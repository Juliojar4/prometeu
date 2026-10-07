import { MIN_SCORE } from './attributes';

/** Números acumulados que alimentam as conquistas (calculados do banco após cada ação). */
export type AchStats = {
  water: number; // copos registrados
  waterGoalDays: number; // dias que bateram a meta de água
  workouts: number;
  workoutMinutes: number;
  meals: number;
  goodMeals: number;
  missions: number;
  perfectDays: number; // 3 ou mais pilares no dia
  activeDays: number;
  bestStreak: number;
  level: number;
  maxAttrScore: number; // maior valor (8 a 20) entre os atributos
  bossesDefeated: number;
  chests: number;
  items: number; // itens possuídos (comprados ou vindos de baú)
  shopPurchases: number;
  studySessions: number;
  studyMinutes: number;
  pages: number;
  books: number; // livros diferentes (por título)
  longestStudy: number; // maior sessão, em minutos
  intelectoScore: number;
  // combate (Etapa B), contados do log de rodadas
  hits: number;
  crits: number;
  flawlessWins: number; // chefões derrotados em combate sem nenhum recuo na semana
  intKills: number; // golpes finais com o Raio do Intelecto
  // classes (Etapa C)
  classChosen: number; // 1 depois de escolher a primeira senda
  secondWinds: number; // Segundo fôlego usados
  dodges: number; // Esquivas
  crit19: number; // críticos com 19 natural (só o Raio do Filósofo)
  classWins: number; // classes diferentes que deram o golpe final num chefão
  // magias (Etapa D)
  spellsCast: number;
  prometheus: number; // Fogo de Prometeu conjurados
  spellKills: number; // chefões derrubados por uma magia
  // equipamentos (Etapa E)
  gearItems: number; // equipamentos possuídos
  legendaries: number; // lendários possuídos
  attunedGear: number; // sintonizados agora
  gearSlots: number; // slots equipados agora (5 = conjunto completo)
};

export const emptyStats = (): AchStats => ({
  water: 0, waterGoalDays: 0, workouts: 0, workoutMinutes: 0, meals: 0, goodMeals: 0, missions: 0, perfectDays: 0,
  activeDays: 0, bestStreak: 0, level: 1, maxAttrScore: 8, bossesDefeated: 0, chests: 0, items: 0, shopPurchases: 0,
  studySessions: 0, studyMinutes: 0, pages: 0, books: 0, longestStudy: 0, intelectoScore: 8,
  hits: 0, crits: 0, flawlessWins: 0, intKills: 0,
  classChosen: 0, secondWinds: 0, dodges: 0, crit19: 0, classWins: 0,
  spellsCast: 0, prometheus: 0, spellKills: 0,
  gearItems: 0, legendaries: 0, attunedGear: 0, gearSlots: 0,
});

/** `gear`: equipamento dado junto com as moedas (Etapa E). */
export type Achievement = { id: string; name: string; desc: string; icon: string; metric: keyof AchStats; target: number; coins: number; gear?: string };

const a = (id: string, name: string, desc: string, icon: string, metric: keyof AchStats, target: number, coins: number, gear?: string): Achievement =>
  ({ id, name, desc, icon, metric, target, coins, ...(gear ? { gear } : {}) });

