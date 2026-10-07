import { REWARDS } from './actions';
import {
  armorClass, ATTRS, attrXpFromEvents, CON_XP_FACTOR, INT_XP_FACTOR, AttrEventRow, effectiveScore, modifier, proficiencyBonus, scoreFromXp, scoreProgress, workoutSplit,
} from './attributes';
import { addDays } from './dates';
import { bonusesFor, equipGear, GEAR, MAX_ATTUNED, toggleAttune, unequipGear, type Loadout } from './gear';
import { mealReward, studyReward, WATER_GOAL_BONUS, workoutReward } from './habits';
import { autoMissionDone, DayEvent, MISSIONS, pickDailyMissions } from './missions';
import { totalXp } from './xp';

describe('valor e modificador', () => {
  it('tabela de XP acumulado 8 a 20', () => {
    expect(scoreFromXp(0)).toBe(8);
    expect(scoreFromXp(99)).toBe(8);
    expect(scoreFromXp(100)).toBe(9);
    expect(scoreFromXp(250)).toBe(10);
    expect(scoreFromXp(1399)).toBe(13);
    expect(scoreFromXp(1400)).toBe(14);
    expect(scoreFromXp(6200)).toBe(20);
    expect(scoreFromXp(99999)).toBe(20);
    expect(scoreProgress(175)).toBeCloseTo(0.5);
    expect(scoreProgress(99999)).toBe(1);
  });
  it('modificador, proficiencia, valor efetivo e CA', () => {
    expect([8, 9, 10, 11, 12, 14, 20, 22].map(modifier)).toEqual([-1, -1, 0, 0, 1, 2, 5, 6]);
    expect([1, 4, 5, 8, 9, 13, 17, 30].map(proficiencyBonus)).toEqual([2, 2, 3, 3, 4, 5, 6, 6]);
    expect(effectiveScore(14, 3)).toBe(17);
    expect(effectiveScore(20, 3)).toBe(22);
    expect(effectiveScore(20, 6)).toBe(22);
    expect(armorClass(2, 3, 2)).toBe(17);
    expect(armorClass(-1, 0, 0)).toBe(9);
  });
});

