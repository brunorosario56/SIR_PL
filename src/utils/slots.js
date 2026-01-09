function parseTimeToMinutes(hhmm) {
  if (typeof hhmm !== 'string') return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

function formatMinutesToTime(totalMinutes) {
  const clamped = Math.max(0, Math.min(24 * 60, totalMinutes));
  const hours = String(Math.floor(clamped / 60)).padStart(2, '0');
  const minutes = String(clamped % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function mergeIntervals(intervals) {
  const sorted = (intervals || [])
    .filter((i) => i && Number.isFinite(i.start) && Number.isFinite(i.end) && i.start < i.end)
    .sort((a, b) => a.start - b.start);

  const merged = [];
  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (!last || current.start > last.end) {
      merged.push({ start: current.start, end: current.end });
      continue;
    }
    last.end = Math.max(last.end, current.end);
  }
  return merged;
}

function invertBusyToFree(busyMerged, dayStart, dayEnd) {
  const free = [];
  let cursor = dayStart;

  for (const interval of busyMerged) {
    if (interval.start > cursor) {
      free.push({ start: cursor, end: interval.start });
    }
    cursor = Math.max(cursor, interval.end);
  }

  if (cursor < dayEnd) {
    free.push({ start: cursor, end: dayEnd });
  }

  return free;
}

function intersectIntervalSets(a, b) {
  const result = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    const start = Math.max(a[i].start, b[j].start);
    const end = Math.min(a[i].end, b[j].end);

    if (start < end) {
      result.push({ start, end });
    }

    if (a[i].end < b[j].end) i += 1;
    else j += 1;
  }

  return result;
}

export function computeCommonFreeSlots({ members, schedules, dayStart = '08:00', dayEnd = '22:00' }) {
  const startMinutes = parseTimeToMinutes(dayStart);
  const endMinutes = parseTimeToMinutes(dayEnd);
  if (startMinutes == null || endMinutes == null || startMinutes >= endMinutes) {
    throw new Error('Invalid dayStart/dayEnd bounds');
  }

  const memberIds = (members || []).map((m) => m.toString());
  const schedulesByUser = new Map();
  for (const s of schedules || []) {
    if (!s?.user) continue;
    schedulesByUser.set(s.user.toString(), s);
  }

  const output = [];

  for (let diaSemana = 1; diaSemana <= 7; diaSemana += 1) {
    let common = [{ start: startMinutes, end: endMinutes }];

    for (const memberId of memberIds) {
      const schedule = schedulesByUser.get(memberId);
      const blocos = Array.isArray(schedule?.blocos) ? schedule.blocos : [];

      const busyIntervals = [];
      for (const bloco of blocos) {
        if (Number(bloco?.diaSemana) !== diaSemana) continue;

        const start = parseTimeToMinutes(bloco?.horaInicio);
        const end = parseTimeToMinutes(bloco?.horaFim);
        if (start == null || end == null || start >= end) continue;

        const clampedStart = Math.max(startMinutes, start);
        const clampedEnd = Math.min(endMinutes, end);
        if (clampedStart < clampedEnd) {
          busyIntervals.push({ start: clampedStart, end: clampedEnd });
        }
      }

      const mergedBusy = mergeIntervals(busyIntervals);
      const free = invertBusyToFree(mergedBusy, startMinutes, endMinutes);
      common = intersectIntervalSets(common, free);

      if (common.length === 0) break;
    }

    for (const slot of common) {
      output.push({
        diaSemana,
        inicio: formatMinutesToTime(slot.start),
        fim: formatMinutesToTime(slot.end),
      });
    }
  }

  return output;
}
