import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { allowedOrigins, verifyAccessToken } from "./auth.ts";

const SUPABASE_URL = "https://example.supabase.co";

let keys: ReturnType<typeof createLocalJWKSet>;
let sign: (claims: { sub?: string; iss?: string; aud?: string; exp?: string }) => Promise<string>;
let signWithOtherKey: () => Promise<string>;

beforeAll(async () => {
  const pair = await generateKeyPair("ES256");
  const other = await generateKeyPair("ES256");
  keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(pair.publicKey)), alg: "ES256" }] });

  const build = (claims: { sub?: string; iss?: string; aud?: string; exp?: string }) => {
    const jwt = new SignJWT({})
      .setProtectedHeader({ alg: "ES256" })
      .setIssuer(claims.iss ?? `${SUPABASE_URL}/auth/v1`)
      .setAudience(claims.aud ?? "authenticated")
      .setIssuedAt()
      .setExpirationTime(claims.exp ?? "1h");
    return claims.sub === undefined ? jwt : jwt.setSubject(claims.sub);
  };
  sign = (claims) => build(claims).sign(pair.privateKey);
  signWithOtherKey = () => build({ sub: "user-1" }).sign(other.privateKey);
});

describe("verifyAccessToken", () => {
  it("accepts a valid token and returns the user id", async () => {
    expect(await verifyAccessToken(await sign({ sub: "user-1" }), SUPABASE_URL, keys)).toEqual({
      userId: "user-1",
    });
  });

  it("rejects a token signed by a different key", async () => {
    expect(await verifyAccessToken(await signWithOtherKey(), SUPABASE_URL, keys)).toBeNull();
  });

  it("rejects the wrong issuer, wrong audience, expiry, and a missing subject", async () => {
    const bad = [
      await sign({ sub: "user-1", iss: "https://evil.example/auth/v1" }),
      await sign({ sub: "user-1", aud: "anon" }),
      await sign({ sub: "user-1", exp: "-1m" }),
      await sign({}),
      "not-a-jwt",
    ];
    for (const token of bad) {
      expect(await verifyAccessToken(token, SUPABASE_URL, keys)).toBeNull();
    }
  });
});

describe("allowedOrigins", () => {
  it("splits and trims the configured list", () => {
    expect(allowedOrigins({ ALLOWED_ORIGINS: "http://a.test, http://b.test,," })).toEqual([
      "http://a.test",
      "http://b.test",
    ]);
  });
});
