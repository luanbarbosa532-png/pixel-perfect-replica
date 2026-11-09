import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Lock } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AppShell, PageTitle } from "@/components/cyberlab/AppShell";
import { MISSIONS, getMission } from "@/lib/cyberlab/missions";
import { achievements, resetAll, update, useProgress } from "@/lib/cyberlab/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico e evolução — CyberLab" },
      { name: "description", content: "Tentativas, pontuações, dificuldades por categoria e conquistas." },
      { property: "og:title", content: "Histórico e evolução — CyberLab" },
      { property: "og:description", content: "Acompanhe sua evolução como analista de SOC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <Historico />
    </AppShell>
  ),
});

function Historico() {
  const d = useProgress();
  const done = d.attempts.filter((a) => a.outcome === "concluida").sort((a, b) => a.endedAt - b.endedAt);
  const series = done.map((a, i) => ({ n: i + 1, nota: a.score.total }));
  const byCat = MISSIONS.map((m) => {
    const xs = done.filter((a) => a.missionId === m.id);
    return { m, avg: xs.length ? Math.round(xs.reduce((s, a) => s + a.score.total, 0) / xs.length) : null, n: xs.length };
  });
  const hardest = byCat.filter((c) => c.avg !== null).sort((a, b) => a.avg! - b.avg!)[0];

  return (
    <>
      <PageTitle title="Histórico e evolução" subtitle={`Dados de ${d.demo?.name}, salvos neste navegador.`}>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="outline" size="sm">Apagar meu progresso</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar todo o progresso?</AlertDialogTitle>
              <AlertDialogDescription>Lições, exercícios, tentativas e conquistas deste navegador serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { const demo = d.demo; resetAll(); update((p) => ({ ...p, demo })); }}>Apagar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageTitle>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2" aria-labelledby="evo">
          <h2 id="evo" className="font-semibold">Evolução das notas</h2>
          {series.length < 1 ? (
            <p className="mt-3 text-sm text-muted-foreground">Finalize uma missão para ver sua evolução.</p>
          ) : (
            <div className="mt-4 h-56">
              <ResponsiveContainer>
                <LineChart data={series}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="n" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                  <Line dataKey="nota" stroke="var(--chart-1)" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="panel p-5" aria-labelledby="cat">
          <h2 id="cat" className="font-semibold">Desempenho por categoria</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {byCat.map((c) => (
              <li key={c.m.id} className="flex justify-between gap-2"><span>{c.m.incidentType}</span><span className="font-mono">{c.avg === null ? "—" : `${c.avg} (${c.n}x)`}</span></li>
            ))}
          </ul>
          {hardest && <p className="mt-4 text-sm text-warning">Maior dificuldade: {hardest.m.incidentType}</p>}
        </section>
      </div>

      <section className="panel mt-6 p-5" aria-labelledby="conq">
        <h2 id="conq" className="font-semibold">Conquistas</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {achievements(d).map((a) => (
            <li key={a.id} className={cn("rounded-md border p-3", a.earned ? "border-primary/50" : "border-border opacity-70")}>
              <p className="flex items-center gap-2 text-sm font-medium">{a.earned ? <Award className="size-4 text-primary" aria-hidden /> : <Lock className="size-4" aria-hidden />}{a.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{a.description}{a.earned ? " · conquistada" : ""}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel mt-6 overflow-x-auto p-5" aria-labelledby="tent">
        <h2 id="tent" className="font-semibold">Tentativas</h2>
        {d.attempts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma tentativa registrada. <Link to="/campanha" className="text-accent hover:underline">Abrir a campanha</Link></p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Data</th><th>Missão</th><th>Situação</th><th>Nota</th><th>Ações</th><th>Erros</th></tr></thead>
            <tbody>
              {[...d.attempts].sort((a, b) => b.endedAt - a.endedAt).map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="py-2 font-mono text-xs">{new Date(a.endedAt).toLocaleString("pt-BR")}</td>
                  <td>{getMission(a.missionId)?.title}</td>
                  <td>{a.outcome === "reiniciada" ? "Reiniciada" : a.score.passed ? <span className="text-primary">Aprovado</span> : <span className="text-destructive">Não aprovado</span>}</td>
                  <td className="font-mono">{a.score.total}</td>
                  <td className="font-mono">{a.actions}</td>
                  <td className="font-mono">{a.wrongActions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
