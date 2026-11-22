import { describe, expect, it } from "vitest";
import { createInitialState, execute, score } from "./engine";
import { MISSIONS } from "./missions";
import { overview } from "./overview";
import type { ProgressData } from "./progress";

const def = MISSIONS[0];
if (!def) throw new Error("Intro mission missing");

describe("investigation records", () => {
  it("requires analysis before evidence can be associated with an incident", () => {
    const state = execute(def, createInitialState(def, 0), "link ALR-001");
    expect(state.linkedEvidence ?? []).toEqual([]);
    expect(state.invalidCommands).toBe(1);
  });
  it("shares associations between panel and terminal and preserves them after clear", () => {
    const initial = execute(def, createInitialState(def, 0), "investigate ALR-001");
    const panel = execute(def, initial, "link ALR-001", "painel");
    const terminal = execute(def, initial, "link ALR-001");
    expect(panel.linkedEvidence).toEqual(["ALR-001"]);
    expect(terminal.linkedEvidence).toEqual(panel.linkedEvidence);
    const cleared = execute(def, panel, "clear");
    expect(JSON.parse(JSON.stringify(cleared)).linkedEvidence).toEqual(["ALR-001"]);
    expect(panel.tick).toBe(initial.tick);
    expect(score(def, panel)).toEqual(score(def, initial));
  });
  it("does not duplicate associated evidence", () => {
    let state = execute(def, createInitialState(def, 0), "investigate ALR-001");
    state = execute(def, state, "link ALR-001");
    state = execute(def, state, "link ALR-001");
    expect(state.linkedEvidence).toEqual(["ALR-001"]);
  });
  it("filters SOC telemetry by case and uses actual simulation risk", () => {
    const state = execute(def, createInitialState(def, 0), "investigate ALR-001");
    const data: ProgressData = {
      version: 1,
      demo: null,
      lessonsDone: [],
      exercises: {},
      attempts: [],
      active: { [def.id]: state },
    };
    expect(overview(data, def.id).series.at(-1)?.risk).toBe(state.risk);
    expect(overview(data, "m1-phishing").series).toEqual([]);
    expect(overview(data, "m1-phishing").alerts).toEqual([]);
    expect(overview(data).active).toHaveLength(1);
  });
});
