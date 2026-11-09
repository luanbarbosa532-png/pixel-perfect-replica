import { CheckCircle2, Lock, PlayCircle, CircleDot } from "lucide-react";
import type { MissionStatus } from "@/lib/cyberlab/progress";
import { cn } from "@/lib/utils";

const MAP: Record<MissionStatus, { cls: string; icon: typeof Lock; label: string }> = {
  bloqueada: { cls: "border-border text-muted-foreground", icon: Lock, label: "Bloqueada" },
  disponivel: { cls: "border-accent/60 text-accent", icon: CircleDot, label: "Disponível" },
  "em andamento": { cls: "border-warning/60 text-warning", icon: PlayCircle, label: "Em andamento" },
  concluida: { cls: "border-primary/60 text-primary", icon: CheckCircle2, label: "Concluída" },
};

export function StatusBadge({ status }: { status: MissionStatus }) {
  const m = MAP[status];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs", m.cls)}>
      <Icon className="size-3.5" aria-hidden /> {m.label}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: number }) {
  const label = risk >= 80 ? "Crítico" : risk >= 55 ? "Alto" : risk >= 30 ? "Moderado" : "Baixo";
  const cls = risk >= 80 ? "bg-destructive text-destructive-foreground" : risk >= 55 ? "bg-warning text-warning-foreground" : risk >= 30 ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground";
  return <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", cls)}>Risco {label} · {Math.round(risk)}</span>;
}
