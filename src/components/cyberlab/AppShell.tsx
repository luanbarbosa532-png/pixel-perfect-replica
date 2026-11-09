import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, ShieldCheck, X, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { update, useProgress } from "@/lib/cyberlab/progress";

const NAV = [
  { to: "/painel", label: "Painel SOC" },
  { to: "/academia", label: "Academia" },
  { to: "/campanha", label: "Campanha" },
  { to: "/historico", label: "Histórico" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
      <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
        <ShieldCheck className="size-5" aria-hidden />
      </span>
      Cyber<span className="text-primary">Lab</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const d = useProgress();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    setMounted(true);
  }, []);

  const leave = () => {
    update((p) => ({ ...p, demo: null }));
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Logo />
          <nav aria-label="Principal" className="ml-6 hidden gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {mounted && d.demo && (
              <span className="hidden items-center gap-1.5 rounded-full border border-warning/50 px-2.5 py-1 text-xs text-warning sm:flex">
                <HardDrive className="size-3.5" aria-hidden /> Demonstração · salvo neste navegador
              </span>
            )}
            {mounted && d.demo && (
              <Button variant="ghost" size="sm" onClick={leave} className="hidden md:inline-flex">
                Sair
              </Button>
            )}
            <Button variant="ghost" size="icon" className="md:hidden" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {open && (
          <nav aria-label="Principal (móvel)" className="border-t border-border px-4 py-2 md:hidden">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm hover:bg-secondary">
                {n.label}
              </Link>
            ))}
            {d.demo && (
              <button onClick={leave} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary">
                Sair da demonstração
              </button>
            )}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {!mounted ? (
          <div className="panel h-64 animate-pulse" aria-busy="true" aria-label="Carregando" />
        ) : !d.demo ? (
          <div className="panel mx-auto max-w-lg p-8 text-center">
            <h1 className="text-2xl font-bold">Acesso ao laboratório</h1>
            <p className="mt-2 text-muted-foreground">Entre no modo demonstração para acessar o SOC simulado.</p>
            <Button asChild className="mt-6">
              <Link to="/entrar">Ir para a entrada</Link>
            </Button>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
