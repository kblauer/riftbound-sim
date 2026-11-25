import { describe, expect, it } from "vitest";
import { isLocalSupabaseUrl } from "./local.ts";

describe("isLocalSupabaseUrl", () => {
  it("accepts the local stack", () => {
    expect(isLocalSupabaseUrl("http://127.0.0.1:54321")).toBe(true);
    expect(isLocalSupabaseUrl("http://localhost:54321")).toBe(true);
  });

  it("rejects hosted projects, lookalikes, and junk", () => {
    expect(isLocalSupabaseUrl("https://abcd.supabase.co")).toBe(false);
    expect(isLocalSupabaseUrl("https://localhost.evil.example")).toBe(false);
    expect(isLocalSupabaseUrl("https://127.0.0.1.evil.example")).toBe(false);
    expect(isLocalSupabaseUrl("not a url")).toBe(false);
  });
});
