import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";

/**
 * Verifies a Supabase access token locally against the project's public signing keys.
 * No call to Supabase Auth per connection: jose caches the key set in memory, so the
 * keys are fetched roughly once per Worker isolate.
 *
 * Requires the Supabase project to use asymmetric JWT signing keys (the default for new
 * projects). A project still on the legacy shared secret publishes no keys and every
 * token will be rejected.
 */

const keySets = new Map<string, JWTVerifyGetKey>();

function remoteKeys(supabaseUrl: string): JWTVerifyGetKey {
  let keys = keySets.get(supabaseUrl);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
    keySets.set(supabaseUrl, keys);
  }
  return keys;
}

export interface AuthedUser {
  userId: string;
}

export async function verifyAccessToken(
  token: string,
  supabaseUrl: string,
  keys: JWTVerifyGetKey = remoteKeys(supabaseUrl),
): Promise<AuthedUser | null> {
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: `${supabaseUrl}/auth/v1`,
      audience: "authenticated",
    });
    return typeof payload.sub === "string" && payload.sub ? { userId: payload.sub } : null;
  } catch (error) {
    // Log the reason (never the token) so a misconfigured project is diagnosable.
    const reason =
      error instanceof Error
        ? `${(error as { code?: string }).code ?? error.name}: ${error.message}`
        : "unknown";
    console.warn(`Access token rejected (${reason})`);
    return null;
  }
}

export function allowedOrigins(env: Pick<Env, "ALLOWED_ORIGINS">): string[] {
  return env.ALLOWED_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}
