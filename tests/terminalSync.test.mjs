import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const compile = source => ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022}}).outputText;
const url = source => 'data:text/javascript;base64,' + Buffer.from(compile(source)).toString('base64');
const merge = url(readFileSync(new URL('../src/utils/terminalMerge.ts', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../src/utils/terminalSync.ts', import.meta.url), 'utf8').replace("'./terminalMerge'", JSON.stringify(merge));
const {TerminalSync} = await import(url(source));
const point = (odds, timestamp) => ({odds, timestamp, sportsbook: 'Fliff'});
const game = points => ({event_id: 'g', markets: [{market_type: 'MONEY', outcomes: [{outcome_id: 'lines:NBA:MONEY:g:home', outcome_name: 'home', history: points, history_by_sportsbook: {Fliff: points}}]}]});
const outcome = games => games[0].markets[0].outcomes[0];
const deferred = () => {let resolve; const promise = new Promise(r => {resolve = r;}); return {promise, resolve};};
function options(overrides = {}) {
  return {getOdds: async () => [game([point(-110, 100)])], getHistory: async () => game([point(-110, 100)]), loadedHistory: () => new Set(), replace() {}, update() {}, error() {}, ...overrides};
}

test('updates arriving during REST load survive snapshot replacement', async () => {
  const pending = deferred(); let result;
  const sync = new TerminalSync(options({getOdds: () => pending.promise, replace: games => {result = games;}}));
  const refresh = sync.refresh();
  sync.receive([{event_id: 'g', market_type: 'MONEY', outcome_name: 'home', point: point(-115, 120)}]);
  pending.resolve([game([point(-110, 100)])]);
  await refresh;
  assert.deepEqual(outcome(result).history.map(p => p.odds), [-110, -115]);
  sync.stop();
});

test('reconnect reloads expanded history including changes missed while offline', async () => {
  let result; let history = [point(-110, 100)];
  const sync = new TerminalSync(options({loadedHistory: () => new Set(['g']), getHistory: async () => game(history), replace: games => {result = games;}}));
  await sync.refresh();
  history = [...history, point(-115, 120), point(-130, 140)];
  await sync.refresh();
  assert.deepEqual(outcome(result).history.map(p => p.odds), [-110, -115, -130]);
  sync.stop();
});

test('a response from an obsolete league/user cannot replace current data', async () => {
  const pending = deferred(); let replaced = false;
  const sync = new TerminalSync(options({getOdds: () => pending.promise, replace: () => {replaced = true;}}));
  const refresh = sync.refresh(); sync.stop(); pending.resolve([game([])]); await refresh;
  assert.equal(replaced, false);
});

test('a failed refresh reports an error and a later retry succeeds', async () => {
  let fail = true; let errors = 0; let replacements = 0;
  const sync = new TerminalSync(options({getOdds: async () => {if (fail) throw Error('offline'); return [game([])];}, error: () => {errors++;}, replace: () => {replacements++;}}));
  await sync.refresh(); fail = false; await sync.refresh(); sync.stop();
  assert.equal(errors, 1); assert.equal(replacements, 1);
});
