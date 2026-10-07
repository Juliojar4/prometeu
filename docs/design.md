# Prometeu: guia visual

Tema: o titã que roubou o fogo. Fogo = esforço e evolução; streak = chama; chefão = provação. Escuro é o tema principal (obsidiana + brasa); claro é mármore/pergaminho.

## Paleta (`constants/theme.ts`, via `useTheme()`)
| Papel | Escuro | Claro |
|---|---|---|
| `bg` | #110F0D obsidiana | #F2EDE2 mármore |
| `card` / `card2` | #1A1714 / #231F1A | #FBF8F1 / #EAE3D3 |
| `track` (sulco de barra) | #0B0A09 | #DDD3BE |
| `border` (bronze apagado) | #3A3026 | #CBBE9F |
| `text` / `sub` | #EDE3D0 / #A39683 | #2A231B / #6B6051 |
| `ember` / `primary` (chama, ação principal) | #E8622A | #C4501B |
| `bronze` / `gold` (ornamento, números, moeda) | #B98A4A / #D9B26B | #86602B / #9A7125 |
| `danger` (chefão) | #C4452F | #A8341F |
| `attr.forca` terracota / `destreza` verdete / `constituicao` oliva / `intelecto` ametista | #D1633A / #56AFA2 / #8FA05A / #A98BD0 | #B5471F / #1A675E / #5F6F34 / #6A4B9C |
| `water` azul-egeu (ânfora, não é atributo) | #5C8DBA | #2F5F8C |

Regra: brasa é raridade (CTA principal, chama, XP). Ouro/bronze é ornamento e recompensa. Nunca outra cor de destaque.

## Tipografia
- `Cinzel` (`F.display`, `F.displayBlack`): títulos, números de destaque, botões, rótulos de seção. Sempre em caixa-alta ou números; use `letterSpacing` 1.5 a 3 em rótulos.
- `Inter` (`F.body`, `bodyMed`, `bodySemi`): todo o resto.
- Use `<T>` (aplica a família certa; `serif` = Cinzel; `fontWeight >= 600` escolhe a variante). Não use `fontWeight` com `fontFamily` próprio fora do `<T>`: no Android ele não troca de peso.
- Escala: 11-12 legenda, 15 corpo, 17-22 título de card, 26-34 hero.

## Princípios
- Escuro primeiro; contraste AA (texto sobre card >= 4.5:1).
- Raios moderados: `radius.sm 6 / md 10 / lg 14`. Nada de pílulas/bolhas, exceto círculos reais (avatar, medalhão, moeda).
- Hierarquia por tipografia e respiro (padding de tela 20, gap entre seções 20-24), não por sombra. Escuro: sem sombra, só borda de bronze. Claro: sombra curta e quente (`shadow(t)`).
- Frisos (meandro) só em cards de peso (herói, chefão, hero do onboarding). Um por tela é o ideal.
- Ações principais na metade inferior; CTA fixo no rodapé somando `insets.bottom`.
- Animação discreta (reanimated): barras com `ease-out` ~800 ms, chama oscilando 600-900 ms, botão 0.97 ao toque.
- Edge-to-edge: toda tela com conteúdo no topo soma `insets.top`; a tab bar soma `insets.bottom` na altura e no padding.

## Componentes (`components/`)
- `ui.tsx`: `Card` (`frieze` = meandro no topo), `T`, `SectionTitle`, `Bar` (sulco + aro de bronze + realce + graduação em quartos + ponta quente), `Button` (`primary` brasa / `ghost` bronze), re-exporta `Meander` e `Divider`.
- `Meander.tsx`: `Meander` (friso de chave grega feito com Views; `cell` = espessura) e `Divider` (filete com losango; `meander` = friso).
- `Medallion.tsx`: `Medallion` (nível) e `Coin` (obolo).
- `Flame.tsx`: `Flame` (streak, animada; `lit={false}` apaga).
- `AttrIcon.tsx`: `AttrIcon` por atributo (+ `ATTR_GLYPH`) e `AttrRows` (lista da Home e do perfil: valor em Cinzel, " · modificador" em Inter, barra até o próximo valor). Lista em linhas, nunca grade de 4 cards iguais.
- `Avatar.tsx`: busto de estátua em moldura de bronze; 3 variantes (Guerreiro, Oráculo com louros, Titã; o rótulo "Hoplita" ficou só para a classe); `tired` dessatura e põe selo de sono. Ids no banco: `raposa`, `dragao`, `robo` (não mudar).
- `Placeholder.tsx`: tela "em breve" (`icon`, `title`, `line`).
- `Confetti.tsx`: paleta bronze/brasa.

