# Prometeu — contexto do projeto

## O que é
App Android de produtividade gamificada, em português do Brasil. O usuário é o personagem de um RPG: hábitos saudáveis (beber água, treinar, comer bem, estudar/ler) dão XP e moedas, sobem o nível geral e 4 atributos estilo D&D 5e (valor 8 a 20 + modificador). Tema visual e narrativo: **Prometeu**, o Titã da mitologia grega que roubou o fogo dos deuses. Fogo = esforço e evolução; streak = chama acesa; chefão semanal = provação/monstro mítico.

Princípios do produto:
- **Offline-first:** todos os registros ficam no celular (SQLite), funciona sem internet e sem conta. Só as funções sociais (desafios com amigos) usam backend Supabase, e o login só é pedido na aba "Amigos".
- **Sem punição pesada:** dia perdido só deixa o avatar "cansado". Sem contagem de calorias (foco em hábito, não restrição).
- **Uso com uma mão:** ações principais na metade inferior da tela.
- **Visual elegante, NÃO pode parecer app genérico/gerado por IA** (ver "Design").

## Stack
- React Native 0.86 + Expo SDK 57 (TypeScript strict), Expo Router 57 (rotas em `app/` na raiz), Zustand 5, expo-sqlite, react-native-reanimated 4, expo-haptics, @expo/vector-icons, fontes Cinzel + Inter (@expo-google-fonts).
- Testes: Jest (jest-expo) para toda a lógica de `lib/game`.
- Roda como **development build** (não Expo Go). Pacote Android: `com.prometeu.app`. Build de APK: `eas build -p android --profile preview`.
- Ambiente do dev: Linux; o build Android local exige **JDK 17** (`~/jdks/temurin17`) — o Java 25 do sistema quebra o Gradle/CMake. Celular de teste: Samsung Galaxy A06 (720x1600) via adb.

## Arquitetura
```
app/                 rotas (Expo Router)
  _layout.tsx        gate onboarding x app, carrega fontes, banner de conquistas
  onboarding.tsx
  (tabs)/            index (Início), agua, treino, comida, estudo, amigos
  perfil.tsx         hub: perfil, atalhos p/ loja, conquistas, chefão
  chefao.tsx  combate.tsx  loja.tsx  conquistas.tsx  senda.tsx (escolha/troca de classe)  grimorio.tsx (magias)  arsenal.tsx (equipar/sintonizar)
components/          ui.tsx (Card, T, Bar, Button, SectionTitle), Avatar, Medallion/Coin,
                     Flame, Meander/Divider, AttrIcon, Amphora, Chip, Modal (AppModal/ConfirmModal),
                     BossEmblem, Chest, AchievementBanner, ChargeToast, ItemArt, Confetti, Placeholder, ClassPicker, Spell (selo do deus, centelhas, efeitos)
constants/theme.ts   tokens de cor (claro/escuro + temas da loja), tipografia, raios
store/game.ts        Zustand: une DB + lib/game; registra/reverte ações em transação
lib/game/            SÓ funções puras e testadas: xp, attributes, streak, boss, chest,
                     missions, achievements, shop, gear, combat, classes, spells, habits, workouts, actions, dates, rng
lib/db/              expo-sqlite: migrations versionadas (PRAGMA user_version, hoje v9), repos
docs/design.md       guia visual completo (paleta, tipografia, componentes, o que não fazer)
```
Futuras: `lib/sync/` (fila de eventos p/ Supabase), `widgets/` (widget Android), `supabase/` (migrations SQL).

Regras de código: lógica de jogo sempre pura em `lib/game` com datas recebidas por parâmetro e testes Jest; toda ação grava evento em SQLite e pode ser **revertida** exatamente (desfazer copo, excluir treino/estudo, editar refeição, desfazer missão); `days` é recalculado a partir dos eventos. Migrations sempre aditivas, preservando dados do usuário. Sem módulos nativos novos sem necessidade (exigem rebuild).

