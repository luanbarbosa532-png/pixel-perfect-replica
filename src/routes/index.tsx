import { createFileRoute, Link } from "@tanstack/react-router";
import { Bug, Fish, KeyRound, ShieldAlert, Terminal, Waves, LineChart, GraduationCap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/cyberlab/AppShell";
import hero from "@/assets/soc-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CyberLab — Aprenda cibersegurança investigando incidentes simulados" },
      { name: "description", content: "Laboratório educacional de SOC: phishing, força bruta, DDoS e malware em ambiente 100% simulado, com terminal, missões e relatórios." },
      { property: "og:title", content: "CyberLab — Laboratório de SOC para estudantes" },
      { property: "og:description", content: "Investigue incidentes fictícios, aplique defesas e receba relatórios detalhados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const MODULES = [
  { icon: Fish, title: "Phishing e engenharia social", text: "Analise remetentes, cabeçalhos e domínios. Coloque iscas em quarentena e proteja contas expostas." },
  { icon: KeyRound, title: "Força bruta", text: "Leia logs de autenticação, separe erro humano de ataque e aplique limites e MFA." },
  { icon: Waves, title: "DDoS e disponibilidade", text: "Interprete gráficos de tráfego e mitigue sem derrubar clientes reais." },
  { icon: Bug, title: "Malware e resposta", text: "Encontre IoCs, isole o ativo, preserve evidências e recupere na ordem certa." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Logo />
        <Button asChild variant="outline" size="sm">
          <Link to="/entrar">Entrar</Link>
        </Button>
      </header>

      <section className="relative overflow-hidden bg-hero">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-up">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 px-3 py-1 font-mono text-xs text-primary">
              <span className="size-1.5 rounded-full bg-primary animate-blink" aria-hidden /> SOC de treinamento · ambiente simulado
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              Aprenda a defender investigando <span className="text-primary">incidentes reais</span> — em um mundo fictício.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Assuma o turno de um analista de SOC: leia logs, use o terminal, correlacione evidências e aplique defesas. Cada decisão muda o incidente — e o relatório explica por quê.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="shadow-glow">
                <Link to="/academia">Começar a aprender</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/entrar">Acessar a demonstração</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <img src={hero} alt="Estação de trabalho de um centro de operações de segurança com gráficos e terminal" width={1600} height={912} className="rounded-xl border border-border shadow-glow" />
            <div className="panel absolute -bottom-6 left-4 right-4 bg-terminal p-4 font-mono text-xs md:left-8 md:right-auto md:w-96">
              <p className="text-muted-foreground">$ investigate LOG-AUTH</p>
              <p className="text-primary">✓ 203.0.113.45 gerou 398 falhas; 1 SUCCESS em admin.recepcao</p>
              <p className="text-muted-foreground">$ reset ACC-ADMIN</p>
              <p className="text-accent">✓ Sessões revogadas · MFA obrigatório</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="panel flex flex-col gap-3 border-warning/40 p-5 md:flex-row md:items-center">
          <ShieldAlert className="size-6 shrink-0 text-warning" aria-hidden />
          <p className="text-sm">
            <strong>Tudo é simulado.</strong> Organizações, domínios, IPs e arquivos são fictícios. O terminal só aceita comandos da simulação e nenhuma ação atinge sistemas reais.
          </p>
        </div>

        <h2 className="mt-16 text-3xl font-bold">Quatro módulos de treinamento</h2>
        <p className="mt-2 text-muted-foreground">Teoria acessível, código comentado, exercícios e uma missão prática por módulo — e uma missão final que junta tudo.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m, i) => (
            <article key={m.title} className="panel p-5">
              <m.icon className="size-6 text-accent" aria-hidden />
              <p className="mt-4 font-mono text-xs text-muted-foreground">Módulo {i + 1}</p>
              <h3 className="mt-1 font-semibold">{m.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{m.text}</p>
            </article>
          ))}
        </div>

        <h2 className="mt-16 text-3xl font-bold">Por que estudar no CyberLab</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            { icon: Terminal, t: "Terminal interpretado", d: "Comandos validados que alteram o mesmo incidente do painel." },
            { icon: LineChart, t: "Consequências reais", d: "Demorar ou errar agrava o incidente de forma previsível." },
            { icon: GraduationCap, t: "Relatório didático", d: "Pontuação transparente, acertos, erros e o que revisar." },
            { icon: Lock, t: "Seguro por design", d: "Nada sai do motor de simulação. Nenhum ataque real." },
          ].map((b) => (
            <div key={b.t} className="border-l-2 border-primary/60 pl-4">
              <b.icon className="size-5 text-primary" aria-hidden />
              <h3 className="mt-2 font-semibold">{b.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">CyberLab · plataforma educacional · ambiente fictício</footer>
    </div>
  );
}