Ícones: `MaterialCommunityIcons` (`@expo/vector-icons`). Abas (6): pillar, water-outline, dumbbell, food-apple-outline, book-open-page-variant-outline (Estudo), account-group-outline. Atributos: sword (Força), feather (Destreza), heart-pulse (Constituição), book-open-page-variant (Intelecto). Chefão: skull-outline (derrotado: crown-outline).

## Etapa 3 (chefão, missões, conquistas, loja)
- `Modal.tsx`: `AppModal` (cortina + cartão de bronze, `frieze` opcional) e `ConfirmModal` (`destructive`, `busy`). Nunca use `Alert` nativo.
- `BossEmblem`: losango duplo de bronze + glifo da criatura (derrotado: ouro + coroa). `Chest`: baú em Views (treme, tampa sobe, luz e moedas).
- `AchievementBanner`: banner no topo (fila), montado no `_layout`. `ItemArt`/`RarityMarks`: prévia do item e raridade em losangos (1 a 4), sem cores extras.
- Temas da loja: `constants/theme.ts` (`THEMES`), cada um com variante escura e clara; `useTheme()` lê o tema equipado (e `ThemePreview` para prévia). O tema só troca superfícies/bordas/texto/acento; atributos e perigo ficam.
- Avatar reflete cor (fundo/aro), adereços (diadema, louros, elmo, capa, áspis, tocha) e pet (medalhão no canto). `look` força uma aparência (prévia).
- Rotas: `perfil` (hub), `chefao`, `combate`, `loja`, `conquistas`, todas como Stack com cabeçalho `PERFIL`/`PROVAÇÃO`/`COMBATE`/`LOJA`/`CONQUISTAS`.

## Regras de jogo (etapa 3)
- Chefão: 8 criaturas em rodízio fixo por semana (`bossInfoForWeek`, pura), zera na segunda. HP e ficha de combate: ver Etapa B.
- Baú: só se abre manualmente, com o chefão derrotado, **uma única vez** (`boss_weeks.chest_claimed`, UPDATE condicional). Se uma reversão "ressuscitar" o chefão antes de abrir, o botão some até derrotá-lo de novo; depois de aberto, a flag não volta (sem duplicar nem perder). Conteúdo: 50 a 90 moedas (múltiplos de 5) + 1 item ainda não possuído; se possui tudo, +100 moedas. Semente = semana (determinística).
- Missões automáticas: concluem sozinhas (e desfazem sozinhas se o gatilho for desfeito: copo, treino, refeição). Só as que o app criou (`data.auto`) são desfeitas automaticamente. Manuais: tocar conclui; tocar de novo pede confirmação para desfazer.
- Escudos: +1 a cada 7 dias ativos (máx 3); um dia falho consome um escudo sozinho. Mensagem acolhedora no dia seguinte ao consumo.
- Conquistas: desbloqueio permanente (desfazer ações não as revoga); recompensa em moedas paga uma vez.
- Loja: compra valida saldo/posse e já equipa; um item por slot (cor, tema, pet, cabeça, costas, mão).

## Intelecto (4º atributo)
- Sobe ao estudar e ler (aba Estudo, `app/(tabs)/estudo.tsx`): tipo (leitura, estudo/curso, idioma, revisão, outro), minutos (1 a 240), título e páginas opcionais, mais cronômetro de foco 15/25/45 min por timestamps.
- XP = minutos x multiplicador (leitura 1, estudo 1,2, idioma 1,2, revisão 1, outro 1) + 1 por 10 páginas lidas (bônus máx. 20). Moedas = XP/4 (máx. 40); 1 carga de ataque a cada 15 min (Etapa B).
- Pilar do estudo: >= 10 min no dia (`days.study`, em minutos). Dia ativo = 2 de 4 pilares; dias antigos (sem o campo) valem 0 e seguem válidos.
- "Meus livros" deriva dos eventos de leitura com título (`summarizeBooks`), sem tabela própria. `mostEvolved` (atributo que mais evoluiu, para o Wrapped) considera os 4 atributos.
- Ametista é só do Intelecto: não use como cor de destaque em outro lugar.

## Atributos D&D (Etapa A)
- Força, Destreza, Constituição, Intelecto. Valor 8 a 20 + modificador ("14 · +2") no lugar do antigo "Nv N". CA, proficiência e PV aparecem no combate e no perfil ("CA 10 · Prof +2 · PV 10", à direita do título Atributos).
- Verdete (pátina do bronze) é só da Destreza; contraste >= 5:1 sobre card/card2 em todos os temas (claro e escuro). Constituição herdou o oliva da Vitalidade.
- Os temas da loja não mudam as cores de atributo.