## Regras de jogo (implementadas)
- **Nível:** XP para o próximo nível = 100 × nível^1,5. Subir de nível: confete + vibração.
- **4 atributos (Etapa A):** Força (musculação), Destreza (corrida, caminhada, alongamento), Constituição (água + alimentação; funde as antigas Vitalidade e Energia), Intelecto (estudo/leitura). Sem Sabedoria e Carisma.
  - Valor 8 a 20 por XP acumulado (tabela `SCORE_XP` em `lib/game/attributes.ts`: 9:100, 10:250, 11:450, 12:700, 13:1000, 14:1400, 15:1900, 16:2500, 17:3200, 18:4000, 19:5000, 20:6200); modificador = piso((valor - 10) / 2). UI mostra "14 · +2" e barra até o próximo valor.
  - O XP de atributo é **derivado dos eventos** (`attrXpFromEvents` sobre `ATTR_XP_SQL`): desfazer = apagar o evento, sem conta própria. As colunas `*_level/_xp` do perfil (formato antigo nível + XP no nível) ficaram congeladas e não são mais lidas.
  - Treino: musculação → Força; corrida/caminhada/alongamento → Destreza; "outro" → 50/50. Treinos rápidos têm destino fixo (Circuito → Força, HIIT e Alongamento matinal → Destreza); o evento grava `data.quick` (id) e, nos antigos, o nome serve de id. Treino sem tipo (antes da v2) = Força.
  - Constituição = XP de água + comida (eventos antigos `energia`/`vitalidade` contam aqui) × `CON_XP_FACTOR` 0,2. Intelecto = XP de estudo × `INT_XP_FACTOR` 0,6. Calibrado por simulação (usuário típico: ~10 em 2 semanas, ~14 em 3 meses).
  - `proficiencyBonus`, `effectiveScore` (teto 22) e `armorClass` são usados no combate (Etapa B). Equipamentos em `lib/game/gear.ts` (5 slots, 4 raridades, máx. 3 sintonizados) e tabelas `gear_inventory`/`gear_equipped` (v5); aquisição e efeitos na Etapa E (abaixo).
