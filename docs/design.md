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
| `attr.forca` terracota / `vitalidade` oliva / `energia` azul-egeu / `intelecto` ametista | #D1633A / #8FA05A / #5C8DBA / #A98BD0 | #B5471F / #5F6F34 / #2F5F8C / #6A4B9C |

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
- `AttrIcon.tsx`: `AttrIcon` por atributo (+ `ATTR_GLYPH`).
- `Avatar.tsx`: busto de estátua em moldura de bronze; 3 variantes (Hoplita, Oráculo com louros, Titã); `tired` dessatura e põe selo de sono. Ids no banco: `raposa`, `dragao`, `robo` (não mudar).
- `Placeholder.tsx`: tela "em breve" (`icon`, `title`, `line`).
- `Confetti.tsx`: paleta bronze/brasa.

Ícones: `MaterialCommunityIcons` (`@expo/vector-icons`). Abas (6): pillar, water-outline, dumbbell, food-apple-outline, book-open-page-variant-outline (Estudo), account-group-outline. Atributos: sword, leaf, waves, book-open-page-variant (Intelecto). Chefão: skull-outline (derrotado: crown-outline).

## Etapa 3 (chefão, missões, conquistas, loja)
- `Modal.tsx`: `AppModal` (cortina + cartão de bronze, `frieze` opcional) e `ConfirmModal` (`destructive`, `busy`). Nunca use `Alert` nativo.
- `BossEmblem`: losango duplo de bronze + glifo da criatura (derrotado: ouro + coroa). `Chest`: baú em Views (treme, tampa sobe, luz e moedas).
- `AchievementBanner`: banner no topo (fila), montado no `_layout`. `ItemArt`/`RarityMarks`: prévia do item e raridade em losangos (1 a 4), sem cores extras.
- Temas da loja: `constants/theme.ts` (`THEMES`), cada um com variante escura e clara; `useTheme()` lê o tema equipado (e `ThemePreview` para prévia). O tema só troca superfícies/bordas/texto/acento; atributos e perigo ficam.
- Avatar reflete cor (fundo/aro), adereços (diadema, louros, elmo, capa, áspis, tocha) e pet (medalhão no canto). `look` força uma aparência (prévia).
- Rotas: `perfil` (hub), `chefao`, `loja`, `conquistas`, todas como Stack com cabeçalho `PERFIL`/`PROVAÇÃO`/`LOJA`/`CONQUISTAS`.

## Regras de jogo (etapa 3)
- Chefão: 8 criaturas em rodízio fixo por semana (`bossInfoForWeek`, pura). HP máx = 400 + 30 x (nível - 1), zera na segunda.
- Baú: só se abre manualmente, com o chefão derrotado, **uma única vez** (`boss_weeks.chest_claimed`, UPDATE condicional). Se uma reversão "ressuscitar" o chefão antes de abrir, o botão some até derrotá-lo de novo; depois de aberto, a flag não volta (sem duplicar nem perder). Conteúdo: 50 a 90 moedas (múltiplos de 5) + 1 item ainda não possuído; se possui tudo, +100 moedas. Semente = semana (determinística).
- Missões automáticas: concluem sozinhas (e desfazem sozinhas se o gatilho for desfeito: copo, treino, refeição). Só as que o app criou (`data.auto`) são desfeitas automaticamente. Manuais: tocar conclui; tocar de novo pede confirmação para desfazer.
- Escudos: +1 a cada 7 dias ativos (máx 3); um dia falho consome um escudo sozinho. Mensagem acolhedora no dia seguinte ao consumo.
- Conquistas: desbloqueio permanente (desfazer ações não as revoga); recompensa em moedas paga uma vez.
- Loja: compra valida saldo/posse e já equipa; um item por slot (cor, tema, pet, cabeça, costas, mão).

## Intelecto (4º atributo)
- Sobe ao estudar e ler (aba Estudo, `app/(tabs)/estudo.tsx`): tipo (leitura, estudo/curso, idioma, revisão, outro), minutos (1 a 240), título e páginas opcionais, mais cronômetro de foco 15/25/45 min por timestamps.
- XP = minutos x multiplicador (leitura 1, estudo 1,2, idioma 1,2, revisão 1, outro 1) + 1 por 10 páginas lidas (bônus máx. 20). Moedas = XP/4 (máx. 40); dano ao chefão = XP/2 (máx. 60).
- Pilar do estudo: >= 10 min no dia (`days.study`, em minutos). Dia ativo = 2 de 4 pilares; dias antigos (sem o campo) valem 0 e seguem válidos.
- "Meus livros" deriva dos eventos de leitura com título (`summarizeBooks`), sem tabela própria. `mostEvolved` (atributo que mais evoluiu, para o Wrapped) considera os 4 atributos.
- Ametista é só do Intelecto: não use como cor de destaque em outro lugar.

## O que NÃO fazer
- Emoji como ícone ou texto de interface (nem em avatares, rótulos, botões).
- Gradiente roxo/azul, neon, glassmorphism, cards todos iguais com sombra suave genérica.
- Barras chapadas coloridas: use `Bar`.
- Fonte do sistema: sempre `<T>` ou `F.*`.
- Cantos "bolha" (raio > 14) em cards/botões; meandro em todo card.
- Mais de um botão `primary` por tela.
- Esquecer os insets de safe-area.
