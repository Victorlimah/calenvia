import { describe, expect, it } from "vitest";
import { duotoneTables } from "./photo";

describe("duotone (CAL-147)", () => {
  it("mapeia preto → cor escura e branco → cor clara", () => {
    expect(duotoneTables("#000000", "#FFFFFF")).toEqual({ r: "0 1", g: "0 1", b: "0 1" });
    expect(duotoneTables("#3A1F29", "#F8EDEA").r).toBe("0.227 0.973");
    expect(duotoneTables("lixo", "#FFFFFF").g).toBe("0 1");
  });
});
