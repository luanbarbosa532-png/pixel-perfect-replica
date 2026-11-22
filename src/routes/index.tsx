import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageTitle } from "@/components/cyberlab/AppShell";
import { Button } from "@/components/ui/button";
import { nextMission, useProgress } from "@/lib/cyberlab/progress";
import { MISSIONS } from "@/lib/cyberlab/missions";
import { StatusBadge } from "@/components/cyberlab/StatusBadge";
import { missionStatus } from "@/lib/cyberlab/progress";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CyberLab — Aprenda cibersegurança investigando incidentes simulados" },
      {
        name: "description",
        content:
          "Laboratório educacional de SOC: phishing, força bruta, DDoS e malware em ambiente 100% simulado, com terminal, missões e relatórios.",
      },
      { property: "og:title", content: "CyberLab — Laboratório de SOC para estudantes" },
      {
        property: "og:description",
        content: "Investigue incidentes fictícios, aplique defesas e receba relatórios detalhados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <PainelHome />
    </AppShell>
  ),
});

function PainelHome() {
  const d = useProgress();
  const next = nextMission(d);
  return (
    <>
      <PageTitle
        title="CyberLab"
        subtitle="Laboratório de investigação e defesa cibernética · ambiente simulado"
      />
      <div className="border-y border-border py-8">
        <p className="font-mono text-xs text-accent">TURNO DE {d.demo?.name.toUpperCase()}</p>
        <h2 className="mt-3 text-3xl font-bold">{next ? next.title : "Campanha concluída"}</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {next?.briefing ?? "Revise seus relatórios e pratique novamente os casos."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {next && (
            <Button asChild>
              <Link to="/missao/$missaoId" params={{ missaoId: next.id }}>
                Abrir investigação
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/painel">Central SOC</Link>
          </Button>
        </div>
      </div>
      <h2 className="mt-8 text-lg font-semibold">Seus casos</h2>
      <ul className="mt-4 divide-y divide-border">
        {MISSIONS.map((m) => (
          <li key={m.id} className="flex flex-wrap justify-between gap-3 py-4">
            <div>
              <p className="font-medium">{m.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {m.incidentType} · {m.org}
              </p>
            </div>
            <StatusBadge status={missionStatus(m, d)} />
          </li>
        ))}
      </ul>
    </>
  );
}
