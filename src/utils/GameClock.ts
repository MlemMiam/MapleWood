import type { TimePhase } from '../engine/Renderer';

/** Real-time seconds required for one in-game minute (1 in-game minute = 30 real seconds). */
export const GAME_SECONDS_PER_MINUTE = 30;

export interface GameClockState {
  hour: number;
  minute: number;
  accum: number;
}

export interface GameClockTickResult {
  minuteChanged: boolean;
  hourChanged: boolean;
}

export function getTimePhaseForHour(hour: number): TimePhase {
  if (hour >= 20 || hour < 6) return 'night';
  if (hour >= 17) return 'sunset';
  if (hour >= 14) return 'afternoon';
  if (hour >= 11) return 'midday';
  return 'morning';
}

export function advanceGameClock(
  clock: GameClockState,
  dt: number,
  secondsPerMinute = GAME_SECONDS_PER_MINUTE
): GameClockTickResult {
  if (dt <= 0 || !Number.isFinite(dt)) {
    return { minuteChanged: false, hourChanged: false };
  }
  const stepSec = Math.max(0.1, secondsPerMinute);
  clock.accum += dt;
  let minuteChanged = false;
  let hourChanged = false;
  while (clock.accum >= stepSec) {
    clock.accum -= stepSec;
    clock.minute += 1;
    if (clock.minute >= 60) {
      clock.minute = 0;
      clock.hour = (clock.hour + 1) % 24;
      hourChanged = true;
    }
    minuteChanged = true;
  }
  return { minuteChanged, hourChanged };
}
