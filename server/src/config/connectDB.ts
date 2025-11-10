import {
  createClient,
  SupabaseClient,
  PostgrestError,
} from "@supabase/supabase-js";

// Lazily initialized Supabase client to avoid env access at import time
let _supabase: SupabaseClient | null = null;

export function initSupabase(): SupabaseClient | null {
  const privateKey = process.env.SUPABASE_API_KEY;
  const url = process.env.SUPABASE_URL;
  if (!privateKey || !url) {
    return null;
  }
  // createClient returns a fully-typed SupabaseClient
  _supabase = createClient(url, privateKey);
  return _supabase;
}

export function getSupabase(): SupabaseClient | null {
  return _supabase;
}

// Best‑effort connectivity check against the Auth settings endpoint
export async function verifySupabaseConnection(): Promise<{
  ok?: boolean;
  reason?: string;
}> {
  try {
    const privateKey = process.env.SUPABASE_API_KEY;
    const url = process.env.SUPABASE_URL;
    if (!privateKey || !url) {
      return { ok: false, reason: "Missing SUPABASE_URL or SUPABASE_API_KEY" };
    }
    const fetchFn = (
      globalThis as unknown as {
        fetch?: (
          input: string,
          init?: unknown
        ) => Promise<
          { ok?: boolean; status?: number } & Record<string, unknown>
        >;
      }
    ).fetch;
    if (!fetchFn)
      return { ok: false, reason: "fetch not available in this runtime" };
    const res = await fetchFn(`${url}/auth/v1/settings`, {
      headers: {
        apikey: privateKey,
        authorization: `Bearer ${privateKey}`,
      },
    });
    if (res.ok) return { ok: true };
    return { ok: false, reason: `HTTP ${res.status}` };
  } catch (err: unknown) {
    const e = err as unknown;
    return {
      ok: false,
      reason: String((e as { message?: string })?.message ?? e),
    };
  }
}

// Typed wrapper for calling Supabase RPC functions
export type SupabaseRpcResult<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export async function callSupabaseRpc<T = unknown>(
  name: string,
  params?: Record<string, unknown>
): Promise<SupabaseRpcResult<T>> {
  const client = _supabase || initSupabase();
  if (!client)
    return {
      data: null,
      error: { message: "Supabase not configured" } as PostgrestError,
    };
  try {
    const res = await client.rpc(
      name,
      params as unknown as Record<string, unknown> | undefined
    );
    return {
      data: res.data as T | null,
      error: res.error as PostgrestError | null,
    };
  } catch (err: unknown) {
    const e = err as unknown;
    return {
      data: null,
      error: {
        message: String((e as { message?: string })?.message ?? e),
      } as PostgrestError,
    };
  }
}
