import type { GameTerminalData, LineUpdate } from '../types/terminal';
import { appendLineUpdates, mergeGameHistory } from './terminalMerge';

interface SyncOptions {
    getOdds: () => Promise<GameTerminalData[]>;
    getHistory: (eventId: string) => Promise<GameTerminalData>;
    loadedHistory: () => Set<string>;
    replace: (games: GameTerminalData[]) => void;
    update: (updates: LineUpdate[]) => void;
    error: (message: string) => void;
}

/** Reconcile after subscription acknowledgement; preserve updates during REST loads. */
export class TerminalSync {
    private active = true;
    private generation = 0;
    private pending: LineUpdate[] | null = null;
    private retry: ReturnType<typeof setTimeout> | null = null;

    private readonly options: SyncOptions;
    constructor(options: SyncOptions) { this.options = options; }

    async refresh(): Promise<void> {
        if (!this.active) return;
        const generation = ++this.generation;
        if (this.retry) clearTimeout(this.retry);
        this.pending = [];
        try {
            let games = await this.options.getOdds();
            const ids = this.options.loadedHistory();
            const histories = await Promise.all(games.filter(g => ids.has(g.event_id)).map(g => this.options.getHistory(g.event_id)));
            if (!this.active || generation !== this.generation) return;
            for (const history of histories) games = mergeGameHistory(games, history);
            games = appendLineUpdates(games, this.pending ?? []);
            this.pending = null;
            this.options.replace(games);
        } catch {
            if (!this.active || generation !== this.generation) return;
            // Keep the existing display; retry instead of leaving loading stuck.
            this.options.error('Unable to refresh odds. Retrying?');
            this.retry = setTimeout(() => { void this.refresh(); }, 3000);
        }
    }

    receive(updates: LineUpdate[]): void {
        if (!this.active) return;
        if (this.pending !== null) {
            this.pending.push(...updates);
            // Reload rather than retaining an unbounded backlog during outages.
            if (this.pending.length > 10000) void this.refresh();
        } else {
            this.options.update(updates);
        }
    }

    stop(): void {
        this.active = false;
        ++this.generation;
        this.pending = null;
        if (this.retry) clearTimeout(this.retry);
    }
}
