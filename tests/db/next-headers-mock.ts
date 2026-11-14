import { vi } from "vitest";

/** Fora de uma requisição do Next não há headers(): simula um IP de teste configurável. */
export const fakeRequest = { ip: "127.0.0.1" };

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": fakeRequest.ip }),
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => {} }),
}));
