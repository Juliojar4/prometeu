import { ACHIEVEMENTS, emptyStats, newlyUnlocked } from './achievements';
import { applyChanges } from './actions';
import { ATTRS, initialAttributes, mostEvolved } from './attributes';
import { newBoss } from './boss';
import { addDays } from './dates';
import { clampPages, clampStudyMinutes, MAX_PAGES_BONUS, MAX_STUDY_COINS, MAX_STUDY_DAMAGE, MAX_STUDY_MIN, studyReward, studyXp, summarizeBooks } from './habits';
import { autoMissionDone, MISSIONS, pickDailyMissions } from './missions';
import { computeStreak, DayRecord, isActiveDay, pillarsDone, STUDY_PILLAR_MIN } from './streak';

const d = (date: string, o: Partial<DayRecord> = {}): DayRecord => ({ date, water: 0, waterGoal: 8, workout: false, meals: 0, study: 0, ...o });
const st = (kind: string, minutes: number, extra: Record<string, unknown> = {}, ts = 1) => ({ type: 'study', ref: null, ts, data: { kind, minutes, ...extra } });

describe('intelecto', () => {
  it('e o quarto atributo e nasce no nivel 1', () => {
    expect(ATTRS).toHaveLength(4);
    expect(initialAttributes().intelecto).toEqual({ level: 1, xp: 0 });
  });
  it('mostEvolved considera os 4 atributos', () => {
    const a = initialAttributes();
    expect(mostEvolved(a, { ...a, intelecto: { level: 1, xp: 40 } })).toBe('intelecto');
    expect(mostEvolved(a, { ...a, forca: { level: 2, xp: 0 }, intelecto: { level: 1, xp: 40 } })).toBe('forca');
  });
});

describe('xp de estudo', () => {
  it('minutos x multiplicador do tipo', () => {
    expect(studyXp(30, 'leitura')).toBe(30);
    expect(studyXp(25, 'estudo')).toBe(30);
    expect(studyXp(25, 'idioma')).toBe(30);
    expect(studyXp(20, 'revisao')).toBe(20);
    expect(studyXp(20, 'outro')).toBe(20);
  });
  it('paginas dao +1 XP a cada 10, com teto, so na leitura', () => {
    expect(studyXp(30, 'leitura', 25)).toBe(32);
    expect(studyXp(30, 'leitura', 9)).toBe(30);
    expect(studyXp(30, 'leitura', 5000)).toBe(30 + MAX_PAGES_BONUS);
    expect(studyXp(30, 'estudo', 100)).toBe(36);
  });
  it('limita minutos e paginas', () => {
    expect(clampStudyMinutes(0)).toBe(1);
    expect(clampStudyMinutes(999)).toBe(MAX_STUDY_MIN);
    expect(clampStudyMinutes(NaN)).toBe(1);
    expect(clampPages(-3)).toBe(0);
  });
  it('recompensa vai para Intelecto, com teto de moedas e dano', () => {
    const r = studyReward(25, 'leitura', 0);
    expect(r).toEqual({ xp: 25, coins: 6, attr: 'intelecto', bossDamage: 13 });
    const big = studyReward(240, 'idioma', 0);
    expect(big.coins).toBe(MAX_STUDY_COINS);
    expect(big.bossDamage).toBe(MAX_STUDY_DAMAGE);
  });
  it('aplicar e desfazer devolve XP geral, do atributo, moedas e dano', () => {
    const s = { level: 1, xp: 0, coins: 0, attrs: initialAttributes(), boss: newBoss('2026-10-06', 1) };
    const r = studyReward(30, 'leitura');
    const { state, applied } = applyChanges(s, [], [r]);
    expect(state.attrs.intelecto.xp).toBe(30);
    expect(state.boss.hp).toBe(s.boss.maxHp - 15);
    expect(applyChanges(state, applied, []).state).toEqual(s);
  });
});

