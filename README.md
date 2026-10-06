# Prometeu

Hábitos viram XP: você é um personagem de RPG que sobe de nível bebendo água, treinando e comendo bem.
React Native + Expo (TypeScript), Expo Router, Zustand, expo-sqlite, reanimated. Offline-first, sem conta.

## Rodar (dev build, Android)

```bash
npm install
npx expo prebuild        # gera android/
npx expo run:android     # com emulador ou celular via USB
```

## Testes e checagens

```bash
npm test                 # Jest (lib/game)
npm run typecheck        # tsc --noEmit
```

## Estrutura

- `app/` rotas (Expo Router): onboarding, abas, perfil
- `components/` UI reutilizável
- `store/` Zustand (une `lib/db` + `lib/game`)
- `lib/game/` regras de jogo (funções puras, testadas)
- `lib/db/` SQLite: migrations e repositórios

## Supabase

_A completar (etapa 7). Copie `.env.example` para `.env`._

## APK

_A completar._ Perfil já configurado: `eas build -p android --profile preview`
