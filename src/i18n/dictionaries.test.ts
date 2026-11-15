import { describe, expect, it } from "vitest";
import { en } from "./en";
import { ar } from "./ar";

type Tree = { [key: string]: string | Tree };

function leaves(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(path, v);
    else for (const [p, s] of leaves(v, path)) out.set(p, s);
  }
  return out;
}

describe("English/Arabic dictionaries", () => {
  const enKeys = leaves(en as unknown as Tree);
  const arKeys = leaves(ar as unknown as Tree);

  it("have exactly the same keys", () => {
    expect([...arKeys.keys()].sort()).toEqual([...enKeys.keys()].sort());
  });

  it("have no empty Arabic strings", () => {
    const empty = [...arKeys].filter(([, v]) => v.trim() === "").map(([k]) => k);
    expect(empty).toEqual([]);
  });
});
