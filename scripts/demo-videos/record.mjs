// Records the Feature Showcase demo clips from the real app, with Firebase auth,
// the REST API and the WebSocket stream all mocked by curated fixtures.
//
//   npm run record:demos            # record every scene
//   npm run record:demos -- arbs    # record one scene
//
// Output: public/dashboard_videos/<scene>.{mp4,webm} and <scene>-poster.jpg

import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { ARBS, NEW_ARB, EV_BETS, SPORTSBOOKS, TERMINAL_GAMES, filterArbs, filterEv, terminalSnapshot, moveLine } from './fixtures.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'public', 'dashboard_videos');
const PORT = 5179;
const BASE = `http://localhost:${PORT}`;
const VIEWPORT = { width: 1120, height: 700 };
const SCALE = 2;
const OUTPUT_WIDTH = 1100;
const FPS = 30;
const LOOP_FADE = 0.6;
// Playback speed relative to real time; scenes are paced for a viewer, then sped up evenly
const SPEED = 1.3;

const DEMO_USER = { uid: 'demo-user-0001', email: 'jordan@example.com', displayName: 'Jordan Lee' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readEnv() {
	const env = {};
	for (const file of ['.env', '.env.local']) {
		const path = join(ROOT, file);
		if (!existsSync(path)) continue;
		for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
			const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
			if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
		}
	}
	return env;
}

// ==================== DEV SERVER ====================

async function startViteServer() {
	const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: ROOT, shell: true, stdio: 'pipe' });
	vite.stderr.on('data', (d) => process.stderr.write(d));
	for (let i = 0; i < 60; i++) {
		try {
			if ((await fetch(BASE)).ok) return vite;
		} catch { /* not up yet */ }
		await sleep(500);
	}
	throw new Error('Vite dev server did not start');
}

function stopViteServer(vite) {
	if (process.platform === 'win32') {
		try { execFileSync('taskkill', ['/pid', String(vite.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* already gone */ }
	} else {
		vite.kill();
	}
}

// ==================== MOCKS ====================

function fakeIdToken(projectId) {
	const now = Math.floor(Date.now() / 1000);
	const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
	return [
		encode({ alg: 'RS256', kid: 'demo', typ: 'JWT' }),
		encode({
			iss: `https://securetoken.google.com/${projectId}`,
			aud: projectId,
			auth_time: now,
			user_id: DEMO_USER.uid,
			sub: DEMO_USER.uid,
			iat: now,
			exp: now + 3600,
			email: DEMO_USER.email,
			email_verified: true,
			stripeRole: 'premium',
			firebase: { identities: { email: [DEMO_USER.email] }, sign_in_provider: 'password' },
		}),
		'demo-signature',
	].join('.');
}

const CORS = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': '*',
	'access-control-allow-methods': 'GET, POST, OPTIONS',
};

const json = (route, body) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });

function firebaseResponse(url, projectId) {
	const idToken = fakeIdToken(projectId);
	if (url.includes('accounts:signInWithPassword')) {
		return { kind: 'identitytoolkit#VerifyPasswordResponse', localId: DEMO_USER.uid, email: DEMO_USER.email, displayName: DEMO_USER.displayName, idToken, registered: true, refreshToken: 'demo-refresh-token', expiresIn: '3600' };
	}
	if (url.includes('accounts:lookup')) {
		const now = String(Date.now());
		return {
			kind: 'identitytoolkit#GetAccountInfoResponse',
			users: [{
				localId: DEMO_USER.uid,
				email: DEMO_USER.email,
				displayName: DEMO_USER.displayName,
				emailVerified: true,
				providerUserInfo: [{ providerId: 'password', email: DEMO_USER.email, federatedId: DEMO_USER.email, rawId: DEMO_USER.email, displayName: DEMO_USER.displayName }],
				validSince: '1700000000',
				lastLoginAt: now,
				createdAt: '1700000000000',
				lastRefreshAt: new Date().toISOString(),
			}],
		};
	}
	if (url.includes('securetoken.googleapis.com')) {
		return { access_token: idToken, expires_in: '3600', token_type: 'Bearer', refresh_token: 'demo-refresh-token', id_token: idToken, user_id: DEMO_USER.uid, project_id: projectId };
	}
	console.warn('[mock] unhandled Firebase request:', url);
	return {};
}

