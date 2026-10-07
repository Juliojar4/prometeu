import { activeFx, attrXpFromEvents, AttrEventRow, bossCombat, bossInfoForWeek, bossMaxHp, chargeBalance, ChargeRow, CON_XP_FACTOR, expectedDamage, heroStats, INT_XP_FACTOR, rescaleBoss, SpentRow, totalXp } from '../game';
import { MIGRATIONS } from './migrations';
import { ATTR_XP_SQL, CHARGES_SQL, SPARKS_SPENT_SQL, SPENT_SQL } from './repos';

// SQLite do próprio Node (mesmo motor do expo-sqlite) para rodar as migrations de verdade.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- sem @types/node no projeto
const { DatabaseSync } = require('node:sqlite');

describe('migration v5 sobre um banco v4 com dados', () => {
  it('não perde nada e os atributos derivados batem com o perfil antigo', () => {
    const db = new DatabaseSync(':memory:');
    MIGRATIONS.slice(0, 4).forEach((m) => db.exec(m));
    db.exec(`INSERT INTO profile (id, name, avatar, created_date, level, xp, coins, forca_level, forca_xp, vitalidade_level, vitalidade_xp, energia_level, energia_xp, intelecto_level, intelecto_xp)
      VALUES (1, 'Taste', 'raposa', '2026-10-06', 2, 5, 42, 1, 75, 1, 47, 1, 25, 1, 28)`);
    db.exec(`INSERT INTO events (ts, date, type, ref, xp, coins, attr, boss_damage, data) VALUES
      (1, '2026-10-06', 'meal', 'almoco', 12, 4, 'vitalidade', 7, '{"rating":"ok","tags":[]}'),
      (2, '2026-10-06', 'mission', 'vit-fruta', 35, 8, 'vitalidade', 15, '{"auto":true}'),
      (3, '2026-10-06', 'mission', 'forca-caminhada', 30, 8, 'forca', 15, NULL),
      (4, '2026-10-06', 'study', NULL, 28, 7, 'intelecto', 14, '{"kind":"leitura","minutes":25,"pages":35}'),
      (5, '2026-10-06', 'water', NULL, 5, 2, 'energia', 5, NULL),
      (6, '2026-10-06', 'water_goal', NULL, 20, 5, 'energia', 15, NULL),
      (7, '2026-10-06', 'workout', NULL, 45, 11, 'forca', 23, '{"kind":"outro","minutes":30,"intensity":"media","name":"HIIT"}')`);
    const dump = () => ['profile', 'events', 'days', 'daily_missions', 'boss_weeks', 'inventory', 'achievements', 'settings']
      .map((tb) => JSON.stringify(db.prepare(`SELECT * FROM ${tb}`).all()));
    const before = dump();

    db.exec(MIGRATIONS[4]);
    expect(dump()).toEqual(before);
    expect(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('gear_inventory', 'gear_equipped')").get().n).toBe(2);

    const attrs = attrXpFromEvents(db.prepare(ATTR_XP_SQL).all() as AttrEventRow[]);
    const p = db.prepare('SELECT * FROM profile').get();
    const acc = (k: string) => totalXp({ level: p[`${k}_level`], xp: p[`${k}_xp`] });
    expect(attrs.constituicao).toBe(Math.floor((acc('energia') + acc('vitalidade')) * CON_XP_FACTOR)); // (25 + 47) x fator
    expect(attrs.forca).toBe(30); // HIIT gravado antes da Etapa A (só o nome) vai para Destreza
    expect(attrs.destreza).toBe(45);
    expect(attrs.forca + attrs.destreza).toBe(acc('forca'));
    expect(attrs.intelecto).toBe(Math.floor(acc('intelecto') * INT_XP_FACTOR));
  });
});

describe('migration v6 (combate) sobre um banco v5 com dados', () => {
  it('é aditiva: preserva eventos, dano passivo e o HP do chefão; eventos antigos não geram cargas', () => {
    const db = new DatabaseSync(':memory:');
    MIGRATIONS.slice(0, 5).forEach((m) => db.exec(m));
    db.exec(`INSERT INTO profile (id, name, avatar, created_date, level, xp, coins) VALUES (1, 'Taste', 'raposa', '2026-10-06', 2, 5, 42)`);
    db.exec(`INSERT INTO boss_weeks (week_start, name, max_hp, hp) VALUES ('2026-10-05', 'Minotauro', 400, 334)`);
    db.exec(`INSERT INTO events (ts, date, type, ref, xp, coins, attr, boss_damage, data) VALUES
      (1, '2026-10-06', 'meal', 'almoco', 12, 4, 'constituicao', 7, '{"rating":"ok","tags":[]}'),
      (2, '2026-10-06', 'study', NULL, 28, 7, 'intelecto', 14, '{"kind":"leitura","minutes":25}')`);
    const dump = () => ['profile', 'events', 'days', 'boss_weeks', 'inventory', 'achievements', 'settings', 'gear_inventory', 'gear_equipped']
      .map((tb) => JSON.stringify(db.prepare(`SELECT * FROM ${tb}`).all().map((r: Record<string, unknown>) => { const { charges: _, ...rest } = r; return rest; })));
    const before = dump();

    db.exec(MIGRATIONS[5]);
    expect(MIGRATIONS.length).toBeGreaterThanOrEqual(6); // v7+ (Etapa C) vieram depois
    expect(dump()).toEqual(before);
    expect(db.prepare('SELECT hp, max_hp FROM boss_weeks').get()).toEqual({ hp: 334, max_hp: 400 });
    expect(db.prepare('SELECT SUM(boss_damage) AS d, SUM(charges) AS c FROM events').get()).toEqual({ d: 21, c: 0 });

    // evento novo com cargas, uma rodada gasta e o saldo derivado
    db.exec(`INSERT INTO events (ts, date, type, xp, coins, attr, boss_damage, charges, data) VALUES (3, '2026-10-07', 'study', 30, 8, 'intelecto', 0, 2, '{"kind":"estudo","minutes":30}')`);
    db.exec(`INSERT INTO combat_rounds (idx, ts, date, week_start, attr, d20, total, hit, crit, damage, boss_hp, boss_d20, boss_total, boss_hit, boss_damage, hero_hp)
      VALUES (0, 4, '2026-10-07', '2026-10-05', 'intelecto', 15, 17, 1, 0, 5, 329, 8, 10, 1, 2, 13)`);
    const spent = db.prepare('SELECT week_start AS week, attr, COUNT(*) AS n FROM combat_rounds GROUP BY 1, 2').all() as SpentRow[];
    expect(chargeBalance(db.prepare(CHARGES_SQL).all() as ChargeRow[], spent, '2026-10-05').intelecto).toBe(1);
    // excluir a sessão depois de gastar: dívida, e o dano da rodada fica
    db.exec('DELETE FROM events WHERE ts = 3');
    expect(chargeBalance(db.prepare(CHARGES_SQL).all() as ChargeRow[], spent, '2026-10-05').intelecto).toBe(-1);
    expect(chargeBalance(db.prepare(CHARGES_SQL).all() as ChargeRow[], spent, '2026-10-12').intelecto).toBe(-1);
  });
});

describe('migration v7 (classes) sobre um banco v6 com dados', () => {
  const setup = () => {
    const db = new DatabaseSync(':memory:');
    MIGRATIONS.slice(0, 6).forEach((m) => db.exec(m));
    db.exec(`INSERT INTO profile (id, name, avatar, created_date, level, xp, coins) VALUES (1, 'Taste', 'raposa', '2026-10-06', 2, 5, 42)`);
    // semana corrente aberta na escala antiga, uma semana antiga também antiga e uma já na escala nova
    db.exec(`INSERT INTO boss_weeks (week_start, name, max_hp, hp) VALUES ('2026-10-05', 'Minotauro', 400, 334), ('2026-09-28', 'Hidra', 400, 120), ('2026-09-21', 'Harpias', 52, 0)`);
    db.exec(`INSERT INTO combat_rounds (idx, ts, date, week_start, attr, d20, total, hit, crit, damage, boss_hp, boss_d20, boss_total, boss_hit, boss_damage, hero_hp)
      VALUES (0, 1, '2026-09-24', '2026-09-21', 'forca', 15, 16, 1, 0, 3, 0, NULL, NULL, 0, 0, 10)`);
    return db;
  };

  it('é aditiva: classe vazia (escolha pendente), rodadas antigas intactas e só chefões da escala antiga marcados', () => {
    const db = setup();
    const before = JSON.stringify(db.prepare('SELECT * FROM combat_rounds').all());
    db.exec(MIGRATIONS[6]);
    expect(db.prepare('SELECT class, class_changed, coins FROM profile').get()).toEqual({ class: null, class_changed: null, coins: 42 });
    const rounds = db.prepare('SELECT * FROM combat_rounds').all() as Record<string, unknown>[];
    expect(JSON.stringify(rounds.map(({ hero_class: _a, talent: _b, heal: _c, ...r }) => r))).toBe(before);
    expect(rounds[0]).toMatchObject({ hero_class: null, talent: null, heal: 0 });
    expect(db.prepare('SELECT week_start, legacy_hp FROM boss_weeks ORDER BY week_start').all().map((r: { legacy_hp: number }) => r.legacy_hp)).toEqual([0, 1, 1]);
    // o Segundo fôlego não gasta carga (SPENT_SQL é o atual, que também lê a coluna `spell` da v8)
    db.exec(MIGRATIONS[7]);
    db.exec(`INSERT INTO combat_rounds (idx, ts, date, week_start, attr, d20, total, hit, crit, damage, boss_hp, boss_d20, boss_total, boss_hit, boss_damage, hero_hp, talent, heal)
      VALUES (1, 2, '2026-10-06', '2026-10-05', 'forca', 0, 0, 0, 0, 0, 334, 9, 11, 0, 0, 10, 'folego', 6)`);
    expect(db.prepare(SPENT_SQL).all()).toEqual([{ week: '2026-09-21', attr: 'forca', n: 1 }]);
  });

  it('reescala o chefão da semana corrente uma única vez, mantendo a fração de vida', () => {
    const db = setup();
    db.exec(MIGRATIONS[6]);
    const week = '2026-10-05';
    const hero = heroStats(2, { forca: 30, destreza: 0, constituicao: 9, intelecto: 16 });
    const max = bossMaxHp(week, expectedDamage(hero, bossCombat(bossInfoForWeek(week), 2)));
    const row = db.prepare('SELECT * FROM boss_weeks WHERE week_start = ?').get(week);
    const scaled = rescaleBoss({ weekStart: week, name: row.name, maxHp: row.max_hp, hp: row.hp }, max);
    expect(max).toBeLessThan(100);
    expect(scaled.hp).toBe(Math.round((334 * max) / 400));
    // mesmo UPDATE condicional do repo (rescaleLegacyBoss): a segunda chamada não muda nada
    const run = (b: typeof scaled) => db.prepare('UPDATE boss_weeks SET max_hp = ?, hp = ?, legacy_hp = 0 WHERE week_start = ? AND legacy_hp = 1').run(b.maxHp, b.hp, b.weekStart).changes;
    expect(run(scaled)).toBe(1);
    expect(run(rescaleBoss(scaled, max))).toBe(0);
    expect(db.prepare('SELECT max_hp, hp, legacy_hp FROM boss_weeks WHERE week_start = ?').get(week)).toEqual({ max_hp: max, hp: scaled.hp, legacy_hp: 0 });
    // semanas encerradas ficam como estavam
    expect(db.prepare("SELECT max_hp, hp FROM boss_weeks WHERE week_start = '2026-09-28'").get()).toEqual({ max_hp: 400, hp: 120 });
  });
});

describe('migration v8 (magias) sobre um banco v7 com dados', () => {
  it('é aditiva; rodadas de magia gastam centelhas e não cargas; efeitos ativos saem do log do dia', () => {
    const db = new DatabaseSync(':memory:');
    MIGRATIONS.slice(0, 7).forEach((m) => db.exec(m));
    db.exec(`INSERT INTO profile (id, name, avatar, created_date, level, xp, coins, class) VALUES (1, 'Taste', 'raposa', '2026-10-06', 3, 5, 42, 'filosofo')`);
    db.exec(`INSERT INTO combat_rounds (idx, ts, date, week_start, attr, d20, total, hit, crit, damage, boss_hp, boss_d20, boss_total, boss_hit, boss_damage, hero_hp, hero_class)
      VALUES (0, 1, '2026-10-06', '2026-10-05', 'forca', 15, 16, 1, 0, 3, 50, 4, 6, 0, 0, 10, 'filosofo')`);
    const before = JSON.stringify(db.prepare('SELECT * FROM combat_rounds').all());
    db.exec(MIGRATIONS[7]);
    expect(MIGRATIONS.length).toBeGreaterThanOrEqual(8); // v9 (Etapa E) veio depois
    expect(db.prepare('SELECT spells, spells_swapped, class FROM profile').get()).toEqual({ spells: null, spells_swapped: null, class: 'filosofo' });
    const rounds = db.prepare('SELECT * FROM combat_rounds').all() as Record<string, unknown>[];
    expect(JSON.stringify(rounds.map(({ spell: _a, spell_cost: _b, spell_ok: _c, fx: _d, ...r }) => r))).toBe(before);
    expect(rounds[0]).toMatchObject({ spell: null, spell_cost: 0, spell_ok: null, fx: null });
    // Égide e Forja (dádivas: 1 centelha cada, nenhuma carga), depois um golpe de Força que consumiu 1 uso da Forja
    db.exec(`INSERT INTO combat_rounds (idx, ts, date, week_start, attr, d20, total, hit, crit, damage, boss_hp, boss_d20, boss_total, boss_hit, boss_damage, hero_hp, spell, spell_cost, spell_ok, fx) VALUES
      (1, 2, '2026-10-07', '2026-10-05', 'intelecto', 0, 0, 0, 0, 0, 50, 9, 11, 0, 0, 10, 'atena', 1, 1, NULL),
      (2, 3, '2026-10-07', '2026-10-05', 'intelecto', 0, 0, 0, 0, 0, 50, 9, 11, 0, 0, 10, 'hefesto', 1, 1, NULL),
      (3, 4, '2026-10-07', '2026-10-05', 'forca', 12, 14, 1, 0, 6, 44, 3, 5, 0, 0, 10, NULL, 0, NULL, 'forja')`);
    expect(db.prepare(SPENT_SQL).all()).toEqual([{ week: '2026-10-05', attr: 'forca', n: 2 }]);
    expect(db.prepare(SPARKS_SPENT_SQL).all()).toEqual([{ date: '2026-10-07', n: 2 }]);
    const today = (db.prepare("SELECT spell, spell_ok, fx FROM combat_rounds WHERE date = '2026-10-07' ORDER BY idx").all() as { spell: string | null; spell_ok: number | null; fx: string | null }[])
      .map((r) => ({ spell: r.spell, spellOk: r.spell_ok === null ? null : !!r.spell_ok, fx: (r.fx ? r.fx.split(',') : []) as never[] }));
    expect(activeFx(today)).toMatchObject({ atena: true, forja: 2 });
  });
});

describe('migration v9 (itens) sobre um banco v8 com dados', () => {
  it('é aditiva: o que estava equipado continua, sem sintonia; inventário e rodadas intactos', () => {
    const db = new DatabaseSync(':memory:');
    MIGRATIONS.slice(0, 8).forEach((m) => db.exec(m));
    db.exec(`INSERT INTO profile (id, name, avatar, created_date, level, xp, coins, class) VALUES (1, 'Taste', 'raposa', '2026-10-06', 3, 5, 42, 'hoplita')`);
    db.exec(`INSERT INTO gear_inventory (item_id, acquired, source) VALUES ('gladio-bronze', '2026-10-06', 'loja')`);
    db.exec(`INSERT INTO gear_equipped (slot, item_id) VALUES ('arma', 'gladio-bronze')`);
    db.exec(`INSERT INTO combat_rounds (idx, ts, date, week_start, attr, d20, total, hit, crit, damage, boss_hp, boss_d20, boss_total, boss_hit, boss_damage, hero_hp, fx)
      VALUES (0, 1, '2026-10-06', '2026-10-05', 'forca', 15, 16, 1, 0, 3, 50, 4, 6, 1, 2, 10, 'perseu,giges')`);
    const dump = () => ['profile', 'gear_inventory', 'combat_rounds', 'boss_weeks', 'events'].map((tb) => JSON.stringify(db.prepare(`SELECT * FROM ${tb}`).all()));
    const before = dump();
    db.exec(MIGRATIONS[8]);
    expect(MIGRATIONS).toHaveLength(9);
    expect(dump()).toEqual(before);
    expect(db.prepare('SELECT slot, item_id, attuned FROM gear_equipped').all()).toEqual([{ slot: 'arma', item_id: 'gladio-bronze', attuned: 0 }]);
    // INSERT OR IGNORE do addGear: o mesmo item nunca duplica
    expect(db.prepare("INSERT OR IGNORE INTO gear_inventory (item_id, acquired, source) VALUES ('gladio-bronze', '2026-10-07', 'bau')").run().changes).toBe(0);
    // usos de hoje das habilidades (mesma conta do getHeroDay)
    expect(db.prepare("SELECT SUM(fx LIKE '%perseu%') AS p, SUM(fx LIKE '%giges%') AS g FROM combat_rounds WHERE date = '2026-10-06'").get()).toEqual({ p: 1, g: 1 });
  });
});
