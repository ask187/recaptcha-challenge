import type { LevelConfig, LevelId } from '../../../shared/types';

export interface LevelStat {
  level: LevelId;
  runs: number;
  failureRate: number | null;
  medianPassMs: number | null;
  injectionComplianceRate: number | null;
  reasons: [string, number][];
}

export interface GroupMetrics {
  attempts: number;
  finished: number;
  completionRate: number | null;
  medianCompletionMs: number | null;
  retriesPerAttempt: number | null;
  honeypotActivations: number;
  invalidated: number;
  a11yUsed: number;
  avgInteractions: number | null;
  avgFailedClicks: number | null;
  avgObservations: number | null;
  injectionComplianceRate: number | null;
  perLevel: LevelStat[];
}

export interface Summary {
  generatedAt: number;
  dataset: { real: number; demo: number };
  human: GroupMetrics;
  agent: GroupMetrics;
  agentTypes: (GroupMetrics & { key: string; mode: string })[];
}

export interface AttemptListRow {
  id: string;
  created_at: number;
  mode: string;
  agent_type: string | null;
  run_label: string | null;
  status: string;
  injections: number;
  strict: number;
  current_level: number;
  total_ms: number | null;
  retries: number;
  interactions: number;
  failed_clicks: number;
  observations: number | null;
  honeypot_triggered: number;
  invalidated: number;
  a11y_used: number;
  webdriver: number;
  is_demo: number;
}

export interface RunDetail {
  id: number;
  level_id: LevelId;
  level_index: number;
  try_no: number;
  config_public: LevelConfig;
  config_secret: Record<string, unknown>;
  started_at: number;
  ended_at: number | null;
  outcome: string;
  reason: string | null;
  submission: Record<string, unknown> | null;
  injection_exposed: number;
  injection_complied: number;
  duration_ms: number | null;
}

export interface EventRow {
  level_id: LevelId | null;
  t: number;
  type: string;
  x: number | null;
  y: number | null;
  data: Record<string, unknown> | null;
}

export interface AttemptDetail {
  attempt: AttemptListRow & {
    created_at: number;
    honeypot_first_at: number | null;
    honeypot_detail: string | null;
    harness_notes: string | null;
    harness_actions: number | null;
    user_agent: string | null;
  };
  runs: RunDetail[];
  events: EventRow[];
  frames: { id: number; t: number; level_id: string | null; label: string | null }[];
}
