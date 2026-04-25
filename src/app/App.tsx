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

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-[#1b1b1f]">
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
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-6 shadow-[0_-1px_0_rgba(15,23,42,0.04)]">
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
                alt="Cadastro Cultural de Ilhabela"
                className="h-10 w-10 object-contain"
              />
              <div className="text-left">
                <p className="text-[0.76rem] font-black leading-tight text-[#0b57d0]">Cadastro Cultural</p>
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#5f5f6a]">Ilhabela</p>
              </div>
            </div>

            {/* Logos governo federal */}
            <div className="flex items-center gap-5">
              <img src={logoPNAB} alt="PNAB" className="h-9 object-contain" />
              <img src={logoFederal} alt="Governo Federal" className="h-9 object-contain" />
            </div>

          </div>

          {/* Bottom Text */}
          <div className="mt-5 border-t border-slate-100 pt-4 text-center">
            <p className="text-[0.75rem] text-[#5f5f6a] font-medium mb-1">
              Sistema de Transparência · Cadastro Cultural de Ilhabela
            </p>
            <p className="text-[0.63rem] text-[#5f5f6a]/50 uppercase tracking-[0.2em] font-black">
              © 2020-2026 CADASTRO CULTURAL DE ILHABELA
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}