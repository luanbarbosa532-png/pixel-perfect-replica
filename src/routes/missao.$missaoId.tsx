import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, Lock, RotateCcw, Search, Server, XCircle } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppShell } from "@/components/cyberlab/AppShell";
import { RiskBadge } from "@/components/cyberlab/StatusBadge";
import { acknowledgeCritical, actionCount, createInitialState, defenseId, execute, isContained, objectiveMet, PASS_SCORE, score, serviceLabel, visibleEntities } from "@/lib/cyberlab/engine";
import { getLesson } from "@/lib/cyberlab/content";
import { getMission, MISSIONS } from "@/lib/cyberlab/missions";
import { lockReasons, update, useProgress } from "@/lib/cyberlab/progress";
import type { Attempt, MissionDef, SimState } from "@/lib/cyberlab/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/missao/$missaoId")({
  loader: ({ params }) => {
    const m = getMission(params.missaoId);
    if (!m) throw notFound();
    return { title: m.title, objective: m.objective };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Missão"} — Laboratório CyberLab` },
      { name: "description", content: loaderData?.objective ?? "Missão do laboratório CyberLab." },
      { property: "og:title", content: `${loaderData?.title ?? "Missão"} — CyberLab` },
      { property: "og:description", content: loaderData?.objective ?? "Missão do laboratório CyberLab." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <MissionPage />
    </AppShell>
  ),
});

// SVG attributes do not resolve CSS variables; keep in sync with --chart-* in styles.css.
const CHART = { green: "oklch(0.86 0.2 150)", cyan: "oklch(0.82 0.13 205)", red: "oklch(0.66 0.21 25)" };

function toAttempt(def: MissionDef, s: SimState, outcome: Attempt["outcome"]): Attempt {
  return {
    id: `${def.id}-${s.startedAt}-${Date.now()}`,
    missionId: def.id,
    startedAt: s.startedAt,
    endedAt: Date.now(),
    outcome,
    score: score(def, s),
    actions: actionCount(s),
    wrongActions: s.wrong.length,
    critical: s.critical,
  };
}

function MissionPage() {
  const { missaoId } = Route.useParams();
  const def = getMission(missaoId)!;
  const d = useProgress();
  const reasons = lockReasons(def, d);
  const saved = d.active[def.id];
  const [confirmRestart, setConfirmRestart] = useState(false);

  useEffect(() => {
    if (!saved && reasons.length === 0) {
      update((p) => (p.active[def.id] ? p : { ...p, active: { ...p.active, [def.id]: createInitialState(def) } }));
    }
  }, [saved, reasons.length, def]);

  if (reasons.length) {
    return (
      <div className="panel mx-auto max-w-lg p-8">
        <Lock className="size-6 text-muted-foreground" aria-hidden />
        <h1 className="mt-3 text-2xl font-bold">{def.title} está bloqueada</h1>
        <p className="mt-2 text-sm text-muted-foreground">O que falta para liberar:</p>
        <ul className="mt-2 list-disc pl-6 text-sm">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        <Button asChild className="mt-6"><Link to="/campanha">Voltar à campanha</Link></Button>
      </div>
    );
  }
  if (!saved) return <div className="panel h-64 animate-pulse" aria-busy="true" aria-label="Preparando a missão" />;

  const setState = (s: SimState) => update((p) => ({ ...p, active: { ...p.active, [def.id]: s } }));

  const run = (cmd: string, source: "terminal" | "painel") => {
    const next = execute(def, saved, cmd, source);
    if (next.status === "ended" && saved.status === "active") {
      update((p) => ({ ...p, active: { ...p.active, [def.id]: next }, attempts: [...p.attempts, toAttempt(def, next, "concluida")] }));
    } else setState(next);
  };

  const restart = () => {
    update((p) => ({
      ...p,
      attempts: saved.status === "active" && actionCount(saved) > 0 ? [...p.attempts, toAttempt(def, saved, "reiniciada")] : p.attempts,
      active: { ...p.active, [def.id]: createInitialState(def) },
    }));
  };

  return (
    <>
      {saved.status === "ended" ? (
        <Report def={def} s={saved} onRestart={restart} />
      ) : (
        <Lab def={def} s={saved} run={run} onRestart={() => setConfirmRestart(true)} />
      )}

      <AlertDialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reiniciar a tentativa?</AlertDialogTitle>
            <AlertDialogDescription>O incidente volta ao estado inicial. A tentativa atual fica registrada no histórico como “reiniciada”.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={restart}>Reiniciar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={saved.status === "active" && !!saved.critical && !saved.criticalAcknowledged}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="size-5" aria-hidden />Situação crítica</AlertDialogTitle>
            <AlertDialogDescription>{saved.critical} Esta falha impede a aprovação nesta tentativa. Você pode continuar com o incidente agravado para praticar, ou reiniciar.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setState(acknowledgeCritical(saved))}>Continuar agravado</AlertDialogCancel>
            <AlertDialogAction onClick={restart}>Reiniciar tentativa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ------------------------------------------------------------------ LAB
function Lab({ def, s, run, onRestart }: { def: MissionDef; s: SimState; run: (c: string, src: "terminal" | "painel") => void; onRestart: () => void }) {
  const ents = visibleEntities(def, s);
  const alerts = ents.filter((e) => e.kind === "alerta");
  const others = ents.filter((e) => e.kind !== "alerta");
  const allReq = def.objectives.filter((o) => o.required).every((o) => objectiveMet(o, s));
  const defenses = def.defenses.filter((d) => ents.some((e) => e.id === d.target));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/campanha" className="text-sm text-accent hover:underline">← Campanha</Link>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">{def.title}</h1>
          <p className="text-sm text-muted-foreground">{def.org} · {def.incidentType} · {def.difficulty}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onRestart}><RotateCcw className="size-4" aria-hidden />Reiniciar</Button>
          <Button size="sm" onClick={() => run("close", "painel")} variant={allReq ? "default" : "secondary"}>Encerrar e gerar relatório</Button>
        </div>
      </div>
      <p className="panel mt-4 p-4 text-sm leading-relaxed">{def.briefing}</p>
      {allReq && <p role="status" className="mt-3 rounded-md border border-primary/50 p-3 text-sm text-primary">Todos os objetivos obrigatórios foram cumpridos. Encerre a tentativa para ver o relatório.</p>}

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-2"><TerminalView def={def} s={s} run={run} /></div>

        <div className="space-y-4 xl:col-span-3">
          <section className="panel p-4" aria-labelledby="estado">
            <h2 id="estado" className="sr-only">Estado do incidente</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Risco atual</p><div className="mt-1"><RiskBadge risk={s.risk} /></div><Progress value={s.risk} className="mt-2" aria-label="Risco" /></div>
              <div><p className="flex items-center gap-1 text-xs text-muted-foreground"><Server className="size-3.5" aria-hidden />{def.serviceName}</p><p className="mt-1 text-sm font-semibold">{Math.round(s.health)}% · {serviceLabel(s.health)}</p><Progress value={s.health} className="mt-2" aria-label="Saúde do serviço" /></div>
              <div><p className="text-xs text-muted-foreground">Ciclo / contenção</p><p className="mt-1 text-sm font-semibold">{s.tick}{def.escalation ? ` de ${def.escalation.deadline} (prazo)` : " · sem prazo"}</p><p className={cn("mt-1 text-xs", isContained(def, s) ? "text-primary" : "text-warning")}>{isContained(def, s) ? "Contido" : "Não contido"}</p></div>
            </div>
            <Chart def={def} s={s} />
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="panel p-4" aria-labelledby="al">
              <h2 id="al" className="font-semibold">Alertas</h2>
              <EntityList items={alerts} s={s} run={run} />
              <h2 className="mt-4 font-semibold">Evidências e indicadores</h2>
              <EntityList items={others} s={s} run={run} />
            </section>
            <div className="space-y-4">
              <section className="panel p-4" aria-labelledby="def">
                <h2 id="def" className="font-semibold">Controles de defesa</h2>
                <p className="text-xs text-muted-foreground">Cada controle executa o comando equivalente no terminal.</p>
                <div className="mt-3 space-y-2">
                  {defenses.length === 0 && <p className="text-sm text-muted-foreground">Investigue para descobrir alvos de ação.</p>}
                  {defenses.map((d) => {
                    const id = defenseId(d);
                    const applied = s.applied.includes(id);
                    return (
                      <Button key={id} variant="outline" size="sm" className={cn("h-auto w-full justify-between whitespace-normal py-2 text-left", applied && "border-primary/60")} disabled={applied} onClick={() => run(`${d.verb} ${d.target}`, "painel")}>
                        <span>{d.label}</span>
                        <span className="font-mono text-xs text-muted-foreground">{applied ? "aplicado" : `${d.verb} ${d.target}`}</span>
                      </Button>
                    );
                  })}
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => run("monitor", "painel")}>Monitorar um ciclo</Button>
                </div>
              </section>
              <section className="panel p-4" aria-labelledby="obj">
                <h2 id="obj" className="font-semibold">Objetivos</h2>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {def.objectives.map((o) => {
                    const met = objectiveMet(o, s);
                    return (
                      <li key={o.id} className="flex gap-2">
                        {met ? <CheckCircle2 className="size-4 shrink-0 text-primary" aria-label="Cumprido" /> : <Circle className="size-4 shrink-0 text-muted-foreground" aria-label="Pendente" />}
                        <span>{o.label}{o.required ? "" : " (opcional)"}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          </div>

          <section className="panel p-4" aria-labelledby="tl">
            <h2 id="tl" className="font-semibold">Linha do tempo</h2>
            <ol className="mt-2 max-h-56 space-y-1 overflow-y-auto font-mono text-xs">
              {[...s.timeline].reverse().map((t, i) => (
                <li key={i} className={cn(t.tone === "erro" && "text-destructive", t.tone === "alerta" && "text-warning", t.tone === "ok" && "text-primary")}>
                  [c{String(t.tick).padStart(2, "0")}] [{t.source}] {t.tone === "erro" ? "ERRO: " : t.tone === "alerta" ? "ALERTA: " : ""}{t.text}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function EntityList({ items, s, run }: { items: ReturnType<typeof visibleEntities>; s: SimState; run: (c: string, src: "painel") => void }) {
  if (!items.length) return <p className="mt-2 text-sm text-muted-foreground">Nada por aqui ainda.</p>;
  return (
    <ul className="mt-2 space-y-2">
      {items.map((e) => {
        const done = s.investigated.includes(e.id);
        return (
          <li key={e.id} className="animate-fade-up rounded-md border border-border p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-xs text-accent">{e.id}{e.severity ? ` · ${e.severity.toUpperCase()}` : ""} · {e.kind}</p>
                <p className="text-sm font-medium break-words">{e.label}</p>
                <p className="text-xs text-muted-foreground">{e.summary}</p>
              </div>
              {!done && <Button size="sm" variant="secondary" onClick={() => run(`investigate ${e.id}`, "painel")} aria-label={`Investigar ${e.id}`}><Search className="size-3.5" aria-hidden /></Button>}
            </div>
            {done && <p className="mt-2 border-l-2 border-primary/60 pl-2 text-xs">{e.finding}</p>}
          </li>
        );
      })}
    </ul>
  );
}

function Chart({ def, s }: { def: MissionDef; s: SimState }) {
  const data = s.history;
  return (
    <div className="mt-4 h-44" role="img" aria-label={def.traffic ? "Gráfico de tráfego legítimo e de ataque por ciclo" : "Gráfico de risco e saúde do serviço por ciclo"}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="oklch(0.32 0.035 250)" strokeDasharray="3 3" />
          <XAxis dataKey="tick" stroke="oklch(0.72 0.03 230)" fontSize={11} />
          <YAxis stroke="oklch(0.72 0.03 230)" fontSize={11} />
          <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {def.traffic ? (
            <>
              <Line dataKey="attack" name="Tráfego anômalo (req/s)" stroke=CHART.red strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="legit" name="Clientes (req/s)" stroke=CHART.cyan strokeWidth={2} dot={false} isAnimationActive={false} />
            </>
          ) : (
            <>
              <Line dataKey="risk" name="Risco" stroke=CHART.red strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="health" name="Saúde do serviço" stroke=CHART.green strokeWidth={2} dot={false} isAnimationActive={false} />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TerminalView({ def, s, run }: { def: MissionDef; s: SimState; run: (c: string, src: "terminal") => void }) {
  const [value, setValue] = useState("");
  const [hIdx, setHIdx] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputs = useMemo(() => s.terminal.filter((l) => l.kind === "input" && !l.text.startsWith("[painel]")).map((l) => l.text.replace(/^\$ /, "")), [s.terminal]);
  useEffect(() => endRef.current?.scrollIntoView({ block: "nearest" }), [s.terminal.length]);

  return (
    <section className="panel flex h-[560px] flex-col overflow-hidden bg-terminal xl:sticky xl:top-20" aria-label="Terminal simulado">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 font-mono text-xs text-muted-foreground">
        <span>analista@soc-lab:~/{def.id}</span>
        <span>simulado · sem shell real</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-5" role="log" aria-live="polite">
        {s.terminal.map((l, i) => (
          <p key={i} className={cn("whitespace-pre-wrap break-words", l.kind === "input" && "text-foreground", l.kind === "output" && "text-muted-foreground", l.kind === "ok" && "text-primary", l.kind === "error" && "text-destructive", l.kind === "warn" && "text-warning", l.kind === "system" && "text-accent")}>
            {l.kind === "ok" ? "✓ " : l.kind === "error" ? "✗ " : l.kind === "warn" ? "! " : ""}{l.text}
          </p>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="flex items-center gap-2 border-t border-border px-3 py-2 font-mono text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim()) return;
          run(value, "terminal");
          setValue("");
          setHIdx(null);
        }}
      >
        <label htmlFor="cmd" className="text-primary">$</label>
        <input
          id="cmd"
          value={value}
          maxLength={80}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && inputs.length) {
              e.preventDefault();
              const i = hIdx === null ? inputs.length - 1 : Math.max(0, hIdx - 1);
              setHIdx(i);
              setValue(inputs[i] ?? "");
            } else if (e.key === "ArrowDown" && hIdx !== null) {
              e.preventDefault();
              const i = hIdx + 1;
              if (i >= inputs.length) { setHIdx(null); setValue(""); } else { setHIdx(i); setValue(inputs[i] ?? ""); }
            }
          }}
          className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/60"
          placeholder="digite um comando (help)"
          aria-label="Comando do terminal"
        />
      </form>
    </section>
  );
}

// ------------------------------------------------------------------ REPORT
function Report({ def, s, onRestart }: { def: MissionDef; s: SimState; onRestart: () => void }) {
  const r = score(def, s);
  const correct = s.applied.map((id) => def.defenses.find((d) => defenseId(d) === id)!).filter((d) => d?.correct);
  const wrong = s.wrong.map((id) => def.defenses.find((d) => defenseId(d) === id)!);
  const missedDef = def.defenses.filter((d) => d.correct && d.needed && !s.applied.includes(defenseId(d)));
  const missedObj = def.objectives.filter((o) => !objectiveMet(o, s));
  const lessons = Array.from(new Set(missedObj.map((o) => o.lesson))).map((id) => getLesson(id)!).filter(Boolean);
  const next = r.passed ? MISSIONS.find((m) => m.order === def.order + 1) : null;
  const minutes = s.endedAt ? Math.max(1, Math.round((s.endedAt - s.startedAt) / 60000)) : null;

  const Row = ({ label, v, max }: { label: string; v: number | null; max: number }) => (
    <div className="flex justify-between border-b border-border py-2 text-sm"><span>{label}</span><span className="font-mono">{v === null ? "não avaliado" : `${v}/${max}`}</span></div>
  );

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <p className="font-mono text-xs text-muted-foreground">Relatório de missão · {def.org}</p>
      <h1 className="mt-1 text-3xl font-bold">{def.title}</h1>
      <div className={cn("panel mt-6 flex flex-wrap items-center gap-6 p-6", r.passed ? "border-primary/60 shadow-glow" : "border-destructive/50")}>
        <div className="font-display text-6xl font-bold">{r.total}</div>
        <div>
          <p className={cn("flex items-center gap-2 text-xl font-semibold", r.passed ? "text-primary" : "text-destructive")}>
            {r.passed ? <CheckCircle2 aria-hidden /> : <XCircle aria-hidden />}{r.passed ? "Missão aprovada" : "Missão não aprovada"}
          </p>
          <p className="text-sm text-muted-foreground">
            Aprovação: ≥ {PASS_SCORE} pontos, todos os objetivos obrigatórios e nenhuma falha crítica. {actionCount(s)} comandos · {s.tick} ciclos{minutes ? ` · ~${minutes} min` : ""}.
          </p>
          {s.critical && <p className="mt-1 text-sm text-destructive">Falha crítica: {s.critical}</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-semibold">Detalhamento da pontuação</h2>
          <Row label="Investigação e evidências" v={r.investigation} max={30} />
          <Row label="Medidas defensivas" v={r.defense} max={35} />
          <Row label="Objetivos obrigatórios" v={r.objectives} max={25} />
          <Row label="Tempo de resposta" v={r.time} max={10} />
          <p className="mt-2 text-xs text-muted-foreground">
            {r.time === null ? "Esta missão não tem prazo didático: o tempo não é avaliado e os demais critérios são reescalonados para 100." : `Prazo didático: conter em até ${def.escalation!.deadline} ciclos.`} Cada decisão inadequada desconta 8 pontos da defesa.
          </p>
        </section>
        <section className="panel p-5">
          <h2 className="font-semibold">Objetivos</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {def.objectives.map((o) => (
              <li key={o.id} className="flex gap-2">{objectiveMet(o, s) ? <CheckCircle2 className="size-4 shrink-0 text-primary" aria-label="Alcançado" /> : <XCircle className="size-4 shrink-0 text-destructive" aria-label="Não alcançado" />}{o.label}{o.required ? "" : " (opcional)"}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel mt-4 p-5">
        <h2 className="font-semibold text-primary">Decisões corretas</h2>
        {correct.length ? <ul className="mt-2 space-y-2 text-sm">{correct.map((d) => <li key={defenseId(d)}><strong>{d.label}.</strong> {d.rationale}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Nenhuma ação defensiva correta aplicada.</p>}
      </section>
      <section className="panel mt-4 p-5">
        <h2 className="font-semibold text-destructive">Decisões inadequadas e consequências</h2>
        {wrong.length || s.consequences.length ? (
          <ul className="mt-2 space-y-2 text-sm">
            {wrong.map((d) => <li key={defenseId(d)}><strong>{d.label}:</strong> {d.message} <span className="text-muted-foreground">Por quê: {d.rationale}</span></li>)}
            {s.firedEvents.map((id) => { const ev = def.events.find((e) => e.id === id)!; return <li key={id}><strong>Consequência da demora:</strong> {ev.message}</li>; })}
          </ul>
        ) : <p className="mt-2 text-sm text-muted-foreground">Nenhuma decisão inadequada. Ótimo trabalho.</p>}
      </section>
      {missedDef.length > 0 && (
        <section className="panel mt-4 p-5">
          <h2 className="font-semibold">O que deveria ter sido feito</h2>
          <ul className="mt-2 space-y-2 text-sm">{missedDef.map((d) => <li key={defenseId(d)}><code className="font-mono text-accent">{d.verb} {d.target}</code> — {d.label}. {d.rationale}</li>)}</ul>
        </section>
      )}

      <section className="panel mt-4 p-5">
        <h2 className="font-semibold">Próximos passos</h2>
        {lessons.length > 0 && (
          <p className="mt-2 text-sm">Revise: {lessons.map((l, i) => <span key={l.id}>{i > 0 && ", "}<Link to="/academia/$licaoId" params={{ licaoId: l.id }} className="text-accent hover:underline">{l.title}</Link></span>)}</p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">{r.passed ? def.nextHint : "Reinicie a missão aplicando as recomendações acima."}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onRestart}><RotateCcw className="size-4" aria-hidden />Nova tentativa</Button>
          {next && <Button asChild variant="outline"><Link to="/missao/$missaoId" params={{ missaoId: next.id }}>Próxima: {next.title}</Link></Button>}
          <Button asChild variant="ghost"><Link to="/campanha">Mapa da campanha</Link></Button>
        </div>
      </section>
    </div>
  );
}
