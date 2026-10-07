import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AttrIcon } from '../components/AttrIcon';
import { BossEmblem } from '../components/BossEmblem';
import { Confetti } from '../components/Confetti';
import { Bar, Button, T } from '../components/ui';
import { radius, useTheme } from '../constants/theme';
import { ClassBadge } from '../components/ClassPicker';
import { AppModal } from '../components/Modal';
import { ActiveFx, GodSeal, SparkCount, SparkPips, SpellBurst } from '../components/Spell';
import {
  ATENA_AC, attackProf, ATTR_LABEL, ATTRS, bossInfoForWeek, GIGES, MNEMOSINE, PELION, PERSEU, canCast, classById, critFrom, extraDie, flatDamage, forgeBonus, modifier, POSIDON_PEN, spellById, spellDc, spellText, STRIKES, strikeDie,
  type AttrKey, type Spell, type SpellId,
} from '../lib/game';
import type { RoundRow } from '../lib/db/repos';
import { useGame } from '../store/game';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sign = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);
const tap = (f: () => Promise<void>) => f().catch(() => {});

/** Tremor curto (acerto) e número subindo e sumindo (dano). */
function useHitFx() {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const o = useSharedValue(0);
  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const float = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  const fire = (strong: boolean) => {
    const a = strong ? 9 : 5;
    x.set(withSequence(withTiming(-a, { duration: 45 }), withTiming(a, { duration: 70 }), withTiming(-a / 2, { duration: 60 }), withTiming(0, { duration: 60 })));
    y.set(0);
    o.set(1);
    y.set(withTiming(-46, { duration: 950, easing: Easing.out(Easing.cubic) }));
    o.set(withSequence(withTiming(1, { duration: 550 }), withTiming(0, { duration: 400 })));
  };
  return { shake, float, fire };
}