export const ACHIEVEMENTS: Achievement[] = [
  a('primeira-gota', 'Primeira gota', 'Registre seu primeiro copo de água.', 'water-outline', 'water', 1, 5),
  a('rio-que-corre', 'Rio que corre', 'Beba 50 copos de água.', 'waves', 'water', 50, 15),
  a('oceano', 'Oceano', 'Beba 500 copos de água.', 'sail-boat', 'water', 500, 60),
  a('sede-saciada', 'Sede saciada', 'Bata a meta de água em 7 dias.', 'cup-water', 'waterGoalDays', 7, 20),
  a('primeiro-treino', 'Primeiro golpe', 'Registre seu primeiro treino.', 'dumbbell', 'workouts', 1, 5),
  a('forja-acesa', 'Forja acesa', 'Complete 10 treinos.', 'anvil', 'workouts', 10, 20),
  a('olimpico', 'Atleta olímpico', 'Complete 50 treinos.', 'medal-outline', 'workouts', 50, 60),
  a('maratonista', 'Maratonista', 'Acumule 600 minutos de treino.', 'run-fast', 'workoutMinutes', 600, 30),
  a('primeira-mesa', 'À mesa', 'Avalie sua primeira refeição.', 'silverware-fork-knife', 'meals', 1, 5),
  a('mesa-farta', 'Mesa farta', 'Avalie 30 refeições.', 'food-apple-outline', 'meals', 30, 20),
  a('prato-de-herois', 'Prato de heróis', 'Avalie 20 refeições como boas.', 'chef-hat', 'goodMeals', 20, 25),
  a('primeira-missao', 'Mandado cumprido', 'Conclua sua primeira missão.', 'script-text-outline', 'missions', 1, 5),
  a('cumpridor', 'Cumpridor', 'Conclua 25 missões.', 'text-box-check-outline', 'missions', 25, 25),
  a('mestre-das-missoes', 'Mestre das missões', 'Conclua 100 missões.', 'book-open-page-variant-outline', 'missions', 100, 80),
  a('chama-acesa', 'Chama acesa', 'Alcance 3 dias de chama seguidos.', 'fire', 'bestStreak', 3, 10),
  a('chama-de-semana', 'Uma semana de fogo', 'Alcance 7 dias de chama seguidos.', 'fire-circle', 'bestStreak', 7, 25),
  a('chama-eterna', 'Chama eterna', 'Alcance 30 dias de chama seguidos.', 'infinity', 'bestStreak', 30, 100),
  a('escudo-de-bronze', 'Escudo de bronze', 'Acumule 7 dias ativos e ganhe seu primeiro escudo.', 'shield-half-full', 'activeDays', 7, 15),
  a('dia-perfeito', 'Dia perfeito', 'Cumpra 3 dos 4 pilares num mesmo dia.', 'star-four-points-outline', 'perfectDays', 1, 15),
  a('semana-de-ouro', 'Semana de ouro', 'Tenha 7 dias perfeitos.', 'crown-outline', 'perfectDays', 7, 50),
  a('nivel-5', 'Herói nascente', 'Chegue ao nível 5.', 'numeric-5-circle-outline', 'level', 5, 25),
  a('nivel-10', 'Herói consagrado', 'Chegue ao nível 10.', 'numeric-10-circle-outline', 'level', 10, 60),
  // ids antigos preservados (desbloqueios já gravados continuam valendo); nível 5 (~1700 XP) equivale a ~14 na nova escala
  a('atributo-5', 'Virtude lapidada', 'Leve um atributo ao valor 14.', 'diamond-stone', 'maxAttrScore', 14, 30),
  a('cacador', 'Caçador de monstros', 'Derrote seu primeiro chefão.', 'skull-outline', 'bossesDefeated', 1, 30),
  a('algoz', 'Algoz de feras', 'Derrote 5 chefões.', 'sword-cross', 'bossesDefeated', 5, 100),
  a('tesouro', 'Tesouro aberto', 'Abra um baú de chefão.', 'treasure-chest', 'chests', 1, 20),
  a('primeira-compra', 'Mercador', 'Compre um item na loja.', 'store-outline', 'shopPurchases', 1, 10),
  a('primeira-sessao', 'Primeira lição', 'Registre sua primeira sessão de estudo.', 'school-outline', 'studySessions', 1, 5),
  a('dez-horas', 'Dez horas de estudo', 'Acumule 10 horas de estudo e leitura.', 'timer-sand', 'studyMinutes', 600, 40),
  a('rato-de-biblioteca', 'Rato de biblioteca', 'Leia 500 páginas.', 'book-open-page-variant', 'pages', 500, 40),
  a('tres-livros', 'Leitor voraz', 'Leia 3 livros diferentes.', 'bookshelf', 'books', 3, 30),
  a('foco-profundo', 'Foco profundo', 'Complete uma sessão de 45 minutos.', 'head-lightbulb-outline', 'longestStudy', 45, 20),
  a('intelecto-5', 'Mente afiada', 'Leve o Intelecto ao valor 14.', 'lightbulb-on-outline', 'intelectoScore', 14, 30),
  a('colecionador', 'Colecionador', 'Possua 5 itens.', 'treasure-chest-outline', 'items', 5, 40),
  // combate (Etapa B)
  a('golpe-critico', 'Favor dos deuses', 'Tire um 20 natural num ataque.', 'dice-d20-outline', 'crits', 1, 15),
  a('mao-firme', 'Mão firme', 'Acerte 10 golpes no chefão.', 'bullseye-arrow', 'hits', 10, 20),
  a('sem-recuar', 'Inabalável', 'Derrote um chefão sem recuar nenhuma vez na semana.', 'shield-check-outline', 'flawlessWins', 1, 40),
  a('raio-final', 'Golpe do sábio', 'Derrube um chefão com o Raio do Intelecto.', 'lightning-bolt-outline', 'intKills', 1, 30),
  // classes (Etapa C)
  a('primeira-senda', 'A senda escolhida', 'Escolha sua classe.', 'sign-direction', 'classChosen', 1, 10),
  a('segundo-folego', 'Ainda de pé', 'Use o Segundo fôlego do Hoplita.', 'heart-plus-outline', 'secondWinds', 1, 20),
  a('esquiva', 'Pés de Hermes', 'Esquive de um golpe com o Peltasta.', 'debug-step-over', 'dodges', 1, 20),
  a('critico-19', 'Lampejo socrático', 'Acerte um crítico com 19 natural no Raio do Filósofo.', 'head-lightbulb-outline', 'crit19', 1, 20),
  a('quatro-sendas', 'Mestre das quatro sendas', 'Derrube um chefão com cada uma das 4 classes.', 'compass-rose', 'classWins', 4, 100),
  // magias (Etapa D)
  a('primeira-magia', 'Fagulha roubada', 'Conjure sua primeira magia.', 'creation', 'spellsCast', 1, 10),
  a('dez-magias', 'Voz dos deuses', 'Conjure 10 magias.', 'book-cross', 'spellsCast', 10, 30),
  a('fogo-prometeu', 'O fogo devolvido', 'Conjure o Fogo de Prometeu.', 'torch', 'prometheus', 1, 40),
  a('golpe-divino', 'Desígnio divino', 'Derrube um chefão com uma magia.', 'lightning-bolt-circle', 'spellKills', 1, 30),
  // equipamentos (Etapa E)
  a('primeira-arma', 'Bronze nas mãos', 'Consiga seu primeiro equipamento.', 'sword', 'gearItems', 1, 10),
  a('primeiro-lendario', 'Relíquia dos heróis', 'Consiga um equipamento lendário.', 'star-four-points', 'legendaries', 1, 40),
  a('tres-sintonias', 'Três laços', 'Sintonize 3 equipamentos ao mesmo tempo.', 'link-variant', 'attunedGear', 3, 20),
  a('panoplia', 'Panóplia completa', 'Equipe os 5 espaços: arma, armadura, escudo, amuleto e anel.', 'shield-sword-outline', 'gearSlots', 5, 40),
  // a conquista difícil que dá o único lendário fora do baú: o primeiro trabalho de Héracles
  a('doze-trabalhos', 'Os doze trabalhos', 'Derrote 12 chefões. Recompensa: a Pele do Leão de Nemeia.', 'paw', 'bossesDefeated', 12, 60, 'pele-nemeia'),
];

export const achievementById = (id: string) => ACHIEVEMENTS.find((x) => x.id === id);

/** Progresso 0..1 de uma conquista. */
export function achievementProgress(x: Achievement, s: AchStats) {
  const from = x.metric === 'maxAttrScore' || x.metric === 'intelectoScore' ? MIN_SCORE : 0; // valor de atributo começa em 8
  return Math.max(0, Math.min(1, (s[x.metric] - from) / (x.target - from)));
}

/** Conquistas que acabaram de ser cumpridas e ainda não estavam desbloqueadas (ordem do catálogo). */
export const newlyUnlocked = (s: AchStats, unlocked: string[]): Achievement[] =>
  ACHIEVEMENTS.filter((x) => !unlocked.includes(x.id) && s[x.metric] >= x.target);
