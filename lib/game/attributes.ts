import { applyXp, Progress, removeXp, xpForNextLevel } from './xp';

export type Attr = 'forca' | 'vitalidade' | 'energia' | 'intelecto';
export type Attributes = Record<Attr, Progress>;

export const ATTRS: Attr[] = ['forca', 'vitalidade', 'energia', 'intelecto'];
export const ATTR_LABEL: Record<Attr, string> = { forca: 'Força', vitalidade: 'Vitalidade', energia: 'Energia', intelecto: 'Intelecto' };


export const initialAttributes = (): Attributes => ({
  forca: { level: 1, xp: 0 },
  vitalidade: { level: 1, xp: 0 },
  energia: { level: 1, xp: 0 },
  intelecto: { level: 1, xp: 0 },
});

export function addAttrXp(a: Attributes, attr: Attr, xp: number): { attrs: Attributes; levelsGained: number } {
  const { levelsGained, ...next } = applyXp(a[attr], xp);
  return { attrs: { ...a, [attr]: next }, levelsGained };
}

export const removeAttrXp = (a: Attributes, attr: Attr, xp: number): Attributes => ({ ...a, [attr]: removeXp(a[attr], xp) });

/** Atributo que mais evoluiu entre dois retratos (níveis e XP somados em XP total aproximado). Base do futuro Wrapped. */
export function mostEvolved(before: Attributes, after: Attributes): Attr {
  const total = (p: Progress) => { let t = p.xp; for (let l = 1; l < p.level; l++) t += xpForNextLevel(l); return t; };
  return ATTRS.reduce((best, a) => (total(after[a]) - total(before[a]) > total(after[best]) - total(before[best]) ? a : best), ATTRS[0]);
}
