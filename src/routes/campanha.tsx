import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell, PageTitle } from "@/components/cyberlab/AppShell";
import { StatusBadge } from "@/components/cyberlab/StatusBadge";
import { MISSIONS } from "@/lib/cyberlab/missions";
import { bestScore, lockReasons, missionStatus, useProgress } from "@/lib/cyberlab/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/campanha")({
  head: () => ({
    meta: [
      { title: "Mapa da campanha — CyberLab" },
      { name: "description", content: "Sequência de missões do CyberLab, do primeiro plantão à Operação Aurora." },
      { property: "og:title", content: "Mapa da campanha — CyberLab" },
      { property: "og:description", content: "Seis missões progressivas de resposta a incidentes simulados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <Campanha />
    </AppShell>
  ),
});

function Campanha() {
  const d = useProgress();
  return (
    <>
      <PageTitle title="Mapa da campanha" subtitle="Aprovação exige 70 pontos e todos os objetivos obrigatórios, sem falha crítica." />
      <ol className="relative space-y-4 border-l-2 border-border pl-6">
        {MISSIONS.map((m, i) => {
          const st = missionStatus(m, d);
          const reasons = lockReasons(m, d);
          const best = bestScore(m.id, d);
          return (
            <li key={m.id} className="relative">
              <span className={cn("absolute -left-[35px] top-5 grid size-6 place-items-center rounded-full border-2 bg-background font-mono text-xs", st === "concluida" ? "border-primary text-primary" : st === "bloqueada" ? "border-border text-muted-foreground" : "border-accent text-accent")} aria-hidden>{i}</span>
              <article className={cn("panel p-5", st === "bloqueada" && "opacity-80", m.id === "m5-final" && "border-primary/40")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{m.incidentType} · {m.difficulty}</p>
                    <h2 className="mt-1 text-lg font-semibold">{m.title}</h2>
                    <p className="text-sm text-muted-foreground">{m.org}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {best !== null && <span className="font-mono text-xs">Melhor: {best}</span>}
                    <StatusBadge status={st} />
                  </div>
                </div>
                <p className="mt-3 text-sm"><strong>Objetivo:</strong> {m.objective}</p>
                {st === "bloqueada" ? (
                  <div className="mt-3 rounded-md border border-border p-3 text-sm">
                    <p className="flex items-center gap-2 font-medium"><Lock className="size-4" aria-hidden />Para liberar:</p>
                    <ul className="mt-1 list-disc pl-6 text-muted-foreground">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                  </div>
                ) : (
                  <Button asChild className="mt-4" variant={st === "concluida" ? "outline" : "default"}>
                    <Link to="/missao/$missaoId" params={{ missaoId: m.id }}>{st === "em andamento" ? "Continuar" : st === "concluida" ? "Jogar novamente" : "Iniciar missão"}</Link>
                  </Button>
                )}
              </article>
            </li>
          );
        })}
      </ol>
    </>
  );
}