function apiResponse(path, stream) {
	if (path.startsWith('/api/config/sportsbooks')) return { sportsbooks: SPORTSBOOKS };
	if (path.startsWith('/api/config/leagues')) return { all_leagues: ['NBA', 'NFL', 'NHL', 'MLB', 'NCAAB', 'NCAAF'], tier_allowed_leagues: { free: ['NBA', 'NFL', 'MLB'], premium: null } };
	if (path.startsWith('/api/products')) return { products: [] };
	if (path.startsWith('/api/terminal/odds')) {
		const data = terminalSnapshot(stream.terminal);
		return { tier: 'premium', data, metadata: { count: data.length } };
	}
	if (path.startsWith('/api/terminal/lines/')) {
		const eventId = decodeURIComponent(path.split('/').pop());
		return { tier: 'premium', data: stream.terminal.find((g) => g.event_id === eventId) };
	}
	return {};
}

async function installMocks(context, env) {
	const apiUrl = env.VITE_API_URL || 'http://localhost:8000';
	const projectId = env.VITE_FIREBASE_PROJECT_ID || 'demo-project';

	// The fake backend state. Scenes push new data through `stream.push` / `stream.moveLines`.
	const stream = { arbs: [...ARBS], ev: [...EV_BETS], terminal: structuredClone(TERMINAL_GAMES), filters: {}, sockets: new Set() };

	await context.route('**/*', async (route) => {
		const request = route.request();
		const url = request.url();
		const { host, pathname } = new URL(url);

		if (url.startsWith(BASE) || host.endsWith('fonts.googleapis.com') || host.endsWith('fonts.gstatic.com')) {
			return route.continue();
		}
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
		if (host === 'identitytoolkit.googleapis.com' || host === 'securetoken.googleapis.com') {
			return json(route, firebaseResponse(url, projectId));
		}
		if (url.startsWith(apiUrl)) return json(route, apiResponse(pathname, stream));

		// Firestore, analytics, Stripe, etc. Settings fall back to defaults without Firestore.
		return route.abort();
	});

	const payloadFor = (name) => name === 'arbs'
		? { message: '', tier: 'premium', data: filterArbs(stream.arbs, stream.filters.arbs) }
		: { tier: 'premium', data: filterEv(stream.ev, stream.filters.ev) };
	const sendData = (ws, name) => ws.send(JSON.stringify({ type: 'data', stream: name, payload: payloadFor(name) }));

	stream.push = (name, data) => {
		stream[name] = data;
		for (const ws of stream.sockets) if (stream.filters[name]) sendData(ws, name);
	};

	// moves: [eventId, team, sportsbook, odds][]; recorded in history so later REST loads include them
	stream.moveLines = (moves) => {
		const updates = moves.map((move) => moveLine(stream.terminal, ...move));
		for (const ws of stream.sockets) {
			if (stream.filters.terminal) ws.send(JSON.stringify({ type: 'data', stream: 'terminal', payload: { data: updates } }));
		}
	};

	await context.routeWebSocket(/\/api\/ws$/, (ws) => {
		stream.sockets.add(ws);
		ws.onClose(() => stream.sockets.delete(ws));
		ws.onMessage((raw) => {
			const message = JSON.parse(String(raw));
			const name = message.stream;
			switch (message.type) {
				case 'authenticate':
					ws.send(JSON.stringify({ type: 'auth_success', user: DEMO_USER.uid }));
					break;
				case 'subscribe':
				case 'update_filters':
					stream.filters[name] = message.filters ?? {};
					// Terminal snapshots come over REST once the subscription is acknowledged
					if (name === 'terminal') {
						ws.send(JSON.stringify({ type: 'subscribed', stream: name }));
						break;
					}
					ws.send(JSON.stringify({ type: message.type === 'subscribe' ? 'subscribed' : 'filters_updated', stream: name, filters: message.filters }));
					// Small delay so the update reads as a server round trip
					setTimeout(() => sendData(ws, name), 120);
					break;
				case 'unsubscribe':
					delete stream.filters[name];
					ws.send(JSON.stringify({ type: 'unsubscribed', stream: name }));
					break;
				case 'ping':
					ws.send(JSON.stringify({ type: 'pong' }));
					break;
			}
		});
	});

	return stream;
}

