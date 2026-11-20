import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity as ActivityIcon, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Terminal, FileText, Code2, ArrowUpRight, AlertTriangle, CheckCircle2, Circle, Lock, RotateCcw, Search, Server, XCircle } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppShell } from "@/components/cyberlab/AppShell";
import { CodeStudy } from "@/components/cyberlab/CodeStudy";
import { EvidenceList, IndicatorList } from "@/components/cyberlab/EvidenceDetails";
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
  const def = getMission(missaoId);
  const d = useProgress();
  const reasons = def ? lockReasons(def, d) : [];
  const saved = def ? d.active[def.id] : undefined;
  const [confirmRestart, setConfirmRestart] = useState(false);

  useEffect(() => {
    if (def && !saved && reasons.length === 0) {
      update((p) => (p.active[def.id] ? p : { ...p, active: { ...p.active, [def.id]: createInitialState(def) } }));
    }
  }, [saved, reasons.length, def]);

  if (!def) return null;
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
  const [left,setLeft]=useState(true); const [right,setRight]=useState(true);
  const [mobileTab,setMobileTab]=useState("workspace"); const [tab,setTab]=useState("terminal");
  const ents=visibleEntities(def,s);const allReq=def.objectives.filter(o=>o.required).every(o=>objectiveMet(o,s));
  const complete=def.objectives.filter(o=>objectiveMet(o,s)).length; const lesson=getLesson(def.module);
  const defenses=def.defenses.filter(d=>ents.some(e=>e.id===d.target));
  const checklist=<><p className="section-heading">Objetivos da investigação</p><Progress value={complete/def.objectives.length*100} className="mt-3"/><p className="mt-2 font-mono text-[10px] text-muted-foreground">{complete}/{def.objectives.length} cumpridos</p><ul className="mt-4 space-y-3 text-xs">{def.objectives.map(o=><li key={o.id} className="flex gap-2">{objectiveMet(o,s)?<CheckCircle2 className="size-4 shrink-0 text-primary"/>:<Circle className="size-4 shrink-0 text-muted-foreground"/>}<span>{o.label}{!o.required&&<span className="block text-muted-foreground">Opcional</span>}</span></li>)}</ul></>;
  return <div>
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5"><div><Link to="/laboratorio" className="font-mono text-[10px] text-accent">LABORATÓRIO / CASO {def.order.toString().padStart(2,"0")}</Link><h1 className="mt-2 text-2xl font-bold">{def.title}</h1><p className="mt-2 text-xs text-muted-foreground">{def.org} · {def.incidentType} · {def.difficulty}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={onRestart}><RotateCcw/>Reiniciar</Button><Button size="sm" onClick={()=>run("close","painel")} variant={allReq?"default":"secondary"}>Encerrar e gerar relatório<ArrowUpRight/></Button></div></div>
    {allReq&&<p role="status" className="mt-3 border-l-2 border-primary px-3 py-2 text-xs text-primary">Todos os objetivos obrigatórios foram cumpridos. Encerre a tentativa para ver o relatório.</p>}
    <div role="tablist" aria-label="Áreas do laboratório" className="my-4 flex gap-1 xl:hidden">{[{id:"investigation",label:"Investigação"},{id:"workspace",label:"Área de trabalho"},{id:"incident",label:"Incidente"}].map(t=><Button key={t.id} role="tab" aria-selected={mobileTab===t.id} variant={mobileTab===t.id?"secondary":"ghost"} size="sm" onClick={()=>setMobileTab(t.id)}>{t.label}</Button>)}</div>
    <div className={cn("lab-grid mt-5",!left&&"left-closed",!right&&"right-closed")}>
      <aside className={cn("min-w-0 work-surface",mobileTab!=="investigation"&&"hidden xl:block")}><div className="flex items-center justify-between border-b border-border px-2 py-3">{left&&<h2 className="section-heading px-2">Investigação</h2>}<Button size="icon" variant="ghost" className="hidden xl:inline-flex" aria-label={left?"Recolher investigação":"Expandir investigação"} title={left?"Recolher investigação":"Expandir investigação"} onClick={()=>setLeft(!left)}>{left?<PanelLeftClose/>:<PanelLeftOpen/>}</Button></div><div className={cn("p-4",!left&&"xl:hidden")}><p className="section-heading">Briefing</p><p className="mt-3 text-xs leading-6 text-muted-foreground">{def.briefing}</p><div className="mt-6 border-t border-border pt-5">{checklist}</div><h2 className="section-heading mt-6 border-t border-border pt-5">Evidências disponíveis</h2><EvidenceList items={ents.filter(e=>e.kind!=="alerta")} def={def} s={s} run={run}/></div></aside>
      <section className={cn("min-w-0",mobileTab!=="workspace"&&"hidden xl:block")}><div className="work-surface overflow-hidden"><div className="flex flex-wrap items-center gap-1 border-b border-border p-2" role="tablist" aria-label="Área de análise">{[{id:"terminal",label:"Terminal",icon:Terminal},{id:"logs",label:"Logs",icon:FileText},{id:"indicators",label:"Indicadores",icon:Search},{id:"python",label:"Python",icon:Code2}].map(t=><Button key={t.id} size="sm" role="tab" aria-selected={tab===t.id} variant={tab===t.id?"secondary":"ghost"} onClick={()=>setTab(t.id)}><t.icon/>{t.label}</Button>)}</div>{tab==="terminal"?<TerminalView def={def} s={s} run={run}/>:tab==="logs"?<div className="min-h-[520px] p-4"><h2 className="section-heading">Registros coletados</h2>{def.entities.filter(e=>s.investigated.includes(e.id)&&e.logs?.length).map(e=><div className="mt-4" key={e.id}><h3 className="font-mono text-xs text-accent">{e.id}</h3><pre className="mt-2 overflow-x-auto bg-terminal p-3 font-mono text-xs leading-6">{e.logs?.join("\n")}</pre></div>)}{!def.entities.some(e=>s.investigated.includes(e.id)&&e.logs?.length)&&<p className="mt-6 text-xs text-muted-foreground">Nenhum registro coletado. Analise as evidências.</p>}</div>:tab==="indicators"?<div className="min-h-[520px] p-4"><h2 className="section-heading">Indicadores analisados</h2><IndicatorList def={def} s={s}/></div>:lesson?<CodeStudy lesson={lesson}/>:<p className="p-4 text-sm">Este caso integrado usa os exemplos da Academia.</p>}</div><div className="mt-4 border-y border-border py-4"><div className="flex justify-between"><h2 className="section-heading">Evolução do incidente</h2><span className="font-mono text-[10px] text-muted-foreground">CICLO {s.tick}</span></div><Chart def={def} s={s}/></div></section>
      <aside className={cn("work-surface min-w-0",mobileTab!=="incident"&&"hidden xl:block")}><div className="flex justify-between border-b border-border px-2 py-3">{right&&<h2 className="section-heading px-2">Estado do incidente</h2>}<Button variant="ghost" size="icon" className="hidden xl:inline-flex" aria-label={right?"Recolher incidente":"Expandir incidente"} title={right?"Recolher incidente":"Expandir incidente"} onClick={()=>setRight(!right)}>{right?<PanelRightClose/>:<PanelRightOpen/>}</Button></div><div className={cn("p-4",!right&&"xl:hidden")}><RiskBadge risk={s.risk}/><p className={cn("mt-3 text-xs",isContained(def,s)?"text-primary":"text-warning")}>{isContained(def,s)?"Contido / sem escalonamento":"Não contido"}</p><div className="mt-4 border-t border-border pt-4"><p className="flex items-center gap-2 text-xs text-muted-foreground"><Server className="size-4"/>{def.serviceName}</p><p className="mt-2 font-mono text-lg">{Math.round(s.health)}% <span className="text-xs text-muted-foreground">{serviceLabel(s.health)}</span></p><Progress value={s.health} className="mt-2"/>{def.escalation&&<p className="mt-2 text-xs text-warning">Prazo de contenção: {def.escalation.deadline} ciclos</p>}</div><h2 className="section-heading mt-5 border-t border-border pt-4">Alertas</h2><EvidenceList items={ents.filter(e=>e.kind==="alerta")} def={def} s={s} run={run}/><h2 className="section-heading mt-5 border-t border-border pt-4">Controles defensivos</h2><div className="mt-3 space-y-2">{defenses.map(d=>{const applied=s.applied.includes(defenseId(d));return <Button key={defenseId(d)} variant="outline" size="sm" className="h-auto w-full justify-start whitespace-normal py-2 text-left" disabled={applied} onClick={()=>run(`${d.verb} ${d.target}`,"painel")}><span>{d.label}<span className="mt-1 block font-mono text-[10px] text-muted-foreground">{applied?"Aplicado":`${d.verb} ${d.target}`}</span></span></Button>})}<Button size="sm" variant="secondary" className="w-full" onClick={()=>run("monitor","painel")}><ActivityIcon/>Monitorar um ciclo</Button></div><h2 className="section-heading mt-5 border-t border-border pt-4">Linha do tempo</h2><ol className="mt-3 max-h-64 space-y-3 overflow-y-auto text-xs">{[...s.timeline].reverse().map((t,i)=><li key={i} className={cn("border-l border-border pl-3",t.tone==="erro"&&"text-destructive",t.tone==="alerta"&&"text-warning",t.tone==="ok"&&"text-primary")}><span className="block font-mono text-[10px] text-muted-foreground">CICLO {t.tick} · {t.source}</span>{t.text}</li>)}</ol></div></aside>
    </div>
  </div>;
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
          <Line dataKey={def.traffic ? "attack" : "risk"} name={def.traffic ? "Tráfego anômalo (req/s)" : "Risco"} stroke={CHART.red} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey={def.traffic ? "legit" : "health"} name={def.traffic ? "Clientes (req/s)" : "Saúde do serviço"} stroke={def.traffic ? CHART.cyan : CHART.green} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TerminalView({ def, s, run }: { def: MissionDef; s: SimState; run: (c: string, src: "terminal") => void }) {
  const [value, setValue] = useState("");
  const [hIdx, setHIdx] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputs = useMemo(() => (s.commandHistory ?? s.terminal.filter((l) => l.kind === "input").map((l) => l.text)).filter((text) => !text.startsWith("[painel]")).map((text) => text.replace(/^\$ /, "")), [s.commandHistory, s.terminal]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [s.terminal.length]);

  return (
    <section className="flex h-[560px] min-w-0 flex-col overflow-hidden bg-terminal" aria-label="Terminal simulado">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 font-mono text-xs text-muted-foreground">
        <span>analista@soc-lab:~/{def.id}</span>
        <span>simulado · sem shell real</span>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-border p-2">{["help", "status", "evidence", "objectives", "history"].map(c => <Button key={c} variant="ghost" size="sm" className="font-mono text-[10px] text-accent" onClick={() => run(c, "terminal")}>{c}</Button>)}</div>
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
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/60"
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

      <section className="mt-6 border-y border-border py-5"><h2 className="font-semibold">Evidências e indicadores analisados</h2><p className="mt-2 text-sm text-muted-foreground">{s.investigated.length} itens analisados · {s.linkedEvidence?.length ?? 0} explicitamente associados ao caso</p><ul className="mt-4 space-y-3">{def.entities.filter(e=>s.investigated.includes(e.id)).map(e=><li key={e.id} className="text-xs"><span className="font-mono text-accent">{e.id}{s.linkedEvidence?.includes(e.id)?" · associado ao caso":""}</span><p className="mt-1">{e.finding}</p></li>)}</ul></section><section className="mt-6"><h2 className="font-semibold">Linha do tempo das decisões</h2><ol className="mt-4 space-y-3 border-l border-border pl-4">{s.timeline.map((t,i)=><li key={i} className="text-xs"><span className="font-mono text-accent">Ciclo {t.tick} · {t.source}</span><p className="mt-1">{t.text}</p></li>)}</ol></section>
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
