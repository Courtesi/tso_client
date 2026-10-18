import { auth } from '../config/firebase';

const WS_URL = import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:8000';

export interface FilterOptions {
	// Terminal/Charts filters
	league?: string | string[] | null;
	game_time?: string | null;
	sportsbooks?: string[] | null;

	// Arb-specific filters
	min_profit?: number | null;
	max_profit?: number | null;
	market_type?: string | string[] | null;

	// EV-specific filters
	min_ev?: number | null;
	confidence?: string[] | null;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
export type StreamType = 'arbs' | 'terminal' | 'ev';

// Type for stream data callback - allows any structure but maintains type safety
export interface StreamDataPayload {
	data: unknown[];
	[key: string]: unknown;
}

export type StreamCallback = (data: StreamDataPayload) => void;

interface WebSocketMessage {
	type: string;
	stream?: StreamType;
	filters?: FilterOptions;
	token?: string;
	payload?: StreamDataPayload;
	user?: string;
	message?: string;
	code?: number;
}

export class WebSocketService {
	private ws: WebSocket | null = null;
	private reconnectTimeout: number | null = null;
	private reconnectAttempts = 0;
	private maxReconnectDelay = 30000;
	private connectTimeout: number | null = null;
	private reconnectDelay = 1000;
	private pingInterval: number | null = null;
	private pongTimeout: number | null = null;
	private connectionStatus: ConnectionStatus = 'disconnected';
	private currentToken: string | null = null;
	private intentionallyClosed = false;
	private refreshToken = false;
	private subscribedCallbacks = new Map<StreamType, Set<() => void>>();
	private pendingSubscriptions: Map<StreamType, {filters: FilterOptions, callback: StreamCallback}> = new Map();
	private activeSubscriptions: Map<StreamType, { filters: FilterOptions }> = new Map();

	// Callbacks
	private onMessageCallbacks: Map<StreamType, StreamCallback> = new Map();
	private onStatusChangeCallbacks: Set<(status: ConnectionStatus) => void> = new Set();

	constructor() {
		// Bind methods to maintain context
		this.handleMessage = this.handleMessage.bind(this);
		this.handleError = this.handleError.bind(this);
		this.handleClose = this.handleClose.bind(this);
	}

	async connect(token: string): Promise<void> {
		if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
			console.log('WebSocket already connected or connecting');
			return;
		}

		this.intentionallyClosed = false;
		this.currentToken = token;
		this.setStatus('reconnecting');

		try {
			const wsUrl = `${WS_URL}/api/ws`;
			console.log('Connecting to WebSocket:', wsUrl);

			this.ws = new WebSocket(wsUrl);
            const socket = this.ws;
            this.connectTimeout = window.setTimeout(() => {
                if (this.ws === socket) socket.close(4000, 'Authentication timed out');
            }, 15000);

			this.ws.onopen = async () => {
				console.log('WebSocket connected, authenticating...');

				// Send authentication message
				this.send({
					type: 'authenticate',
					token: this.currentToken ?? undefined
				});
			};

			this.ws.onmessage = this.handleMessage;
			this.ws.onerror = this.handleError;
			this.ws.onclose = event => { if (this.ws === socket) this.handleClose(event); };

		} catch (error) {
			console.error('WebSocket connection failed:', error);
			this.handleError(error as Event);
		}
	}

	disconnect(): void {
		this.intentionallyClosed = true;
		if (this.connectTimeout) clearTimeout(this.connectTimeout);
		this.connectTimeout = null;
		console.log('Disconnecting WebSocket');
		this.stopHeartbeat();

		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		if (this.ws) {
			this.ws.onclose = null; // Prevent reconnection
			this.ws.close();
			this.ws = null;
		}

		this.setStatus('disconnected');
		this.onMessageCallbacks.clear();
		this.pendingSubscriptions.clear();
		this.activeSubscriptions.clear();
		this.subscribedCallbacks.clear();
	}

	subscribe(stream: StreamType, filters: FilterOptions, onMessage: StreamCallback): void {
		console.log(`Subscribing to ${stream} with filters:`, filters);

		this.onMessageCallbacks.set(stream, onMessage);

		if (this.ws && this.ws.readyState === WebSocket.OPEN && this.connectionStatus === 'connected') {
			// Already connected and authenticated, subscribe immediately
			this.send({
				type: 'subscribe',
				stream,
				filters
			});
			this.activeSubscriptions.set(stream, { filters: { ...filters } });
		} else {
			// Connection not ready, store for later
			// auth_success will flush pendingSubscriptions and move them to activeSubscriptions
			this.pendingSubscriptions.set(stream, { filters, callback: onMessage });
		}
	}