## Combate (Etapa B)
- Tela `app/combate.tsx`, sem rolagem: criatura no topo (BossEmblem 92 + CA/ataque/dado em Cinzel caixa-alta + barra de HP `danger`), d20 no meio, herói e controles na metade inferior.
- d20: hexágono de bronze feito com 3 pares de lados em Views e a face triangular (`card2`) ao centro; gira 720° e para no valor. Número em Cinzel: ouro no crítico, `danger` no 1 natural, `sub` no erro.
- Resultado em Cinzel caixa-alta ("ACERTOU · 5 DE DANO", "CRÍTICO", "ERROU"), conta em Inter abaixo, contra-ataque em `danger` quando acerta. Log curto (2 linhas, losango na cor do atributo; ouro nas magias).
- Acerto: tremor curto no emblema e número de dano subindo e sumindo; contra-ataque treme o painel do herói. Haptics: seleção ao rolar, médio no acerto, pesado + sucesso no crítico, leve ao levar dano, aviso no recuo.
- Cargas: 4 blocos iguais lado a lado (exceção consciente à regra de grade: são botões de escolha), borda de 2 px na cor do atributo quando escolhido, saldo em Cinzel; dívida em `danger` com o rótulo "dívida". CTA único com o nome do golpe ("Raio do Intelecto").
- PV do herói na barra oliva da Constituição. Recuo: painel com fogueira (`campfire` em brasa) e texto acolhedor no lugar dos controles. Chefão caído: painel em ouro com "Ver o baú".
- Home: card do chefão com HP, saldo por atributo (4 chips) e botão "Lutar" (fantasma "Recuado até amanhã" depois de recuar). `ChargeToast` no topo ao ganhar cargas ("+1 carga de Força"), cede lugar ao banner de conquista.

## Classes (Etapa C)
- `ClassPicker` (`components/ClassPicker.tsx`): lista de 4 linhas (não grade): insígnia, nome em Cinzel, atributo em Cinzel na cor do atributo + lema; a escolhida ganha fundo `card2`, borda e filete esquerdo de 3 px na cor do atributo, e se abre com a frase e os dois talentos (selo "NV 1"/"NV 5"; o bloqueado fica esmaecido). Losango à direita marca a escolha.
- `ClassBadge`: losango (quadrado a 45°) com borda e véu na cor do atributo e o glifo ao centro. Usado na lista, no perfil (ao lado do nome da classe em ouro) e no cabeçalho do herói no combate.
- Avatar: insígnia no canto inferior esquerdo (losango `card2` com aro de ouro e glifo na cor do atributo), só em tamanhos >= 56. Não disputa com adereços (no busto) nem com o pet (inferior direito).
- Tela "Escolha sua senda" (`app/senda.tsx`): avatar com a insígnia da escolha, título em Cinzel, meandro, texto curto e CTA fixo no rodapé. Na primeira vez sem cabeçalho; na troca, cabeçalho SENDA e aviso de quando poderá trocar de novo.
- Combate: o rótulo HERÓI vira o nome da classe com a insígnia; linha de talento abaixo dos PV ("Segundo fôlego pronto", "Esquiva usada hoje"...); Segundo fôlego é botão fantasma acima do CTA (continua um só `primary`).

## Magias (Etapa D)
- Magia é bônus, nunca obrigação: nada na UI cobra o Grimório (sem selos de alerta, sem "você ainda não conjurou"); o Conjurar é botão fantasma, o golpe continua o único `primary`.
- `components/Spell.tsx`: `GodSeal` (disco com aro duplo ouro/bronze e o glifo do deus; Prometeu em brasa; selada = esmaecida), `SparkPips` (custo em chamas pequenas `fire` em brasa), `SparkCount` ("3/4 centelhas"; dívida em `danger`), `ActiveFx` (efeitos ativos: glifo + duração, borda de bronze, raio 6) e `SpellBurst` (halo dourado que cresce e some + glifo do deus subindo, ~1 s, sobre o d20).
- Glifos: Ártemis bow-arrow, Apolo white-balance-sunny, Atena shield-sun, Hermes weather-windy, Hefesto anvil, Deméter barley, Ares axe-battle, Zeus lightning-bolt, Posídon waves, Héstia fireplace, Hades weather-night, Prometeu torch. Centelha = `fire`.
- Grimório (`app/grimorio.tsx`): códice, não grade. Cabeçalho com livro, título "DÁDIVAS DO OLIMPO", um meandro; livro-razão de 3 colunas entre filetes (centelhas, preparadas, troca de hoje); folhas em sequência (Preparadas com filete esquerdo de ouro, Aprendidas, Seladas) separadas por filetes de bronze. Cada folha: selo, nome em Cinzel, "DEUS · TIPO" em Cinzel bronze, efeito com o dado do patamar atual, custo em chamas, ação PREPARAR/TIRAR (losango). Seladas mostram cadeado e "nível N". Avisos ("troca usada", "espaços cheios") num aviso fixo no rodapé.
- Combate: botão fantasma "Conjurar" com o saldo de centelhas (ao lado do "Fôlego" do Hoplita, mesma linha); abre um `AppModal` com as preparadas (selo, nome, custo, efeito; indisponível esmaecido com o motivo) e "Abrir o grimório". Resultado da magia em Cinzel ouro ("RAIO DE ZEUS · 9 DE DANO", "MARÉ DE POSÍDON · RESISTIU"), conta da resistência/ataque em Inter. Efeitos ativos ao lado da linha de talento. CA e ataque exibidos já com Égide/Maré.
- Home: "3/4 centelhas" sob o número da chama (toque abre o grimório). Perfil: saldo sob os escudos e linha "Grimório" nos Salões. `ChargeToast` junta "+1 centelha" ao fechar o 2º (ou 4º) pilar; ícone `fire` quando só há centelha.

