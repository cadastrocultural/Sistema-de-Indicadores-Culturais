import { useEffect, useState } from 'react';
import { LogOut, Menu, ShieldCheck, X } from 'lucide-react';

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  /** Sessão do painel administrativo (local) */
  adminAuthed?: boolean;
  onAdminLogout?: () => void;
}

export function Header({ currentPage, onPageChange, adminAuthed = false, onAdminLogout }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [
    { id: 'home', label: 'Início' },
    { id: 'painel', label: 'Painel' },
    { id: 'galeria-mapeamento', label: 'Galeria' },
    { id: 'transparencia', label: 'Transparência' },
  ];

  useEffect(() => {
    if (!mobileOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [mobileOpen]);

  const navigateTo = (page: string) => {
    onPageChange(page);
    setMobileOpen(false);
  };

  const navButtonClass = (page: string) =>
    `rounded-lg px-3.5 py-2 text-[0.8125rem] font-semibold tracking-tight transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
      currentPage === page
        ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/10'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl backdrop-saturate-150">
      <div className="container relative mx-auto flex items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <button
          type="button"
          className="group flex min-w-0 items-center gap-3 rounded-xl text-left transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 sm:gap-3.5"
          onClick={() => navigateTo('home')}
          aria-label="Ir para a página inicial"
        >
          <img
            src="/footer/logo-cadastro-cultural.png"
            alt="Cadastro Cultural"
            className="h-11 w-11 shrink-0 rounded-xl border border-slate-200/80 bg-white object-contain [image-rendering:auto] shadow-sm transition-transform group-hover:scale-[1.02] sm:h-12 sm:w-12"
          />
          <span className="min-w-0">
            <span className="block font-bold text-[0.92rem] leading-snug tracking-tight text-slate-900 sm:text-[1.05rem]">
              <span className="hidden sm:inline">Cadastro Cultural de Ilhabela</span>
              <span className="sm:hidden">Cadastro Cultural</span>
            </span>
            <span className="mt-0.5 hidden font-mono text-[0.62rem] font-medium uppercase tracking-[0.12em] text-slate-500 sm:block">
              Observatório · indicadores culturais
            </span>
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-1 flex-wrap justify-end">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.id)}
              className={navButtonClass(item.id)}
            >
              {item.label}
            </button>
          ))}
          {adminAuthed && (
            <>
              <button
                type="button"
                onClick={() => navigateTo('admin')}
                className={navButtonClass('admin')}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => onAdminLogout?.()}
                className="rounded-lg border border-rose-200/90 px-3.5 py-2 text-sm font-semibold text-rose-700 transition-all hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
              >
                Sair
              </button>
            </>
          )}
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 md:hidden"
          aria-label={mobileOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-public-navigation"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </button>

        {mobileOpen && (
          <div
            id="mobile-public-navigation"
            className="absolute left-4 right-4 top-[calc(100%+0.5rem)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white/97 p-2 shadow-[0_24px_64px_-24px_rgba(15,23,42,0.22)] backdrop-blur-xl md:hidden"
          >
            <nav className="grid gap-1" aria-label="Navegação principal">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                    currentPage === item.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {currentPage === item.id && <span className="h-2 w-2 rounded-full bg-white/80" aria-hidden />}
                </button>
              ))}

              {adminAuthed && <div className="my-1 border-t border-slate-100" />}

              {adminAuthed && (
                <>
                  <button
                    type="button"
                    onClick={() => navigateTo('admin')}
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                      currentPage === 'admin' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck size={17} aria-hidden />
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAdminLogout?.();
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                  >
                    <LogOut size={17} aria-hidden />
                    Sair
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}