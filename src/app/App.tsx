import React, { useState, useEffect } from 'react';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { Mapeamento2020GalleryPage } from './pages/Mapeamento2020GalleryPage';
import { TransparenciaPage } from './pages/TransparenciaPage';
import { AdminPage } from './pages/AdminPage';
import { Header } from './components/Header';

import logoPNAB from "figma:asset/a80a0fe173f9536b946ae928065c612433c8d6ac.png";
import logoFederal from "figma:asset/d3ec3a35684a1a30ee2f7d060855d2c8395e5544.png";

type Page = 'home' | 'painel' | 'transparencia' | 'admin' | 'galeria-mapeamento';

const ADMIN_SESSION_KEY = 'cc_admin_session';

export default function App() {
  const [adminAuthed, setAdminAuthed] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (adminAuthed) localStorage.setItem(ADMIN_SESSION_KEY, '1');
      else localStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, [adminAuthed]);

  // ✅ PERSISTÊNCIA DE NAVEGAÇÃO: salva no localStorage para manter página após refresh
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const saved = localStorage.getItem('currentPage');
    return saved === 'home' ||
      saved === 'painel' ||
      saved === 'transparencia' ||
      saved === 'admin' ||
      saved === 'galeria-mapeamento'
      ? (saved as Page)
      : 'home';
  });

  // Salva página atual no localStorage sempre que muda
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  const [footerBannerLoadError, setFooterBannerLoadError] = useState(false);

  return (
    <div className="min-h-screen bg-[#fdfcff] text-[#1b1b1f] flex flex-col font-sans">
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
          />
        )}
      </main>

      {/* RODAPÉ UNIFICADO EM UMA ÚNICA FAIXA */}
      <footer className="bg-white border-t border-gray-100 py-12 mt-auto">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between gap-10 md:flex-row md:items-start">
            {/* Esquerda: faixa Prefeitura / cultura (PNG em public/footer) + logo Cadastro Cultural */}
            <div className="flex w-full max-w-3xl flex-col items-center gap-6 md:flex-row md:items-center md:gap-8">
              {!footerBannerLoadError ? (
                <div className="w-full max-w-xl bg-white p-1.5">
                  <img
                    src="/footer/footer-prefeitura-cultura.png"
                    alt="Prefeitura Municipal de Ilhabela e identidade cultural"
                    onError={() => setFooterBannerLoadError(true)}
                    className="h-auto max-h-24 w-full object-contain object-center [mix-blend-mode:screen] contrast-110 md:max-h-28 md:object-left"
                  />
                </div>
              ) : (
                <div className="w-full max-w-xl rounded-xl border border-[#0b57d0]/15 bg-[#f8fbff] px-4 py-3 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0b57d0]">Prefeitura de Ilhabela</p>
                  <p className="text-sm font-extrabold text-[#1b1b1f]">Secretaria Municipal de Cultura</p>
                </div>
              )}
              <div className="flex shrink-0 items-center gap-3 border-t border-gray-200 pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                <img
                  src="/footer/logo-cadastro-cultural.png"
                  alt="Cadastro Cultural de Ilhabela"
                  className="h-16 w-16 rounded-full object-cover shadow-sm ring-1 ring-gray-200/90 md:h-[4.5rem] md:w-[4.5rem]"
                />
                <div className="text-left">
                  <p className="text-[0.82rem] font-black leading-tight text-[#0b57d0]">Cadastro Cultural</p>
                  <p className="text-[0.72rem] font-bold uppercase tracking-wide text-[#5f5f6a]">Ilhabela</p>
                </div>
              </div>
            </div>

            {/* Direita: Logos Federais */}
            <div className="flex items-center gap-8 md:gap-12">
              <img src={logoPNAB} alt="PNAB" className="h-10 md:h-12 object-contain" />
              <img src={logoFederal} alt="Governo Federal" className="h-10 md:h-12 object-contain" />
            </div>
          </div>

          {/* Bottom Text Centered */}
          <div className="mt-10 pt-8 border-t border-gray-50 text-center">
            <p className="text-[0.78rem] text-[#5f5f6a] font-medium mb-1">
              Sistema de Transparência · Cadastro Cultural de Ilhabela
            </p>
            <p className="text-[0.65rem] text-[#5f5f6a]/50 uppercase tracking-[0.2em] font-black">
              © 2020-2026 CADASTRO CULTURAL DE ILHABELA
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}