// ==================== ON-SCREEN CURSOR ====================

// Headless Chrome doesn't draw a cursor, so render one that follows mouse events
const CURSOR_SCRIPT = `
(() => {
	const install = () => {
		if (document.getElementById('demo-cursor')) return;
		const style = document.createElement('style');
		style.textContent = \`
			#demo-cursor { position: fixed; left: 0; top: 0; width: 26px; height: 26px; z-index: 2147483647;
				pointer-events: none; opacity: 0; transition: opacity 200ms; filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.5)); }
			#demo-cursor svg { transition: transform 120ms ease-out; transform-origin: 4px 3px; }
			#demo-cursor.down svg { transform: scale(0.82); }
			.demo-ripple { position: fixed; width: 36px; height: 36px; margin: -18px 0 0 -18px; border-radius: 9999px;
				border: 2px solid rgb(165 180 252 / 0.9); pointer-events: none; z-index: 2147483646;
				animation: demo-ripple 500ms ease-out forwards; }
			@keyframes demo-ripple { from { transform: scale(0.3); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }
			@keyframes demo-flash { 0%, 30% { background-color: rgb(99 102 241 / 0.38); } 100% { background-color: transparent; } }
			tr.demo-flash > td { animation: demo-flash 2200ms ease-out; }
		\`;
		document.head.appendChild(style);
		const cursor = document.createElement('div');
		cursor.id = 'demo-cursor';
		cursor.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M4 3 L4 21 L9 16.5 L12.5 24 L15.5 22.6 L12 15.3 L19 15.3 Z" fill="white" stroke="black" stroke-width="1.4" stroke-linejoin="round"/></svg>';
		document.documentElement.appendChild(cursor);
		document.addEventListener('mousemove', (e) => {
			cursor.style.opacity = '1';
			cursor.style.transform = 'translate(' + (e.clientX - 4) + 'px,' + (e.clientY - 3) + 'px)';
		}, true);
		document.addEventListener('mousedown', (e) => {
			cursor.classList.add('down');
			const ripple = document.createElement('div');
			ripple.className = 'demo-ripple';
			ripple.style.left = e.clientX + 'px';
			ripple.style.top = e.clientY + 'px';
			document.documentElement.appendChild(ripple);
			setTimeout(() => ripple.remove(), 600);
		}, true);
		document.addEventListener('mouseup', () => cursor.classList.remove('down'), true);
	};
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
	else install();
})();
`;

function createPointer(page) {
	let x = VIEWPORT.width * 0.62;
	let y = VIEWPORT.height * 0.78;
	const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

	const pointer = {
		async place(nx, ny) {
			x = nx; y = ny;
			await page.mouse.move(x, y);
		},
		async glide(tx, ty, ms = 700) {
			const sx = x, sy = y;
			const steps = Math.max(1, Math.round(ms / 16));
			for (let i = 1; i <= steps; i++) {
				const t = ease(i / steps);
				x = sx + (tx - sx) * t;
				y = sy + (ty - sy) * t;
				await page.mouse.move(x, y);
				await sleep(16);
			}
		},
		async glideTo(locator, ms, { dx = 0.5, dy = 0.5 } = {}) {
			const box = await locator.boundingBox();
			if (!box) throw new Error(`No bounding box for ${locator}`);
			await pointer.glide(box.x + box.width * dx, box.y + box.height * dy, ms);
		},
		async click(locator, ms = 700) {
			if (locator) await pointer.glideTo(locator, ms);
			await page.mouse.down();
			await sleep(90);
			await page.mouse.up();
		},
		async drag(tx, ms = 900) {
			await page.mouse.down();
			await sleep(120);
			await pointer.glide(tx, y, ms);
			await sleep(80);
			await page.mouse.up();
		},
	};
	return pointer;
}

// x position on an rc-slider rail for a given value
async function sliderX(page, value, max) {
	const rail = await page.locator('.rc-slider-rail').first().boundingBox();
	return rail.x + rail.width * (value / max);
}

