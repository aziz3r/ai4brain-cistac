/**
 * Label mapping and language rules.
 * Never show raw IDs or percentages; plain English only.
 */

export const DIMENSION_MAP: Record<string, { label: string; description: string }> = {
  working_memory: {
    label: 'Memory',
    description: 'Holding and updating information'
  },
  selective_attention: {
    label: 'Focus',
    description: 'Staying on what matters despite distractions'
  },
  inhibitory_control: {
    label: 'Focus',
    description: 'Staying on what matters despite distractions'
  },
  cognitive_flexibility: {
    label: 'Flexibility',
    description: 'Switching between rules or ideas'
  },
  processing_speed: {
    label: 'Speed',
    description: 'How quickly you take in and respond'
  },
  inductive_reasoning: {
    label: 'Reasoning',
    description: 'Spotting patterns and rules'
  }
};

export const TASK_MAP: Record<string, { name: string; dimensionId: string }> = {
  spatial_n_back: { name: 'Grid Memory', dimensionId: 'working_memory' },
  nback_spatial: { name: 'Grid Memory', dimensionId: 'working_memory' },
  flanker_arrows: { name: 'Arrow Focus', dimensionId: 'selective_attention' },
  flanker: { name: 'Arrow Focus', dimensionId: 'selective_attention' },
  stroop: { name: 'Arrow Focus', dimensionId: 'selective_attention' },
  task_switching_cued: { name: 'Rule Switch', dimensionId: 'cognitive_flexibility' },
  task_switching: { name: 'Rule Switch', dimensionId: 'cognitive_flexibility' },
  speed_choice_rt: { name: 'Quick Reaction', dimensionId: 'processing_speed' },
  choice_rt: { name: 'Quick Reaction', dimensionId: 'processing_speed' },
  matrix_reasoning: { name: 'Pattern Puzzle', dimensionId: 'inductive_reasoning' }
};

export function getDimensionLabel(id: string): string {
  return DIMENSION_MAP[id]?.label || id;
}

export function getDimensionDescription(id: string): string {
  return DIMENSION_MAP[id]?.description || '';
}

export function getTaskName(taskId: string): string {
  return TASK_MAP[taskId]?.name || taskId;
}

export function formatScore(score: number): string {
  return `${Math.round(score)} / 100`;
}

export function formatRange(lower: number, upper: number): string {
  return `about ${Math.round(lower)}–${Math.round(upper)}`;
}

export function getConfidenceBadge(sigma: number): { label: string; color: string } {
  if (sigma > 12) {
    return { label: 'Early estimate', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' };
  }
  if (sigma >= 6) {
    return { label: 'Getting clearer', color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' };
  }
  return { label: 'Stable', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' };
}

export function getDifficultyBadge(diff: number): { label: string; dots: number } {
  if (diff <= 0.75) return { label: 'Easy', dots: 1 };
  if (diff <= 1.25) return { label: 'Medium', dots: 2 };
  return { label: 'Hard', dots: 3 };
}
