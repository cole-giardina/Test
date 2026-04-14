import { addCalendarDays, enumerateCalendarDays } from "@/lib/formatters";
import { getDailyTotals, type DailyNutritionTotals } from "@/lib/foodLog";

export type DayTotalsRow = {
  date: string;
  totals: DailyNutritionTotals;
};

/**
 * Loads daily nutrition totals for each local calendar day in `[startYmd, endYmd]` (inclusive).
 */
export async function getTotalsForDayRange(
  userId: string,
  startYmd: string,
  endYmd: string,
): Promise<DayTotalsRow[]> {
  const days = enumerateCalendarDays(startYmd, endYmd);
  const rows = await Promise.all(
    days.map(async (date) => ({
      date,
      totals: await getDailyTotals(userId, date),
    })),
  );
  return rows;
}

/** Last `dayCount` local calendar days ending at `endYmd` (inclusive). */
export async function getRollingDayTotals(
  userId: string,
  endYmd: string,
  dayCount: number,
): Promise<DayTotalsRow[]> {
  const startYmd = addCalendarDays(endYmd, -(dayCount - 1));
  return getTotalsForDayRange(userId, startYmd, endYmd);
}
