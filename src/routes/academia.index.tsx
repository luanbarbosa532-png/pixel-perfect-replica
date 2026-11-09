import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { AppShell, PageTitle } from "@/components/cyberlab/AppShell";
import { LESSONS } from "@/lib/cyberlab/content";
import { useProgress } from "@/lib/cyberlab/progress";

export const Route = createFileRoute("/academia/")({
  head: () => ({
    meta: [
      { title: "Academia — CyberLab" },
      { name: "description", content: "Lições de SOC, phishing, força bruta, DDoS e malware com código comentado e exercícios." },
      { property: "og:title", content: "Academia CyberLab" },
      { property: "og:description", content: "Teoria acessível, exemplos e exercícios de cibersegurança defensiva." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Academia,
});

function Academia() {
  return (
    <AppShell>
      <Lista />
    </AppShell>
  );
}

function Lista() {
  const d = useProgress();
  return (
    <>
      <PageTitle title="Academia" subtitle="Conclua a lição de cada módulo para liberar a missão correspondente." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {LESSONS.map((l, i) => {
          const done = d.lessonsDone.includes(l.id);
          return (
            <Link key={l.id} to="/academia/$licaoId" params={{ licaoId: l.id }} className="panel group p-5 transition-colors hover:border-accent">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{i === 0 ? "Introdução" : `Módulo ${i}`}</span>
                {done && <span className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="size-4" aria-hidden />Concluída</span>}
              </div>
              <h2 className="mt-2 text-lg font-semibold group-hover:text-accent">{l.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{l.short}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
