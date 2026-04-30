import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const Mapeamento2020GalleryPage = lazy(() =>
  import('./pages/Mapeamento2020GalleryPage').then((m) => ({ default: m.Mapeamento2020GalleryPage }))
);
const TransparenciaPage = lazy(() => import('./pages/TransparenciaPage').then((m) => ({ default: m.TransparenciaPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-3 px-4" aria-busy="true" aria-label="A carregar">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
      <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-slate-500">A carregar…</p>
    </div>
  );
}
import { getSupabaseClient, isSupabaseAuthConfigured } from '../lib/supabaseClient';

import logoPNAB from "figma:asset/a80a0fe173f9536b946ae928065c612433c8d6ac.png";
import logoFederal from "figma:asset/d3ec3a35684a1a30ee2f7d060855d2c8395e5544.png";

type Page = 'home' | 'painel' | 'transparencia' | 'admin' | 'galeria-mapeamento';

const ADMIN_SESSION_KEY = 'cc_admin_session';
/** If `getSession()` never resolves (rede/timeout do cliente), ainda exibe o login em vez de spinner infinito. */
const SUPABASE_SESSION_CHECK_TIMEOUT_MS = 10_000;

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [data-copy-enabled="true"]')
  );
}

function useSiteProtection() {
  useEffect(() => {
    document.documentElement.classList.add('site-protection-enabled');

    const blockEvent = (event: Event) => {
      if (isEditableElement(event.target)) return;
      event.preventDefault();
    };

    const blockKeyboardShortcuts = (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) return;
      const key = event.key.toLowerCase();
      const blocked =
        key === 'f12' ||
        (event.ctrlKey && ['u', 's', 'p', 'c', 'x', 'a'].includes(key)) ||
        (event.metaKey && ['s', 'p', 'c', 'x', 'a'].includes(key)) ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && ['i', 'j', 'c'].includes(key));

      if (blocked) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('contextmenu', blockEvent);
    document.addEventListener('copy', blockEvent);
    document.addEventListener('cut', blockEvent);
    document.addEventListener('dragstart', blockEvent);
    document.addEventListener('selectstart', blockEvent);
    window.addEventListener('keydown', blockKeyboardShortcuts, true);

    return () => {
      document.documentElement.classList.remove('site-protection-enabled');
      document.removeEventListener('contextmenu', blockEvent);
      document.removeEventListener('copy', blockEvent);
      document.removeEventListener('cut', blockEvent);
      document.removeEventListener('dragstart', blockEvent);
      document.removeEventListener('selectstart', blockEvent);
      window.removeEventListener('keydown', blockKeyboardShortcuts, true);
    };
  }, []);
}

