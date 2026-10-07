import type { AttrKey } from './attributes';
import { addDays } from './dates';
import { STUDY_PILLAR_MIN } from './streak';

/**
 * Classes (Etapa C): uma por atributo. Classe muda SÓ o combate (proficiência, PV, CA e talentos);
 * XP, moedas, cargas dos hábitos e chama são iguais para todas. Tudo puro: o banco guarda a classe e o log de rodadas.
 */
export type ClassId = 'hoplita' | 'peltasta' | 'atleta' | 'filosofo';
export type Talent = { name: string; desc: string; level: number };
export type HeroClass = { id: ClassId; name: string; attr: AttrKey; icon: string; epithet: string; line: string; talents: [Talent, Talent] };

/** Nível em que o segundo talento desperta. */
export const TALENT_LEVEL = 5;

export const CLASSES: HeroClass[] = [
  {
    id: 'hoplita', name: 'Hoplita', attr: 'forca', icon: 'shield-sword', epithet: 'Escudo e lança na falange',
    line: 'Firme na linha de frente: aguenta o golpe e devolve com o peso do bronze.',
    talents: [
      { level: 1, name: 'Muralha de bronze', desc: '+1 de CA e +2 de dano nos golpes de Força (+3 no nível 5).' },
      { level: TALENT_LEVEL, name: 'Segundo fôlego', desc: 'Uma vez por dia, recupera 1d10 + nível de PV sem gastar carga. Ocupa a rodada: a criatura contra-ataca.' },
    ],
  },
  {
    id: 'peltasta', name: 'Peltasta', attr: 'destreza', icon: 'spear', epithet: 'Dardo leve e pés velozes',
    line: 'Escaramuçador trácio: entra, fere onde dói e já não está mais lá.',
    talents: [
      { level: 1, name: 'Golpe certeiro', desc: '+1d3 de dano nos golpes de Destreza (1d4 no nível 5).' },
      { level: TALENT_LEVEL, name: 'Esquiva', desc: 'Uma vez por dia, o primeiro golpe que a criatura acertaria passa de raspão.' },
    ],
  },
  {
    id: 'atleta', name: 'Atleta de Olímpia', attr: 'constituicao', icon: 'run-fast', epithet: 'Fôlego de quem corre o estádio',
    line: 'Resistência forjada no treino e na mesa: o último a cair.',
    talents: [
      { level: 1, name: 'Fôlego olímpico', desc: '+2 PV por nível.' },
      { level: TALENT_LEVEL, name: 'Vigor', desc: 'Uma vez por dia, o primeiro acerto de Constituição causa +1 de dano e cura 1 PV.' },
    ],
  },
  {
    id: 'filosofo', name: 'Filósofo', attr: 'intelecto', icon: 'script-text-outline', epithet: 'A palavra que fere mais que o bronze',
    line: 'Estuda a fera antes de enfrentá-la: o raio encontra a falha na armadura.',
    talents: [
      { level: 1, name: 'Mente afiada', desc: 'O Raio do Intelecto é crítico com 19 ou 20.' },
      { level: TALENT_LEVEL, name: 'Contemplação', desc: '+1 carga de Intelecto ao cumprir o pilar de estudo do dia, até 2 por semana (respeita o teto diário).' },
    ],
  },
];

export const CLASS_IDS = CLASSES.map((c) => c.id);
export const classById = (id?: string | null): HeroClass | null => CLASSES.find((c) => c.id === id) ?? null;
const is = (cls: ClassId | null | undefined, id: ClassId, level = 1, min = 1) => cls === id && level >= min;

/**
 * Proficiência no ataque: integral no atributo da classe, 1 a menos nos outros (no nível 1-4, prof +2, é a metade).
 * A metade cheia abriria 2 a 3 pontos a partir do nível 5 e a classe da Constituição (58% das cargas do usuário típico)
 * dispararia na simulação. Sem classe = integral em tudo (Etapa B).
 */
