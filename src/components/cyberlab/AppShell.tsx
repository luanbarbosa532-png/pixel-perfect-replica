import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  History,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Terminal,
  UserRound,
  Waypoints,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { update, useProgress, level, xp } from "@/lib/cyberlab/progress";
import { MISSIONS } from "@/lib/cyberlab/missions";
import { LESSONS } from "@/lib/cyberlab/content";
import { cn } from "@/lib/utils";
const NAV = [
  { to: "/painel", label: "Central SOC", icon: Activity },
  { to: "/campanha", label: "Campanha", icon: Waypoints },
  { to: "/academia", label: "Academia", icon: GraduationCap },
  { to: "/laboratorio", label: "Laboratório", icon: Terminal },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/perfil", label: "Perfil", icon: UserRound },
] as const;
export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
      <ShieldCheck className="size-7 shrink-0 text-accent" />
      <span>
        Cyber<span className="text-accent">Lab</span>
        <span className="ml-1 align-top font-mono text-[10px] text-muted-foreground">2.0</span>
      </span>
    </Link>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  const d = useProgress();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [notifications, setNotifications] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const leave = () => {
    update((p) => ({ ...p, demo: null }));
    navigate({ to: "/entrar" });
  };
  const events = Object.values(d.active)
    .flatMap((s) => s.timeline.map((t) => ({ ...t, mission: s.missionId })))
    .slice(-12)
    .reverse();
  const active =
    NAV.find((n) => path.startsWith(n.to))?.label ??
    (path.startsWith("/missao") ? "Laboratório" : "Central SOC");
  return (
    <div className="min-h-screen bg-background">
      {mobile && (
        <div
          className="fixed inset-0 z-30 bg-background/80 xl:hidden"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-sidebar transition-[width,transform]",
          collapsed ? "w-16" : "w-56",
          mobile ? "translate-x-0" : "-translate-x-full xl:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center justify-center border-b border-border px-4">
          {collapsed ? <ShieldCheck className="size-7 text-accent" /> : <Logo />}
        </div>
        {!collapsed && (
          <p className="px-5 pb-2 pt-7 font-mono text-[10px] text-muted-foreground">
            ESPAÇO DE OPERAÇÕES
          </p>
        )}
        <nav aria-label="Principal" className="space-y-1 px-2 py-3">
          {NAV.map((n) => (
            <Button
              asChild
              variant="ghost"
              key={n.to}
              className={cn(
                "h-11 w-full justify-start text-muted-foreground hover:bg-secondary hover:text-foreground",
                (path.startsWith(n.to) ||
                  (n.to === "/laboratorio" && path.startsWith("/missao"))) &&
                  "border-l-2 border-accent bg-secondary text-accent",
                collapsed && "justify-center px-0",
              )}
            >
              <Link to={n.to} title={n.label} onClick={() => setMobile(false)}>
                <n.icon className="size-4 shrink-0" />
                {!collapsed && n.label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="mt-auto border-t border-border p-3">
          {!collapsed && (
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" />
              Ambiente simulado<span className="sr-only">Ambiente simulado</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            title={collapsed ? "Expandir navegação" : "Recolher navegação"}
            aria-label={collapsed ? "Expandir navegação" : "Recolher navegação"}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </Button>
        </div>
      </aside>
      <div className={cn("min-w-0 transition-[margin]", collapsed ? "xl:ml-16" : "xl:ml-56")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="xl:hidden"
            aria-label={mobile ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </Button>
          <span className="hidden text-sm text-muted-foreground sm:block">
            Operações <span className="mx-2 text-border">/</span>
            <span className="text-foreground">{active}</span>
          </span>
          <Button
            variant="ghost"
            onClick={() => setSearch(true)}
            className="ml-auto text-muted-foreground"
            aria-label="Buscar no CyberLab"
          >
            <Search />
            <span className="hidden md:inline">Buscar no CyberLab</span>
          </Button>
          <span className="hidden border-l border-border pl-4 font-mono text-[10px] text-warning lg:block">
            SIMULAÇÃO LOCAL
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notificações"
            onClick={() => setNotifications(true)}
            className="relative"
          >
            <Bell />
            {events.length > 0 && (
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-warning" />
            )}
          </Button>
          <Button asChild variant="ghost" className="max-w-40 min-w-0 px-2">
            <Link to="/perfil">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary font-mono text-accent">
                {mounted ? (d.demo?.name.slice(0, 2).toUpperCase() ?? "CL") : "CL"}
              </span>
              <span className="hidden truncate text-xs sm:block">
                {mounted ? (d.demo?.name ?? "Visitante") : "Visitante"}
              </span>
            </Link>
          </Button>
          {mounted && d.demo && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sair da demonstração"
              title="Sair da demonstração"
              onClick={leave}
            >
              <LogOut />
            </Button>
          )}
        </header>
        <main className="mx-auto max-w-[1800px] px-4 py-6 md:px-6">
          {!mounted ? (
            <div className="h-64 animate-pulse bg-card" aria-busy="true" />
          ) : !d.demo ? (
            <div className="mx-auto max-w-lg py-20 text-center">
              <ShieldCheck className="mx-auto size-12 text-accent" />
              <h1 className="mt-4 text-3xl font-bold">CyberLab</h1>
              <p className="mt-3 text-muted-foreground">
                Seu turno no laboratório de investigação.
              </p>
              <Button asChild className="mt-6">
                <Link to="/entrar">Entrar na demonstração</Link>
              </Button>
              <p className="mt-4 text-xs text-muted-foreground">
                Progresso salvo apenas neste navegador.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <Dialog open={search} onOpenChange={setSearch}>
        <DialogContent className="max-h-[80vh] overflow-auto">
          <DialogTitle>Busca interna</DialogTitle>
          <DialogDescription>Missões, lições e áreas do CyberLab</DialogDescription>
          <input
            autoFocus
            aria-label="Buscar missão ou lição"
            className="h-10 w-full rounded-md border border-input bg-secondary px-3"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {NAV.filter((n) => n.label.toLowerCase().includes(query.toLowerCase())).map((n) => (
            <Button asChild variant="ghost" className="justify-start" key={n.to}>
              <Link to={n.to} onClick={() => setSearch(false)}>
                <n.icon />
                {n.label}
              </Link>
            </Button>
          ))}
          {MISSIONS.filter((m) =>
            `${m.title} ${m.incidentType}`.toLowerCase().includes(query.toLowerCase()),
          ).map((m) => (
            <Link
              key={m.id}
              to="/missao/$missaoId"
              params={{ missaoId: m.id }}
              onClick={() => setSearch(false)}
              className="border-t border-border py-2 text-sm"
            >
              <span className="text-accent">Caso</span> · {m.title}
            </Link>
          ))}
          {LESSONS.filter((l) => l.title.toLowerCase().includes(query.toLowerCase())).map((l) => (
            <Link
              key={l.id}
              to="/academia/$licaoId"
              params={{ licaoId: l.id }}
              onClick={() => setSearch(false)}
              className="text-sm"
            >
              <span className="text-primary">Academia</span> · {l.title}
            </Link>
          ))}
        </DialogContent>
      </Dialog>
      <Dialog open={notifications} onOpenChange={setNotifications}>
        <DialogContent>
          <DialogTitle>Notificações da simulação</DialogTitle>
          <DialogDescription>Eventos registrados nas suas investigações.</DialogDescription>
          {events.length ? (
            events.map((t, i) => (
              <Link
                key={i}
                to="/missao/$missaoId"
                params={{ missaoId: t.mission }}
                onClick={() => setNotifications(false)}
                className="border-b border-border py-2 text-sm"
              >
                <span className="font-mono text-xs text-accent">Ciclo {t.tick}</span>
                <p>{t.text}</p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function PageTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 font-mono text-[10px] text-accent">CYBERLAB / OPERAÇÕES SIMULADAS</p>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