// Zooms the whole app (#root) toward an element, like a screen-recording camera.
// The cursor overlay lives outside #root so it stays the same size.
async function camera(page, locator, { scale = 1, ms = 900 } = {}) {
	const el = locator ? await locator.elementHandle() : null;
	await page.evaluate(({ el, scale, ms, width, height }) => {
		const root = document.getElementById('root');
		const current = JSON.parse(root.dataset.camera || '{"tx":0,"ty":0,"s":1}');
		let tx = 0, ty = 0;
		if (el && scale !== 1) {
			// Element centre in untransformed layout coordinates
			const r = el.getBoundingClientRect();
			const cx = (r.x + r.width / 2 - current.tx) / current.s;
			const cy = (r.y + r.height / 2 - current.ty) / current.s;
			const clamp = (v, min) => Math.min(0, Math.max(min, v));
			tx = clamp(width / 2 - cx * scale, width - width * scale);
			ty = clamp(height / 2 - cy * scale, height - height * scale);
		}
		root.dataset.camera = JSON.stringify({ tx, ty, s: scale });
		root.style.transformOrigin = '0 0';
		root.style.transition = `transform ${ms}ms cubic-bezier(0.65, 0, 0.35, 1)`;
		root.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
	}, { el, scale, ms, width: VIEWPORT.width, height: VIEWPORT.height });
	await sleep(ms + 60);
	// Any transform (even identity) makes #root the containing block for the fixed navbar
	// and sidebar, so drop it once the camera is back at 1x
	if (scale === 1) await page.evaluate(() => { document.getElementById('root').style.transform = ''; });
}

// ==================== CAPTURE ====================

async function startCapture(page, frameDir) {
	mkdirSync(frameDir, { recursive: true });
	const cdp = await page.context().newCDPSession(page);
	const frames = [];
	cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
		const file = join(frameDir, `f${String(frames.length).padStart(5, '0')}.jpg`);
		writeFileSync(file, Buffer.from(data, 'base64'));
		frames.push({ file, time: metadata.timestamp });
		await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
	});
	await cdp.send('Page.startScreencast', {
		format: 'jpeg',
		quality: 95,
		maxWidth: VIEWPORT.width * SCALE,
		maxHeight: VIEWPORT.height * SCALE,
	});
	return async () => {
		await cdp.send('Page.stopScreencast');
		frames.push({ file: frames.at(-1).file, time: Date.now() / 1000 });
		await cdp.detach();
		return frames;
	};
}

function encode(name, frames, frameDir, crop = [0, 0, VIEWPORT.width, VIEWPORT.height]) {
	// Screencast frames arrive only when the screen changes, so give each its real duration
	const list = frames.slice(0, -1).map((f, i) => `file '${f.file.replace(/\\/g, '/')}'\nduration ${((frames[i + 1].time - f.time) / SPEED).toFixed(4)}`);
	list.push(`file '${frames.at(-2).file.replace(/\\/g, '/')}'`);
	const listFile = join(frameDir, 'frames.txt');
	writeFileSync(listFile, list.join('\n'));

	const duration = (frames.at(-1).time - frames[0].time) / SPEED;
	const [cx, cy, cw, ch] = crop.map((v) => Math.round(v * SCALE));
	// Crossfade the tail into the opening frames so the autoplay loop has no visible jump
	const filter = [
		`[0]crop=${cw}:${ch}:${cx}:${cy},scale=${OUTPUT_WIDTH}:-2:flags=lanczos,fps=${FPS},format=yuv420p,split[main][head]`,
		`[head]trim=0:${LOOP_FADE},setpts=PTS-STARTPTS[intro]`,
		`[main][intro]xfade=transition=fade:duration=${LOOP_FADE}:offset=${(duration - LOOP_FADE).toFixed(3)}[v]`,
	].join(';');

	const master = join(frameDir, 'master.mp4');
	const ffmpeg = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });

	ffmpeg(['-f', 'concat', '-safe', '0', '-i', listFile, '-filter_complex', filter, '-map', '[v]', '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', master]);
	ffmpeg(['-i', master, '-c:v', 'libx264', '-crf', '23', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-vf', 'scale=out_range=tv', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-an', '-movflags', '+faststart', join(OUT_DIR, `${name}.mp4`)]);
	ffmpeg(['-i', master, '-c:v', 'libvpx-vp9', '-crf', '40', '-b:v', '0', '-row-mt', '1', '-an', join(OUT_DIR, `${name}.webm`)]);
	ffmpeg(['-i', master, '-frames:v', '1', '-q:v', '3', join(OUT_DIR, `${name}-poster.jpg`)]);
}

