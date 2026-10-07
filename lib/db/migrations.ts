// Migrations versionadas via PRAGMA user_version. Nunca edite uma existente: adicione uma nova.
export const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    created_date TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 0,
    forca_level INTEGER NOT NULL DEFAULT 1,
    forca_xp INTEGER NOT NULL DEFAULT 0,
    vitalidade_level INTEGER NOT NULL DEFAULT 1,
    vitalidade_xp INTEGER NOT NULL DEFAULT 0,
    energia_level INTEGER NOT NULL DEFAULT 1,
    energia_xp INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  -- registro de cada ação (água, treino, refeição, missão) para etapas futuras
  CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    ref TEXT,
    xp INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 0,
    attr TEXT,
    boss_damage INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX idx_events_date ON events(date);
  CREATE TABLE days (
    date TEXT PRIMARY KEY,
    water INTEGER NOT NULL DEFAULT 0,
    water_goal INTEGER NOT NULL,
    workout INTEGER NOT NULL DEFAULT 0,
    meals INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE daily_missions (
    date TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (date, mission_id)
  );
  CREATE TABLE boss_weeks (
    week_start TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    max_hp INTEGER NOT NULL,
    hp INTEGER NOT NULL
  );
  `,
  // v2: detalhes do evento (tipo/duração/intensidade do treino, nota/tags da refeição) em JSON. Aditiva: não toca nos dados existentes.
  `ALTER TABLE events ADD COLUMN data TEXT;`,
  // v3: baú do chefão (flag; boss_weeks existentes ficam como estavam), inventário da loja e conquistas. Só adiciona, não toca nos dados existentes.
  `
  ALTER TABLE boss_weeks ADD COLUMN chest_claimed INTEGER NOT NULL DEFAULT 0;
  CREATE TABLE inventory (
    item_id TEXT PRIMARY KEY,
    acquired TEXT NOT NULL,
    equipped INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'loja' -- 'loja' | 'bau'
  );
  CREATE TABLE achievements (
    id TEXT PRIMARY KEY,
    unlocked TEXT NOT NULL
  );
  `,
  // v4: quarto atributo (Intelecto) e minutos de estudo por dia (pilar). Aditiva, com default; dias antigos ficam com 0.
  `
  ALTER TABLE profile ADD COLUMN intelecto_level INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE profile ADD COLUMN intelecto_xp INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE days ADD COLUMN study INTEGER NOT NULL DEFAULT 0;
  `,
  // v5: equipamentos de combate (Etapa A). Aditiva. Os atributos (Força, Destreza, Constituição, Intelecto) são
  // derivados dos eventos em lib/game, então as colunas antigas de Vitalidade/Energia ficam como estão.
  `
  CREATE TABLE gear_inventory (
    item_id TEXT PRIMARY KEY,
    acquired TEXT NOT NULL,
    source TEXT NOT NULL -- 'bau' | 'loja' | 'combate'
  );
  CREATE TABLE gear_equipped (
    slot TEXT PRIMARY KEY, -- arma | armadura | escudo | amuleto | anel
    item_id TEXT NOT NULL REFERENCES gear_inventory(item_id)
  );
  `,
  // v6: combate por rodadas (Etapa B). Aditiva. `events.charges` = cargas de ataque que o evento gerou (eventos
  // antigos ficam com 0: já causaram dano passivo, gravado em boss_damage, e o HP do chefão da semana fica como está).
  // Cada rodada gasta 1 carga do atributo; o saldo é derivado (eventos - rodadas), sem conta paralela.
  `
  ALTER TABLE events ADD COLUMN charges INTEGER NOT NULL DEFAULT 0;
  CREATE TABLE combat_rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idx INTEGER NOT NULL UNIQUE, -- índice global da rodada (semente do dado)
    ts INTEGER NOT NULL,
    date TEXT NOT NULL,
    week_start TEXT NOT NULL,
    attr TEXT NOT NULL,
    d20 INTEGER NOT NULL,
    total INTEGER NOT NULL,
    hit INTEGER NOT NULL,
    crit INTEGER NOT NULL,
    damage INTEGER NOT NULL,
    boss_hp INTEGER NOT NULL, -- HP do chefão depois da rodada
    boss_d20 INTEGER, -- NULL quando o golpe derrubou o chefão (sem contra-ataque)
    boss_total INTEGER,
    boss_hit INTEGER NOT NULL DEFAULT 0,
    boss_damage INTEGER NOT NULL DEFAULT 0,
    hero_hp INTEGER NOT NULL -- PV do herói depois da rodada (0 = recuou)
  );
  CREATE INDEX idx_rounds_week ON combat_rounds(week_start);
  CREATE INDEX idx_rounds_date ON combat_rounds(date);
  `,
  // v7: classes (Etapa C). Aditiva. `profile.class` NULL = ainda não escolheu (a tela "Escolha sua senda" aparece uma vez);
  // `class_changed` = data da última troca (NULL até a primeira troca; a escolha inicial não conta para o intervalo de 7 dias).
  // Rodadas guardam a classe do herói e o talento que agiu ('folego' não gasta carga), mais os PV curados.
  // `legacy_hp` marca chefões criados na escala antiga (400 + 30/nível, sempre >= 400): o da semana corrente é
  // reescalado uma única vez no load (UPDATE condicional zera a marca); semanas encerradas não são tocadas.
  `
  ALTER TABLE profile ADD COLUMN class TEXT;
  ALTER TABLE profile ADD COLUMN class_changed TEXT;
  ALTER TABLE combat_rounds ADD COLUMN hero_class TEXT;
  ALTER TABLE combat_rounds ADD COLUMN talent TEXT;
  ALTER TABLE combat_rounds ADD COLUMN heal INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE boss_weeks ADD COLUMN legacy_hp INTEGER NOT NULL DEFAULT 0;
  UPDATE boss_weeks SET legacy_hp = 1 WHERE max_hp >= 400;
  `,
  // v8: magias (Etapa D). Aditiva. `profile.spells` = magias preparadas (JSON, em ordem de preparo; NULL = nenhuma),
  // `spells_swapped` = data da última troca de preparo (1 por dia). Rodadas de magia: `spell` (NULL nos golpes),
  // `spell_cost` (centelhas gastas; o saldo é derivado dos dias − este custo), `spell_ok` (acertou / a criatura falhou na
  // resistência) e `fx` (efeitos consumidos na rodada, separados por vírgula). Os efeitos ativos saem do log do dia.
  `
  ALTER TABLE profile ADD COLUMN spells TEXT;
  ALTER TABLE profile ADD COLUMN spells_swapped TEXT;
  ALTER TABLE combat_rounds ADD COLUMN spell TEXT;
  ALTER TABLE combat_rounds ADD COLUMN spell_cost INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE combat_rounds ADD COLUMN spell_ok INTEGER;
  ALTER TABLE combat_rounds ADD COLUMN fx TEXT;
  `,
  // v9: itens de combate (Etapa E). Aditiva. `gear_equipped.attuned` = sintonizado (máx. 3: bônus de atributo e habilidade
  // do lendário); equipado sem sintonia dá só CA e o dado da arma. `gear_inventory.source` ganha 'conquista'.
  // O uso das habilidades (1x/dia, 1x/semana) sai das marcas em combat_rounds.fx; nada mais a gravar.
  `ALTER TABLE gear_equipped ADD COLUMN attuned INTEGER NOT NULL DEFAULT 0;`,
];
