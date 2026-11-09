// Camada de dados (modo demonstração): localStorage, por perfil local.
// Toda leitura/escrita passa por aqui, para facilitar migração futura ao Lovable Cloud.
import { useSyncExternalStore } from "react";
import { MISSIONS, getMission } from "./missions";
import { LESSONS } from "./content";
import type { Attempt, MissionDef, SimState } from "./types";

export interface ProgressData {
  version: 1;
  demo: { active: boolean; name: string } | null;
  lessonsDone: string[];
  exercises: Record<string, { correct: boolean; tries: number }>;
  attempts: Attempt[];
  active: Record<string, SimState>;
}

const KEY = "cyberlab:demo:v1";
const EMPTY: ProgressData = { version: 1, demo: null, lessonsDone: [], exercises: {}, attempts: [], active: {} };

let cache: ProgressData | null = null;
const listeners = new Set<() => void>();

function read(): ProgressData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache!;
}

export function update(fn: (d: ProgressData) => ProgressData) {
  cache = fn(read());
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* armazenamento cheio ou bloqueado: mantém em memória */
  }
  listeners.forEach((l) => l());
}

export function useProgress(): ProgressData {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    read,
    () => EMPTY,
  );
}

export function resetAll() {
  update(() => EMPTY);
}

// ---------- regras de progressão (puras, testáveis) ----------
export function passedMissions(d: Pick<ProgressData, "attempts">) {
  return new Set(d.attempts.filter((a) => a.score.passed).map((a) => a.missionId));
}

export function lockReasons(m: MissionDef, d: Pick<ProgressData, "attempts" | "lessonsDone">): string[] {
  const passed = passedMissions(d);
  const r: string[] = [];
  for (const p of m.prereqMissions)
    if (!passed.has(p)) r.push(`Seja aprovado em "${getMission(p)?.title}".`);
  for (const l of m.prereqLessons)
    if (!d.lessonsDone.includes(l)) r.push(`Conclua a lição "${LESSONS.find((x) => x.id === l)?.title}" na Academia.`);
  return r;
}

export type MissionStatus = "bloqueada" | "disponivel" | "em andamento" | "concluida";
export function missionStatus(m: MissionDef, d: ProgressData): MissionStatus {
  if (passedMissions(d).has(m.id)) return "concluida";
  if (lockReasons(m, d).length) return "bloqueada";
  if (d.active[m.id]?.status === "active") return "em andamento";
  return "disponivel";
}

export function bestScore(missionId: string, d: Pick<ProgressData, "attempts">) {
  const s = d.attempts.filter((a) => a.missionId === missionId && a.outcome === "concluida").map((a) => a.score.total);
  return s.length ? Math.max(...s) : null;
}

export function xp(d: ProgressData) {
  const missionXp = MISSIONS.reduce((acc, m) => acc + (bestScore(m.id, d) ?? 0) * 2, 0);
  const exXp = Object.values(d.exercises).filter((e) => e.correct).length * 15;
  return missionXp + d.lessonsDone.length * 40 + exXp;
}

const LEVELS = ["Estagiário de SOC", "Analista N1", "Analista N2", "Analista N3", "Especialista em resposta", "Líder de SOC"];
export function level(points: number) {
  const n = Math.min(LEVELS.length - 1, Math.floor(points / 250));
  return { n: n + 1, title: LEVELS[n], current: points - n * 250, next: n === LEVELS.length - 1 ? null : 250 };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earned: boolean;
}
export function achievements(d: ProgressData): Achievement[] {
  const passed = passedMissions(d);
  const done = d.attempts.filter((a) => a.outcome === "concluida");
  return [
    { id: "a1", title: "Primeiro chamado", description: "Concluir a missão introdutória.", earned: passed.has("m0-plantao") },
    { id: "a2", title: "Olho no remetente", description: "Ser aprovado na missão de phishing.", earned: passed.has("m1-phishing") },
    { id: "a3", title: "Porta trancada", description: "Ser aprovado na missão de força bruta.", earned: passed.has("m2-forca-bruta") },
    { id: "a4", title: "Serviço de pé", description: "Ser aprovado na missão de DDoS.", earned: passed.has("m3-ddos") },
    { id: "a5", title: "Cadeia de custódia", description: "Ser aprovado na missão de malware.", earned: passed.has("m4-malware") },
    { id: "a6", title: "Operação Aurora", description: "Concluir a missão final integrada.", earned: passed.has("m5-final") },
    { id: "a7", title: "Resposta impecável", description: "Fazer 100 pontos em qualquer missão.", earned: done.some((a) => a.score.total === 100) },
    { id: "a8", title: "Estudante dedicado", description: "Concluir todas as lições da Academia.", earned: LESSONS.every((l) => d.lessonsDone.includes(l.id)) },
  ];
}

export function nextMission(d: ProgressData) {
  return MISSIONS.find((m) => {
    const s = missionStatus(m, d);
    return s === "disponivel" || s === "em andamento";
  });
}
