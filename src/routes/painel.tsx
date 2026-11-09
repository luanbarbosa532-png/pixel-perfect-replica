import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, AlertTriangle, Award, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppShell, PageTitle } from "@/components/cyberlab/AppShell";
import { StatusBadge } from "@/components/cyberlab/StatusBadge";
import { MISSIONS, getMission } from "@/lib/cyberlab/missions";
import { level, missionStatus, nextMission, passedMissions, useProgress, xp } from "@/lib/cyberlab/progress";
import { visibleEntities } from "@/lib/cyberlab/engine";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel do SOC — CyberLab" },
      { name: "description", content: "Resumo da campanha, alertas ativos, nível e próxima missão." },
      { property: "og:title", content: "Painel do SOC — CyberLab" },
      { property: "og:description", content: "Seu centro de operações de segurança em treinamento." },
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

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Activity; label: string; value: string; hint?: string }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-4" aria-hidden />{label}</div>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Painel() {
  const d = useProgress();
  const passed = passedMissions(d);
  const finished = d.attempts.filter((a) => a.outcome === "concluida");
  const rate = finished.length ? Math.round((finished.filter((a) => a.score.passed).length / finished.length) * 100) : null;
  const points = xp(d);
  const lv = level(points);
  const next = nextMission(d);
  const statuses = MISSIONS.map((m) => missionStatus(m, d));
  const activeAlerts = Object.values(d.active)
    .filter((s) => s.status === "active")
    .flatMap((s) => {
      const def = getMission(s.missionId)!;
      return visibleEntities(def, s).filter((e) => e.kind === "alerta").map((e) => ({ e, def }));
    });
  const activity = [
    ...d.attempts.map((a) => ({ t: a.endedAt, text: `${getMission(a.missionId)?.title}: ${a.outcome === "reiniciada" ? "tentativa reiniciada" : a.score.passed ? `aprovado (${a.score.total})` : `não aprovado (${a.score.total})`}` })),
  ].sort((a, b) => b.t - a.t).slice(0, 6);

  return (
    <>
      <PageTitle title={`SOC Atlântico · turno de ${d.demo?.name}`} subtitle="Centro de operações de treinamento. Todos os incidentes são simulados.">
        {next && <Button asChild className="shadow-glow"><Link to="/missao/$missaoId" params={{ missaoId: next.id }}>Próxima missão: {next.title}</Link></Button>}
      </PageTitle>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Trophy} label="Missões concluídas" value={`${passed.size}/${MISSIONS.length}`} hint={`${statuses.filter((s) => s === "bloqueada").length} bloqueadas · ${statuses.filter((s) => s === "disponivel" || s === "em andamento").length} disponíveis`} />
        <Stat icon={Award} label="Pontos de experiência" value={String(points)} hint="Melhor nota ×2, lições e exercícios" />
        <Stat icon={Target} label="Taxa de sucesso" value={rate === null ? "—" : `${rate}%`} hint={`${finished.length} tentativa(s) finalizada(s)`} />
        <div className="panel p-4">
          <p className="text-xs text-muted-foreground">Nível {lv.n}</p>
          <p className="mt-2 font-display text-xl font-bold text-primary">{lv.title}</p>
          {lv.next ? <><Progress value={(lv.current / lv.next) * 100} className="mt-3" aria-label="Progresso de nível" /><p className="mt-1 text-xs text-muted-foreground">{lv.current}/{lv.next} XP para o próximo nível</p></> : <p className="mt-2 text-xs">Nível máximo</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2" aria-labelledby="camp">
          <h2 id="camp" className="font-semibold">Campanha</h2>
          <ul className="mt-4 divide-y divide-border">
            {MISSIONS.map((m, i) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium">{i}. {m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.org} · {m.incidentType}</p>
                </div>
                <StatusBadge status={statuses[i]} />
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          <section className="panel p-5" aria-labelledby="alertas">
            <h2 id="alertas" className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 text-warning" aria-hidden />Alertas ativos</h2>
            {activeAlerts.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nenhuma missão em andamento. Os alertas aparecem aqui quando você inicia uma missão.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {activeAlerts.map(({ e, def }) => (
                  <li key={def.id + e.id}>
                    <Link to="/missao/$missaoId" params={{ missaoId: def.id }} className="block rounded-md border border-border p-2 text-sm hover:bg-secondary">
                      <span className="font-mono text-xs text-warning">[{(e.severity ?? "media").toUpperCase()}] {e.id}</span>
                      <span className="block">{e.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="panel p-5" aria-labelledby="atv">
            <h2 id="atv" className="font-semibold">Atividade recente</h2>
            {activity.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Sem atividades ainda. Comece pela missão introdutória.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {activity.map((a, i) => (
                  <li key={i}><span className="font-mono text-xs text-muted-foreground">{new Date(a.t).toLocaleString("pt-BR")}</span><br />{a.text}</li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