	updateFilters(stream: StreamType, filters: FilterOptions): void {
		if (!this.activeSubscriptions.has(stream)) return;

		this.activeSubscriptions.set(stream, { filters: { ...filters } });
		console.log(`Updating ${stream} filters:`, filters);

		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.send({
				type: 'update_filters',
				stream,
				filters
			});
		}
	}

	unsubscribe(stream: StreamType): void {
		console.log(`Unsubscribing from ${stream}`);

		this.activeSubscriptions.delete(stream);
		this.onMessageCallbacks.delete(stream);
		this.pendingSubscriptions.delete(stream);

		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.send({
				type: 'unsubscribe',
				stream
			});
		}
	}

	onSubscribed(stream: StreamType, callback: () => void): () => void {
        const callbacks = this.subscribedCallbacks.get(stream) ?? new Set<() => void>();
        callbacks.add(callback);
        this.subscribedCallbacks.set(stream, callbacks);
        return () => { callbacks.delete(callback); };
    }

	onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
		this.onStatusChangeCallbacks.add(callback);

		// Return unsubscribe function
		return () => {
			this.onStatusChangeCallbacks.delete(callback);
		};
	}

	private send(message: WebSocketMessage): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		} else {
			console.warn('Cannot send message, WebSocket not open:', message);
		}
	}

	private handleMessage(event: MessageEvent): void {
		try {
			const message = JSON.parse(event.data) as WebSocketMessage;
			console.log('WebSocket message received:', message.type);

			switch (message.type) {
				case 'auth_success':
					if (this.connectTimeout) clearTimeout(this.connectTimeout);
					this.connectTimeout = null;
					this.reconnectAttempts = 0;
					this.refreshToken = false;
					console.log('Authentication successful:', message.user);
					this.setStatus('connected');
					this.startHeartbeat();

					// Re-subscribe all active subscriptions (reconnection case)
					this.activeSubscriptions.forEach(({ filters }, stream) => {
						if (this.onMessageCallbacks.has(stream)) {
							this.send({ type: 'subscribe', stream, filters });
							console.log(`Re-subscribed to ${stream}`);
						}
					});

					// Process pending subscriptions (first-connect case)
					this.pendingSubscriptions.forEach(({ filters, callback }, stream) => {
						this.onMessageCallbacks.set(stream, callback);
						this.activeSubscriptions.set(stream, { filters: { ...filters } });
						this.send({ type: 'subscribe', stream, filters });
					});
					this.pendingSubscriptions.clear();
					break;

				case 'auth_error':
					console.error('Authentication failed:', message.message);
					this.handleAuthError();
					break;

				case 'subscribed':
					if (message.stream) this.subscribedCallbacks.get(message.stream)?.forEach(callback => callback());
					console.log(`Subscribed to ${message.stream}`);
					break;

				case 'data': {
					const stream = message.stream as StreamType;
					const callback = this.onMessageCallbacks.get(stream);
					if (callback && message.payload) {
						callback(message.payload);
					}
					break;
				}

				case 'filters_updated':
					console.log('Filters updated:', message.filters);
					break;

				case 'unsubscribed':
					console.log(`Unsubscribed from ${message.stream}`);
					break;

				case 'pong':
					if (this.pongTimeout) {
						clearTimeout(this.pongTimeout);
						this.pongTimeout = null;
					}
					break;

				case 'error':
					console.error('WebSocket error message:', message.message, message.code);
					break;

				default:
					console.warn('Unknown message type:', message.type);
			}

		} catch (error) {
			console.error('Failed to parse WebSocket message:', error);
		}
	}

	private handleError(event: Event): void {
		console.error('WebSocket error:', event);
	}

	private handleClose(event: CloseEvent): void {
		console.log('WebSocket closed:', event.code, event.reason);

		this.stopHeartbeat();
		if (this.connectTimeout) clearTimeout(this.connectTimeout);
		this.connectTimeout = null;
		this.setStatus('disconnected');

		// Attempt to reconnect if not intentionally closed
		this.ws = null;
		if (!this.intentionallyClosed) {
			this.reconnect();
		}
	}

	private handleAuthError(): void {
        // Preserve subscriptions and callbacks while refreshing authentication.
        this.refreshToken = true;
        this.ws?.close(4001, 'Refresh authentication');
    }

	private reconnect(): void {
		if (this.reconnectTimeout) {
			return; // Already scheduled
		}

		this.reconnectAttempts++;
		const delay = Math.min(this.maxReconnectDelay, this.reconnectDelay * Math.pow(2, Math.min(this.reconnectAttempts - 1, 10))); // Exponential backoff

		console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

		this.setStatus('reconnecting');

		this.reconnectTimeout = window.setTimeout(async () => {
			this.reconnectTimeout = null;

			try {
				const currentUser = auth.currentUser;
				if (currentUser) {
					const token = await currentUser.getIdToken(this.refreshToken);
					if (this.intentionallyClosed) return;
					await this.connect(token);
				}
			} catch (error) {
				console.error('Reconnection failed:', error);
				this.handleClose(new CloseEvent('close', { code: 1006 }));
			}
		}, delay);
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();

		// Send ping every 30 seconds
		this.pingInterval = window.setInterval(() => {
			this.sendPing();
		}, 30000);
	}

	private stopHeartbeat(): void {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}

		if (this.pongTimeout) {
			clearTimeout(this.pongTimeout);
			this.pongTimeout = null;
		}
	}

	private sendPing(): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.send({ type: 'ping' });

			// Set timeout for pong response (10 seconds)
			this.pongTimeout = window.setTimeout(() => {
				console.warn('Pong timeout - closing connection');
				this.ws?.close();
			}, 10000);
		}
	}

	private setStatus(status: ConnectionStatus): void {
		if (this.connectionStatus !== status) {
			this.connectionStatus = status;
			this.onStatusChangeCallbacks.forEach(callback => callback(status));
		}
	}

	getStatus(): ConnectionStatus {
		return this.connectionStatus;
	}
}

// Global WebSocket service instance
export const wsService = new WebSocketService();
