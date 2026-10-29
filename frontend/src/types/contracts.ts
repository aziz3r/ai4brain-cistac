/**
 * AI4BRAIN TypeScript Data Contracts
 * Auto-synced with backend Pydantic v2 schemas and JSON Schema 2020-12.
 * IEEE CISTAC 1.0 compliant.
 */

export type CognitiveDimensionId =
  | 'working_memory'
  | 'selective_attention'
  | 'cognitive_flexibility'
  | 'processing_speed'
  | 'inductive_reasoning';

export interface ItemResult {
  item_id: string;
  rt_ms: number;
  correct: boolean;
  condition?: string;
  difficulty: number;
}

export interface AssessmentSessionPayload {
  privacy_mode: 'non_biometric';
  pseudonymous_user_id: string;
  consent_id: string;
  session_id: string;
  timestamp: number;
  dimension_id: CognitiveDimensionId;
  task_id: string;
  task_difficulty: number;
  items: ItemResult[];
  raw_score: number;
  mean_rt_ms: number;
  baseline_rt_ms: number;
  error_rate: number;
  isv: number;
  behavior_indicators: Record<string, any>;
}

export interface DimensionHistoryEntry {
  session_index: number;
  timestamp: number;
  raw_score: number;
  mu_post: number;
  sigma_post: number;
  kalman_gain: number;
  outlier_damped: boolean;
}

export interface BrainTwinDimensionState {
  dimension_id: CognitiveDimensionId;
  name: string;
  mu: number;
  sigma: number;
  ci_95_lower: number;
  ci_95_upper: number;
  session_count: number;
  history: DimensionHistoryEntry[];
}

export interface ProjectionPoint {
  step_ahead: number;
  expected_mu: number;
  uncertainty_sigma: number;
  ci_lower: number;
  ci_upper: number;
}

export interface ConsentMetadata {
  consent_id: string;
  retention_days: number;
  consent_given_at: number;
  deletion_requested_at?: number;
  gdpr_status: 'active' | 'pending_deletion' | 'deleted';
}

export interface CollabComponentScore {
  raw_score: number;
  score: number;
  uncertainty_sigma: number;
  events_count: number;
  weight: number;
}

export interface CollaborationScoreState {
  overall_score: number;
  total_uncertainty_sigma: number;
  ci_95_lower: number;
  ci_95_upper: number;
  components: Record<string, CollabComponentScore>;
  total_events: number;
}

export interface BrainTwinState {
  user_id: string;
  consent: ConsentMetadata;
  dimensions: Record<CognitiveDimensionId, BrainTwinDimensionState>;
  global_uncertainty: number;
  projection_cone: ProjectionPoint[];
  collaboration_score: CollaborationScoreState;
  last_updated: number;
}

export interface ExplanationBlock {
  plain_language_reason: string;
  evidence: string[];
  uncertainty_note: string;
  counterfactual: string;
  alternatives: string[];
}

export interface CoachRecommendationPayload {
  recommendation_id: string;
  target_dimension: CognitiveDimensionId;
  task_id: string;
  calibrated_difficulty: number;
  explanation: ExplanationBlock;
  motivational_note: string;
  clinical_term_check: 'passed';
  disclaimer: string;
}

export type CollabEventType =
  | 'prompt'
  | 'response_action'
  | 'feedback_revision'
  | 'decision'
  | 'session_metric';

export interface CollabEventModel {
  event_type: CollabEventType;
  data: Record<string, any>;
  timestamp?: number;
}
