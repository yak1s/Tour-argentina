import type { Chapter, ChapterId, Leg } from '../content/types';
import { chapterById, legById } from '../content';
import { isDone, type Progress } from './progress';

/**
 * Pacing. Sightseeing time and travel time are kept separate. All times are
 * estimates: traffic, weather, crowds, queues and lunch change them, and the
 * game never requires being anywhere at a particular time.
 */

export const PLANNED_START = { hour: 9, minute: 15 };

export function legMinutes(leg: Leg | undefined): number {
  if (!leg) return 0;
  const mode = leg.recommended === 'walk' ? leg.walk : leg.taxi;
  const range = mode?.minutes ?? [0, 0];
  // Taxis also need a few minutes to find; walking needs none.
  return Math.round((range[0] + range[1]) / 2) + (leg.recommended === 'taxi' ? 5 : 0);
}

export function siteMinutes(chapter: Chapter): number {
  return Math.round((chapter.onSiteMinutes[0] + chapter.onSiteMinutes[1]) / 2);
}

export interface ScheduleRow {
  chapterId: ChapterId;
  arrive: Date;
  leave: Date;
  travelMin: number;
  siteMin: number;
  warnings: string[];
}

/** Approximate sunset in Buenos Aires (local time, UTC−3) by month. */
const SUNSET: [number, number][] = [
  [20, 10], [19, 55], [19, 25], [18, 50], [18, 20], [18, 0],
  [18, 10], [18, 30], [18, 50], [19, 10], [19, 35], [20, 0],
];

export function approxSunset(day: Date): Date {
  const [h, m] = SUNSET[day.getMonth()]!;
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

function at(day: Date, hour: number, minute: number): Date {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Things worth knowing about a stop on a given day and time. */
export function warningsFor(id: ChapterId, arrive: Date, leave: Date): string[] {
  const w: string[] = [];
  const dow = arrive.getDay();
  const month = arrive.getMonth();
  const date = arrive.getDate();
  if (id === 'garden') {
    if (dow === 1) w.push('El Rosedal is closed on Mondays. Use the lakeside alternative or skip.');
    if (arrive > at(arrive, 17, 0)) w.push('Arriving after about 17:00: published closing times vary, so the gates may be closing.');
    if (arrive < at(arrive, 8, 0)) w.push('Too early: the garden opens in the morning.');
    if (month >= 5 && month <= 7) w.push('June–August is pruning season: few roses in bloom.');
  }
  if (id === 'colours' && leave > new Date(approxSunset(arrive).getTime() - 30 * 60_000)) {
    w.push('La Boca is a daylight visit: you would be leaving close to dusk. Consider going earlier or skipping.');
  }
  if (id === 'fever') {
    if ((month === 11 && date === 25) || (month === 0 && date === 1)) w.push('The market is closed today; the challenge still works from Plaza Dorrego.');
    if (dow === 0) w.push('Sunday: the San Telmo fair fills Defensa (about 10:00–17:00) — lively and crowded.');
    if (arrive > at(arrive, 19, 30)) w.push('The market closes at 20:00.');
  }
  if (id === 'key') {
    if ((dow === 5 && arrive > at(arrive, 15, 0)) || dow === 6) {
      w.push('Directory listings say the café at this address closes on Friday afternoon and reopens on Saturday night.');
    }
  }
  if (id === 'architects' && arrive > at(arrive, 16, 30)) {
    w.push('Guided tours of the theatre end around 16:45 (the challenge never needs a ticket).');
  }
  return w;
}

/**
 * Projects the remaining day from `now`: the current chapter (if not finished)
 * gets its remaining on-site time, then each unfinished chapter in order.
 */
export function projectSchedule(p: Progress, now: Date): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  let clock = new Date(now);
  const remaining = p.order.filter((id) => !isDone(p.chapters[id].status));
  for (const id of remaining) {
    const chapter = chapterById(id);
    const st = p.chapters[id].status;
    const arrived = st === 'arrived';
    const travelMin = arrived ? 0 : id === 'prologue' ? 0 : legMinutes(legById(chapter.legId));
    const siteMin = arrived
      ? Math.max(5, siteMinutes(chapter) - Math.round((now.getTime() - (p.chapters[id].arrivedAt ?? now.getTime())) / 60_000))
      : siteMinutes(chapter);
    const arrive = new Date(clock.getTime() + travelMin * 60_000);
    const leave = new Date(arrive.getTime() + siteMin * 60_000);
    rows.push({ chapterId: id, arrive, leave, travelMin, siteMin, warnings: warningsFor(id, arrive, leave) });
    clock = leave;
  }
  return rows;
}

/** The planned day from 09:15, ignoring progress (shown on the route overview). */
export function plannedSchedule(order: ChapterId[], day: Date): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  let clock = at(day, PLANNED_START.hour, PLANNED_START.minute);
  for (const id of order) {
    const chapter = chapterById(id);
    const travelMin = id === 'prologue' ? 0 : legMinutes(legById(chapter.legId));
    const siteMin = siteMinutes(chapter);
    const arrive = new Date(clock.getTime() + travelMin * 60_000);
    const leave = new Date(arrive.getTime() + siteMin * 60_000);
    rows.push({ chapterId: id, arrive, leave, travelMin, siteMin, warnings: warningsFor(id, arrive, leave) });
    clock = leave;
  }
  return rows;
}

export function formatClock(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
