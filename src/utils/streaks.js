const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Computes the current day-streak and week-streak from a user's workout
// logs. The day-streak tolerates a split's scheduled rest days — a missed
// rest day doesn't break it, only a missed training day does. Shared
// between TodayPage's ConsistencyCard and StatsPage so the two pages can
// never disagree on the same underlying data.
export function computeStreak(logs, activeSplit) {
  if (!activeSplit) return { streakDays: 0, streakWeeks: 0 };

  const sortedSplitDays = [...(activeSplit.days || [])].sort((a, b) => (a.dayOrder ?? 8) - (b.dayOrder ?? 8));
  const allRest = sortedSplitDays.length === 0 || sortedSplitDays.every((d) => d.isRest);
  // Splits using real weekday names ("Monday", "Tuesday"...) can trust a
  // missing weekday means rest. Cycle-based splits (custom names like
  // "Day A"/"Day B", unrelated to calendar weekday) can't be matched by
  // name at all, so they fall back to the original sequential/modulo
  // placement — the only way to tell if a cycle day was scheduled.
  const hasWeekdayAnchor = sortedSplitDays.some((d) => DAY_NAMES.some((wd) => d.name.trim().toLowerCase() === wd.toLowerCase()));
  function isScheduledRestDay(dateObj) {
    if (allRest) return false;
    const dayNameMatch = DAY_NAMES[dateObj.getDay()].toLowerCase();
    const idx = sortedSplitDays.findIndex((d) => d.name.toLowerCase().startsWith(dayNameMatch));
    if (idx !== -1) return !!sortedSplitDays[idx].isRest;
    if (hasWeekdayAnchor) return true; // no day scheduled for this weekday — treat as rest
    const modIdx = dateObj.getDay() % sortedSplitDays.length; // cycle-based split — original behavior
    return !!sortedSplitDays[modIdx].isRest;
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const logsByDate = new Map();
  (logs || []).forEach((l) => logsByDate.set(l.date, true));

  function getISOWeekString(dateObj) {
    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return `${d.getFullYear()}-W${1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)}`;
  }

  const logsByWeek = new Map();
  (logs || []).forEach((l) => {
    const ws = getISOWeekString(new Date(l.date));
    logsByWeek.set(ws, (logsByWeek.get(ws) || 0) + 1);
  });

  let streakWeeks = 0;
  let checkDate = new Date(now);
  let checkWeekStr = getISOWeekString(checkDate);
  if ((logsByWeek.get(checkWeekStr) || 0) > 0) {
    streakWeeks++;
  }
  checkDate.setDate(checkDate.getDate() - 7);
  checkWeekStr = getISOWeekString(checkDate);
  while ((logsByWeek.get(checkWeekStr) || 0) > 0) {
    streakWeeks++;
    checkDate.setDate(checkDate.getDate() - 7);
    checkWeekStr = getISOWeekString(checkDate);
  }

  let streakDays = 0;
  let dDay = new Date(now);
  let checkDayStr = todayStr;
  if (logsByDate.has(checkDayStr)) {
    streakDays++;
  }
  dDay.setDate(dDay.getDate() - 1);
  checkDayStr = dDay.toISOString().slice(0, 10);
  for (let guard = 0; guard < 3650; guard++) {
    if (logsByDate.has(checkDayStr)) {
      streakDays++;
    } else if (!isScheduledRestDay(dDay)) {
      break;
    }
    dDay.setDate(dDay.getDate() - 1);
    checkDayStr = dDay.toISOString().slice(0, 10);
  }

  return { streakDays, streakWeeks };
}