describe('origem do XP', () => {
  it('treino por tipo; outro divide 50/50; treino rapido tem destino fixo', () => {
    expect(workoutSplit('musculacao')).toEqual({ forca: 1 });
    expect(workoutSplit('corrida')).toEqual({ destreza: 1 });
    expect(workoutSplit('caminhada')).toEqual({ destreza: 1 });
    expect(workoutSplit('alongamento')).toEqual({ destreza: 1 });
    expect(workoutSplit('outro')).toEqual({ forca: 0.5, destreza: 0.5 });
    expect(workoutSplit('outro', 'circuito')).toEqual({ forca: 1 });
    expect(workoutSplit('outro', 'hiit')).toEqual({ destreza: 1 });
    expect(workoutSplit(null)).toEqual({ forca: 1 }); // eventos sem tipo (antes da v2) eram Força
    expect(workoutReward(30, 'media', 'corrida').attr).toBe('destreza');
  });
  it('recalcula o historico: nome do treino rapido vale como id; energia e vitalidade viram Constituicao', () => {
    const rows: AttrEventRow[] = [
      { type: 'workout', attr: 'forca', xp: 24, kind: 'outro', name: 'Circuito em casa' }, // gravado antes da Etapa A
      { type: 'workout', attr: 'forca', xp: 40, kind: 'outro', name: 'HIIT' },
      { type: 'workout', attr: 'forca', xp: 30, kind: 'outro' }, // 15 + 15
      { type: 'workout', attr: 'forca', xp: 50, kind: 'corrida' },
      { type: 'water', attr: 'energia', xp: 300 },
      { type: 'meal', attr: 'vitalidade', xp: 200 },
      { type: 'mission', attr: 'constituicao', xp: 0 },
      { type: 'mission', attr: 'forca', xp: 30 },
      { type: 'study', attr: 'intelecto', xp: 100 },
    ];
    expect(attrXpFromEvents(rows)).toEqual({ forca: 24 + 15 + 30, destreza: 40 + 15 + 50, constituicao: Math.floor(500 * CON_XP_FACTOR), intelecto: Math.floor(100 * INT_XP_FACTOR) });
  });
  it('desfazer = tirar o evento: volta exatamente ao valor anterior', () => {
    const base: AttrEventRow[] = [{ type: 'workout', attr: 'forca', xp: 45, kind: 'outro' }, { type: 'water', attr: 'constituicao', xp: 5 }];
    const extra: AttrEventRow = { type: 'workout', attr: 'forca', xp: 33, kind: 'outro' };
    const before = attrXpFromEvents(base);
    const all = [...base, extra];
    expect(attrXpFromEvents(all).destreza).toBe(Math.floor((45 + 33) / 2)); // arredonda só o total, sem resto perdido por evento
    expect(attrXpFromEvents(all.filter((r) => r !== extra))).toEqual(before);
  });
  it('banco v4: XP acumulado do perfil (nivel + XP no nivel) bate com a soma dos eventos', () => {
    // perfil v4 real do aparelho: vitalidade nv 1 / 47 XP; forca nv 1 / 30; intelecto nv 1 / 28. E um perfil sintetico de nivel alto.
    expect(totalXp({ level: 1, xp: 47 })).toBe(47);
    expect(totalXp({ level: 3, xp: 10 })).toBe(100 + 283 + 10);
    const profile = { energia: { level: 3, xp: 10 }, vitalidade: { level: 1, xp: 47 } };
    const rows: AttrEventRow[] = [{ type: 'water', attr: 'energia', xp: 393 }, { type: 'meal', attr: 'vitalidade', xp: 12 }, { type: 'mission', attr: 'vitalidade', xp: 35 }];
    const fromProfile = Math.floor((totalXp(profile.energia) + totalXp(profile.vitalidade)) * CON_XP_FACTOR);
    expect(attrXpFromEvents(rows).constituicao).toBe(fromProfile);
  });
  it('missoes antigas de energia/vitalidade agora sao de Constituicao; alongar/caminhar sao de Destreza', () => {
    expect(MISSIONS.some((m) => (m.attr as string) === 'energia' || (m.attr as string) === 'vitalidade')).toBe(false);
    expect(MISSIONS.find((m) => m.id === 'forca-caminhada')!.attr).toBe('destreza');
    expect(new Set(MISSIONS.map((m) => m.attr))).toEqual(new Set(ATTRS));
  });
});

/** Usuario tipico com as recompensas reais: 3 treinos/semana de 45 XP, 8 copos, 2 refeicoes, 30 min de leitura, missoes automaticas. */
function simulate(days: number, mixed: boolean) {
  const rows: AttrEventRow[] = [];
  let n = 0;
  for (let d = 0; d < days; d++) {
    const date = addDays('2026-10-05', d);
    const t0 = new Date(2026, 9, 5 + d).getTime();
    const day: DayEvent[] = [];
    const add = (type: string, r: { attr: string; xp: number }, data: Record<string, unknown> | null = null, hour = 12) => {
      rows.push({ type, attr: r.attr, xp: r.xp, kind: (data?.kind as string) ?? null });
      day.push({ type, ref: (data?.slot as string) ?? null, ts: t0 + hour * 3600e3, data });
    };
    for (let c = 0; c < 8; c++) add('water', REWARDS.water, null, 8 + c * 1.5);
    add('water_goal', WATER_GOAL_BONUS);
    add('meal', mealReward('bom', ['verdura']), { slot: 'almoco', rating: 'bom', tags: ['verdura'] });
    add('meal', mealReward('ok', ['caseiro']), { slot: 'jantar', rating: 'ok', tags: ['caseiro'] });
    add('study', studyReward(30, 'leitura'), { kind: 'leitura', minutes: 30 });
    if ([0, 2, 4].includes(d % 7)) {
      const kind = mixed && n++ % 2 ? 'corrida' : 'musculacao';
      add('workout', workoutReward(30, 'media', kind), { kind, minutes: 30 }); // 30 min média = 45 XP
    }
    for (const m of pickDailyMissions(date)) if (m.auto && autoMissionDone(m.auto, day, 8)) rows.push({ type: 'mission', attr: m.attr, xp: m.xp });
  }
  const xp = attrXpFromEvents(rows);
  return Object.fromEntries(ATTRS.map((a) => [a, scoreFromXp(xp[a])]));
}