- **Água:** +5 XP de Constituição por copo de 250 ml, 2 moedas; bônus ao bater a meta (20 XP, 5 moedas, 2 cargas de ataque) uma vez por dia, revogado se desfizer abaixo da meta. Máx 24 copos/dia.
- **Treino:** tipo (musculação, corrida, caminhada, alongamento, outro), duração 1–240 min, intensidade leve ×1 / média ×1,5 / forte ×2. XP = minutos × multiplicador; moedas = XP/4 (máx 40); 1 carga a cada 15 min. 3 treinos rápidos (Alongamento matinal 7 min, Circuito em casa 12 min, HIIT 20 min) com timer por timestamps.
- **Alimentação:** café, almoço, lanche, jantar; avaliação bom/ok/ruim (20/12/5 XP) + 3 XP por tag (fruta, verdura, caseiro, sem refrigerante). Pilar cumprido com ≥ 2 refeições.
- **Estudo (Intelecto):** tipo (leitura ×1, estudo/curso ×1,2, idioma ×1,2, revisão ×1, outro ×1), 1–240 min, título e páginas opcionais (+1 XP a cada 10 páginas, máx +20). Timer de foco 15/25/45 min. "Meus livros" derivado dos eventos. Pilar cumprido com ≥ 10 min.
- **Streak:** dia ativo = ≥ 2 dos 4 pilares. A cada 7 dias ativos ganha 1 escudo (máx 3); o escudo protege automaticamente um dia falho, com mensagem acolhedora.
- **Chefão semanal:** 8 criaturas gregas em rodízio (Hidra, Minotauro, Quimera, Cérbero, Medusa, Polifemo, Javali de Erimanto, Harpias), reseta toda segunda. Desde a Etapa B as ações não causam dano: dão cargas, gastas em combate (abaixo). Derrotado → baú (abre manualmente, uma única vez): 50–90 moedas + 1 item: cosmético não possuído (40%) ou equipamento (60%; sempre equipamento se já tem todos os cosméticos). Ver Etapa E.
- **Combate (Etapa B, `lib/game/combat.ts`, tela `app/combate.tsx`):**
  - Cargas de ataque por atributo: refeição 1 e missão 1 (atributo da missão); meta de água 2 (copo avulso 0); treino 1 a cada 15 min a partir de 5 min (Força/Destreza como o XP, "outro" divide); estudo 1 a cada 15 min a partir de 10 min (Intelecto). Treino e estudo: teto de 4 por dia cada. Gravadas em `events.charges`; eventos anteriores à v6 valem 0 (já causaram dano passivo).
  - Saldo = cargas dos eventos − rodadas do log (`combat_rounds`), sem conta paralela. Sobra positiva vale só na semana; dívida (desfazer uma ação com a carga já gasta: o dano fica) atravessa semanas até ser paga. Atacar exige saldo ≥ 1.
  - Rodada: d20 + mod do atributo (valor efetivo com gear) + proficiência contra a CA do monstro; 20 natural = crítico (dados dobrados), 1 natural = erro. Dano: dado da arma (golpes de Força/Destreza) ou 1d6 Força/Destreza/Constituição, 1d8 Raio do Intelecto, + mod (mín. 1). Se o monstro sobrevive, contra-ataca: d20 + ataque contra a CA do herói (10 + mod Des + armadura/escudo).
  - d20 com semente: `hash(semana + índice global da rodada)`, fluxos separados herói/monstro (o dado do monstro não depende da carga escolhida). Fechar e reabrir não muda nada.
  - PV do herói: 10 + mod Con no nível 1, +6 + mod Con por nível (mín. 1). Pool diário: PV zerados = recuo até a meia-noite, sem perder XP, moedas, cargas nem chama.
  - Monstro: ficha base (CA 11-14, ataque +0 a +2, 1d4 a 1d6) +1 em CA/ataque/dano a cada 4 níveis do herói. HP = `charges` da criatura (37 a 41) × dano médio por carga do herói contra ela no início da semana (`expectedDamage`); com classe, × 1,11 (`SPELL_HP_SHARE`: magia é bônus, a Etapa D supõe só um reforço pequeno).
  - Simulação (104 semanas, `combat.test.ts`): típico (~48 cargas/semana) vence 78% na semana 1 (recua com 9 PV), 84% com 1 mês e 92% com 3 meses, mediana no 6º dia; fraco (~26 cargas) vence 0-5% e tira ~65% do HP.
  - Migração: a v6 manteve o HP antigo (escala de 400); a v7 marca esses chefões (`boss_weeks.legacy_hp`) e o load reescala o da semana corrente uma única vez (UPDATE condicional): hp novo = round(hp × máx. novo / máx. antigo), vivo continua vivo. Semanas encerradas não mudam. No aparelho: Minotauro 334/400 → 47/56.
