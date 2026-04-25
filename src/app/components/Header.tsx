interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  /** Sessão do painel administrativo (local) */
  adminAuthed?: boolean;
  onAdminLogout?: () => void;
}

export function Header({ currentPage, onPageChange, adminAuthed = false, onAdminLogout }: HeaderProps) {
  const navItems = [
    { id: 'home', label: 'Início' },
    { id: 'painel', label: 'Painel' },
    { id: 'galeria-mapeamento', label: 'Galeria 2020' },
    { id: 'transparencia', label: 'Transparência' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onPageChange('home')}>
          <img
            src="/footer/logo-cadastro-cultural.png"
            alt="Cadastro Cultural"
            className="h-12 w-12 shrink-0 object-contain [image-rendering:auto]"
          />
          <div className="flex flex-col">
            <span className="font-black text-[1.1rem] text-[#1b1b1f] leading-tight tracking-tight">
              Cadastro Cultural de Ilhabela
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 flex-wrap justify-end">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                currentPage === item.id
                  ? 'bg-[#0b57d0] text-white shadow-md shadow-blue-900/15'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
          {adminAuthed ? (
            <>
              <button
                type="button"
                onClick={() => onPageChange('admin')}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                  currentPage === 'admin'
                    ? 'bg-[#0b57d0] text-white shadow-md shadow-blue-900/15'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => onAdminLogout?.()}
                className="rounded-lg border border-red-200/90 px-3.5 py-2 text-sm font-semibold text-red-700 transition-all hover:bg-red-50"
              >
                Sair
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onPageChange('admin')}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                currentPage === 'admin'
                  ? 'bg-[#0b57d0] text-white shadow-md shadow-blue-900/15'
                  : 'bg-[#0b57d0] text-white shadow-md shadow-blue-900/20 hover:bg-[#0842a8]'
              }`}
            >
              Entrar
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}