export default function App() {
  useSiteProtection();
  const [adminAuthedState, setAdminAuthedState] = useState(() => {
    if (isSupabaseAuthConfigured()) return false;
    try {
      return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [adminAuthReady, setAdminAuthReady] = useState(() => !isSupabaseAuthConfigured());

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setAdminAuthReady(true);
      return;
    }

    const syncFromSession = (hasSession: boolean) => {
      setAdminAuthedState(hasSession);
      try {
        if (hasSession) localStorage.setItem(ADMIN_SESSION_KEY, 'true');
        else localStorage.removeItem(ADMIN_SESSION_KEY);
      } catch {
        /* localStorage indisponivel */
      }
    };

    let sessionReadyTimeout = window.setTimeout(() => {
      sessionReadyTimeout = 0;
      setAdminAuthReady(true);
    }, SUPABASE_SESSION_CHECK_TIMEOUT_MS);

    const clearSessionReadyTimeout = () => {
      if (sessionReadyTimeout) {
        window.clearTimeout(sessionReadyTimeout);
        sessionReadyTimeout = 0;
      }
    };

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        clearSessionReadyTimeout();
        syncFromSession(!!session);
        setAdminAuthReady(true);
      })
      .catch(() => {
        clearSessionReadyTimeout();
        setAdminAuthReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncFromSession(!!session);
    });

    return () => {
      clearSessionReadyTimeout();
      subscription.unsubscribe();
    };
  }, []);

  const setAdminAuthed = (value: boolean) => {
    const supabase = getSupabaseClient();
    if (supabase) {
      if (!value) {
        void supabase.auth.signOut();
        return;
      }
      setAdminAuthedState(true);
      try {
        localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      } catch {
        /* localStorage indisponivel */
      }
      return;
    }
    setAdminAuthedState(value);
    try {
      if (value) localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      else localStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      /* localStorage indisponivel */
    }
  };
  const adminAuthed = adminAuthedState;

  const [currentPage, setCurrentPage] = useState<Page>(() => {
    try {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname.replace(/\/$/, '') || '/';
        const hash = window.location.hash.replace(/^#\/?/, '');
        if (path.endsWith('/admin') || hash === 'admin') return 'admin';
      }
    } catch {
      /* ignore */
    }
    try {
      const saved = localStorage.getItem('currentPage');
      return saved === 'home' ||
        saved === 'painel' ||
        saved === 'transparencia' ||
        saved === 'admin' ||
        saved === 'galeria-mapeamento'
        ? (saved as Page)
        : 'home';
    } catch {
      return 'home';
    }
  });

  // Salva página atual no localStorage sempre que muda
  useEffect(() => {
    try {
      localStorage.setItem('currentPage', currentPage);
    } catch {
      /* quota ou armazenamento indisponível */
    }
  }, [currentPage]);

  /** URL direta: /admin ou #admin. Ao sair do painel, remove #admin e o segmento /admin da rota (evita home com URL /admin). */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace(/^#\/?/, '');
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    if (currentPage === 'admin') {
      if (hash !== 'admin') {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#admin`);
      }
    } else {
      const hasAdminHash = hash === 'admin';
      const onAdminPath = path === '/admin' || path.endsWith('/admin');
      if (!hasAdminHash && !onAdminPath) return;
      const withoutAdminPath = onAdminPath ? path.replace(/\/admin$/, '') || '/' : path;
      const pathPart = withoutAdminPath === '' ? '/' : withoutAdminPath;
      window.history.replaceState(null, '', `${pathPart}${window.location.search}`);
    }
  }, [currentPage]);

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace(/^#\/?/, '');
      setCurrentPage((p) => {
        if (h === 'admin') return 'admin';
        if (p === 'admin') return 'home';
        return p;
      });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-transparent font-sans text-slate-900 antialiased">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_0%_-10%,rgba(13,148,136,0.09),transparent_50%),radial-gradient(ellipse_50%_40%_at_100%_0%,rgba(15,23,42,0.04),transparent_45%)]"
        aria-hidden
      />
      <Header
        currentPage={currentPage}
        onPageChange={(page) => setCurrentPage(page as Page)}
        adminAuthed={adminAuthed}
        onAdminLogout={() => {
          setAdminAuthed(false);
          setCurrentPage('home');
        }}
      />
      
      <main className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          {currentPage === 'home' && <HomePage onNavigate={(page) => setCurrentPage(page as Page)} />}
          {currentPage === 'painel' && <DashboardPage />}
          {currentPage === 'galeria-mapeamento' && (
            <Mapeamento2020GalleryPage onNavigate={(page) => setCurrentPage(page as Page)} />
          )}
          {currentPage === 'transparencia' && <TransparenciaPage />}
          {currentPage === 'admin' && (
            <AdminPage
              onNavigate={(page) => setCurrentPage(page as Page)}
              adminAuthed={adminAuthed}
              setAdminAuthed={setAdminAuthed}
              adminAuthReady={adminAuthReady}
            />
          )}
        </Suspense>
      </main>

      {/* RODAPÉ UNIFICADO EM UMA ÚNICA FAIXA */}
      <footer className="mt-auto border-t border-slate-200/90 bg-white/95 py-7 shadow-[0_-12px_40px_-36px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="container mx-auto max-w-6xl px-6">
          {/* Logos lado a lado */}
          <div className="flex flex-wrap items-center justify-center gap-8">
            
            {/* Logo Prefeitura + Secretaria de Cultura */}
            <div className="flex items-center">
              <img
                src="/footer/footer-prefeitura-cultura.png"
                alt="Prefeitura de Ilhabela — Secretaria de Cultura"
                className="h-12 w-auto object-contain"
                style={{ maxWidth: 400 }}
              />
            </div>

            {/* Logo Cadastro Cultural */}
            <div className="flex items-center gap-2.5">
              <img
                src="/footer/logo-cadastro-cultural.png"
                alt="Cadastro Cultural Ilhabela"
                className="h-10 w-10 object-contain"
              />
              <div className="text-left">
                <p className="text-[0.76rem] font-bold leading-tight text-teal-700">Cadastro Cultural</p>
                <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.14em] text-slate-500">Ilhabela</p>
              </div>
            </div>

            {/* Logos governo federal */}
            <div className="flex items-center gap-5">
              <img src={logoPNAB} alt="PNAB" className="h-9 object-contain" />
              <img src={logoFederal} alt="Governo Federal" className="h-9 object-contain" />
            </div>

          </div>

          {/* Bottom Text */}
          <div className="mt-5 border-t border-slate-200/80 pt-5 text-center">
            <p className="mb-1 text-[0.75rem] font-medium text-slate-600">
              Sistema de transparência · Cadastro Cultural Ilhabela
            </p>
            <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.18em] text-slate-400">
              © 2020–2026 · dados municipais
            </p>
            <p className="mt-3 text-center">
              <a
                href="/admin"
                className="text-xs font-semibold text-teal-800 underline decoration-teal-800/30 underline-offset-2 hover:text-teal-600"
                onClick={(event) => {
                  event.preventDefault();
                  setCurrentPage('admin');
                  try {
                    window.history.pushState(null, '', '/admin');
                  } catch {
                    /* ignore */
                  }
                }}
              >
                Área administrativa (acesso restrito)
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}