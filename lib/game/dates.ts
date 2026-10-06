// Datas como strings 'YYYY-MM-DD' (dia local). Tudo recebe a data por parâmetro.
const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

const fmt = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

export const addDays = (s: string, n: number) => fmt(parse(s) + n * DAY_MS);

export const daysBetween = (from: string, to: string) => Math.round((parse(to) - parse(from)) / DAY_MS);

/** Segunda-feira da semana que contém a data. */
export function weekStart(s: string): string {
  const dow = new Date(parse(s)).getUTCDay(); // 0 = domingo
  return addDays(s, -((dow + 6) % 7));
}