// ==================== SCENES ====================

// Each scene may set `crop: [x, y, width, height]` (CSS pixels) to record part of the viewport
const SCENES = {
	arbs: {
		path: '/dashboard',
		async setup(page) {
			await page.locator('tbody tr').first().waitFor();
		},
		async run(page, pointer, stream) {
			await sleep(1300);

			// A fresh arb lands at the top of the table
			stream.push('arbs', [...ARBS, NEW_ARB]);
			const newRows = page.locator('tbody tr').filter({ hasText: 'Denver Nuggets' });
			await newRows.first().waitFor();
			await page.evaluate(() => {
				const first = [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes('Denver Nuggets'));
				first?.classList.add('demo-flash');
				first?.nextElementSibling?.classList.add('demo-flash');
			});
			await sleep(500);

			// Zoom in on the profit and pin it
			const cells = newRows.first().locator('td');
			await camera(page, cells.nth(1), { scale: 1.5, ms: 1000 });
			await pointer.glideTo(cells.nth(1), 700);
			await sleep(500);
			await pointer.click(cells.first().locator('button'), 600);
			await sleep(800);

			// Pan across to the calculated stakes
			await camera(page, cells.nth(5), { scale: 1.5, ms: 1000 });
			await pointer.glideTo(cells.nth(5), 700);
			await sleep(1300);

			// Raise the minimum profit so only the best opportunities remain
			await camera(page, null, { ms: 900 });
			const minHandle = page.locator('.rc-slider-handle').first();
			await pointer.glideTo(minHandle, 800);
			await sleep(200);
			await pointer.drag(await sliderX(page, 0.8, 20), 900);
			await sleep(2700);
		},
	},

	ev: {
		path: '/ev-bets',
		async setup(page) {
			await page.locator('tbody tr').first().waitFor();
		},
		async run(page, pointer) {
			await sleep(1000);
			await camera(page, page.getByRole('button', { name: 'All Levels' }), { scale: 1.5, ms: 900 });

			// Only show high-confidence bets
			await pointer.click(page.getByRole('button', { name: 'All Levels' }), 800);
			await sleep(500);
			await pointer.click(page.locator('label').filter({ hasText: 'HIGH' }).locator('input'), 600);
			await sleep(900);

			// Close the dropdown by clicking outside it
			await pointer.click(page.getByText(/^Min EV:/), 700);
			await sleep(400);

			// Raise the minimum EV
			const handle = page.locator('.rc-slider-handle').first();
			await pointer.glideTo(handle, 800);
			await sleep(200);
			await pointer.drag(await sliderX(page, 4, 20), 1000);
			await sleep(900);

			// Settle on the best bet
			const best = page.locator('tbody tr').first().locator('td').nth(1);
			await camera(page, best, { scale: 1.6, ms: 900 });
			await pointer.glideTo(best, 700);
			await sleep(1600);
		},
	},

	lines: {
		path: '/charts',
		async setup(page) {
			await page.getByText('Denver Nuggets @ Los Angeles Lakers').waitFor();
		},
		async run(page, pointer, stream) {
			const NUGGETS = 'nba-denvernuggets-losangeleslakers';
			const CELTICS = 'nba-bostonceltics-newyorkknicks';
			const SUNS = 'nba-goldenstatewarriors-phoenixsuns';
			const card = page.locator('div.bg-zinc-950').filter({ hasText: 'Denver Nuggets @ Los Angeles Lakers' });

			// Prices tick across the board
			await sleep(900);
			stream.moveLines([[CELTICS, 'Boston Celtics', 'DraftKings', -134], [CELTICS, 'New York Knicks', 'DraftKings', 114]]);
			await sleep(450);
			stream.moveLines([[SUNS, 'Phoenix Suns', 'FanDuel', -124], [SUNS, 'Golden State Warriors', 'FanDuel', 104]]);
			await sleep(500);

			// Zoom in as the Nuggets line keeps moving
			await camera(page, card.locator('table'), { scale: 1.4, ms: 900 });
			stream.moveLines([[NUGGETS, 'Denver Nuggets', 'ProphetX', -156], [NUGGETS, 'Los Angeles Lakers', 'ProphetX', 136]]);
			await sleep(600);
			stream.moveLines([[NUGGETS, 'Denver Nuggets', 'DraftKings', -156], [NUGGETS, 'Los Angeles Lakers', 'DraftKings', 136]]);
			await sleep(600);
			stream.moveLines([[NUGGETS, 'Denver Nuggets', 'FanDuel', -158], [NUGGETS, 'Los Angeles Lakers', 'FanDuel', 138]]);
			await sleep(900);

			// Open the game's line history
			await camera(page, null, { ms: 800 });
			await pointer.click(card.locator('button').first(), 800);
			await card.locator('canvas').first().waitFor();
			await page.evaluate((top) => window.scrollTo({ top, behavior: 'smooth' }), 95);
			await sleep(1100);

			// Trace the line movement with the crosshair
			const chart = await card.locator('canvas').first().boundingBox();
			await pointer.glide(chart.x + chart.width * 0.12, chart.y + chart.height * 0.6, 700);
			await pointer.glide(chart.x + chart.width * 0.88, chart.y + chart.height * 0.3, 2200);
			await sleep(400);
			stream.moveLines([[NUGGETS, 'Los Angeles Lakers', 'BetMGM', 138], [NUGGETS, 'Denver Nuggets', 'BetMGM', -158]]);
			await sleep(1000);

			// Flip to the other side of the market
			await pointer.click(card.getByRole('button', { name: /^Away/ }), 900);
			await sleep(1800);
		},
	},
};

