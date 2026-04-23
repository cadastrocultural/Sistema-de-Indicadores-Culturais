import React from 'react';

// Importa o logo circular colorido
import logoCadastro from 'figma:asset/b517618c80e058d074df30a0fcacbe8286012d13.png';

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
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/95 border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onPageChange('home')}>
          {/* Logo circular grande */}
          <img 
            src={logoCadastro} 
            alt="Cadastro Cultural" 
            className="h-12 w-12 object-contain"
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
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                currentPage === item.id 
                  ? 'bg-[#0b57d0] text-white shadow-sm' 
                  : 'text-[#5f5f6a] hover:bg-gray-50'
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
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  currentPage === 'admin'
                    ? 'bg-[#0b57d0] text-white shadow-sm'
                    : 'text-[#5f5f6a] hover:bg-gray-50'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => onAdminLogout?.()}
                className="px-4 py-1.5 rounded-full text-sm font-semibold text-[#b91c1c] border border-red-200 hover:bg-red-50 transition-all"
              >
                Sair
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onPageChange('admin')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                currentPage === 'admin'
                  ? 'bg-[#0b57d0] text-white shadow-sm'
                  : 'bg-[#0b57d0] text-white hover:bg-[#0842a8] shadow-sm'
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