describe('pilar de estudo e streak', () => {
  it('estudar 10 min e o quarto pilar', () => {
    expect(pillarsDone(d('2026-01-01', { study: 9 }))).toBe(0);
    expect(pillarsDone(d('2026-01-01', { study: STUDY_PILLAR_MIN }))).toBe(1);
    expect(pillarsDone(d('2026-01-01', { workout: true, study: 30 }))).toBe(2);
    expect(pillarsDone(d('2026-01-01', { water: 8, workout: true, meals: 2, study: 10 }))).toBe(4);
  });
  it('dia ativo continua sendo 2 pilares, agora qualquer 2 de 4', () => {
    expect(isActiveDay(d('2026-01-01', { workout: true, study: 15 }))).toBe(true);
    expect(isActiveDay(d('2026-01-01', { study: 15 }))).toBe(false);
  });
  it('dias antigos sem o campo study seguem validos (streak e escudos intactos)', () => {
    const old = Array.from({ length: 8 }, (_, i) => ({ date: addDays('2026-01-01', i), water: 8, waterGoal: 8, workout: true, meals: 0 }));
    const s = computeStreak(old, '2026-01-01', '2026-01-08');
    expect(s.streak).toBe(8);
    expect(s.shields).toBe(1);
  });
  it('estudo + treino mantem a chama sem agua nem comida', () => {
    const days = [0, 1, 2].map((i) => d(addDays('2026-01-01', i), { workout: true, study: 20 }));
    expect(computeStreak(days, '2026-01-01', '2026-01-03').streak).toBe(3);
  });
});

describe('livros', () => {
  it('agrupa por titulo, soma paginas/minutos e ordena pela ultima leitura', () => {
    const ev = [
      { ...st('leitura', 20, { title: 'A Odisseia', pages: 15 }, 100) },
      { ...st('leitura', 30, { title: 'a odisseia', pages: 25 }, 300) },
      { ...st('leitura', 10, { title: 'Ilíada', pages: 5 }, 200) },
      { ...st('estudo', 40, { title: 'Grego' }, 400) },
      { ...st('leitura', 10, {}, 500) },
      { type: 'water', ref: null, ts: 600, data: null },
    ];
    const b = summarizeBooks(ev);
    expect(b.map((x) => x.title)).toEqual(['a odisseia', 'Ilíada']);
    expect(b[0]).toMatchObject({ pages: 40, minutes: 50, sessions: 2, last: 300 });
  });
});

describe('missoes de estudo', () => {
  it('ha pelo menos 8 de Intelecto e o banco passou de 40', () => {
    expect(MISSIONS.filter((m) => m.attr === 'intelecto').length).toBeGreaterThanOrEqual(8);
    expect(MISSIONS.length).toBeGreaterThanOrEqual(41);
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(MISSIONS.length);
  });
  it('automaticas usam minutos e paginas dos eventos; reverter o evento desfaz', () => {
    const rule = (id: string) => MISSIONS.find((m) => m.id === id)!.auto;
    expect(autoMissionDone(rule('int-estudar25'), [st('estudo', 25)], 8)).toBe(true);
    expect(autoMissionDone(rule('int-estudar25'), [st('estudo', 10), st('leitura', 15)], 8)).toBe(true);
    expect(autoMissionDone(rule('int-estudar25'), [st('estudo', 24)], 8)).toBe(false);
    expect(autoMissionDone(rule('int-estudar25'), [], 8)).toBe(false);
    expect(autoMissionDone(rule('int-ler10'), [st('leitura', 20, { pages: 6 }), st('leitura', 5, { pages: 4 })], 8)).toBe(true);
    expect(autoMissionDone(rule('int-ler10'), [st('estudo', 60, { pages: 50 })], 8)).toBe(false);
    expect(autoMissionDone(rule('int-idioma'), [st('idioma', 15)], 8)).toBe(true);
    expect(autoMissionDone(rule('int-idioma'), [st('estudo', 60)], 8)).toBe(false);
  });
  it('manuais existem e o sorteio segue deterministico (3 distintas)', () => {
    expect(MISSIONS.filter((m) => m.attr === 'intelecto' && !m.auto).length).toBeGreaterThanOrEqual(2);
    const a = pickDailyMissions('2026-10-07');
    expect(pickDailyMissions('2026-10-07').map((m) => m.id)).toEqual(a.map((m) => m.id));
    expect(new Set(a.map((m) => m.id)).size).toBe(3);
  });
});

describe('conquistas de estudo', () => {
  it('ha pelo menos 6 novas e desbloqueiam pelos criterios', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(34);
    const s = { ...emptyStats(), studySessions: 1, studyMinutes: 600, pages: 500, books: 3, longestStudy: 45, intelectoLevel: 5 };
    expect(newlyUnlocked(s, []).map((a) => a.id)).toEqual(expect.arrayContaining(['primeira-sessao', 'dez-horas', 'rato-de-biblioteca', 'tres-livros', 'foco-profundo', 'intelecto-5']));
    expect(newlyUnlocked({ ...s, studyMinutes: 599 }, []).map((a) => a.id)).not.toContain('dez-horas');
  });
});