// ==================== MAIN ====================

async function recordScene(browser, env, name) {
	const scene = SCENES[name];
	const context = await browser.newContext({
		viewport: VIEWPORT,
		deviceScaleFactor: SCALE,
		colorScheme: 'dark',
		locale: 'en-US',
		timezoneId: 'America/New_York',
	});
	const stream = await installMocks(context, env);
	await context.addInitScript(CURSOR_SCRIPT);
	const page = await context.newPage();
	page.on('pageerror', (err) => console.warn(`[${name}] page error:`, err.message));

	// Sign in through the real login modal (Firebase calls are mocked)
	await page.goto(BASE);
	await page.getByRole('button', { name: 'Log In' }).click();
	await page.locator('#email').fill(DEMO_USER.email);
	await page.locator('#password').fill('demo-password');
	await page.locator('form').getByRole('button', { name: 'Sign In' }).click();
	await page.waitForURL('**/dashboard');

	if (scene.path !== '/dashboard') {
		// Client-side navigation keeps the session and stream connection alive
		await page.evaluate((path) => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, scene.path);
	}
	await scene.setup(page);
	await page.evaluate(() => document.fonts.ready);
	await sleep(800);

	const pointer = createPointer(page);
	await pointer.place(VIEWPORT.width * 0.62, VIEWPORT.height * 0.78);

	const frameDir = join(tmpdir(), 'tso-demo-frames', name);
	rmSync(frameDir, { recursive: true, force: true });
	const stopCapture = await startCapture(page, frameDir);
	await scene.run(page, pointer, stream);
	const frames = await stopCapture();
	await context.close();

	console.log(`[${name}] captured ${frames.length} frames over ${(frames.at(-1).time - frames[0].time).toFixed(1)}s, encoding...`);
	encode(name, frames, frameDir, scene.crop);
	console.log(`[${name}] wrote public/dashboard_videos/${name}.{mp4,webm} and ${name}-poster.jpg`);
}

async function main() {
	const requested = process.argv.slice(2);
	const names = requested.length ? requested : Object.keys(SCENES);
	for (const name of names) if (!SCENES[name]) throw new Error(`Unknown scene "${name}". Options: ${Object.keys(SCENES).join(', ')}`);

	mkdirSync(OUT_DIR, { recursive: true });
	const env = readEnv();
	const vite = await startViteServer();
	// Without the flag, headless screencast frames come back at 1x despite deviceScaleFactor
	const browser = await chromium.launch({ channel: 'chrome', args: [`--force-device-scale-factor=${SCALE}`] });
	try {
		for (const name of names) await recordScene(browser, env, name);
	} finally {
		await browser.close();
		stopViteServer(vite);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
