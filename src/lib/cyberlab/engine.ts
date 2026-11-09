// Motor de simulação: funções puras com transições explícitas.
// O terminal e o painel gráfico chamam a MESMA função `execute`, garantindo estado único.
import type {
  Defense,
  MissionDef,
  ScoreBreakdown,
  SimState,
  TermLine,
  TimelineEvent,
} from "./types";

export const PASS_SCORE = 70;
const MAX_INPUT = 80;
// Apenas identificadores simples: letras, números, hífen, ponto e barra (CIDR). Nada de shell.
const SAFE_ARG = /^[A-Za-z0-9][A-Za-z0-9.\-/]{0,40}$/;

export const INFO_COMMANDS: Record<string, string> = {
  help: "mostra os comandos válidos nesta missão",
  status: "estado atual: risco, serviço, contenção e tempo",
  alerts: "lista os alertas ativos",
  evidence: "lista evidências, ativos e indicadores visíveis",
  logs: "exibe os registros coletados nas investigações",
  objectives: "mostra os objetivos e o que falta",
  history: "lista os comandos executados nesta tentativa",
  clear: "limpa a tela do terminal (não apaga o histórico)",
};

export const ACTION_HELP: Record<string, string> = {
  investigate: "investigate <id> — analisa um alerta, evidência ou indicador",
  monitor: "monitor — observa o ambiente por um ciclo sem agir",
  report: "report <id> — registra o incidente/reporte formal do item",
  block: "block <id> — bloqueia um domínio, IP ou faixa",
  quarantine: "quarantine <id> — move uma mensagem para quarentena",
  isolate: "isolate <id> — isola um ativo da rede",
  mitigate: "mitigate <id> — aplica uma mitigação disponível",
  reset: "reset <id> — redefine credenciais e revoga sessões de uma conta",
  restore: "restore <id> — restaura o ativo a partir de imagem limpa",
  close: "close — encerra a tentativa e gera o relatório",
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
export const defenseId = (d: Pick<Defense, "verb" | "target">) => `${d.verb}:${d.target}`;

export function visibleEntities(def: MissionDef, s: SimState) {
  return def.entities.filter((e) => !e.hidden || s.revealed.includes(e.id));
}

export function isContained(def: MissionDef, s: SimState) {
  if (!def.escalation) return true;
  return def.escalation.containedWhen.every((id) => s.applied.includes(id));
}

function sample(def: MissionDef, s: SimState) {
  let attack = 0;
  let legit = 0;
  if (def.traffic) {
    attack = def.traffic.attack * (1 + def.traffic.attackGrowth * Math.min(s.tick, 10));
    legit = def.traffic.legit;
    for (const id of s.applied) {
      const d = def.defenses.find((x) => defenseId(x) === id);
      if (d?.attackFactor !== undefined) attack *= d.attackFactor;
      if (d?.legitFactor !== undefined) legit *= d.legitFactor;
    }
  }
  return {
    tick: s.tick,
    risk: Math.round(s.risk),
    health: Math.round(s.health),
    attack: Math.round(attack),
    legit: Math.round(legit),
  };
}

export function createInitialState(def: MissionDef, now = Date.now()): SimState {
  const base: SimState = {
    missionId: def.id,
    tick: 0,
    risk: def.initialRisk,
    health: def.initialHealth,
    investigated: [],
    revealed: [],
    applied: [],
    wrong: [],
    firedEvents: [],
    consequences: [],
    critical: null,
    criticalAcknowledged: false,
    containedAt: null,
    status: "active",
    terminal: [
      { kind: "system", text: `CyberLab SOC — sessão simulada · ${def.org}` },
      { kind: "system", text: "Ambiente isolado: nenhum comando atinge sistemas reais." },
      { kind: "output", text: 'Digite "help" para ver os comandos desta missão.' },
    ],
    timeline: [{ tick: 0, source: "sistema", text: "Chamado recebido pelo SOC.", tone: "info" }],
    history: [],
    invalidCommands: 0,
    startedAt: now,
    endedAt: null,
  };
  base.history = [sample(def, base)];
  return base;
}

function allowedVerbs(def: MissionDef) {
  return Array.from(new Set(def.defenses.map((d) => d.verb)));
}

export function helpLines(def: MissionDef): string[] {
  const lines = ["Comandos de consulta:"];
  for (const [k, v] of Object.entries(INFO_COMMANDS)) lines.push(`  ${k.padEnd(11)} ${v}`);
  lines.push("Comandos de ação:");
  for (const v of ["investigate", "monitor", ...allowedVerbs(def), "close"])
    lines.push(`  ${ACTION_HELP[v]}`);
  return lines;
}

/** Ponto único de entrada. Retorna um NOVO estado (imutável). */
export function execute(
  def: MissionDef,
  prev: SimState,
  rawInput: string,
  source: "terminal" | "painel" = "terminal",
): SimState {
  const input = rawInput.trim().slice(0, MAX_INPUT);
  const s: SimState = structuredClone(prev);
  if (!input) return prev;
  const out: TermLine[] = [{ kind: "input", text: `${source === "painel" ? "[painel] " : ""}$ ${input}` }];
  const say = (kind: TermLine["kind"], text: string) => out.push({ kind, text });
  const mark = (text: string, tone: TimelineEvent["tone"]) =>
    s.timeline.push({ tick: s.tick, source, text, tone });

  if (s.status === "ended") {
    say("error", "Tentativa encerrada. Reinicie a missão para uma nova tentativa.");
    s.terminal.push(...out);
    return s;
  }

  const parts = input.split(/\s+/);
  const cmd = (parts[0] ?? "").toLowerCase();
  const arg = parts[1];

  const KNOWN = [...Object.keys(INFO_COMMANDS), "investigate", "monitor", "close", ...allowedVerbs(def)];
  if (!KNOWN.includes(cmd)) {
    return reject(
      s,
      out,
      cmd in ACTION_HELP
        ? `"${cmd}" não está disponível neste cenário. Digite help.`
        : `Comando desconhecido: "${cmd}". Este terminal só aceita comandos da simulação. Digite help.`,
    );
  }
  if (parts.length > 2) return reject(s, out, "Apenas um argumento é aceito. Ex.: investigate ALR-101");
  if (arg !== undefined && !SAFE_ARG.test(arg))
    return reject(s, out, "Argumento inválido. Use apenas IDs exibidos no painel (letras, números, hífen).");

  const vis = visibleEntities(def, s);
  const findVisible = (id?: string) =>
    id ? vis.find((e) => e.id.toLowerCase() === id.toLowerCase()) : undefined;

  switch (cmd) {
    case "help":
      helpLines(def).forEach((l) => say("output", l));
      break;
    case "clear":
      s.terminal = [];
      return s;
    case "status": {
      say("output", `Risco atual: ${Math.round(s.risk)}/100 (${riskLabel(s.risk)})`);
      say("output", `${def.serviceName}: ${Math.round(s.health)}% — ${serviceLabel(s.health)}`);
      say("output", `Ciclo: ${s.tick}${def.escalation ? ` · prazo didático: ${def.escalation.deadline}` : ""}`);
      say(isContained(def, s) ? "ok" : "warn", isContained(def, s) ? "Incidente contido." : "Incidente NÃO contido.");
      if (s.critical) say("error", `Situação crítica: ${s.critical}`);
      break;
    }
    case "alerts": {
      const al = vis.filter((e) => e.kind === "alerta");
      if (!al.length) say("output", "Nenhum alerta ativo.");
      al.forEach((a) =>
        say("output", `  ${a.id.padEnd(10)} [${(a.severity ?? "media").toUpperCase()}] ${a.label}${s.investigated.includes(a.id) ? " ✓ investigado" : ""}`),
      );
      break;
    }
    case "evidence": {
      vis.filter((e) => e.kind !== "alerta").forEach((e) =>
        say("output", `  ${e.id.padEnd(14)} (${e.kind}) ${e.label}${s.investigated.includes(e.id) ? " ✓" : ""}`),
      );
      break;
    }
    case "logs": {
      const withLogs = def.entities.filter((e) => s.investigated.includes(e.id) && e.logs?.length);
      if (!withLogs.length) say("warn", "Nenhum registro coletado ainda. Investigue alertas e evidências primeiro.");
      withLogs.forEach((e) => {
        say("system", `── ${e.id} ──`);
        e.logs!.forEach((l) => say("output", l));
      });
      break;
    }
    case "objectives":
      def.objectives.forEach((o) =>
        say(objectiveMet(o, s) ? "ok" : "output", `  [${objectiveMet(o, s) ? "x" : " "}] ${o.label}${o.required ? " (obrigatório)" : ""}`),
      );
      break;
    case "history": {
      const inputs = s.terminal.filter((l) => l.kind === "input").map((l) => l.text);
      if (!inputs.length) say("output", "Nenhum comando executado.");
      inputs.forEach((t, i) => say("output", `  ${i + 1}. ${t}`));
      break;
    }
    case "investigate": {
      const ent = findVisible(arg);
      if (!arg) return reject(s, out, "Uso: investigate <id>. Veja os IDs com 'alerts' ou 'evidence'.");
      if (!ent) return reject(s, out, `"${arg}" não existe ou ainda não foi descoberto nesta missão.`);
      if (s.investigated.includes(ent.id)) {
        say("warn", `${ent.id} já foi investigado: ${ent.finding}`);
        break;
      }
      s.investigated.push(ent.id);
      say("ok", `Análise de ${ent.id}: ${ent.finding}`);
      for (const r of ent.reveals ?? []) {
        if (!s.revealed.includes(r)) {
          s.revealed.push(r);
          const re = def.entities.find((e) => e.id === r);
          say("system", `Novo item descoberto: ${r} — ${re?.label ?? ""}`);
        }
      }
      mark(`Investigou ${ent.id}`, "info");
      advance(def, s, say, mark);
      break;
    }
    case "monitor":
      say("output", "Monitorando o ambiente por um ciclo...");
      mark("Monitorou o ambiente sem agir", "info");
      advance(def, s, say, mark);
      break;
    case "close":
      s.status = "ended";
      s.endedAt = Date.now();
      say("system", "Tentativa encerrada. Gerando relatório...");
      mark("Encerrou a tentativa", "info");
      break;
    default: {
      const verbs = allowedVerbs(def);
      if (!(verbs as string[]).includes(cmd)) {
        const known = cmd in ACTION_HELP;
        return reject(
          s,
          out,
          known
            ? `"${cmd}" não está disponível neste cenário. Digite help.`
            : `Comando desconhecido: "${cmd}". Este terminal só aceita comandos da simulação. Digite help.`,
        );
      }
      if (!arg) return reject(s, out, ACTION_HELP[cmd] ?? "Argumento obrigatório.");
      const d = def.defenses.find((x) => x.verb === cmd && x.target.toLowerCase() === arg.toLowerCase());
      const ent = findVisible(arg);
      if (!d || !ent) return reject(s, out, `"${cmd}" não pode ser aplicado a "${arg}" neste cenário.`);
      const id = defenseId(d);
      if (s.applied.includes(id)) {
        say("warn", `Ação já aplicada: ${d.label}.`);
        break;
      }
      const missing = (d.requires ?? []).filter((r) => !s.investigated.includes(r) && !s.applied.includes(r));
      if (missing.length) {
        return reject(s, out, d.requiresHint ?? `Antes desta ação, conclua: ${missing.join(", ")}.`);
      }
      s.applied.push(id);
      s.risk = clamp(s.risk + d.riskDelta);
      if (d.healthDelta) s.health = clamp(s.health + d.healthDelta);
      if (d.correct) {
        say("ok", d.message);
        mark(d.label, "ok");
      } else {
        s.wrong.push(id);
        s.consequences.push(d.message);
        say("error", d.message);
        mark(`${d.label} (decisão inadequada)`, "erro");
      }
      if (d.critical && !s.critical) {
        s.critical = d.critical;
        say("error", `FALHA CRÍTICA: ${d.critical}`);
        mark(`Falha crítica: ${d.critical}`, "erro");
      }
      if (s.containedAt === null && def.escalation && isContained(def, s)) {
        s.containedAt = s.tick;
        say("ok", "Incidente contido. O risco tende a cair nos próximos ciclos.");
        mark("Incidente contido", "ok");
      }
      advance(def, s, say, mark);
    }
  }

  s.terminal.push(...out);
  return s;
}

function reject(s: SimState, out: TermLine[], msg: string): SimState {
  out.push({ kind: "error", text: msg });
  s.invalidCommands += 1;
  s.terminal.push(...out);
  return s;
}

/** Avança um ciclo: escalonamento previsível + eventos programados. */
function advance(
  def: MissionDef,
  s: SimState,
  say: (k: TermLine["kind"], t: string) => void,
  mark: (t: string, tone: TimelineEvent["tone"]) => void,
) {
  s.tick += 1;
  const esc = def.escalation;
  if (esc) {
    if (isContained(def, s)) {
      s.risk = clamp(s.risk - esc.recoveryPerTick);
      s.health = clamp(s.health + esc.recoveryPerTick);
    } else {
      s.risk = clamp(s.risk + esc.riskPerTick);
      s.health = clamp(s.health - esc.healthPerTick);
    }
  }
  for (const ev of def.events) {
    if (s.firedEvents.includes(ev.id) || s.tick < ev.atTick) continue;
    if (ev.unlessAny.some((id) => s.applied.includes(id))) continue;
    s.firedEvents.push(ev.id);
    s.risk = clamp(s.risk + ev.riskDelta);
    if (ev.healthDelta) s.health = clamp(s.health + ev.healthDelta);
    for (const r of ev.reveal ?? []) if (!s.revealed.includes(r)) s.revealed.push(r);
    s.consequences.push(ev.message);
    say("warn", `EVENTO: ${ev.message}`);
    mark(ev.message, "alerta");
  }
  if (s.risk >= 100 && !s.critical) {
    s.critical = "O risco atingiu o nível máximo antes da contenção.";
    say("error", `FALHA CRÍTICA: ${s.critical}`);
    mark(s.critical, "erro");
  }
  s.history.push(sample(def, s));
}

/** Reconhece a situação crítica e permite continuar com o incidente agravado. */
export function acknowledgeCritical(s: SimState): SimState {
  return { ...s, criticalAcknowledged: true };
}

export function objectiveMet(o: MissionDef["objectives"][number], s: SimState) {
  return (
    (o.investigated ?? []).every((id) => s.investigated.includes(id)) &&
    (o.applied ?? []).every((id) => s.applied.includes(id))
  );
}

export function score(def: MissionDef, s: SimState): ScoreBreakdown {
  const keys = def.entities.filter((e) => e.key);
  const inv = keys.length ? keys.filter((e) => s.investigated.includes(e.id)).length / keys.length : 1;
  const needed = def.defenses.filter((d) => d.correct && d.needed);
  const got = needed.filter((d) => s.applied.includes(defenseId(d))).length;
  const defRatio = needed.length ? got / needed.length : 1;
  const defense = Math.max(0, defRatio * 35 - s.wrong.length * 8);
  const req = def.objectives.filter((o) => o.required);
  const reqMet = req.filter((o) => objectiveMet(o, s));
  const objectives = req.length ? (reqMet.length / req.length) * 25 : 25;
  const investigation = inv * 30;

  let time: number | null = null;
  let total: number;
  if (def.escalation) {
    const dl = def.escalation.deadline;
    const t = s.containedAt;
    time = t === null ? 0 : t <= dl ? 10 : Math.max(0, 10 - ((t - dl) / dl) * 10);
    total = investigation + defense + objectives + time;
  } else {
    // Sem prazo didático: o tempo não é avaliado e os pesos são reescalonados para 100.
    total = ((investigation + defense + objectives) / 90) * 100;
  }
  total = Math.round(clamp(total));
  const missedRequired = req.filter((o) => !objectiveMet(o, s)).map((o) => o.id);
  return {
    investigation: Math.round(investigation),
    defense: Math.round(defense),
    objectives: Math.round(objectives),
    time: time === null ? null : Math.round(time),
    total,
    passed: total >= PASS_SCORE && missedRequired.length === 0 && !s.critical,
    missedRequired,
  };
}

export function riskLabel(r: number) {
  if (r >= 80) return "crítico";
  if (r >= 55) return "alto";
  if (r >= 30) return "moderado";
  return "baixo";
}

export function serviceLabel(h: number) {
  if (h >= 85) return "operacional";
  if (h >= 50) return "degradado";
  if (h > 0) return "instável";
  return "fora do ar";
}

export function actionCount(s: SimState) {
  return s.terminal.filter((l) => l.kind === "input").length;
}
