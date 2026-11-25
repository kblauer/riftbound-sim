const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "host.docker.internal"]);

/** True when the URL points at the local Supabase stack rather than a hosted project. */
export function isLocalSupabaseUrl(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}
