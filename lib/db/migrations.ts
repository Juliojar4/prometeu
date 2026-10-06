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
];
