function formatUsingIntlWib(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value || '00';
  return `${get('day')}/${get('month')}/${get('year')}, ${get('hour')}:${get('minute')}:${get('second')} WIB`;
}

function parseSqlLikeToUtcDate(text: string): Date | null {
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d{1,6})?$/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second = '00'] = match;
  // Treat SQL-like datetimes (no timezone) as UTC timestamps coming from the server,
  // then convert to Asia/Jakarta for display. This avoids showing times that look
  // offset-wrong on clients in WIB.
  const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  return Number.isNaN(utcDate.getTime()) ? null : utcDate;
}

function formatSqlLikeAsWibString(text: string): string | null {
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d{1,6})?$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = '00'] = match;
  // The database stores DATETIME without timezone (server local). Treat it as
  // already in local WIB and display the same clock time with WIB label.
  return `${day}/${month}/${year}, ${hour}:${minute}:${second} WIB`;
}

export function formatDateTimeWib(value: string | Date): string {
  if (value instanceof Date) {
    return formatUsingIntlWib(value);
  }

  const text = String(value || '').trim();
  if (!text) return '-';

  // ISO strings with explicit timezone must be converted normally to WIB.
  if (/z$/i.test(text) || /[+-]\d{2}:?\d{2}$/.test(text)) {
    const zonedDate = new Date(text);
    if (!Number.isNaN(zonedDate.getTime())) {
      return formatUsingIntlWib(zonedDate);
    }
  }

  // SQL datetime text has no timezone. Assume it's server-local (WIB) and
  // format directly to avoid adding/subtracting timezone offsets.
  const sqlFormatted = formatSqlLikeAsWibString(text);
  if (sqlFormatted) return sqlFormatted;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return formatUsingIntlWib(date);
}

export function formatDateWib(value: string | Date): string {
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(value);
  }

  const text = String(value || '').trim();
  if (!text) return '-';

  // For SQL-like date/time strings, take only date part to avoid timezone shifts.
  const sqlMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (sqlMatch) {
    const [, year, month, day] = sqlMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatSqlDateTimeAsWib(value: string | Date): string {
  if (value instanceof Date) {
    return formatUsingIntlWib(value);
  }

  const text = String(value || '').trim();
  if (!text) return '-';

  // ISO strings with explicit timezone must be converted to WIB.
  if (/z$/i.test(text) || /[+-]\d{2}:?\d{2}$/.test(text)) {
    const zonedDate = new Date(text);
    if (!Number.isNaN(zonedDate.getTime())) {
      return formatUsingIntlWib(zonedDate);
    }
  }

  const sqlFormatted = formatSqlLikeAsWibString(text);
  if (sqlFormatted) return sqlFormatted;

  return formatDateTimeWib(text);
}

// Backward-compatible alias used in several components.
export const formatDateTimeAsWib = formatSqlDateTimeAsWib;
