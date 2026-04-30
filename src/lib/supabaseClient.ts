import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente browser com chave **anon** + sessão do usuário (Supabase Auth).
 * Nunca use `service_role` no frontend: operações admin sensíveis (ex.: ignorar RLS
 * em tabelas privadas) devem rodar em Edge Function ou backend com a service key.
 * Com RLS ativo, políticas devem permitir acesso apenas a linhas apropriadas
 * (ex.: `auth.uid() = user_id` ou funções com `security definer` revisadas).
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

/** Evita ativar Auth com valores copiados do .env.example (login quebrado e PIN desativado). */
function isPlaceholderSupabaseEnv(u: string, key: string): boolean {
  const low = u.trim().toLowerCase();
  if (low.includes('seu-projeto.supabase.co') || low.includes('your-project.supabase.co')) return true;
  const k = key.trim();
  if (/^coloque_/i.test(k) || /^put_your_/i.test(k) || k === 'coloque_sua_chave_anon_aqui') return true;
  return false;
}

export function isSupabaseAuthConfigured(): boolean {
  if (typeof url !== 'string' || typeof anonKey !== 'string') return false;
  const u = url.trim();
  const k = anonKey.trim();
  if (!u || !k) return false;
  if (isPlaceholderSupabaseEnv(u, k)) return false;
  return true;
}

/**
 * `null` se `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` estiverem ausentes.
 * Em desenvolvimento, o painel usa fallback por PIN.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseAuthConfigured()) return null;
  if (!cached) {
    cached = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return cached;
}
