import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialQuestState,
  getPrincipalSummaryMessage,
  pickupLostNotebook,
  receiveLibraryBook,
  recordBasketballScore,
  recordRoomVisit,
  startQuest,
  turnInLostNotebook,
} from './QuestLogic';

test('find-room quest completes upon visiting Chemistry Lab', () => {
  let state = createInitialQuestState();
  state = startQuest(state, 'quest-find-room');
  assert.equal(state.quests['quest-find-room'].status, 'active');

  state = recordRoomVisit(state, 'lab-chemistry');
  assert.equal(state.quests['quest-find-room'].status, 'completed');
  assert.equal(state.quests['quest-find-room'].progress, 1);
});

test('lost notebook quest tracks pickup and turn-in', () => {
  let state = createInitialQuestState();
  state = startQuest(state, 'quest-lost-notebook');
  state = pickupLostNotebook(state);
  assert.equal(state.hasNotebookItem, true);
  assert.equal(state.quests['quest-lost-notebook'].status, 'active');

  state = turnInLostNotebook(state);
  assert.equal(state.quests['quest-lost-notebook'].status, 'completed');
});

test('basketball mini-game completes quest when reaching 3 baskets', () => {
  let state = createInitialQuestState();
  state = recordBasketballScore(state, 2);
  assert.equal(state.quests['quest-basketball'].status, 'active');
  assert.equal(state.quests['quest-basketball'].progress, 2);

  state = recordBasketballScore(state, 4);
  assert.equal(state.quests['quest-basketball'].status, 'completed');
  assert.equal(state.basketballHighScore, 4);
});

test('principal summary reflects completed quests and visited rooms', () => {
  let state = createInitialQuestState();
  state = recordRoomVisit(state, 'lab-chemistry');
  state = pickupLostNotebook(state);
  state = turnInLostNotebook(state);
  state = receiveLibraryBook(state);
  state = recordBasketballScore(state, 3);

  const summary = getPrincipalSummaryMessage(state);
  assert.ok(summary.includes('4/4'));
});
