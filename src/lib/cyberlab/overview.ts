import { MISSIONS } from "./missions";
import { visibleEntities } from "./engine";
import type { ProgressData } from "./progress";
export function overview(d: ProgressData, mission = "all") {
  const cases = MISSIONS.filter((m) => mission === "all" || m.id === mission).flatMap((def) => {
    const state = d.active[def.id];
    return state ? [{ def, state }] : [];
  });
  const active = cases.filter((c) => c.state.status === "active");
  const alerts = active.flatMap(({ def, state }) =>
    visibleEntities(def, state)
      .filter((e) => e.kind === "alerta")
      .map((e) => ({ e, def, state })),
  );
  const ticks = Math.max(0, ...cases.map((c) => c.state.tick));
  const series = cases.length
    ? Array.from({ length: ticks + 1 }, (_, tick) => {
        const samples = cases
          .map((c) => c.state.history.filter((h) => h.tick <= tick).at(-1))
          .filter((h) => h !== undefined);
        return {
          tick,
          risk: Math.round(samples.reduce((v, h) => v + h.risk, 0) / samples.length),
          health: Math.round(samples.reduce((v, h) => v + h.health, 0) / samples.length),
        };
      })
    : [];
  return {
    cases,
    active,
    alerts,
    series,
    events: cases
      .flatMap((c) => c.state.timeline.map((t) => ({ ...t, def: c.def, time: c.state.startedAt })))
      .sort((a, b) => b.time - a.time || b.tick - a.tick)
      .slice(0, 12),
  };
}