## Itens de combate (Etapa E)
- `GearArt` (`components/ItemArt.tsx`): glifo do item sobre losango `card2` com aro de bronze (raro: aro de ouro). Lendário: aro de ouro de 2 px, glifo em ouro e um halo dourado translúcido (opacidade 0,12); é o único brilho. `dim` esmaece (duplicata). Raridade sempre com `RarityMarks` (`gear={rarity}`): 1 a 4 losangos, sem cor nova.
- Glifos: gládio `sword`, funda `bullseye`, arco `bow-arrow`, clava `mace`, cópis `sickle`, lança `spear`, linotórax `tshirt-crew`, escamas `tshirt-v`, couraça musculada `weight-lifter`, Nemeia `paw`, pelta `shield-half-full`, hóplon `shield`, Perseu `mirror`, Dodona `seed-outline`, coruja `owl`, Graias `eye-circle-outline`, Mnemósine `necklace`, anéis `ring`/`circle-double`. Arsenal = `shield-sword-outline`; sintonia = `link-variant` (desfeita: `link-variant-off`).
- Arsenal (`app/arsenal.tsx`): avatar 96 + "PANÓPLIA" (CA, PV e 3 losangos de sintonia), um meandro, aviso de trava (cadeado bronze) quando já houve rodada no dia. Cinco linhas, uma por slot (não grade): rótulo do slot em Cinzel bronze, nome, efeito ("CA +2 · +2 Constituição", a parte sintonizada em ouro); sintonizado = borda de ouro e filete esquerdo de 3 px. À direita, a ação SINTONIZAR/SINTONIA. Tocar na linha abre `AppModal` com os itens daquele slot e "Deixar vazio". Abaixo: a relíquia (habilidade do lendário sintonizado) e os 4 atributos com o valor efetivo (ouro quando o item soma). CTA fantasma fixo no rodapé: "Armaria".
- Loja: 5ª aba "ARMARIA" (abre direto com `/loja?aba=armaria`): mesmos cartões em 2 colunas, `GearArt` no lugar da prévia, "SLOT · ATRIBUTO" em Cinzel bronze. Prévia mostra o que vale ao equipar e, em ouro, o que vale sintonizado.
- Baú: "NOVO EQUIPAMENTO" ou "REPETIDO · +N MOEDAS" (arte esmaecida) no mesmo cartão do item; botão fantasma "Abrir o arsenal".
- Avatar: panóplia no canto superior esquerdo (slot próprio, tamanhos >= 56): escudo = disco `card2` com aro (ouro se lendário), arma = glifo por cima (sem escudo, losango pequeno). Não disputa com adereços (no busto), cansaço (superior direito), insígnia (inferior esquerdo) e pet (inferior direito). A prévia da loja (`look`) não mostra a panóplia.
- Combate: ícone `shield-sword-outline` bronze ao lado de CA/PV abre o Arsenal; habilidades na linha de talento ("Giges pronto", "Mnemósine usada na semana"); contra-ataque com Giges/Nemeia em verdete/texto próprio; "de graça (Mnemósine)" no modal de conjurar.

## O que NÃO fazer
- Emoji como ícone ou texto de interface (nem em avatares, rótulos, botões).
- Gradiente roxo/azul, neon, glassmorphism, cards todos iguais com sombra suave genérica.
- Barras chapadas coloridas: use `Bar`.
- Fonte do sistema: sempre `<T>` ou `F.*`.
- Cantos "bolha" (raio > 14) em cards/botões; meandro em todo card.
- Mais de um botão `primary` por tela.
- Esquecer os insets de safe-area.