- **Classes (Etapa C, `lib/game/classes.ts`, tela `app/senda.tsx`):** uma por atributo; mudam SÓ o combate (XP, moedas, cargas, chama e missões iguais para todas).
  - Proficiência: integral no atributo da classe, 1 a menos nos outros (no nível 1-4 é a metade; a metade cheia abria 2-3 pontos e a classe da Constituição, que recebe 58% das cargas, disparava). Sem classe = integral (Etapa B).
  - HP do chefão: com classe, supõe proficiência − 0,3 nos 4 golpes (`HP_PROF_DISCOUNT`), igual para todas: o HP não depende da classe.
  - **Hoplita** (Força): Muralha de bronze +1 CA e +2 de dano em golpes de Força (+3 no nível 5; só CA quase não muda a vitória, o recuo custa só o resto do dia). Nv 5 Segundo fôlego: 1×/dia cura 1d10 + nível, sem carga, ocupa a rodada (contra-ataque).
  - **Peltasta** (Destreza): Golpe certeiro +1d3 em golpes de Destreza (1d4 no nível 5). Nv 5 Esquiva: 1×/dia o primeiro acerto do monstro vira raspão.
  - **Atleta de Olímpia** (Constituição): Fôlego olímpico +2 PV por nível. Nv 5 Vigor: 1×/dia o primeiro acerto de Constituição dá +1 de dano e cura 1 PV (em todo acerto dava +18 pp de vitória).
  - **Filósofo** (Intelecto): Mente afiada, Raio crítico com 19-20. Nv 5 Contemplação: +1 carga de Intelecto na sessão que cruza o pilar de estudo, até 2 por semana, dentro do teto diário de 4 (todo dia dava 97% de vitória).
  - "Luta" = o dia de combate (os PV voltam cheios a cada dia): todos os talentos de nível 5 são por dia, derivados do log (`combat_rounds.talent`); Contemplação conta `events.data.contemplacao` da semana.
  - Escolha no onboarding (2º passo) e, para perfis antigos, tela única "Escolha sua senda" antes da Home (`_layout`: abas protegidas por `profile.class`). Troca pelo Perfil, sem custo, no máximo 1 a cada 7 dias (a primeira escolha não conta); não apaga histórico, cargas nem XP.
  - Insígnia: losango com o glifo da classe no canto inferior esquerdo do avatar (slot próprio; adereços da loja ficam no busto e o pet no canto inferior direito). Ícones: shield-sword, spear, run-fast, script-text-outline.
  - Simulação da Etapa C (sem magias): típico por classe 75-94%, fraco ≤ 10%. Desde a Etapa D a simulação de classes roda com magias (abaixo).
  - v7: `profile.class`, `profile.class_changed`, `combat_rounds.hero_class/talent/heal`, `boss_weeks.legacy_hp`. Conquistas: A senda escolhida, Ainda de pé (Segundo fôlego), Pés de Hermes (Esquiva), Lampejo socrático (crítico com 19), Mestre das quatro sendas (golpe final com as 4 classes).
  - Conquistas de combate: Favor dos deuses (crítico), Mão firme (10 acertos), Inabalável (vencer sem recuar na semana), Golpe do sábio (derrubar com o Raio do Intelecto).
