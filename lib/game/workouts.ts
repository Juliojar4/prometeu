import type { Intensity, WorkoutKind } from './habits';

export type QuickWorkout = { id: string; name: string; minutes: number; intensity: Intensity; kind: WorkoutKind; exercises: string[] };

export const QUICK_WORKOUTS: QuickWorkout[] = [
  {
    id: 'alongamento', name: 'Alongamento matinal', minutes: 7, intensity: 'leve', kind: 'alongamento',
    exercises: ['Rotação de pescoço: 30 s', 'Círculos de ombro: 30 s', 'Alongamento de tríceps: 30 s por lado', 'Flexão do tronco à frente: 45 s', 'Gato e vaca: 1 min', 'Postura da criança: 1 min', 'Alongamento de quadríceps: 30 s por lado', 'Respiração profunda: 1 min'],
  },
  {
    id: 'circuito', name: 'Circuito em casa', minutes: 12, intensity: 'media', kind: 'outro',
    exercises: ['Polichinelos: 40 s', 'Agachamento livre: 40 s', 'Flexão de braços (joelhos se precisar): 30 s', 'Prancha: 30 s', 'Afundo alternado: 40 s', 'Escalador: 30 s', 'Descanso de 20 s entre exercícios', 'Repita o circuito 2 vezes'],
  },
  {
    id: 'hiit', name: 'HIIT', minutes: 20, intensity: 'forte', kind: 'outro',
    exercises: ['Aquecimento: 3 min de marcha e mobilidade', 'Burpees: 40 s', 'Agachamento com salto: 40 s', 'Corrida parada com joelho alto: 40 s', 'Prancha com toque no ombro: 40 s', 'Descanso de 20 s entre exercícios', 'Repita 4 rodadas', 'Volta à calma: 3 min de alongamento'],
  },
];
