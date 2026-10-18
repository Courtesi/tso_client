import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/terminalMerge.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
});
const { mergeGameHistory, appendLineUpdates } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);
const point = (sportsbook, timestamp, odds = -110) => ({ sportsbook, timestamp, odds });
const game = (histories) => ({
  event_id: 'game', markets: [{ market_type: 'MONEY', outcomes: [{
    outcome_id: 'lines:NBA:MONEY:game:home', outcome_name: 'Home Team',
    history: Object.values(histories).flat(), history_by_sportsbook: histories,
    current_best_odds: -110, current_best_sportsbook: 'Fliff',
  }] }],
});
const outcome = games => games[0].markets[0].outcomes[0];

test('REST hydration preserves sparse WS changes independently for each sportsbook', () => {
  const existing = game({ Fliff: [point('Fliff', 120)], Novig: [point('Novig', 105)] });
  const hydrated = game({ Fliff: [point('Fliff', 110)], Novig: [point('Novig', 100)] });
  const merged = mergeGameHistory([existing], hydrated);
  assert.deepEqual(outcome(merged).history_by_sportsbook.Novig.map(p => p.timestamp), [100, 105]);
  assert.deepEqual(outcome(merged).history_by_sportsbook.Fliff.map(p => p.timestamp), [110, 120]);
  assert.equal(outcome([hydrated]).history.length, 2);
});

test('live updates match stable outcome IDs and reject replayed or older points', () => {
  const existing = [game({ Fliff: [point('Fliff', 100)] })];
  const update = { event_id: 'game', market_type: 'MONEY', outcome_name: 'home', point: point('Fliff', 120, -115) };
  const updated = appendLineUpdates(existing, [update, update, { ...update, point: point('Fliff', 90) }]);
  assert.deepEqual(outcome(updated).history_by_sportsbook.Fliff.map(p => p.odds), [-110, -115]);
  assert.equal(outcome(existing).history.length, 1);
});

test('returning to an earlier price remains in the live timeline', () => {
  const existing = [game({ Fliff: [point('Fliff', 100)] })];
  const updates = [point('Fliff', 120, -115), point('Fliff', 140, -110)].map(p => ({
    event_id: 'game', market_type: 'MONEY', outcome_name: 'home', point: p,
  }));
  assert.deepEqual(outcome(appendLineUpdates(existing, updates)).history.map(p => p.odds), [-110, -115, -110]);
});