- **Magias (Etapa D, `lib/game/spells.ts`, tela `app/grimorio.tsx`):** grimório igual para as 4 classes; cada magia é a dádiva de um deus.
  - **Centelhas** (fragmentos do fogo roubado): +1 por dia ativo (>= 2 pilares) e +1 extra no dia dos 4 pilares (típico ~10/semana, fraco ~5). Teto = 2 + piso(nível/4), no máximo 6; o Filósofo guarda +1. Não expiram na segunda; o que passa do teto se perde. Saldo derivado: dia a dia, min(teto, saldo + ganho) − custo das magias do dia (`combat_rounds.spell_cost`), sem conta paralela. Desfazer ações que tiram o dia de "ativo" depois de gastar vira dívida (paga por dias novos). O teto usa nível/classe atuais para o histórico todo (subir o teto pode revelar até 1 centelha cortada antes; limite conhecido).
  - Conjurar ocupa a rodada (a criatura contra-ataca) e não gasta carga. Ataque de magia: d20 + mod Int + proficiência de magia contra a CA; resistência: a criatura rola d20 + `save` (0 a +2 por criatura, +1 a cada 4 níveis) contra CD = 8 + prof de magia + mod Int. Prof de magia = a do Intelecto (integral no Filósofo, −1 nas outras classes).
  - Preparadas = 2 + mod Int (mín. 1), Filósofo +2. Aprende ao atingir o nível mínimo. Preparar num espaço livre é livre; tirar gasta a troca do dia (1 por dia; tirar o excesso é livre). Grimório nunca aberto vem com as primeiras magias anotadas.
  - Patamar das magias = 1 + piso((nível−1)/4) (multiplica os dados). 12 magias: Flecha de Ártemis (1, nv 1, ataque de magia, 1d4 fixo), Bênção de Apolo (1, nv 1, cura 1d4/patamar + nível), Égide de Atena (1, nv 1, +2 CA no dia), Sandálias de Hermes (1, nv 2, próximo acerto vira raspão), Forja de Hefesto (1, nv 3, +1+patamar de dano nos próximos 3 golpes), Colheita de Deméter (1, nv 3, cura 1d4/patamar e +1 PV por rodada no dia), Fúria de Ares (1, nv 4, próximo golpe com vantagem e crítico 18-20), Raio de Zeus (2, nv 5, 1d4/patamar, nada se resistir), Maré de Posídon (2, nv 5, −2 no ataque da criatura no dia, nada se resistir), Lareira de Héstia (2, nv 6, golpe que faria recuar deixa com 1 PV e cura 1d8 + nível), Sombra de Hades (2, nv 7, 1d4/patamar agora e nas 2 rodadas seguintes; resistiu = metade agora), Fogo de Prometeu (3, nv 9, 1d6/patamar, metade se resistir).
  - Semente: fluxo próprio do herói na magia (`roundSeed ^ sal`); o dado do monstro é o mesmo de um golpe naquela rodada; rodadas antigas não mudam. Efeitos ativos refeitos do log do dia (`activeFx`: magia que pegou + consumos gravados em `combat_rounds.fx`); não se relança um efeito ativo.
  - **Magia é bônus** (decisão do dono, opção B): quem nunca abre o Grimório vence >= 65%. Simulação (104 semanas; IA: cura abaixo de 40% PV, dádiva no começo do dia se sobra para o dano, dano sempre que há centelhas), Hoplita/Peltasta/Atleta/Filósofo:
    - com magia: semana 1 90/88/88/92%, semana 3 92/90/96/89%, 1 mês 93/90/96/90%, 3 meses 91/90/93/96%;
    - sem conjurar: semana 1 66/67/65/66%, semana 3 73/67/68/74%, 1 mês 69/67/68/74%, 3 meses 75/74/81/82%;
    - fraco: com magia ≤ 9%, sem magia ≤ 5%.
  - Calibragem: HP ×1,11 (0,12 deixava a semana 1 sem magia em 64%); Flecha sem vantagem e sem Int (com vantagem o fraco passava de 12%); Zeus 1d4/patamar e nada se resistir (Atleta passava de 97% no nível 5-8); Prometeu 1d6/patamar e Apolo 1d4/patamar (3 meses passava de 97%).
  - v8: `profile.spells` (JSON), `profile.spells_swapped`, `combat_rounds.spell/spell_cost/spell_ok/fx`. Conquistas: Fagulha roubada (1ª magia), Voz dos deuses (10 magias), O fogo devolvido (Fogo de Prometeu), Desígnio divino (chefão derrubado por magia).
