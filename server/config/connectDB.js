import { createClient } from "@supabase/supabase-js";

// Lazily initialized Supabase client to avoid env access at import time
let _supabase = null;

export function initSupabase() {
  const privateKey = process.env.SUPABASE_API_KEY;
  const url = process.env.SUPABASE_URL;
  if (!privateKey || !url) {
    return null;
  }
  _supabase = createClient(url, privateKey);
  return _supabase;
}

export function getSupabase() {
  return _supabase;
}

// Best‑effort connectivity check against the Auth settings endpoint
export async function verifySupabaseConnection() {
  try {
    const privateKey = process.env.SUPABASE_API_KEY;
    const url = process.env.SUPABASE_URL;
    if (!privateKey || !url) {
      return { ok: false, reason: "Missing SUPABASE_URL or SUPABASE_API_KEY" };
    }
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: {
        apikey: privateKey,
        authorization: `Bearer ${privateKey}`,
      },
    });
    if (res.ok) return { ok: true };
    return { ok: false, reason: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, reason: String(err?.message || err) };
  }
}
