import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, ArrowUpRight, ShieldCheck, Target, Trophy } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppShell, PageTitle } from "@/components/cyberlab/AppShell";
import { StatusBadge, RiskBadge } from "@/components/cyberlab/StatusBadge";
import { MISSIONS } from "@/lib/cyberlab/missions";
import {
  level,
  missionStatus,
  nextMission,
  passedMissions,
  useProgress,
  xp,
} from "@/lib/cyberlab/progress";
import { overview } from "@/lib/cyberlab/overview";
import { serviceLabel } from "@/lib/cyberlab/engine";
export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Central operacional SOC — CyberLab" },
      {
        name: "description",
        content: "Incidentes, disponibilidade, alertas e desempenho da simulação CyberLab.",
      },
      { property: "og:title", content: "Central operacional CyberLab" },
      {
        property: "og:description",
        content: "Situação real dos casos do seu laboratório simulado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <Painel />
    </AppShell>
  ),
});
function Painel() {
  const d = useProgress();
  const [filter, setFilter] = useState("all");
  const [severity, setSeverity] = useState("all");
  const o = overview(d, filter);
  const passed = passedMissions(d);
  const next = nextMission(d);
  const lv = level(xp(d));
  const done = d.attempts.filter((a) => a.outcome === "concluida");
  const alerts = o.alerts
    .filter((a) => severity === "all" || a.e.severity === severity)
    .sort(
      (a, b) =>
        ["critica", "alta", "media", "baixa"].indexOf(a.e.severity ?? "media") -
        ["critica", "alta", "media", "baixa"].indexOf(b.e.severity ?? "media"),
    );
  return (
    <>
      <PageTitle
        title="Central SOC"
        subtitle={`SOC Atlântico · ${d.demo?.name} · ambiente fictício`}
      >
        {next && (
          <Button asChild>
            <Link to="/missao/$missaoId" params={{ missaoId: next.id }}>
              Retomar operações
              <ArrowUpRight />
            </Link>
          </Button>
        )}
      </PageTitle>
      <div className="mb-6 flex flex-wrap items-center gap-3 border-y border-border py-3">
        <span className="flex items-center gap-2 text-xs text-primary">
          <ShieldCheck className="size-4" />
          Sessão de treinamento ativa
        </span>
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          Ambiente
          <select
            aria-label="Filtrar ambiente"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-64 rounded border border-input bg-card p-2"
          >
            <option value="all">Todos os casos iniciados</option>
            {MISSIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-6 border-b border-border pb-6 lg:grid-cols-4">
        {[
          {
            icon: Activity,
            label: "Incidentes em andamento",
            value: o.active.length,
            hint: `${o.alerts.length} alertas nos casos ativos`,
          },
          {
            icon: Trophy,
            label: "Campanha",
            value: `${passed.size}/${MISSIONS.length}`,
            hint: "missões aprovadas",
          },
          {
            icon: Target,
            label: "Taxa de aprovação",
            value: done.length
              ? `${Math.round((done.filter((a) => a.score.passed).length / done.length) * 100)}%`
              : "—",
            hint: `${done.length} tentativas finalizadas`,
          },
          { icon: ShieldCheck, label: lv.title, value: `${xp(d)} XP`, hint: `Nível ${lv.n}` },
        ].map((s) => (
          <div key={s.label}>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <s.icon className="size-4" />
              {s.label}
            </p>
            <p className="mt-3 font-display text-3xl font-bold">{s.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{s.hint}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Evolução dos incidentes</h2>
            <span className="font-mono text-[10px] text-muted-foreground">
              POR CICLO · MÉDIA DOS CASOS
            </span>
          </div>
          {o.series.length ? (
            <div className="mt-5 h-56" role="img" aria-label="Evolução de risco e disponibilidade">
              <ResponsiveContainer>
                <LineChart data={o.series}>
                  <CartesianGrid stroke="oklch(0.32 0.007 250)" strokeDasharray="3 3" />
                  <XAxis dataKey="tick" stroke="oklch(0.72 0.03 230)" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="oklch(0.72 0.03 230)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                    }}
                  />
                  <Line
                    name="Risco"
                    dataKey="risk"
                    stroke="oklch(0.66 0.21 25)"
                    dot
                    isAnimationActive={false}
                  />
                  <Line
                    name="Disponibilidade"
                    dataKey="health"
                    stroke="oklch(0.82 0.13 205)"
                    dot
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="my-5 grid h-56 place-items-center border-y border-dashed border-border text-sm text-muted-foreground">
              Nenhum caso iniciado neste ambiente.
            </div>
          )}
          <div className="mt-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Organizações monitoradas</h2>
            <span className="text-xs text-warning">Fictícias</span>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {MISSIONS.filter((m) => filter === "all" || m.id === filter).map((m) => {
              const s = d.active[m.id];
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="text-sm font-medium">{m.org}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{m.serviceName}</p>
                  </div>
                  {s ? (
                    <div className="text-right">
                      <p
                        className={
                          s.health >= 85
                            ? "font-mono text-sm text-primary"
                            : "font-mono text-sm text-warning"
                        }
                      >
                        {Math.round(s.health)}% · {serviceLabel(s.health)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Último estado · ciclo {s.tick}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Sem telemetria · caso não iniciado
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <div>
          <section className="border-l-2 border-warning pl-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Fila de alertas</h2>
              <select
                aria-label="Filtrar severidade"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="rounded border border-input bg-card p-2 text-xs"
              >
                <option value="all">Todas</option>
                {["critica", "alta", "media", "baixa"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
            {alerts.length ? (
              <ul className="mt-4 divide-y divide-border">
                {alerts.map(({ e, def, state }) => (
                  <li key={def.id + e.id} className="py-3">
                    <Link to="/missao/$missaoId" params={{ missaoId: def.id }}>
                      <p className="font-mono text-xs text-warning">
                        {e.id} · {e.severity}
                      </p>
                      <p className="mt-1 text-sm">{e.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {state.investigated.includes(e.id) ? "Analisado" : "Aguardando triagem"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-sm text-muted-foreground">Nenhum alerta neste filtro.</p>
            )}
          </section>
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Eventos recentes</h2>
            <ol className="mt-4 space-y-4 border-l border-border pl-4">
              {o.events.length ? (
                o.events.map((t, i) => (
                  <li key={i}>
                    <p className="font-mono text-[10px] text-accent">
                      CICLO {t.tick} · {t.source}
                    </p>
                    <p className="mt-1 text-xs">{t.text}</p>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">
                  O turno ainda não registra eventos.
                </li>
              )}
            </ol>
          </section>
        </div>
      </div>
      <section className="mt-8 border-t border-border pt-6">
        <div className="flex justify-between">
          <h2 className="text-lg font-semibold">Progresso da campanha</h2>
          <Button asChild variant="link" size="sm">
            <Link to="/campanha">
              Ver mapa
              <ArrowUpRight />
            </Link>
          </Button>
        </div>
        <Progress value={(passed.size / MISSIONS.length) * 100} className="mt-3" />
        <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {MISSIONS.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 border-b border-border py-3"
            >
              <p className="text-xs">{m.title}</p>
              <StatusBadge status={missionStatus(m, d)} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