- **Itens de combate (Etapa E, `lib/game/gear.ts`, telas `app/arsenal.tsx` e aba Armaria da loja):**
  - 20 equipamentos, 5 slots (arma 6, armadura 4, escudo 3, amuleto 4, anel 3), 4 raridades (6 comuns, 5 incomuns, 4 raros, 5 lendários). Nomes gregos.
  - **Equipado** (um por slot) dá a parte física: CA da armadura (+1 leve, +2 média, +3 pesada) e do escudo (+1/+2), dado da arma (comum/incomum 1d8, raro/lendário 1d10; sem arma 1d6). Desde a Etapa E o dado da arma vale também na Investida de Constituição (58% das cargas do típico); o Raio do Intelecto fica 1d8.
  - **Sintonizado** (máx. 3) soma o atributo (+1 comum, +2 incomum, +3 raro/lendário; teto 22) e a habilidade do lendário. Amuleto e anel só valem sintonizados. Equipar sintoniza sozinho se houver vaga.
  - Lendários: Lança do Pélion (golpes com a arma críticos com 19-20), Escudo polido de Perseu (o primeiro golpe de cada dia tem vantagem), Anel de Giges (o primeiro acerto da criatura em cada dia erra), Colar de Mnemósine (a primeira magia de cada semana não gasta centelhas), Pele do Leão de Nemeia (−1 em todo contra-ataque; só pela conquista "Os doze trabalhos"). Uso derivado das marcas em `combat_rounds.fx` (perseu, giges, mnemosine, nemeia).
  - **Aquisição:** Armaria vende comuns (150) e incomuns (320). O típico ganha ~430 moedas/semana (água 147, refeições 63, estudo 56, treinos 34, missões ~70, baú ~60); com metade em armas, 1 comum por semana ou 1 incomum a cada 2. Baú: 60% equipamento (raridade 45/30/18/7%), duplicata vira moedas (40/80/150/250).
  - **Troca:** livre fora de combate; no dia em que houve qualquer rodada o arsenal trava até a meia-noite (PV e habilidades são por dia).
  - **HP do chefão:** herói sem itens + 90% do ganho de dano por carga do MELHOR arsenal que possui (`bestGeared`; não o vestido: desequipar antes da segunda não amolece a criatura). Item comprado no meio da semana vale inteiro até a segunda.
  - Simulação (104 semanas; arsenal acumulado com metade das moedas e baú semanal; IA sintoniza pelo peso das cargas): sem magia semana 1/3/1 mês/3 meses 65-67 / 69-71 / 77-84 / 81-85%; com magia 88-92 / 90-95 / 92-96 / 92-97%; fraco com tudo ≤ 9%. Limite: um Filósofo que sintoniza tudo em Intelecto chega a ~95% sem magia aos 3 meses.
  - v9: `gear_equipped.attuned`. Conquistas: Bronze nas mãos, Relíquia dos heróis, Três laços, Panóplia completa, Os doze trabalhos (12 chefões, dá a Pele de Nemeia).
- **Missões:** 3 por dia sorteadas (determinístico pela data) de um banco de 43; parte se conclui automaticamente pelos eventos, parte é manual; todas podem ser desfeitas.
- **Conquistas:** 47, com ícone, descrição, progresso e data; desbloqueio permanente, recompensa em moedas paga uma vez.
- **Loja:** 19 itens — cores do avatar, adereços (diadema, louros, elmo, capa, áspis, tocha), temas do app (Brasa do Olimpo, Mar Egeu) e pets (coruja de Atena, águia, Pégaso...). Um item por slot; avatar e tema refletem o equipado.