/** d20 de frente: hexágono de bronze (3 pares de lados em Views) com a face triangular ao centro. Gira e para no valor. */
function D20({ value, rolling, tone }: { value: number | null; rolling: boolean; tone: string }) {
  const t = useTheme();
  const rot = useSharedValue(0);
  const scale = useSharedValue(1);
  const [spin, setSpin] = useState(20);
  useEffect(() => {
    if (!rolling) return;
    rot.set(0);
    rot.set(withTiming(720, { duration: 760, easing: Easing.out(Easing.cubic) }));
    scale.set(withSequence(withTiming(1.12, { duration: 180 }), withTiming(1, { duration: 580, easing: Easing.out(Easing.back(2)) })));
    const h = setInterval(() => setSpin(1 + Math.floor(Math.random() * 20)), 55);
    return () => clearInterval(h);
  }, [rolling, rot, scale]);
  const face = rolling ? spin : value;
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }, { scale: scale.value }] }));
  const r = 54; // raio do hexágono (vértice no topo)
  const w = r * Math.sqrt(3);
  const edge = rolling ? t.bronze : tone;
  return (
    <View style={{ width: w + 8, height: 2 * r + 8, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={value ? `Dado: ${value}` : 'Dado de vinte faces'}>
      <Animated.View style={[{ width: w, height: 2 * r, alignItems: 'center', justifyContent: 'center' }, st]}>
        <View style={{ position: 'absolute', top: r * 0.42, width: 0, height: 0, borderLeftWidth: r * 0.72, borderRightWidth: r * 0.72, borderBottomWidth: r * 1.25, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: t.card2 }} />
        {[0, 60, 120].map((deg) => (
          <View key={deg} style={{ position: 'absolute', width: w, height: r, borderLeftWidth: 2, borderRightWidth: 2, borderColor: edge, transform: [{ rotate: `${deg}deg` }] }} />
        ))}
      </Animated.View>
      <T serif style={{ position: 'absolute', fontSize: 30, fontWeight: '700', color: face === null ? t.sub : rolling ? t.text : tone, top: r * 0.82 }}>{face ?? 20}</T>
    </View>
  );
}

export default function Combate() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { boss, combat, levelUpTick, attack, catchBreath, cast } = useGame();
  const [book, setBook] = useState(false); // lista de magias preparadas
  const [burst, setBurst] = useState<{ spell: Spell | null; tick: number }>({ spell: null, tick: 0 });
  const [attr, setAttr] = useState<AttrKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [round, setRound] = useState<RoundRow | null>(null);
  const [stage, setStage] = useState<0 | 1 | 2>(0); // 0 nada revelado, 1 golpe do herói, 2 contra-ataque
  const [view, setView] = useState<{ bossHp: number; heroHp: number } | null>(null); // números congelados durante a animação
  const [dmg, setDmg] = useState({ boss: '', hero: '' });
  const bossFx = useHitFx();
  const heroFx = useHitFx();
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  if (!boss || !combat) return null;
  const info = bossInfoForWeek(boss.weekStart);
  const { hero, charges } = combat;
  const defeated = boss.hp === 0;
  const bossHp = view?.bossHp ?? boss.hp;
  const heroHp = view?.heroHp ?? combat.heroHp;
  const usable = ATTRS.filter((a) => charges[a] >= 1);
  const chosen: AttrKey | null = attr && charges[attr] >= 1 ? attr : usable[0] ?? null;
  const retreated = combat.heroHp === 0 && !busy;
  const tone = !round ? t.bronze : round.crit ? t.gold : round.d20 === 1 ? t.danger : round.hit ? t.text : t.sub;

  const klass = classById(hero.cls);
  const canBreathe = combat.ready.folego && combat.heroHp > 0 && combat.heroHp < hero.maxHp;

  const strike = (breath = false, spell: SpellId | null = null) => tap(async () => {
    if ((!chosen && !breath && !spell) || busy) return;
    setBusy(true);
    setView({ bossHp: boss.hp, heroHp: combat.heroHp });
    setStage(0);
    setRolling(!spell || spellById(spell)!.kind !== 'dadiva'); // dádiva não rola dado
    Haptics.selectionAsync().catch(() => {});
    if (spell) setBurst((b) => ({ spell: spellById(spell), tick: b.tick + 1 }));
    const [r] = await Promise.all([spell ? cast(spell) : breath ? catchBreath() : attack(chosen!), wait(780)]);
    if (!alive.current) return;
    setRolling(false);
    if (!r) { setView(null); setBusy(false); return; }
    setRound(r);
    setStage(1);
    setView((v) => ({ bossHp: r.bossHp, heroHp: (v?.heroHp ?? r.heroHp) + r.heal }));
    if (r.spell && !r.damage) {
      if (r.heal) { setDmg((d) => ({ ...d, hero: `+${r.heal}` })); heroFx.fire(false); }
      Haptics.notificationAsync(r.spellOk ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else if (r.talent === 'folego') {
      setDmg((d) => ({ ...d, hero: `+${r.heal}` }));
      heroFx.fire(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (r.hit) {
      setDmg((d) => ({ ...d, boss: `−${r.damage}` }));
      bossFx.fire(r.crit);
      if (r.crit) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    await wait(r.defeated ? 300 : 650);
    if (!alive.current) return;
    setStage(2);
    setView((v) => ({ bossHp: v?.bossHp ?? r.bossHp, heroHp: r.heroHp }));
    if (r.bossHit) {
      setDmg((d) => ({ ...d, hero: `−${r.bossDamage}` }));
      heroFx.fire(r.bossCrit);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (r.retreated) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    await wait(250);
    if (!alive.current) return;
    setView(null);
    setBusy(false);
  });

  const mod = (a: AttrKey) => modifier(hero.scores[a]);
  const dmgLabel = (a: AttrKey) => {
    const x = extraDie(hero.cls, a, hero.level);
    return `${strikeDie(a, hero.weapon)}${x ? ` + ${x}` : ''} ${sign(mod(a) + flatDamage(hero.cls, a, hero.level))}`;
  };
  // talentos de uso diário (nível 5) e o crítico ampliado do Filósofo
  const talentNote = !klass ? null
    : klass.id === 'hoplita' && hero.level >= 5 ? `Segundo fôlego ${combat.ready.folego ? 'pronto' : 'usado hoje'}`
    : klass.id === 'peltasta' && hero.level >= 5 ? `Esquiva ${combat.ready.esquiva ? 'pronta' : 'usada hoje'}`
    : klass.id === 'atleta' && hero.level >= 5 ? `Vigor ${combat.ready.vigor ? 'pronto' : 'usado hoje'}`
    : `${klass.talents[0].name}: ${klass.talents[0].desc.replace(/ \(.*\)\.$|\.$/, '')}`;
  // habilidades dos lendários sintonizados (Etapa E): prontas hoje/na semana
  const relicNote = [
    hero.relics.includes(PERSEU) && `Perseu ${combat.relic.perseu ? 'pronto' : 'usado hoje'}`,
    hero.relics.includes(GIGES) && `Giges ${combat.relic.giges ? 'pronto' : 'usado hoje'}`,
    hero.relics.includes(MNEMOSINE) && `Mnemósine ${combat.relic.mnemosine ? 'pronta' : 'usada na semana'}`,
  ].filter(Boolean).join(' · ');
  const note = [relicNote, talentNote].filter(Boolean).join(' · '); // a relíquia primeiro: a descrição do talento do nível 1 é longa
  const recent = round || busy ? combat.rounds.slice(1, 3) : combat.rounds.slice(0, 2); // a rodada da vez fica no centro; 2 linhas cabem com magias ativas
  const sp = round?.spell ? spellById(round.spell) : null;
  // magias: título e conta da rodada
  const spellTitle = !sp || !round ? '' : sp.kind === 'ataque' ? `${sp.name} · ${round.crit ? 'crítico · ' : ''}${round.spellOk ? `${round.damage} de dano` : 'errou'}`
    : sp.kind === 'resistencia' ? `${sp.name} · ${round.damage ? `${round.damage} de dano` : round.spellOk ? 'pegou' : 'resistiu'}`
    : round.heal ? `${sp.name} · +${round.heal} PV` : sp.name;
  const spellDetail = !sp || !round ? '' : sp.kind === 'ataque' ? `${round.d20} ${sign(round.total - round.d20)} = ${round.total} contra CA ${combat.boss.ac}`
    : sp.kind === 'resistencia' ? `Resistência: ${round.d20} ${sign(round.total - round.d20)} = ${round.total} contra CD ${spellDc(hero)} · ${round.spellOk ? 'falhou' : sp.id === 'posidon' ? 'nada acontece' : 'metade do dano'}`
    : ({ atena: '+2 de CA até a meia-noite', hermes: 'O próximo acerto da criatura passa de raspão', hefesto: `+${forgeBonus(hero.level)} de dano nos próximos 3 golpes`,
      ares: 'Próximo golpe com vantagem, crítico com 18-20', hestia: 'Se um golpe for te fazer recuar, você fica de pé', demeter: '+1 PV a cada rodada até a meia-noite' } as Record<string, string>)[sp.id] ?? 'A luz de Apolo fecha as feridas';
  const fxNote = round && !round.spell ? [round.fx.includes('forja') && 'Forja', round.fx.includes('ares') && 'Fúria de Ares', round.fx.includes('hades') && 'Sombra de Hades',
    round.fx.includes('perseu') && 'vantagem do Escudo de Perseu', round.crit && round.d20 === 19 && hero.relics.includes(PELION) && round.attr !== 'intelecto' && 'Lança do Pélion'].filter(Boolean).join(', ') : '';

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 16, gap: 14 }}>
        {/* Criatura */}
        <View style={[s.row, { gap: 14 }]}>
          <View>
            <Animated.View style={bossFx.shake}><BossEmblem icon={info.icon} size={92} defeated={defeated && !busy} /></Animated.View>
            <Animated.View pointerEvents="none" style={[s.float, bossFx.float]}>
              <T serif style={{ fontSize: 26, fontWeight: '700', color: round?.crit ? t.gold : t.danger }}>{dmg.boss}</T>
            </Animated.View>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <T serif style={{ fontSize: 19, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>{info.name}</T>
            <T serif style={{ fontSize: 11, letterSpacing: 1.5, color: t.sub }}>CA {combat.boss.ac}  ·  ATAQUE {sign(combat.boss.atk - (combat.fx.posidon ? POSIDON_PEN : 0))}  ·  {combat.boss.die}{combat.boss.dmgBonus ? `+${combat.boss.dmgBonus}` : ''}</T>
            <Bar value={bossHp / boss.maxHp} color={t.danger} height={12} />
            <T sub style={{ fontSize: 12, textAlign: 'right' }}>{bossHp} / {boss.maxHp} HP</T>
          </View>
        </View>

        {/* Dado e resultado */}
        <View style={{ alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center', minHeight: 170 }}>
          <View>
            <D20 value={round && round.talent !== 'folego' && round.d20 ? round.d20 : null} rolling={rolling} tone={sp ? (round?.spellOk && sp.kind !== 'dadiva' ? t.gold : t.sub) : tone} />
            <SpellBurst spell={burst.spell} tick={burst.tick} />
          </View>
          <View style={{ minHeight: 64, alignItems: 'center', gap: 4 }} accessibilityLiveRegion="polite">
            {round && stage >= 1 && sp ? (
              <>
                <T serif style={{ fontSize: 15, fontWeight: '700', letterSpacing: 2, color: round.spellOk ? (sp.id === 'prometeu' ? t.ember : t.gold) : t.sub, textAlign: 'center' }}>{spellTitle.toUpperCase()}</T>
                <T sub style={{ fontSize: 12, textAlign: 'center' }}>{spellDetail}</T>
              </>
            ) : round && stage >= 1 ? (
              <>
                <T serif style={{ fontSize: 15, fontWeight: '700', letterSpacing: 2, color: round.talent === 'folego' ? t.attr.constituicao : round.crit ? t.gold : round.hit ? t.text : t.sub }}>
                  {round.talent === 'folego' ? `SEGUNDO FÔLEGO · +${round.heal} PV`
                    : round.crit ? `CRÍTICO · ${round.damage} DE DANO` : round.d20 === 1 ? 'UM NATURAL · ERROU' : round.hit ? `ACERTOU · ${round.damage} DE DANO` : 'ERROU'}
                </T>
                <T sub style={{ fontSize: 12 }}>
                  {round.talent === 'folego' ? `1d10 + nível ${hero.level}, sem gastar carga`
                    : `${round.d20} ${sign(round.total - round.d20)} = ${round.total} contra CA ${combat.boss.ac}${round.crit && round.d20 < 20 ? (round.fx.includes('ares') ? ' · Fúria de Ares' : round.attr === 'intelecto' ? ' · Mente afiada' : '') : ''}${round.talent === 'vigor' ? ` · Vigor: +1 de dano${round.heal ? ', +1 PV' : ''}` : ''}${fxNote ? ` · ${fxNote}` : ''}`}
                </T>
              </>
            ) : (
              <T sub style={{ fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
                d20 + modificador + proficiência contra a CA. Vinte natural dobra os dados; um natural sempre erra.
              </T>
            )}
            {round && stage === 2 && round.bossD20 !== null && (
              <T style={{ fontSize: 13, color: round.talent === 'esquiva' || round.fx.includes('hermes') || round.fx.includes('giges') ? t.attr.destreza : round.bossHit ? t.danger : t.sub, textAlign: 'center' }}>
                {info.name.split(' ')[0]} {round.talent === 'esquiva' ? 'acertaria, mas você esquiva: passa de raspão'
                  : round.fx.includes('giges') ? 'acertaria, mas o Anel de Giges te tira da vista'
                  : round.fx.includes('nemeia') && !round.bossDamage ? 'acerta, mas a Pele de Nemeia não deixa passar nada'
                  : round.fx.includes('hermes') ? 'acertaria, mas as Sandálias de Hermes te tiram dali'
                  : round.bossHit ? `${round.bossCrit ? 'acerta em cheio' : 'acerta'}: ${round.bossDamage} de dano${round.fx.includes('hestia') ? ' · a Lareira de Héstia te mantém de pé' : ''}` : 'erra o contra-ataque'}{round.fx.includes('nemeia') && round.bossDamage ? ' (Nemeia: −1)' : ''}  ·  {round.bossTotal} contra CA {hero.ac + (combat.fx.atena ? ATENA_AC : 0)}
              </T>
            )}
          </View>
          {recent.length > 0 && (
            <View style={{ alignSelf: 'stretch', gap: 4, marginTop: 4 }}>
              {recent.map((r) => (
                <View key={r.idx} style={[s.row, { gap: 8, opacity: 0.85 }]}>
                  <View style={{ width: 6, height: 6, transform: [{ rotate: '45deg' }], backgroundColor: r.spell ? t.gold : t.attr[r.attr] }} />
                  <T sub style={{ flex: 1, fontSize: 12 }} numberOfLines={1}>{r.spell ? spellById(r.spell)?.name : r.talent === 'folego' ? 'Segundo fôlego' : `${STRIKES[r.attr].name}: ${r.d20}${r.crit ? ', crítico' : ''}`}</T>
                  <T serif style={{ fontSize: 12, color: r.spell && !r.damage ? t.gold : r.talent === 'folego' ? t.attr.constituicao : r.damage ? t.danger : t.sub }}>
                    {r.damage ? `−${r.damage}` : r.spell ? (r.heal ? `+${r.heal} PV` : r.spellOk ? 'feito' : 'falhou') : r.talent === 'folego' ? `+${r.heal} PV` : 'erro'}
                  </T>
                  <T sub style={{ fontSize: 12, width: 54, textAlign: 'right' }}>{r.talent === 'esquiva' ? 'esquiva' : r.fx.includes('giges') ? 'sumiu' : r.fx.includes('hermes') ? 'raspão' : r.bossDamage ? `PV −${r.bossDamage}` : ''}</T>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Herói */}
        <Animated.View style={[{ gap: 6 }, heroFx.shake]}>
          <View style={s.between}>
            <View style={[s.row, { gap: 4, flexShrink: 1 }]}>
              {klass && <ClassBadge cls={klass.id} size={22} />}
              <T serif style={{ fontSize: 12, letterSpacing: 2, color: t.bronze, fontWeight: '700' }} numberOfLines={1}>{klass ? klass.name.split(' ')[0].toUpperCase() : 'HERÓI'}</T>
            </View>
            <T sub style={{ fontSize: 12 }}>CA {hero.ac + (combat.fx.atena ? ATENA_AC : 0)}  ·  Prof {sign(hero.prof)}  ·  PV {heroHp} / {hero.maxHp}</T>
            <Pressable onPress={() => router.push('/arsenal')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Abrir o arsenal" style={{ paddingLeft: 8 }}>
              <MaterialCommunityIcons name="shield-sword-outline" size={18} color={t.bronze} />
            </Pressable>
          </View>
          <Bar value={heroHp / hero.maxHp} color={t.attr.constituicao} height={10} />
          <View style={[s.row, { gap: 8, minHeight: 18 }]}>
            {!!note && <T sub style={{ flex: 1, fontSize: 11, letterSpacing: 0.3 }} numberOfLines={1}>{note}</T>}
            <ActiveFx fx={combat.fx} />
          </View>
          <Animated.View pointerEvents="none" style={[s.floatHero, heroFx.float]}>
            <T serif style={{ fontSize: 20, fontWeight: '700', color: t.danger }}>{dmg.hero}</T>
          </Animated.View>
        </Animated.View>

        {/* Controles: metade inferior */}
        {defeated && !busy ? (
          <View style={[s.panel, { borderColor: t.gold, backgroundColor: t.card }]}>
            <T serif style={{ fontSize: 16, fontWeight: '700', color: t.gold }}>A criatura caiu</T>
            <T sub style={{ fontSize: 13, lineHeight: 19 }}>Sua constância venceu a provação. O baú espera por você.</T>
            <Button title="Ver o baú" onPress={() => router.replace('/chefao')} icon={<MaterialCommunityIcons name="treasure-chest" size={20} color={t.onPrimary} />} style={{ minHeight: 54 }} />
          </View>
        ) : retreated ? (
          <View style={[s.panel, { borderColor: t.bronze, backgroundColor: t.card }]}>
            <View style={[s.row, { gap: 10 }]}>
              <MaterialCommunityIcons name="campfire" size={24} color={t.ember} />
              <T serif style={{ flex: 1, fontSize: 16, fontWeight: '700' }}>Recuo até amanhã</T>
            </View>
            <T sub style={{ fontSize: 13, lineHeight: 19 }}>Recuar também é estratégia. Seus PV voltam cheios amanhã; cargas, XP, moedas e chama continuam intactos.</T>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <View style={[s.row, { gap: 8 }]}>
              {ATTRS.map((a) => {
                const n = charges[a];
                const on = chosen === a;
                const off = n < 1;
                return (
                  <Pressable
                    key={a}
                    disabled={off || busy}
                    onPress={() => { setAttr(a); Haptics.selectionAsync().catch(() => {}); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on, disabled: off }}
                    accessibilityLabel={`${STRIKES[a].name}: ${n < 0 ? `dívida de ${-n}` : `${n} ${n === 1 ? 'carga' : 'cargas'}`}`}
                    style={[s.charge, { borderColor: on ? t.attr[a] : t.border, borderWidth: on ? 2 : 1, backgroundColor: on ? t.card2 : t.card, opacity: off ? 0.45 : 1 }]}
                  >
                    <AttrIcon attr={a} size={30} />
                    <T serif style={{ fontSize: 20, fontWeight: '700', color: n < 0 ? t.danger : t.text }}>{n}</T>
                    <T sub style={{ fontSize: 10, letterSpacing: 0.3 }} numberOfLines={1}>{n < 0 ? 'dívida' : ATTR_LABEL[a]}</T>
                  </Pressable>
                );
              })}
            </View>
            {chosen ? (
              <T sub style={{ fontSize: 12, textAlign: 'center' }}>
                {STRIKES[chosen].name}: d20 {sign(mod(chosen) + attackProf(hero.cls, chosen, hero.prof))} para acertar{critFrom(hero.cls, chosen) < 20 ? ' (crítico 19-20)' : ''}, {dmgLabel(chosen)} de dano
              </T>
            ) : (
              <T sub style={{ fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
                Sem cargas agora. Treino e estudo dão 1 a cada 15 min, refeição e missão 1, meta de água 2.
              </T>
            )}
            <View style={[s.row, { gap: 8 }]}>
              {canBreathe && (
                <View style={{ flex: 1 }}>
                  <Button variant="ghost" title="Fôlego" onPress={() => strike(true)} disabled={busy}
                    icon={<MaterialCommunityIcons name="heart-plus-outline" size={18} color={t.attr.constituicao} />} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Button variant="ghost" title="Conjurar" onPress={() => setBook(true)} disabled={busy}
                  icon={<SparkCount sparks={combat.sparks} max={combat.sparkMax} label={false} size={12} />} />
              </View>
            </View>
            <Button
              title={busy ? 'Rolando...' : chosen ? STRIKES[chosen].name : 'Sem cargas'}
              onPress={() => strike()}
              disabled={!chosen || busy}
              icon={<MaterialCommunityIcons name="sword-cross" size={20} color={t.onPrimary} />}
              style={{ minHeight: 56 }}
            />
          </View>
        )}
      </View>
      <AppModal visible={book} onClose={() => setBook(false)}>
        <View style={s.between}>
          <T serif style={{ fontSize: 17, fontWeight: '700', letterSpacing: 2 }}>CONJURAR</T>
          <SparkCount sparks={combat.sparks} max={combat.sparkMax} />
        </View>
        <T sub style={{ fontSize: 12, lineHeight: 18 }}>Ocupa a rodada (a criatura contra-ataca) e gasta centelhas, não cargas.</T>
        {combat.spells.length === 0 && <T sub style={{ fontSize: 13 }}>Nenhuma magia preparada.</T>}
        {combat.spells.map((x) => {
          const ok = canCast(x, combat.sparks, combat.fx, combat.heroHp, boss.hp, combat.relic.mnemosine);
          const why = ok ? (combat.relic.mnemosine ? 'de graça (Mnemósine)' : '') : combat.sparks < x.cost ? 'faltam centelhas' : combat.heroHp <= 0 || boss.hp <= 0 ? 'fora de combate' : 'já ativa';
          return (
            <Pressable
              key={x.id}
              disabled={!ok || busy}
              onPress={() => { setBook(false); strike(false, x.id); }}
              accessibilityRole="button"
              accessibilityState={{ disabled: !ok }}
              accessibilityLabel={`${x.name}, ${x.cost} ${x.cost === 1 ? 'centelha' : 'centelhas'}. ${spellText(x, hero.level)}`}
              style={({ pressed }) => [s.spell, { borderColor: ok ? t.bronze : t.border, opacity: !ok ? 0.5 : pressed ? 0.8 : 1 }]}
            >
              <GodSeal spell={x} size={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={s.between}>
                  <T serif style={{ flex: 1, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{x.name}</T>
                  <SparkPips n={x.cost} />
                </View>
                <T sub style={{ fontSize: 12, lineHeight: 17 }} numberOfLines={3}>{why ? `${why} · ` : ''}{spellText(x, hero.level)}</T>
              </View>
            </Pressable>
          );
        })}
        <Button variant="ghost" title="Abrir o grimório" onPress={() => { setBook(false); router.push('/grimorio'); }}
          icon={<MaterialCommunityIcons name="book-open-variant" size={18} color={t.gold} />} />
      </AppModal>
      <Confetti tick={levelUpTick} />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  float: { position: 'absolute', top: 18, left: 0, right: 0, alignItems: 'center' },
  floatHero: { position: 'absolute', right: 0, top: -20 },
  panel: { borderWidth: 1, borderRadius: radius.lg, padding: 16, gap: 10 },
  charge: { flex: 1, alignItems: 'center', gap: 4, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 2 },
  spell: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.md, padding: 10 },
});
