// ────────────────────── Domain Types ──────────────────────────

export interface RiskCategory {
  id: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  priority: number;
  created_at: string;
}

export interface PolicyThreshold {
  id: number;
  policy_id: number;
  category_id: number;
  threshold_low: number;
  threshold_medium: number;
  threshold_high: number;
  strategy_low: string;
  strategy_medium: string;
  strategy_high: string;
  // Temporary editing state (local-only)
  _temp_threshold_low?: number;
  _temp_threshold_medium?: number;
  _temp_threshold_high?: number;
  _temp_strategy_low?: string;
  _temp_strategy_medium?: string;
  _temp_strategy_high?: string;
}

export interface Policy {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  thresholds: PolicyThreshold[];
}

export interface StrategyTemplate {
  id: number;
  strategy_code: string;
  system_prompt: string;
  user_message: string;
  is_active: boolean;
}

export interface RequestLogEntry {
  id: number;
  timestamp: string;
  request_text_hash: string;
  request_preview: string;
  detected_categories: Record<string, number>;
  max_risk_score: number;
  selected_strategy: string;
  policy_id: number;
  latency_ms: number;
  pii_detected: boolean;
  reviewed: boolean;
  review_correct: boolean | null;
  review_note: string;
  audit_priority: boolean;
}

export interface LogListResponse {
  total: number;
  items: RequestLogEntry[];
}

export interface DailyVolume {
  date: string;
  count: number;
  violations: number;
}

export interface LogStats {
  total_requests: number;
  average_latency_ms: number;
  p95_latency_ms: number;
  pii_detection_rate: number;
  violation_rate: number;
  strategy_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
  daily_volume: DailyVolume[];
}

// ────────────────────── UI Constants ──────────────────────────

export const STRATEGY_OPTIONS = [
  { value: 'ALLOW', label: 'ALLOW' },
  { value: 'SOFTEN', label: 'SOFTEN' },
  { value: 'CAUTION', label: 'CAUTION' },
  { value: 'CLARIFY', label: 'CLARIFY' },
  { value: 'REDIRECT', label: 'REDIRECT' },
  { value: 'REFUSE', label: 'REFUSE' },
] as const;

export const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  ALLOW: 'Разрешить запрос без изменений',
  SOFTEN: 'Смягчить тон ответа',
  CAUTION: 'Добавить предупреждение к ответу',
  CLARIFY: 'Запросить уточнение намерения',
  REDIRECT: 'Перенаправить запрос на безопасную тему',
  REFUSE: 'Отказ в обработке небезопасного контента',
};

export const STRATEGY_COLORS: Record<string, string> = {
  ALLOW: 'success',
  SOFTEN: 'processing',
  CAUTION: 'warning',
  CLARIFY: 'warning',
  REDIRECT: 'purple',
  REFUSE: 'error',
};

export const STRATEGY_HEX_COLORS: Record<string, string> = {
  ALLOW: '#10b981',
  SOFTEN: '#6366f1',
  CAUTION: '#f59e0b',
  CLARIFY: '#3b82f6',
  REDIRECT: '#8b5cf6',
  REFUSE: '#ef4444',
};

export const CATEGORY_COLORS: Record<string, string> = {
  HARMFUL: '#ef4444',
  VIOLENCE: '#f43f5e',
  HATE: '#d97706',
  MEDICAL: '#10b981',
  LEGAL: '#06b6d4',
  ILLEGAL: '#7c3aed',
  PII: '#3b82f6',
  NSFW: '#ec4899',
  SELFHARM: '#8b5cf6',
  SENSITIVE: '#64748b',
};

// ────────────────────── API Base ──────────────────────────

export const API_BASE = `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;