## Design (resumo de docs/design.md)
- Escuro é o principal: obsidiana quente (#110F0D), cards #1A1714, bordas de bronze; claro: mármore/pergaminho.
- Brasa (#E8622A) só para CTA principal, chama e XP. Ouro/bronze para ornamento e recompensa.
- Cores dos atributos: Força terracota, Destreza verdete, Constituição oliva, Intelecto ametista discreta (água segue azul-egeu, token `water`).
- Tipografia: Cinzel (títulos, números, botões, rótulos) + Inter (corpo).
- Ornamentos gregos sutis: friso meandro (chave grega) em cards de peso, medalhão de nível, avatar como busto de estátua em moldura de bronze (Guerreiro, Oráculo, Titã), moeda = óbolo.
- Ícones vetoriais (MaterialCommunityIcons). **Proibido:** emoji como ícone, gradiente roxo/azul, neon, glassmorphism, cards genéricos iguais, cantos "bolha", Alert nativo (usar modal próprio), esquecer safe-area insets.
- Abas (6): Início, Água, Treino, Comida, Estudo, Amigos. Perfil, loja, conquistas, chefão (e futuramente histórico, Wrappeds, configurações) pelo avatar no topo da Home.

## Status (06/10/2026)
- ✅ Etapa 1 — lógica de jogo, banco local, onboarding, Home.
- ✅ Identidade visual Prometeu.
- ✅ Etapa 2 — Água, Treino, Alimentação.
- ✅ Etapa 3 — chefão + baú, missões, streak com escudos, conquistas, loja, perfil hub.
- ✅ Acréscimo — 4º atributo Intelecto + aba Estudo.
- ✅ Etapa A — atributos D&D (Força, Destreza, Constituição, Intelecto; valor 8-20 + modificador), equipamentos (lógica + tabelas), migration v5.
- ✅ Etapa B — combate por rodadas (cargas, d20 com semente, CA, proficiência, PV, recuo, dívida), migration v6, tela de combate.
- ✅ Etapa C — classes (Hoplita, Peltasta, Atleta de Olímpia, Filósofo), talentos, escolha/troca de senda, reescala do chefão antigo, migration v7.
- ✅ Etapa D — magias: centelhas, grimório universal de 12 magias, conjurar no combate, migration v8.
- ✅ Etapa E — itens de combate: Armaria, baú com equipamento, Arsenal (equipar/sintonizar), lendários, panóplia no avatar, migration v9. Sistema de RPG A–E concluído.
- Testes: 152 Jest passando; tsc limpo. ESLint (expo lint) tem 11 avisos/erros antigos de react-hooks em telas/componentes da etapa 3.

## Roteiro D&D (uma etapa por vez)
- A. ✅ Fundação dos atributos (acima).
- B. ✅ Combate com rodadas ativas contra o chefão (acima).
- C. ✅ Classes (acima).
- D. ✅ Magias / grimório (acima).
- E. ✅ Itens de combate e baú (acima). Sistema de RPG concluído.

## Próximas etapas (uma por vez, mostrar resultado antes de seguir)
4. **Notificações locais** (expo-notifications — exige rebuild): lembretes de água em horários configuráveis (param ao bater a meta), lembrete de treino, aviso de streak em risco às 20h, Wrapped pronto aos domingos 19h. **Histórico:** calendário de dias ativos e gráficos de 7 e 30 dias por pilar. Configurações.
5. **Wrapped semanal** estilo stories (tela cheia, toque para avançar, barra de progresso, reanimated), 8 cards: litros de água (equivale a X garrafas de 2L), minutos/nº de treinos e tipo favorito, refeições e % boas, melhor dia, atributo que mais evoluiu (considera os 4), resultado do chefão, comparação com a semana anterior (↑↓ por pilar), "título da semana" por regras (ex.: Guerreiro Hidratado, Máquina de Treino, Chef Saudável, Em Recuperação). Card final 9:16 compartilhável (react-native-view-shot + expo-sharing). Wrappeds antigos em Perfil > "Meus Wrappeds". Cálculo em função pura testável `lib/game/wrapped.ts`.
6. **Widget Android** (react-native-android-widget + config plugin): 2x2 (copos hoje/meta, botão +1 copo sem abrir o app, streak) e 4x2 (+ nível e barra de XP); toque fora abre a Home; atualiza quando água/treino/XP mudam, inclusive no clique do widget.
7. **Supabase (Auth + Postgres + Realtime) — amigos e desafios:** login Google e magic link; perfil público (nome, avatar, nível, streak, código de amigo de 6 caracteres); adicionar amigo por código ou deep link. Desafios de 3/7/14 dias, 2–10 participantes: Corrida (mais copos/minutos de treino/dias ativos), Cooperativo (chefão com HP proporcional ao grupo), Duelo 1x1 (mais dias ativos). Ranking ao vivo, barras, contagem regressiva, feed com reações. Recompensas: medalha exclusiva + moedas. Privacidade: só totais agregados (nunca detalhes de refeições). Fila local de eventos sincronizada quando houver internet. Schema SQL com RLS em todas as tabelas: profiles, friendships, challenges, challenge_participants, challenge_progress, activity_feed, reactions. Push (Expo): convite, alguém te ultrapassou, desafio terminando em 24h, resultado. Variáveis `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` em `.env`.

README final deve explicar: rodar com development build, configurar Supabase e aplicar migrations, gerar APK com `eas build -p android --profile preview`.
