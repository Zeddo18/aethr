import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
const lock = JSON.parse(readFileSync(join(process.cwd(), "package-lock.json"), "utf8"));

describe("production dependency safety", () => {
  it("overrides the Next.js nested PostCSS copy with a patched release", () => {
    const patchedVersion = pkg.overrides?.next?.postcss;
    expect(patchedVersion).toBe("8.5.33");
    const nested = lock.packages["node_modules/next/node_modules/postcss"];
    expect(nested.version).toBe(patchedVersion);
    expect(nested.resolved).toBe(`https://registry.npmjs.org/postcss/-/postcss-${patchedVersion}.tgz`);
    expect(nested.integrity).toMatch(/^sha512-/);
    expect(nested.dev).toBeUndefined();
  });
  it("keeps Next.js on the reviewed 15.x release", () => {
    expect(lock.packages["node_modules/next"].version).toBe("15.5.29");
  });
});