export const attackProf = (cls: ClassId | null | undefined, attr: AttrKey, prof: number) =>
  !cls || classById(cls)?.attr === attr ? prof : prof - 1;
/**
 * Proficiência que o HP do chefão supõe para um herói com classe: igual nas 4 classes (o HP não depende da escolha).
 * 0,3 abaixo da integral cobre a média de "integral em 1, −1 nos outros 3" (−0,75) mais o talento médio; calibrado em combat.test.ts.
 */
export const HP_PROF_DISCOUNT = 0.3;

/** Muralha de bronze: +1 de CA e +2 de dano nos golpes de Força (+3 do nível 5 em diante). */
export const classAc = (cls: ClassId | null | undefined) => (cls === 'hoplita' ? 1 : 0);
export const flatDamage = (cls: ClassId | null | undefined, attr: AttrKey, level: number) =>
  cls === 'hoplita' && attr === 'forca' ? (level >= TALENT_LEVEL ? 3 : 2) : 0;
/** Fôlego olímpico: +2 PV por nível. */
export const classHp = (cls: ClassId | null | undefined, level: number) => (cls === 'atleta' ? 2 * Math.max(1, level) : 0);
/** Mente afiada: menor d20 natural que é crítico. */
export const critFrom = (cls: ClassId | null | undefined, attr: AttrKey) => (cls === 'filosofo' && attr === 'intelecto' ? 19 : 20);
/** Golpe certeiro: dado extra nos golpes de Destreza, 1d3 (1d4 do nível 5 em diante); dobra no crítico como os outros. */
export const extraDie = (cls: ClassId | null | undefined, attr: AttrKey, level: number) =>
  cls === 'peltasta' && attr === 'destreza' ? (level >= TALENT_LEVEL ? '1d4' : '1d3') : null;

// Talentos do nível 5: todos uma vez por dia (os PV voltam cheios a cada dia; cada dia é uma luta), Contemplação por semana.
/** Vigor: o primeiro acerto de Constituição do dia causa +1 de dano e cura 1 PV. */
export const vigorReady = (cls: ClassId | null | undefined, level: number, usedToday: number) => is(cls, 'atleta', level, TALENT_LEVEL) && usedToday < 1;
/** Segundo fôlego: cura 1d10 + nível sem gastar carga (ocupa a rodada). */
export const secondWindReady = (cls: ClassId | null | undefined, level: number, usedToday: number) => is(cls, 'hoplita', level, TALENT_LEVEL) && usedToday < 1;
export const SECOND_WIND_DIE = '1d10';
/** Esquiva: o primeiro golpe do dia que acertaria o Peltasta passa de raspão. */
export const dodgeReady = (cls: ClassId | null | undefined, level: number, usedToday: number) => is(cls, 'peltasta', level, TALENT_LEVEL) && usedToday < 1;
/**
 * Contemplação: +1 carga de Intelecto na sessão que faz o estudo do dia cruzar o pilar (10 min), até 2 por semana.
 * Todo dia (+7/semana) dava 97% de vitória ao Filósofo contra ~80% das outras. O teto diário de 4 é aplicado em chargesFor.
 */
export const CONTEMPLATION_PER_WEEK = 2;
export const contemplation = (cls: ClassId | null | undefined, level: number, minutesBefore: number, minutesAfter: number, usedThisWeek: number) =>
  is(cls, 'filosofo', level, TALENT_LEVEL) && usedThisWeek < CONTEMPLATION_PER_WEEK && minutesBefore < STUDY_PILLAR_MIN && minutesAfter >= STUDY_PILLAR_MIN ? 1 : 0;

/** Troca de classe: no máximo uma a cada 7 dias. A primeira escolha não conta (`last` fica null até a primeira troca). */
export const CLASS_COOLDOWN_DAYS = 7;
export const nextClassChange = (last: string | null) => (last ? addDays(last, CLASS_COOLDOWN_DAYS) : null);
export const canChangeClass = (last: string | null, today: string) => !last || today >= nextClassChange(last)!;
