import { describe, expect, it } from 'vitest';
import { CHAPTER_IDS } from '../../src/content';
import { approxSunset, formatClock, plannedSchedule, projectSchedule, warningsFor } from '../../src/engine/schedule';
import { createProgress, startTour } from '../../src/engine/progress';

// A Tuesday in October.
const DAY = new Date(2026, 9, 20, 8, 0, 0);

describe('schedule', () => {
  it('starts at 9:15 and moves forward through the day', () => {
    const rows = plannedSchedule(CHAPTER_IDS, DAY);
    expect(formatClock(rows[0]!.arrive)).toBe('09:15');
    for (let i = 1; i < rows.length; i++) expect(rows[i]!.arrive.getTime()).toBeGreaterThanOrEqual(rows[i - 1]!.leave.getTime());
    const end = rows[rows.length - 1]!.leave;
    expect(end.getHours()).toBeGreaterThanOrEqual(16);
    expect(end.getHours()).toBeLessThanOrEqual(19);
    // El Rosedal is reached comfortably before ~17:00 in the plan.
    const garden = rows.find((r) => r.chapterId === 'garden')!;
    expect(garden.arrive.getHours()).toBeLessThan(17);
  });

  it('warns about the Monday closure of El Rosedal', () => {
    const monday = new Date(2026, 9, 19, 15, 0);
    expect(warningsFor('garden', monday, monday).join(' ')).toMatch(/Monday/);
    const tuesday = new Date(2026, 9, 20, 15, 0);
    expect(warningsFor('garden', tuesday, tuesday).join(' ')).not.toMatch(/Monday/);
  });

  it('warns when La Boca would end near dusk', () => {
    const late = new Date(2026, 5, 10, 17, 30);
    expect(warningsFor('colours', late, new Date(late.getTime() + 40 * 60_000)).join(' ')).toMatch(/daylight/);
    expect(approxSunset(late).getHours()).toBe(18);
  });

  it('projects only unfinished chapters from now', () => {
    const p = startTour(createProgress(DAY.getTime()), DAY.getTime());
    const rows = projectSchedule(p, DAY);
    expect(rows[0]!.chapterId).toBe('prologue');
    expect(rows).toHaveLength(CHAPTER_IDS.length);
  });
});