describe('ritmo (simulacao)', () => {
  it('so musculacao: ~10 em 2 semanas e ~14 em 3 meses', () => {
    expect(simulate(14, false)).toEqual({ forca: 10, destreza: 8, constituicao: 10, intelecto: 10 });
    const q = simulate(90, false);
    expect(q.forca).toBeGreaterThanOrEqual(14);
    expect(q.forca).toBeLessThanOrEqual(15);
    expect(q.constituicao).toBe(14);
    expect(q.intelecto).toBe(14);
  });
  it('misto Forca/Destreza: o mesmo esforco dividido sobe os dois mais devagar', () => {
    const w = simulate(14, true);
    expect([w.forca, w.destreza]).toEqual([9, 9]);
    const q = simulate(90, true);
    expect(q.forca).toBeGreaterThanOrEqual(12);
    expect(q.destreza).toBeGreaterThanOrEqual(12);
  });
});

describe('equipamentos', () => {
  const owned = GEAR.map((g) => g.id);
  it('catalogo: ~10 itens, ids unicos, lendarios com habilidade, CA so em armadura/escudo', () => {
    expect(GEAR.length).toBeGreaterThanOrEqual(10);
    expect(new Set(owned).size).toBe(GEAR.length);
    for (const g of GEAR) {
      expect(!!g.ability).toBe(g.rarity === 'lendario');
      if (g.ac) expect(['armadura', 'escudo']).toContain(g.slot);
    }
  });
  it('um por slot (troca), maximo de 3 sintonizados, so o que possui', () => {
    // Etapa E: equipa os 5 slots; sintoniza sozinho enquanto houver vaga (antes, o 4º item era recusado)
    let l: Loadout = { equipped: {}, attuned: [] };
    for (const id of ['gladio-bronze', 'linotorax', 'hoplon', 'anel-giges']) {
      const r = equipGear(l, owned, id);
      if (!r.ok) throw new Error(r.reason);
      l = r.loadout;
    }
    expect(Object.keys(l.equipped)).toHaveLength(4);
    expect(l.attuned).toEqual(['arma', 'armadura', 'escudo']);
    expect(toggleAttune(l, 'anel')).toEqual({ ok: false, reason: 'limite' });
    const swap = equipGear(l, owned, 'lanca-pelion');
    expect(swap.ok && swap.loadout.equipped.arma).toBe('lanca-pelion');
    expect(swap.ok && swap.loadout.attuned).toHaveLength(MAX_ATTUNED); // a vaga do gládio passa para a lança
    expect(equipGear(l, [], 'gladio-bronze')).toEqual({ ok: false, reason: 'nao_possui' });
    expect(equipGear(l, owned, 'xyz')).toEqual({ ok: false, reason: 'inexistente' });
    const off = unequipGear(l, 'escudo');
    expect(off.attuned).toHaveLength(MAX_ATTUNED - 1);
    const on = toggleAttune(off, 'anel');
    expect(on.ok && on.loadout.attuned).toContain('anel');
    // equipado sem sintonia: CA sim, atributo e habilidade não
    const b = bonusesFor(l.equipped, ['arma']);
    expect(b.attrs).toEqual({ forca: 1, destreza: 0, constituicao: 0, intelecto: 0 });
    expect([b.armor, b.shield, b.relics]).toEqual([1, 2, []]);
  });
  it('bonusesFor soma atributo por raridade e separa armadura e escudo', () => {
    const b = bonusesFor({ arma: 'arco-teixo', armadura: 'couraca-musculada', escudo: 'escudo-perseu' });
    expect(b.attrs).toEqual({ forca: 0, destreza: 5, constituicao: 3, intelecto: 0 });
    expect(armorClass(modifier(14), b.armor, b.shield)).toBe(10 + 2 + 3 + 2);
  });
});
