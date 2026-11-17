import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_SECONDS_PER_MINUTE,
  advanceGameClock,
  getTimePhaseForHour,
  type GameClockState,
} from './GameClock';

describe('GameClock progression & hourly bell triggers', () => {
  it('advances 1 in-game minute every 30 real-world seconds', () => {
    assert.equal(GAME_SECONDS_PER_MINUTE, 30);
    const clock: GameClockState = { hour: 8, minute: 0, accum: 0 };

    // After 29.75s total, minute must still be 08:00
    for (let i = 0; i < 119; i++) {
      const res = advanceGameClock(clock, 0.25);
      assert.deepEqual(res, { minuteChanged: false, hourChanged: false });
    }
    assert.deepEqual({ hour: clock.hour, minute: clock.minute }, { hour: 8, minute: 0 });

    // Next 0.25s reaches 30.0s -> 08:01 (no hour chime yet)
    assert.deepEqual(advanceGameClock(clock, 0.25), { minuteChanged: true, hourChanged: false });
    assert.deepEqual({ hour: clock.hour, minute: clock.minute }, { hour: 8, minute: 1 });

    // 59 more minutes (59 * 30s = 1770s = 1770s / 0.25s = 7080 ticks) -> 09:00 + hourChanged!
    let hourChanges = 0;
    for (let i = 0; i < 7080; i++) {
      const res = advanceGameClock(clock, 0.25);
      if (res.hourChanged) hourChanges += 1;
    }
    assert.equal(hourChanges, 1);
    assert.deepEqual({ hour: clock.hour, minute: clock.minute }, { hour: 9, minute: 0 });
  });

  it('flags hourChanged on minute 59 -> 00 rollover and wraps past midnight', () => {
    const clock: GameClockState = { hour: 23, minute: 59, accum: 0 };
    const res = advanceGameClock(clock, GAME_SECONDS_PER_MINUTE);
    assert.deepEqual(res, { minuteChanged: true, hourChanged: true });
    assert.deepEqual({ hour: clock.hour, minute: clock.minute }, { hour: 0, minute: 0 });
  });

  it('maps hours accurately to campus time phases', () => {
    assert.equal(getTimePhaseForHour(8), 'morning');
    assert.equal(getTimePhaseForHour(11), 'midday');
    assert.equal(getTimePhaseForHour(14), 'afternoon');
    assert.equal(getTimePhaseForHour(17), 'sunset');
    assert.equal(getTimePhaseForHour(20), 'night');
    assert.equal(getTimePhaseForHour(3), 'night');
  });
});
