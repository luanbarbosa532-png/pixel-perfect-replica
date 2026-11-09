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

describe("auditoria: pontuação e consistência", () => {
  it("decisões erradas reduzem a nota", () => {
    const ok = ["investigate MSG-01", "investigate MSG-02", "investigate DOM-FALSO", "investigate EVD-PROXY", "quarantine MSG-01", "block DOM-FALSO", "reset ACC-ANA", "report MSG-01"];
    const a = run("m1-phishing", ok);
    const b = run("m1-phishing", [...ok, "quarantine MSG-02"]);
    expect(score(b.def, b.s).total).toBeLessThan(score(a.def, a.s).total);
    expect(score(a.def, a.s).passed).toBe(true);
  });

  it("encerrar sem agir não aprova", () => {
    const { def, s } = run("m1-phishing", ["close"]);
    expect(score(def, s).passed).toBe(false);
    expect(s.status).toBe("ended");
  });

  it("conter tarde reduz a nota de tempo na força bruta", () => {
    const fast = run("m2-forca-bruta", ["investigate ALR-201", "investigate LOG-AUTH", "investigate IP-ATACANTE", "block IP-ATACANTE", "mitigate PORTAL"]);
    const slow = run("m2-forca-bruta", ["monitor", "monitor", "monitor", "monitor", "monitor", "monitor", "investigate ALR-201", "investigate LOG-AUTH", "investigate IP-ATACANTE", "block IP-ATACANTE", "mitigate PORTAL"]);
    expect(score(fast.def, fast.s).time).toBe(10);
    expect(score(slow.def, slow.s).time!).toBeLessThan(10);
  });

  it("controle do painel e comando do terminal produzem o mesmo estado", () => {
    const def = getMission("m0-plantao")!;
    const s0 = createInitialState(def, 0);
    const t = execute(def, s0, "investigate ALR-001", "terminal");
    const p = execute(def, s0, "investigate ALR-001", "painel");
    expect(t.investigated).toEqual(p.investigated);
    expect(t.risk).toBe(p.risk);
    expect(t.revealed).toEqual(p.revealed);
  });

  it("comando desconhecido com vários argumentos é tratado como desconhecido", () => {
    const { s } = run("m0-plantao", ["rm -rf /"]);
    expect(s.terminal.at(-1)?.text).toContain("Comando desconhecido");
  });
});
