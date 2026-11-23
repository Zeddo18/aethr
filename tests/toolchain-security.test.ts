import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
const lock = JSON.parse(readFileSync(join(process.cwd(), "package-lock.json"), "utf8"));

const parts = (version: string) => version.split(".").map(Number);
const atLeast = (actual: string, minimum: string) => {
  const a = parts(actual), b = parts(minimum);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
};

describe("Phase 12 test toolchain dependency guard", () => {
  it("commits the same Vitest and Vite versions declared in package.json", () => {
    expect(lock.packages["node_modules/vitest"].version).toBe(manifest.devDependencies.vitest);
    expect(lock.packages["node_modules/vite"].version).toBe(manifest.devDependencies.vite);
  });
  it("keeps patched toolchain versions", () => {
    expect(atLeast(lock.packages["node_modules/vitest"].version, "5.1.1")).toBe(true);
    expect(atLeast(lock.packages["node_modules/vite"].version, "7.3.8")).toBe(true);
    expect(atLeast(lock.packages["node_modules/esbuild"].version, "0.25.0")).toBe(true);
    expect(atLeast(lock.packages["node_modules/@vitest/mocker"].version, "5.1.1")).toBe(true);
    expect(lock.packages["node_modules/vite-node"]).toBeUndefined();
  });
  it("preserves the Phase 11 production dependency fix", () => {
    expect(lock.packages["node_modules/next/node_modules/postcss"].version).toBe("8.5.33");
    expect(manifest.overrides.next.postcss).toBe("8.5.33");
  });
});
