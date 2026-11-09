import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CloudOff, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/cyberlab/AppShell";
import { update } from "@/lib/cyberlab/progress";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — CyberLab" },
      { name: "description", content: "Acesse o CyberLab no modo demonstração." },
      { property: "og:title", content: "Entrar no CyberLab" },
      { property: "og:description", content: "Comece seu turno no SOC simulado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Entrar,
});

function Entrar() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const start = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2) return setError("Informe um nome com pelo menos 2 caracteres.");
    update((p) => ({ ...p, demo: { active: true, name: n.slice(0, 40) } }));
    navigate({ to: "/painel" });
  };

  return (
    <div className="min-h-screen bg-background bg-grid px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Logo />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <form onSubmit={start} className="panel p-6" noValidate>
            <HardDrive className="size-6 text-primary" aria-hidden />
            <h1 className="mt-3 text-2xl font-bold">Modo demonstração</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sem cadastro. Seu progresso fica salvo <strong>apenas neste navegador</strong> e não é sincronizado com nenhum servidor.
            </p>
            <Label htmlFor="nome" className="mt-6 block">Como devemos chamar você?</Label>
            <Input id="nome" className="mt-2" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} aria-invalid={!!error} aria-describedby={error ? "nome-erro" : undefined} placeholder="Ex.: Ana" />
            {error && <p id="nome-erro" role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="mt-6 w-full">Entrar no SOC</Button>
          </form>

          <section className="panel p-6" aria-labelledby="conta-titulo">
            <CloudOff className="size-6 text-muted-foreground" aria-hidden />
            <h2 id="conta-titulo" className="mt-3 text-2xl font-bold">Conta com sincronização</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Criar conta e entrar ainda não está disponível: o serviço de contas e armazenamento em nuvem não foi configurado nesta versão.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Quando ativado, seu progresso, tentativas e pontuações serão salvos com segurança e validados no servidor.
            </p>
            <p role="status" className="mt-6 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">Estado: não configurado</p>
            <Link to="/" className="mt-6 inline-block text-sm text-accent underline-offset-4 hover:underline">Voltar ao início</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
