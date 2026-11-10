// Tipos centrais do CyberLab. A lógica de simulação (engine.ts) depende apenas destes tipos,
// nunca de componentes visuais.

export type EntityKind =
  | "alerta"
  | "evidencia"
  | "mensagem"
  | "dominio"
  | "ip"
  | "conta"
  | "ativo"
  | "arquivo";

export interface Entity {
  id: string;
  kind: EntityKind;
  label: string;
  /** Resumo visível desde o início (ou desde a revelação). */
  summary: string;
  /** Detalhe revelado apenas após `investigate <id>`. */
  finding: string;
  /** Linhas de log exibidas pelo comando `logs` após investigação. */
  logs?: string[];
  /** Se a entidade é relevante para a pontuação de investigação. */
  key?: boolean;
  /** Entidades que aparecem após investigar esta. */
  reveals?: string[];
  /** Começa oculta (revelada por investigação ou evento). */
  hidden?: boolean;
  severity?: "baixa" | "media" | "alta" | "critica";
}

export type DefenseVerb =
  | "report"
  | "block"
  | "quarantine"
  | "isolate"
  | "mitigate"
  | "reset"
  | "restore";

export interface Defense {
  verb: DefenseVerb;
  target: string;
  /** Rótulo curto do controle gráfico. */
  label: string;
  correct: boolean;
  /** Defesas corretas obrigatórias contam para a nota de defesa. */
  needed?: boolean;
  /** IDs de entidades investigadas ou defesas (verb:target) já aplicadas. */
  requires?: string[];
  requiresHint?: string;
  riskDelta: number;
  healthDelta?: number;
  /** Multiplicador sobre o tráfego de ataque/legítimo (missões de disponibilidade). */
  attackFactor?: number;
  legitFactor?: number;
  message: string;
  /** Explicação usada no relatório. */
  rationale: string;
  /** Falha crítica impeditiva: impede aprovação mesmo com nota alta. */
  critical?: string;
}

export interface Objective {
  id: string;
  label: string;
  required: boolean;
  investigated?: string[];
  applied?: string[];
  /** Lição da Academia sugerida para revisão quando não cumprido. */
  lesson: string;
}

export interface ScheduledEvent {
  id: string;
  atTick: number;
  /** O evento não ocorre se qualquer uma destas defesas já tiver sido aplicada. */
  unlessAny: string[];
  message: string;
  riskDelta: number;
  healthDelta?: number;
  reveal?: string[];
}

export interface Escalation {
  /** Defesas (verb:target) que, juntas, contêm o incidente. */
  containedWhen: string[];
  riskPerTick: number;
  healthPerTick: number;
  recoveryPerTick: number;
  /** Prazo didático (em ações) para conter o incidente. */
  deadline: number;
}

export interface MissionDef {
  id: string;
  order: number;
  module: string;
  title: string;
  org: string;
  incidentType: string;
  difficulty: "Introdutória" | "Básica" | "Intermediária" | "Avançada";
  objective: string;
  briefing: string;
  prereqMissions: string[];
  prereqLessons: string[];
  serviceName: string;
  initialRisk: number;
  initialHealth: number;
  entities: Entity[];
  defenses: Defense[];
  objectives: Objective[];
  events: ScheduledEvent[];
  escalation?: Escalation;
  traffic?: { legit: number; attack: number; attackGrowth: number };
  nextHint: string;
}

export type LineKind = "input" | "output" | "ok" | "error" | "warn" | "system";
export interface TermLine {
  kind: LineKind;
  text: string;
}

export interface TimelineEvent {
  tick: number;
  source: "terminal" | "painel" | "sistema";
  text: string;
  tone: "info" | "ok" | "erro" | "alerta";
}

export interface Sample {
  tick: number;
  risk: number;
  health: number;
  attack: number;
  legit: number;
}

export interface SimState {
  missionId: string;
  tick: number;
  risk: number;
  health: number;
  investigated: string[];
  revealed: string[];
  applied: string[];
  wrong: string[];
  firedEvents: string[];
  consequences: string[];
  critical: string | null;
  criticalAcknowledged: boolean;
  containedAt: number | null;
  status: "active" | "ended";
  terminal: TermLine[];
  /** Registro independente da tela; opcional para tentativas antigas. */
  commandHistory?: string[];
  timeline: TimelineEvent[];
  history: Sample[];
  invalidCommands: number;
  startedAt: number;
  endedAt: number | null;
}

export interface ScoreBreakdown {
  investigation: number;
  defense: number;
  objectives: number;
  time: number | null;
  total: number;
  passed: boolean;
  missedRequired: string[];
}

export interface Attempt {
  id: string;
  missionId: string;
  startedAt: number;
  endedAt: number;
  outcome: "concluida" | "reiniciada";
  score: ScoreBreakdown;
  actions: number;
  wrongActions: number;
  critical: string | null;
}
