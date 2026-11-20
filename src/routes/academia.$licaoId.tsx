import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/cyberlab/AppShell";
import { getLesson, type Exercise } from "@/lib/cyberlab/content";
import { MISSIONS } from "@/lib/cyberlab/missions";
import { update, useProgress } from "@/lib/cyberlab/progress";
import { CodeStudy } from "@/components/cyberlab/CodeStudy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/academia/$licaoId")({
  loader: ({ params }) => {
    const lesson = getLesson(params.licaoId);
    if (!lesson) throw notFound();
    return { title: lesson.title, short: lesson.short };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Lição"} — Academia CyberLab` },
      { name: "description", content: loaderData?.short ?? "Lição da Academia CyberLab." },
      { property: "og:title", content: `${loaderData?.title ?? "Lição"} — CyberLab` },
      { property: "og:description", content: loaderData?.short ?? "Lição da Academia CyberLab." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <LessonPage />
    </AppShell>
  ),
});

function LessonPage() {
  const { licaoId } = Route.useParams();
  const l = getLesson(licaoId)!;
  const d = useProgress();
  const done = d.lessonsDone.includes(l.id);
  const mission = MISSIONS.find((m) => m.prereqLessons.includes(l.id));


  const markDone = () => {
    update((p) => ({ ...p, lessonsDone: p.lessonsDone.includes(l.id) ? p.lessonsDone : [...p.lessonsDone, l.id] }));
    toast.success("Lição concluída", { description: mission ? `Requisito de "${mission.title}" cumprido.` : undefined });
  };

  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/academia" className="text-sm text-accent hover:underline">← Academia</Link>
      <h1 className="mt-3 text-3xl font-bold md:text-4xl">{l.title}</h1>
      <p className="mt-2 text-lg text-muted-foreground">{l.short}</p>

      <section className="panel mt-6 p-5">
        <h2 className="font-semibold">Objetivos de aprendizagem</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{l.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
      </section>

      {l.sections.map((s) => (
        <section key={s.title} className="mt-8">
          <h2 className="text-xl font-semibold">{s.title}</h2>
          {s.body.map((p, i) => <p key={i} className="mt-3 leading-relaxed text-foreground/90">{p}</p>)}
        </section>
      ))}

      <section className="mt-8 border-l-2 border-accent pl-4">
        <h2 className="font-semibold text-accent">Exemplo prático: {l.example.title}</h2>
        <p className="mt-2 text-sm leading-relaxed">{l.example.body}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Código didático comentado</h2>
        <div className="mt-3"><CodeStudy lesson={l} /></div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Perguntas de revisão</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{l.review.map((q) => <li key={q}>{q}</li>)}</ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Exercícios</h2>
        <p className="mt-1 text-xs text-muted-foreground">Modo demonstração: a correção é feita neste navegador.</p>
        <div className="mt-4 space-y-4">{l.exercises.map((e) => <ExerciseCard key={e.id} ex={e} />)}</div>
      </section>

      <section className="panel mt-8 p-5">
        <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-primary" aria-hidden />Recomendações defensivas</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{l.defenses.map((x) => <li key={x}>{x}</li>)}</ul>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3 pb-12">
        {done ? (
          <p className="inline-flex items-center gap-2 text-primary"><CheckCircle2 className="size-5" aria-hidden />Lição concluída</p>
        ) : (
          <Button onClick={markDone}>Marcar como concluída</Button>
        )}
        {mission && <Button asChild variant="outline"><Link to="/missao/$missaoId" params={{ missaoId: mission.id }}>Ir para a missão: {mission.title}</Link></Button>}
      </div>
    </article>
  );
}

function ExerciseCard({ ex }: { ex: Exercise }) {
  const d = useProgress();
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<boolean | null>(null);
  const saved = d.exercises[ex.id];

  const submit = () => {
    if (choice === null) return;
    const ok = choice === ex.answer;
    setResult(ok);
    update((p) => {
      const prev = p.exercises[ex.id];
      return { ...p, exercises: { ...p.exercises, [ex.id]: { correct: prev?.correct || ok, tries: (prev?.tries ?? 0) + 1 } } };
    });
  };

  return (
    <fieldset className="panel p-4">
      <legend className="sr-only">{ex.prompt}</legend>
      <p className="font-medium">{ex.prompt}</p>
      {ex.code && <code className="mt-2 block rounded bg-terminal px-3 py-2 font-mono text-xs">{ex.code}</code>}
      <div className="mt-3 space-y-2">
        {ex.options.map((o, i) => (
          <label key={i} className={cn("flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-accent", result !== null && "pointer-events-none opacity-90")}>
            <input type="radio" name={ex.id} checked={choice === i} onChange={() => setChoice(i)} className="accent-[var(--accent)]" disabled={result !== null} />
            {o}
          </label>
        ))}
      </div>
      {result === null ? (
        <div className="mt-3 flex items-center gap-3">
          <Button size="sm" onClick={submit} disabled={choice === null}>Verificar resposta</Button>
          {saved?.correct && <span className="text-xs text-primary">Já respondido corretamente</span>}
        </div>
      ) : (
        <div role="status" className={cn("mt-3 rounded-md border p-3 text-sm", result ? "border-primary/50" : "border-destructive/50")}>
          <p className={cn("flex items-center gap-2 font-semibold", result ? "text-primary" : "text-destructive")}>
            {result ? <CheckCircle2 className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}
            {result ? "Correto!" : "Ainda não."}
          </p>
          {result ? <p className="mt-1">{ex.explanation}</p> : <p className="mt-1">Releia a seção relacionada e tente de novo.</p>}
          <Button size="sm" variant="outline" className="mt-2" onClick={() => { setResult(null); setChoice(null); }}>Tentar novamente</Button>
        </div>
      )}
    </fieldset>
  );
}
