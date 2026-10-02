/**
 * Custom Date Formatter with support for pattern tokens:
 * D, DD, Do (1st, 2nd, 23rd), ddd, dddd, MMM, MMMM, MM, M, YYYY, YY
 */

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

export function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return `${day}th`;
  }
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/**
 * Formats a Date or date string according to a pattern (e.g. "Do MMM YYYY")
 */
export function formatDatePattern(dateInput: Date | string, pattern: string = 'Do MMM YYYY'): string {
  let date: Date;
  if (typeof dateInput === 'string') {
    if (!dateInput) return '';
    // If YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      date = new Date(`${dateInput}T12:00:00Z`);
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = dateInput;
  }

  if (isNaN(date.getTime())) return String(dateInput);

  const day = date.getUTCDate();
  const dayOfWeek = date.getUTCDay();
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();

  let formatted = pattern;

  // Replace tokens from longest to shortest to avoid partial replacements
  const replacements: Array<[string, string]> = [
    ['dddd', DAY_NAMES_LONG[dayOfWeek]],
    ['ddd', DAY_NAMES_SHORT[dayOfWeek]],
    ['MMMM', MONTH_NAMES_LONG[month]],
    ['MMM', MONTH_NAMES_SHORT[month]],
    ['MM', String(month + 1).padStart(2, '0')],
    ['Do', getOrdinalSuffix(day)],
    ['DD', String(day).padStart(2, '0')],
    ['D', String(day)],
    ['YYYY', String(year)],
    ['YY', String(year).slice(-2)],
  ];

  for (const [token, value] of replacements) {
    formatted = formatted.replace(new RegExp(token, 'g'), value);
  }

  return formatted;
}
