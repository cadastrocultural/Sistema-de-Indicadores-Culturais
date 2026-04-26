import { useEffect, useState } from 'react';
import { LogIn, LogOut, Menu, ShieldCheck, X } from 'lucide-react';

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
    { id: 'galeria-mapeamento', label: 'Galeria 2020' },
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
    `rounded-xl px-3.5 py-2 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0] ${
      currentPage === page
        ? 'bg-[#0b57d0] text-white shadow-md shadow-blue-900/15'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="container relative mx-auto flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <button
          type="button"
          className="flex min-w-0 items-center gap-3 rounded-2xl text-left transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b57d0] sm:gap-4"
          onClick={() => navigateTo('home')}
          aria-label="Ir para a página inicial"
        >
          <img
            src="/footer/logo-cadastro-cultural.png"
            alt="Cadastro Cultural"
            className="h-11 w-11 shrink-0 object-contain [image-rendering:auto] sm:h-12 sm:w-12"
          />
          <span className="min-w-0 font-black text-[0.95rem] leading-tight tracking-tight text-[#1b1b1f] sm:text-[1.1rem]">
            <span className="hidden sm:inline">
              Cadastro Cultural de Ilhabela
            </span>
            <span className="sm:hidden">Cadastro Cultural</span>
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
          {adminAuthed ? (
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
                className="rounded-xl border border-red-200/90 px-3.5 py-2 text-sm font-semibold text-red-700 transition-all hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              >
                Sair
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigateTo('admin')}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0] ${
                currentPage === 'admin'
                  ? 'bg-[#0b57d0] text-white shadow-md shadow-blue-900/15'
                  : 'bg-[#0b57d0] text-white shadow-md shadow-blue-900/20 hover:bg-[#0842a8]'
              }`}
            >
              Entrar
            </button>
          )}
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0] md:hidden"
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
            className="absolute left-4 right-4 top-[calc(100%+0.5rem)] overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-2 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.03] md:hidden"
          >
            <nav className="grid gap-1" aria-label="Navegação principal">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0] ${
                    currentPage === item.id
                      ? 'bg-[#0b57d0] text-white shadow-md shadow-blue-900/15'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                  {currentPage === item.id && <span className="h-2 w-2 rounded-full bg-white/80" aria-hidden />}
                </button>
              ))}

              <div className="my-1 border-t border-slate-100" />

              {adminAuthed ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigateTo('admin')}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0] ${
                      currentPage === 'admin' ? 'bg-[#0b57d0] text-white' : 'text-slate-700 hover:bg-slate-50'
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
                    className="flex items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-bold text-red-700 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                  >
                    <LogOut size={17} aria-hidden />
                    Sair
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => navigateTo('admin')}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#0b57d0] px-4 py-3 text-sm font-black text-white shadow-md shadow-blue-900/20 transition hover:bg-[#0842a8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0]"
                >
                  <LogIn size={17} aria-hidden />
                  Entrar
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}