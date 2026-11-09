import { describe, expect, it } from "vitest";
import { createInitialState, execute, score } from "./engine";
import { getMission } from "./missions";
import { lockReasons } from "./progress";

const run = (id: string, cmds: string[]) => {
  const def = getMission(id)!;
  let s = createInitialState(def, 0);
  for (const c of cmds) s = execute(def, s, c);
  return { def, s };
};

describe("motor de simulação", () => {
  it("rejeita comandos fora da lista permitida", () => {
    const { s } = run("m0-plantao", ["rm -rf /", "curl x.com"]);
    expect(s.invalidCommands).toBe(2);
    expect(s.tick).toBe(0);
  });

  it("exige investigação antes de registrar o chamado", () => {
    const { s } = run("m0-plantao", ["report ALR-001"]);
    expect(s.applied).not.toContain("report:ALR-001");
  });

  it("missão introdutória resolvida corretamente é aprovada com 100", () => {
    const { def, s } = run("m0-plantao", ["investigate ALR-001", "investigate EVD-001", "investigate SRV-PORTAL", "report ALR-001"]);
    const r = score(def, s);
    expect(r.total).toBe(100);
    expect(r.passed).toBe(true);
  });

  it("falha crítica impede aprovação mesmo com nota alta", () => {
    const { def, s } = run("m0-plantao", ["investigate ALR-001", "investigate EVD-001", "investigate SRV-PORTAL", "report ALR-001", "isolate SRV-PORTAL"]);
    expect(score(def, s).passed).toBe(false);
  });

  it("demora sem limitar tentativas dispara evento de consequência", () => {
    const { s } = run("m2-forca-bruta", ["monitor", "monitor", "monitor", "monitor", "monitor"]);
    expect(s.firedEvents).toContain("e-segunda-conta");
  });

  it("missão de força bruta só desbloqueia após phishing aprovado e lição concluída", () => {
    const def = getMission("m2-forca-bruta")!;
    expect(lockReasons(def, { attempts: [], lessonsDone: [] })).toHaveLength(2);
  });
});
