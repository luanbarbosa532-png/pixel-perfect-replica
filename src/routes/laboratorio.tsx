import { createFileRoute, Link } from "@tanstack/react-router";
import { Terminal, ArrowUpRight, Lock } from "lucide-react";
import { AppShell, PageTitle } from "@/components/cyberlab/AppShell";
import { Button } from "@/components/ui/button";
import { MISSIONS } from "@/lib/cyberlab/missions";
import { lockReasons, missionStatus, useProgress } from "@/lib/cyberlab/progress";
import { StatusBadge } from "@/components/cyberlab/StatusBadge";
export const Route = createFileRoute("/laboratorio")({
  head: () => ({
    meta: [
      { title: "Casos de investigação — CyberLab" },
      {
        name: "description",
        content: "Abra uma investigação simulada com terminal, evidências e controles defensivos.",
      },
      { property: "og:title", content: "Laboratório de investigação CyberLab" },
      { property: "og:description", content: "Casos e investigações defensivas simuladas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <Cases />
    </AppShell>
  ),
});
function Cases() {
  const d = useProgress();
  return (
    <>
      <PageTitle
        title="Laboratório de investigação"
        subtitle="Selecione um caso para iniciar ou retomar seu trabalho."
      />
      <div className="divide-y divide-border">
        {MISSIONS.map((m) => {
          const reasons = lockReasons(m, d);
          return (
            <article key={m.id} className="grid gap-4 py-6 md:grid-cols-[48px_1fr_auto]">
              <Terminal className="size-7 text-accent" />
              <div>
                <p className="font-mono text-xs text-muted-foreground">
                  CASO {m.order.toString().padStart(2, "0")} · {m.incidentType}
                </p>
                <h2 className="mt-1 text-xl font-semibold">{m.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{m.org}</p>
                <p className="mt-2 text-sm">{m.objective}</p>
                {reasons.length > 0 && (
                  <p className="mt-2 flex gap-2 text-xs text-warning">
                    <Lock className="size-3 shrink-0" />
                    {reasons.join(" ")}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-start gap-3">
                <StatusBadge status={missionStatus(m, d)} />
                {!reasons.length && (
                  <Button asChild variant="outline">
                    <Link to="/missao/$missaoId" params={{ missaoId: m.id }}>
                      Abrir caso
                      <ArrowUpRight />
                    </Link>
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
