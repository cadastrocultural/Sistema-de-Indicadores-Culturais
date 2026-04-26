import React, { useMemo, useState, useEffect, useId } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, Users, MapPin, Calendar, ArrowRight, 
  Search, ShieldCheck, Trophy, FileText, ChevronRight,
  BarChart3, PieChart as PieChartIcon, Award, Building2, Bug, ExternalLink, ScrollText,
  CheckCircle2,
} from 'lucide-react';
import { Button, Card, CardContent, Chip, Tooltip, Box, Stack, Typography, Paper } from '@mui/material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Line, Legend, Area, ComposedChart, PieChart, Pie, Cell,
} from 'recharts';

import { formatBRL, COMUNIDADES_TRADICIONAIS } from '../data/pnab-data';
import { useSuppressRechartsWarning } from '../hooks/useSuppressRechartsWarning';
import { findEditalLinks as resolveEditalLinks } from './admin/editalUtils';
import {
  computeDemandaOfertaPorEdital,
  normalizeProjetosOnParsed,
  normalizeFullPersonNameForRanking,
  pickRicherCadastroPayload,
} from './admin/projetosDemandaOferta';
import { computeEstatisticasPublicas } from '../data/estatisticas-publicas';
import { IlhabelaTerritoryMap } from '../components/maps/IlhabelaTerritoryMap';
import StoreLocatorMap from '../components/maps/StoreLocatorMap';
import { InciclePanel } from '../components/dashboard/InciclePanel';
import { resolveComunidadeTradicional } from './admin/comunidadeTradicionalUtils';

import { parseBRLValue } from '../data/editais-data';
import { MAPEAMENTO_2020 } from '../data/mapeamento-data';
import { DADOS_ESTATICOS } from '../data/dados-estaticos';
import { canonicalBairroIlhabela, looksLikeEnderecoCompleto } from '../data/bairros-coords';
import { Timeline } from '../components/Timeline';
import { AdminImportCharts } from '../components/admin/AdminImportCharts';
import { HomeDiversityCharts, type DiversityChartsPayload } from '../components/HomeDiversityCharts';
import { findFieldValue } from '../utils/dashboardDiversityFields';

// Helper: adiciona IDs únicos a arrays de dados para evitar warnings de keys duplicadas no Recharts
const addUniqueIds = <T extends Record<string, any>>(arr: T[], prefix = 'item'): T[] => {
  return arr.map((item, idx) => ({ ...item, _chartId: `${prefix}-${idx}-${Math.random().toString(36).substr(2, 9)}` }));
};

interface HomePageProps {
  onNavigate: (page: string) => void;
}

// Cores do Cadastro Cultural de Ilhabela - ATUALIZADO (Azul Institucional / Ocean)
const CORES_CADASTRO = {
  principal: '#0b57d0',     // Azul Google / Material
  secundario: '#4285f4',    // Azul claro
  destaque: '#FFC857',      // Amarelo (Mantido para contraste)
  aldir: '#E30613',         // Vermelho Aldir Blanc (Mantido pois é da Lei)
  lpg: '#db2777',           // Rosa LPG (Mantido)
  azul: '#1e40af',          // Azul escuro
  cinza: '#5f5f6a'
};

/** Cartões de gráfico — estilo painéis recentes (borda suave, sombra difusa) */
const chartCardSx = {
  borderRadius: '18px',
  boxShadow:
    '0 1px 3px rgba(15,23,42,0.05), 0 18px 48px -18px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
  border: '1px solid rgba(15,23,42,0.055)',
  bgcolor: '#ffffff',
} as const;

/** Paleta vibrante (referência: dashboards analíticos modernos) */
const CHART_VIVID = ['#7c3aed', '#2563eb', '#06b6d4', '#db2777', '#ea580c', '#16a34a', '#8b5cf6', '#0d9488'] as const;

const chartTooltipContentStyle: React.CSSProperties = {
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 40px rgba(15,23,42,0.08)',
  fontSize: '12px',
  fontWeight: 600,
  padding: '10px 14px',
  background: 'rgba(255,255,255,0.98)',
};

/** Altura dos gráficos no painel inicial (acima da dobra) */
const LEAD_CHART_HEIGHT = 200;

function normalizeLooseKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[;:.,]/g, '')
    .trim();
}

function canonicalAreaLabel(raw: string): string {
  const n = normalizeLooseKey(raw).replace(/\s+/g, ' ');
  if (!n) return '';
  if (n.includes('musica')) return 'Música';
  if (n.includes('artesan')) return 'Artesanato';
  if (n.includes('cultura caicara') || n.includes('caicara')) return 'Cultura caiçara';
  if (n.includes('artes visual') || n.includes('artes plastica') || n.includes('artes plasticas') || n.includes('arte visual')) return 'Artes visuais';
  if (n.includes('audiovisual') || n.includes('cinema') || n.includes('video')) return 'Audiovisual';
  if (n.includes('danca')) return 'Dança';
  if (n.includes('literatura')) return 'Literatura';
  if (n.includes('patrimonio') || n.includes('imaterial')) return 'Patrimônio imaterial';
  if (n.includes('teatro') || n.includes('artes cenicas') || n.includes('artes cênicas') || n.includes('cena')) return 'Artes cênicas';
  if (n.includes('agentes culturais') || n === 'agentes' || n === 'agente cultural') return 'Agentes culturais';
  if (n.includes('grupos e coletivos') || n.includes('coletivos')) return 'Grupos e coletivos';
  if (n.includes('espacos culturais') || n.includes('espacos') || n.includes('espaços')) return 'Espaços culturais';
  return raw.trim().replace(/\s+/g, ' ');
}

/** Limpa textos de faixa/módulo e separa múltiplas linguagens declaradas na mesma célula. */
function splitAreaTokens(raw: string): string[] {
  if (!raw) return [];
  const flat = raw
    .replace(/\r?\n/g, ',')
    .replace(/\s*[-–—]\s*/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
  if (!flat) return [];
  const normalizedSeparators = flat
    .replace(/\s+e\s+/gi, ',')
    .replace(/\//g, ',')
    .replace(/\|/g, ',')
    .replace(/;/g, ',');
  const parts = normalizedSeparators
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const bad = normalizeLooseKey(p);
    if (!bad || bad.length < 2) continue;
    if (
      bad.includes('faixa') ||
      bad.includes('projetos com valor') ||
      bad.includes('modulo') ||
      bad.includes('módulo') ||
      bad.includes('demais areas culturais') ||
      bad.includes('demais áreas culturais')
    ) {
      continue;
    }
    const canonical = canonicalAreaLabel(p);
    const key = normalizeLooseKey(canonical);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(canonical.length > 38 ? `${canonical.slice(0, 35)}…` : canonical);
  }
  return out;
}

/** Mesma normalização de texto usada no Dashboard para chave nome+bairro. */
function normalizeKeyCadastro(v: unknown): string {
  return String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Chave CPF/CNPJ ou nome+bairro — alinhada a `DashboardPage` (mapeamento). */
function cadastroChavePainel(row: any): string {
  const cpf = String(row?.cpf || row?.cpf_cnpj || row?.cnpj || '').replace(/\D/g, '');
  const nome = normalizeKeyCadastro(row?.nome || row?.Nome || '');
  const bairro = normalizeKeyCadastro(row?.bairro || row?.Bairro || '');
  return cpf ? `cpf:${cpf}` : `nome:${nome}|bairro:${bairro}`;
}

function dedupeMapeamentoRows(rows: any[]): any[] {
  const seen = new Set<string>();
  return rows.filter((a: any) => {
    const key = cadastroChavePainel(a);
    if (!key || key === 'nome:|bairro:') return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Mapeamento 2020 (ou `parsed.mapeamento`) + agentes/grupos/espaços importados,
 * sem contar duas vezes a mesma pessoa/entidade (chave igual ao painel).
 */
function countCadastroUnion(mapeamentoBase: any[], agentes: any[], grupos: any[], espacos: any[]): number {
  const mapRows = dedupeMapeamentoRows(mapeamentoBase);
  const used = new Set<string>();
  for (const a of mapRows) {
    const key = cadastroChavePainel(a);
    if (key && key !== 'nome:|bairro:') used.add(key);
  }
  let extra = 0;
  for (const r of [...agentes, ...grupos, ...espacos]) {
    const key = cadastroChavePainel(r);
    if (key && key !== 'nome:|bairro:') {
      if (used.has(key)) continue;
      used.add(key);
    }
    extra += 1;
  }
  return mapRows.length + extra;
}

/** Preenche anos sem contemplados com 0 para o eixo X não “pular” anos. */
function fillYearGaps(rows: { ano: string; valor: number }[]): { ano: string; valor: number }[] {
  if (rows.length === 0) return rows;
  const years = rows.map((r) => parseInt(r.ano, 10)).filter((y) => Number.isFinite(y));
  if (years.length === 0) return rows;
  const min = Math.min(...years);
  const max = Math.max(...years);
  if (max - min > 45) return rows;
  const valByYear = new Map<number, number>();
  rows.forEach((r) => {
    const y = parseInt(r.ano, 10);
    if (Number.isFinite(y)) valByYear.set(y, (valByYear.get(y) || 0) + (Number(r.valor) || 0));
  });
  const out: { ano: string; valor: number }[] = [];
  for (let y = min; y <= max; y++) {
    out.push({ ano: String(y), valor: valByYear.get(y) || 0 });
  }
  return out;
}

/** Valor da célula de PcD: prioriza colunas cujo nome indica deficiência (evita “Sim” de outras perguntas). */
function extractPcdColumnValue(obj: any): string {
  let best: { score: number; val: string; keyLen: number } | null = null;
  for (const k of Object.keys(obj || {})) {
    const cl = normalizeLooseKey(k);
    if (
      cl.includes('publico') ||
      cl.includes('faixa etaria') ||
      cl.includes('faixaet') ||
      (cl.includes('valor') && !cl.includes('deficienc'))
    ) {
      continue;
    }
    let score = 0;
    if (cl.includes('deficienc') || cl.includes('pessoa com deficienc')) score = 5;
    else if (/(^| )pcd( |$)/.test(cl) || cl === 'pcd') score = 4;
    else if (cl.includes('necessidades especiais')) score = 3;
    if (score === 0) continue;
    const v = obj[k];
    const s = v !== undefined && v !== null ? String(v).trim() : '';
    if (!s) continue;
    const keyLen = k.length;
    if (!best || score > best.score || (score === best.score && keyLen > best.keyLen)) {
      best = { score, val: s, keyLen };
    }
  }
  if (best) return best.val;
  const cand = [obj?.deficiencia, obj?.pcd, obj?.pessoa_com_deficiencia, obj?.['Deficiência'], obj?.['PcD']];
  const first = cand.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
  return first ? String(first).trim() : '';
}

function isPcdDeclaracaoPositiva(raw: string): boolean {
  const v = normalizeLooseKey(raw);
  if (!v || v === '-' || v === 'n/a') return false;
  const negatives = [
    'nao',
    'não',
    'nenhum',
    'nenhuma',
    'sem',
    'nao informado',
    'não informado',
    'nao possui',
    'não possui',
    'ausente',
  ];
  if (negatives.includes(v)) return false;
  if (v.startsWith('nao ') || v.startsWith('não ')) return false;
  if (v === 'sim' || v === 'yes' || v.startsWith('sim,') || v.startsWith('sim ')) return true;
  const tipos = [
    'deficienc',
    'auditiva',
    'visual',
    'cegueir',
    'surdez',
    'surdo',
    'surda',
    'fisica',
    'motora',
    'intelectual',
    'multipl',
    'autismo',
    'tea',
    'baixa visao',
    'baix visao',
  ];
  return tipos.some((t) => v.includes(t));
}

function DashboardSectionHeader({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex max-w-3xl gap-4 md:mb-8 md:gap-5">
      <div
        className="hidden w-1 shrink-0 rounded-full bg-gradient-to-b from-[#0b57d0] via-sky-500/80 to-slate-300/50 sm:block sm:min-h-[4.5rem]"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="ds-dash-kicker mb-2">{kicker}</p>
        <h2 className="ds-dash-section-title mb-2">{title}</h2>
        <p className="text-sm font-medium leading-relaxed text-slate-600 md:text-base">{description}</p>
      </div>
    </div>
  );
}

function KpiMetricCard({
  borderColor,
  icon,
  chipLabel,
  value,
  subtitle,
}: {
  borderColor: string;
  icon: React.ReactNode;
  chipLabel: string;
  value: React.ReactNode;
  subtitle: string;
}) {
  return (
    <div
      className="flex h-full flex-col"
      style={{
        minWidth: 0,
        borderRadius: '16px',
        background: borderColor,
        padding: '16px 18px 18px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 4px 20px ${borderColor}50, 0 1px 4px rgba(0,0,0,0.12)`,
        transition: 'transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 10px 32px ${borderColor}60, 0 2px 8px rgba(0,0,0,0.15)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${borderColor}50, 0 1px 4px rgba(0,0,0,0.12)`;
      }}
    >
      {/* Shine diagonal */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 45%, transparent 70%)',
      }} />
      {/* Top row */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span style={{ color: 'rgba(255,255,255,0.82)', display: 'flex' }}>{icon}</span>
        <span style={{
          fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: 'rgba(255,255,255,0.72)',
          background: 'rgba(255,255,255,0.18)', borderRadius: '999px',
          padding: '2px 9px', whiteSpace: 'nowrap',
        }}>
          {chipLabel}
        </span>
      </div>
      {/* Value */}
      <div className="flex-1" style={{ color: '#ffffff', minWidth: 0 }}>
        {value}
      </div>
      {/* Subtitle */}
      <p style={{
        color: 'rgba(255,255,255,0.72)', fontSize: '0.72rem', fontWeight: 600,
        margin: '8px 0 0', lineHeight: 1.35, letterSpacing: '-0.01em',
      }}>
        {subtitle}
      </p>
    </div>
  );
}

const EDITAIS_ALDIR_BLANC_2020 = [
  {
    numero: '010/2020',
    chamada: '198/2020',
    tipo: 'AGENTES CULTURAIS',
    cor: CORES_CADASTRO.aldir
  },
  {
    numero: '011/2020',
    chamada: '201/2020',
    tipo: 'GRUPOS E COLETIVOS',
    cor: CORES_CADASTRO.aldir
  },
  {
    numero: '013/2020',
    chamada: '220/2020',
    tipo: 'ESPAÇOS CULTURAIS',
    cor: CORES_CADASTRO.aldir
  },
  {
    numero: '221/2020',
    chamada: '221/2020',
    tipo: 'PREMIAÇÃO PARA PROJETOS CULTURAIS',
    cor: CORES_CADASTRO.aldir
  }
];

export function HomePage({ onNavigate }: HomePageProps) {
  // Suprimir warning conhecido do Recharts sobre keys duplicadas internas
  useSuppressRechartsWarning();

  const chartUid = useId().replace(/:/g, '');
  
  const [isMounted, setIsMounted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  
  useEffect(() => {
    setIsMounted(true);
    
    // Atualiza quando o localStorage muda
    const handleStorageChange = () => {
      console.log('🔄 localStorage mudou - atualizando HomePage');
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Também detecta mudanças internas (quando salvam dados no mesmo tab)
    const intervalCheck = setInterval(() => {
      const data = localStorage.getItem('editais_imported_data');
      if (data) {
        const currentHash = data.length; // Simples verificação de mudança
        const storedHash = sessionStorage.getItem('data_hash');
        if (storedHash !== String(currentHash)) {
          sessionStorage.setItem('data_hash', String(currentHash));
          if (storedHash !== null) { // Só atualiza se não for primeira vez
            handleStorageChange();
          }
        }
      }
    }, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalCheck);
    };
  }, []);

  // Mesma fonte do Dashboard/Admin: servidor primeiro, depois cache no localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { projectId, publicAnonKey } = await import('/utils/supabase/info');
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2320c79f/load-data`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (!response.ok || cancelled) return;
        const result = await response.json();
        if (result?.success && result.data && !cancelled) {
          const normalized = normalizeProjetosOnParsed(result.data) as Record<string, any>;
          let merged: Record<string, unknown> = normalized;
          try {
            const loc = localStorage.getItem('editais_imported_data');
            if (loc) merged = pickRicherCadastroPayload(normalized, JSON.parse(loc)) as Record<string, unknown>;
          } catch {
            /* mantém servidor */
          }
          try {
            localStorage.setItem('editais_imported_data', JSON.stringify(merged));
          } catch {
            /* quota ou modo privado restrito */
          }
          setRefreshKey((k) => k + 1);
        }
      } catch {
        /* offline ou função indisponível — permanece o que já estiver no localStorage */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resumoGlobal = useMemo(() => {
    // Carrega dados importados do localStorage
    const loadedData = localStorage.getItem('editais_imported_data');
    let parsed: Record<string, any> | null = null;
    let agentesImportados: any[] = [];
    let gruposImportados: any[] = [];
    let espacosImportados: any[] = [];
    let editaisImportados: any[] = [];
    let usandoDadosReais = false;
    let customEditalLinks: Record<string, { resultado?: string; resumo?: string; diarioOficial?: string }> = {};
    let editalResumoOverrides: Record<string, unknown> = {};
    let demandaOfertaExcluidosHome: string[] = [];
    
    if (loadedData) {
      try {
        parsed = normalizeProjetosOnParsed(JSON.parse(loadedData)) as Record<string, any>;
        agentesImportados = parsed.agentes || [];
        gruposImportados = parsed.grupos || [];
        espacosImportados = parsed.espacos || [];
        editaisImportados = (parsed.projetos || []) as any[];
        if (parsed.customEditalLinks && typeof parsed.customEditalLinks === 'object') {
          customEditalLinks = parsed.customEditalLinks;
        }
        editalResumoOverrides = parsed.editalResumoOverrides || {};
        demandaOfertaExcluidosHome = Array.isArray(parsed.demandaOfertaExcluidosHome)
          ? parsed.demandaOfertaExcluidosHome.filter((x: unknown) => typeof x === 'string')
          : [];
        
        usandoDadosReais = editaisImportados.length > 0;
        
        console.log('📊 Dados carregados na HomePage:', {
          agentes: agentesImportados.length,
          grupos: gruposImportados.length,
          espacos: espacosImportados.length,
          projetos: editaisImportados.length,
          usandoDadosReais
        });
        
        // 🔴 DEBUG DETALHADO
        if (agentesImportados.length > 0) {
          console.log('✅ AGENTES IMPORTADOS ENCONTRADOS:', agentesImportados.length);
          console.log('📋 Amostra (primeiros 3):', agentesImportados.slice(0, 3));
        } else {
          console.warn('⚠️ NENHUM AGENTE IMPORTADO! Usando dados estáticos (MAPEAMENTO_2020)');
        }
        
        if (editaisImportados.length > 0) {
          console.log('✅ PROJETOS/EDITAIS IMPORTADOS:', editaisImportados.length);
          console.log('📋 Amostra (primeiros 3 projetos):', editaisImportados.slice(0, 3));
        }
      } catch (e) {
        console.error('Erro ao carregar dados importados:', e);
      }
    }
    
    // Fallback para dados estáticos embutidos quando localStorage estiver vazio (ex: produção Vercel)
    const agentesFinais = agentesImportados.length > 0 ? agentesImportados : DADOS_ESTATICOS.agentes;
    const editaisFinais = editaisImportados.length > 0 ? editaisImportados : DADOS_ESTATICOS.projetos;
    if (gruposImportados.length === 0) gruposImportados = DADOS_ESTATICOS.grupos;
    if (espacosImportados.length === 0) espacosImportados = DADOS_ESTATICOS.espacos;
    
    const totalAgentes = agentesFinais.length;
    const totalGrupos = gruposImportados.length;
    const totalEspacos = espacosImportados.length;

    // Mesma prioridade do Dashboard: `mapeamento` no payload; senão base exportada (localStorage no build).
    const baseMapeamento =
      parsed && Array.isArray(parsed.mapeamento) && parsed.mapeamento.length > 0
        ? parsed.mapeamento
        : MAPEAMENTO_2020;

    const inscricoesTotais = countCadastroUnion(
      baseMapeamento,
      agentesImportados,
      gruposImportados,
      espacosImportados,
    );
    
    /** Mesma lógica do painel Admin: edital+ano, overrides e exclusões da vitrine "Demanda vs Oferta". */
    const porEditalAll = computeDemandaOfertaPorEdital(editaisFinais, editalResumoOverrides as any);
    const breakdownEditais: { chave: string; nome: string; inscritos: number; contemplados: number; valor: number }[] = porEditalAll
      .filter(r => !demandaOfertaExcluidosHome.includes(r.chave))
      .map(r => ({
        chave: r.chave,
        nome: r.nome,
        inscritos: r.inscritos,
        contemplados: r.contemplados,
        valor: r.valorInvestido,
      }));

    /** Anos presentes na base (editais + cadastro/mapeamento) — sem intervalo fixo inventado. */
    const anosCadastroSet = new Set<number>();
    for (const r of porEditalAll) {
      const y = Number(r.ano);
      if (Number.isFinite(y) && y >= 1990 && y <= 2100) anosCadastroSet.add(y);
    }
    for (const p of editaisFinais) {
      const y = Number((p as any)._anoOrigem ?? (p as any).ano ?? (p as any).Ano ?? 0);
      if (Number.isFinite(y) && y >= 1990 && y <= 2100) anosCadastroSet.add(y);
    }
    for (const row of [...agentesImportados, ...gruposImportados, ...espacosImportados, ...baseMapeamento]) {
      const y = Number((row as any).ano);
      if (Number.isFinite(y) && y >= 1990 && y <= 2100) anosCadastroSet.add(y);
    }
    const anosLista = [...anosCadastroSet].sort((a, b) => a - b);
    const faixaAnos =
      anosLista.length === 0 ? '' : anosLista.length === 1 ? String(anosLista[0]) : `${anosLista[0]}–${anosLista[anosLista.length - 1]}`;
    
    // 🎨 INDICADORES DE DIVERSIDADE (findFieldValue compartilhado: evita “idade” em identidade/unidade e “orientação” em colunas de projeto)

    const looksLikePersonName = (v: string): boolean => {
      const s = String(v || '').trim();
      if (!s) return false;
      const plain = s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const tokens = plain.split(' ').filter(Boolean);
      if (tokens.length < 2) return false;
      if (tokens.length > 6) return true;
      const hasCivilKeyword =
        plain.includes('solteir') ||
        plain.includes('casad') ||
        plain.includes('divorci') ||
        plain.includes('viuv') ||
        plain.includes('separad') ||
        plain.includes('uniao estavel') ||
        plain.includes('nao informado');
      if (hasCivilKeyword) return false;
      return /^[a-z\s.'-]+$/.test(plain);
    };

    /** Estado civil / situação conjugal: varre nomes de coluna (planilhas usam rótulos diferentes; underscore vs espaço). */
    const findEstadoCivil = (obj: any): string => {
      if (!obj || typeof obj !== 'object') return '';
      const collapseKey = (s: string) =>
        s
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[\s_\-.,:/'"()]/g, '');
      for (const k of Object.keys(obj)) {
        const kn = collapseKey(k);
        const looks =
          kn.includes('estadocivil') ||
          (kn.includes('estado') && kn.includes('civil')) ||
          (kn.includes('situacao') && kn.includes('conjugal')) ||
          (kn.includes('situa') && kn.includes('conjugal')) ||
          kn.includes('estadocivilproponente') ||
          kn.includes('estadocivildoproponente') ||
          kn.includes('estadocivildoagente');
        if (!looks) continue;
        const v = obj[k];
        const raw = v !== undefined && v !== null ? String(v).trim() : '';
        if (!raw || raw === '-' || raw.toLowerCase() === 'n/a') continue;
        return raw;
      }
      return '';
    };

    const normalizeEstadoCivil = (raw: string): string => {
      const v = String(raw || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!v || v === '-' || v === 'n/a' || looksLikePersonName(v)) return '';
      if (v.includes('solteir')) return 'Solteiro(a)';
      if (v.includes('casad')) return 'Casado(a)';
      if (v.includes('divorci') || v.includes('desquit')) return 'Divorciado(a)';
      if (v.includes('viuv')) return 'Viúvo(a)';
      if (v.includes('separad')) return 'Separado(a)';
      if (v.includes('uniao estavel')) return 'União estável';
      if (v.includes('nao informado') || v.includes('não informado') || v.includes('prefiro nao') || v.includes('prefiro não')) return 'Não informado';
      return '';
    };

    const normalizeRendaFaixa = (raw: string): string => {
      const txt = String(raw || '').trim();
      if (!txt) return '';
      const v = txt
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      // Remove faixas de edital/projeto (não são renda declarada pessoal/familiar)
      if (
        v.includes('faixa 1') ||
        v.includes('faixa 2') ||
        v.includes('faixa 3') ||
        v.includes('projetos com valor') ||
        v.includes('modulo') ||
        v.includes('demais areas culturais') ||
        v.includes('demais áreas culturais')
      ) {
        return '';
      }
      if (v.includes('ate 1 salario') || v.includes('até 1 salario') || v.includes('ate um salario')) return 'Até 1 salário mínimo';
      if (v.includes('1 a 3 salario') || v.includes('de 1 a 3 salario')) return 'De 1 a 3 salários mínimos';
      if (v.includes('3 a 5 salario') || v.includes('de 3 a 5 salario')) return 'De 3 a 5 salários mínimos';
      if (v.includes('acima de 5 salario') || v.includes('mais de 5 salario')) return 'Acima de 5 salários mínimos';

      const hasCurrency = v.includes('r$') || /[\d.]+,\d{2}/.test(v) || /^\d+([.,]\d+)?$/.test(v);
      if (!hasCurrency) return '';
      const valor = parseBRLValue(txt);
      if (!Number.isFinite(valor) || valor <= 0) return '';
      // Limite de sanidade para renda mensal/familiar; evita capturar orçamento de edital.
      if (valor > 30_000) return '';
      if (valor <= 2_000) return 'Até R$ 2.000';
      if (valor <= 5_000) return 'R$ 2.001 a R$ 5.000';
      return 'Acima de R$ 5.000';
    };

    const findEstadoCivilFallback = (obj: any): string => {
      if (!obj || typeof obj !== 'object') return '';
      for (const v of Object.values(obj)) {
        const raw = String(v || '').trim();
        if (!raw || raw.length > 40) continue;
        const n = normalizeEstadoCivil(raw);
        if (n) return raw;
      }
      return '';
    };

    const findRendaRawFallback = (obj: any): string => {
      if (!obj || typeof obj !== 'object') return '';
      for (const [k, v] of Object.entries(obj)) {
        const kn = normalizeLooseKey(String(k || ''));
        if (
          kn.includes('renda') ||
          kn.includes('salario') ||
          kn.includes('salário') ||
          kn.includes('remuneracao') ||
          kn.includes('remuneração')
        ) {
          const raw = String(v || '').trim();
          if (raw) return raw;
        }
      }
      return '';
    };

    const findExperienciaRawFallback = (obj: any): string => {
      if (!obj || typeof obj !== 'object') return '';
      for (const [k, v] of Object.entries(obj)) {
        const kn = normalizeLooseKey(String(k || ''));
        if (
          kn.includes('experiencia') ||
          kn.includes('experiência') ||
          (kn.includes('tempo') && kn.includes('atuacao')) ||
          kn.includes('anosdeatuacao') ||
          kn.includes('carreira')
        ) {
          const raw = String(v || '').trim();
          if (raw && raw.length <= 48) return raw;
        }
      }
      return '';
    };
    
    // 🎯 Indicadores de diversidade com a MESMA base da página inicial:
    // apenas cadastros culturais (agentes + grupos + espaços), sem somar linhas de projetos/editais.
    const todosParaDiversidade = [...agentesFinais, ...gruposImportados, ...espacosImportados];
    const baseParaPercentual = todosParaDiversidade.length || 1;
    
    /** Mesma regra do Admin: só conta com nome oficial em COMUNIDADES_TRADICIONAIS (evita "Sim" genérico ou a palavra "comunidade" em títulos). */
    const ehComunidadeTradicionalRegistro = (o: any, opts?: { includeNomeProjeto?: boolean }) => {
      let rawField = findFieldValue(
        o,
        'comunidadeTradicional',
        'comunidade_tradicional',
        'Comunidade Tradicional',
        'Comunidades Tradicionais',
        'comunidade_tradicional',
        'comunidade_tradicional_nome'
      );
      if (o.eh_comunidade_tradicional === true || o.eh_comunidade_tradicional === 'sim' || o.eh_comunidade_tradicional === 'Sim') {
        if (!String(rawField || '').trim()) rawField = 'Sim';
      }
      const bairro = String(o.bairro || '').trim();
      const endereco = findFieldValue(
        o,
        'endereco',
        'enderecoCompleto',
        'Endereço',
        'endereco_completo',
        'logradouro',
        'Logradouro',
        'rua',
        'Rua',
        'local_execucao',
        'localExecucao',
        'Local de execução'
      );
      const nome = String(o.nome || o.Nome || o.proponente || o.Proponente || '').trim();
      const extras: string[] = [];
      if (opts?.includeNomeProjeto) {
        const np = String(
          o.nomeProjeto || o.nome_projeto || o['Nome do Projeto'] || o['Título'] || o.titulo || ''
        ).trim();
        if (np) extras.push(np);
      }
      if (nome) extras.push(nome);
      const { eh } = resolveComunidadeTradicional({
        rawField: String(rawField || ''),
        bairro,
        enderecoCompleto: endereco,
        extras,
      });
      return eh;
    };

    const tradCadastroBase = [...agentesFinais, ...gruposImportados, ...espacosImportados].filter((a: any) =>
      ehComunidadeTradicionalRegistro(a)
    ).length;
    const trad = tradCadastroBase;
    const percTrad = baseParaPercentual > 0 ? Math.round((trad / baseParaPercentual) * 100) : 0;
    
    const negros = todosParaDiversidade.filter((a: any) => {
      const raca = findFieldValue(a, 'raca', 'etnia', 'autodeclaracao', 'Raça', 'Raça/Cor', 'raca_cor', 'Cor', 'cor').toLowerCase();
      return raca.includes('pret') || raca.includes('pard') || raca.includes('negr') || raca.includes('afro');
    }).length;

    /** Remove textos narrativos de projeto que vazam para colunas de orientação sexual em algumas planilhas. */
    const sanitizeOrientacaoSexualValue = (raw: string): string => {
      const txt = String(raw || '').trim();
      if (!txt) return '';
      if (txt.length > 90) return '';
      const low = txt
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const compact = low.replace(/[^a-z0-9]/g, '');
      const hasOrientacaoKeyword =
        low.includes('hetero') ||
        low.includes('homossexual') ||
        low.includes('homoafetiv') ||
        low.includes('bissexual') ||
        low.includes('pansexual') ||
        low.includes('assexual') ||
        low.includes('queer') ||
        low.includes('lesbica') ||
        low.includes('gay') ||
        low.includes('lgbt') ||
        (low.includes('orientacao') && low.includes('sexual'));
      const looksLikeProjetoNarrativa =
        compact.startsWith('oprojeto') ||
        compact.startsWith('ocoletivo') ||
        compact.startsWith('realizaremos') ||
        compact.startsWith('otitulo') ||
        compact.startsWith('odocumentario') ||
        compact.startsWith('ocine') ||
        compact.includes('consistenarealizacao') ||
        compact.includes('objetivodoprojeto') ||
        compact.includes('resumodoprojeto') ||
        compact.includes('metodologia');
      if (looksLikeProjetoNarrativa) return '';
      const wordCount = low.split(' ').filter(Boolean).length;
      if (!hasOrientacaoKeyword && wordCount >= 8) return '';
      return txt;
    };

    /** Captura identidade de gênero mesmo quando a planilha usa rótulos/valores fora do padrão. */
    const getIdentidadeGeneroValue = (row: any): string => {
      const direto = findFieldValue(row, 'identidade_genero', 'Identidade de gênero', 'Identidade de genero').trim();
      if (direto) return direto;
      const candidates = Object.values(row || {})
        .map((v) => String(v || '').trim())
        .filter((v) => v && v.length <= 64);
      const hit = candidates.find((val) => {
        const low = val
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
        return (
          low.includes('travesti') ||
          low.includes('nao binario') ||
          low.includes('não binario') ||
          low.includes('nao-binario') ||
          low.includes('genero fluido') ||
          low.includes('agenero') ||
          low.includes('intersexo') ||
          low.includes('bigenero') ||
          low.includes('mulher trans') ||
          low.includes('homem trans') ||
          low.includes('transgener') ||
          low.includes('transgener')
        );
      });
      return hit || '';
    };

    /** Eixos LGBTQIA+ distintos: orientação sexual e identidade/gênero são independentes (podem coexistir). */
    const lgbtAxesFrom = (a: any) => {
      const orientacaoCampo = sanitizeOrientacaoSexualValue(
        findFieldValue(a, 'orientacao_sexual', 'Orientação Sexual', 'sexualidade', 'orientacao_sex')
      );
      const generoSexoCampo = findFieldValue(a, 'genero_sexo', 'genero', 'sexo', 'Gênero', 'Sexo');
      const orientacao = `${orientacaoCampo} ${generoSexoCampo}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const idGeneroCampo = getIdentidadeGeneroValue(a)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const generoVal = findFieldValue(a, 'genero', 'sexo', 'Gênero', 'Sexo')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const isLgbtOrientacao =
        orientacao.includes('lgbt') ||
        orientacao.includes('homossexual') ||
        orientacao.includes('homoafetiv') ||
        orientacao.includes('bissexual') ||
        orientacao.includes('bi ') ||
        orientacao.startsWith('bi') ||
        orientacao.includes('pansexual') ||
        orientacao.includes('pan ') ||
        orientacao.startsWith('pan') ||
        orientacao.includes('assexual') ||
        orientacao.includes('queer') ||
        orientacao.includes('lesbica') ||
        orientacao.includes('gay');
      const isLgbtIdGenero =
        idGeneroCampo.includes('trans') ||
        idGeneroCampo.includes('travesti') ||
        idGeneroCampo.includes('nao binario') ||
        idGeneroCampo.includes('não binario') ||
        idGeneroCampo.includes('nao-binario') ||
        idGeneroCampo.includes('genero fluido') ||
        idGeneroCampo.includes('agenero') ||
        idGeneroCampo.includes('intersexo') ||
        idGeneroCampo.includes('nao cisgener') ||
        idGeneroCampo.includes('não cisgener');
      const isLgbtGenero =
        generoVal.includes('travesti') ||
        generoVal.includes('transgenero') ||
        generoVal.includes('transgen') ||
        generoVal.includes('trans feminino') ||
        generoVal.includes('trans masculino') ||
        generoVal.includes('transfeminino') ||
        generoVal.includes('transmasculino') ||
        generoVal.includes('nao binario') ||
        generoVal.includes('não binario') ||
        generoVal.includes('nao-binario') ||
        generoVal.includes('genero fluido') ||
        generoVal.includes('agenero') ||
        generoVal.includes('bigenero') ||
        generoVal.includes('intersexo') ||
        generoVal.includes('nao cisgener') ||
        (generoVal.includes('trans') && !generoVal.includes('transparencia') && !generoVal.includes('transporte'));
      return { isLgbtOrientacao, isLgbtIdGenero, isLgbtGenero };
    };

    const lgbtOrientacaoSexual = todosParaDiversidade.filter((a: any) => lgbtAxesFrom(a).isLgbtOrientacao).length;
    /** Identidade/gênero LGBTQIA+: eixo independente do eixo de orientação sexual. */
    const lgbtIdentidadeGenero = todosParaDiversidade.filter((a: any) => {
      const f = lgbtAxesFrom(a);
      return f.isLgbtIdGenero || f.isLgbtGenero;
    }).length;
    const lgbtqia = todosParaDiversidade.filter((a: any) => {
      const f = lgbtAxesFrom(a);
      return f.isLgbtOrientacao || f.isLgbtIdGenero || f.isLgbtGenero;
    }).length;
    
    const mulheres = todosParaDiversidade.filter((a: any) => {
      const genero = findFieldValue(a, 'genero', 'sexo', 'Gênero', 'Sexo', 'identidade_genero').toLowerCase();
      return genero.includes('feminino') || genero.includes('mulher') || genero === 'f' || genero.includes('female');
    }).length;
    const homens = todosParaDiversidade.filter((a: any) => {
      const genero = findFieldValue(a, 'genero', 'sexo', 'Gênero', 'Sexo', 'identidade_genero').toLowerCase();
      return genero.includes('masculino') || genero.includes('homem') || genero === 'm' || genero.includes('male');
    }).length;
    const percMulheres = baseParaPercentual > 0 ? Math.round((mulheres / baseParaPercentual) * 100) : 0;
    
    const jovens = todosParaDiversidade.filter((a: any) => {
      const idadeStr = findFieldValue(a, 'idade', 'faixa_etaria', 'Idade', 'Faixa Etária', 'data_nascimento', 'nascimento');
      const idadeNum = parseInt(idadeStr);
      if (idadeNum > 0 && idadeNum <= 29) return true;
      const faixaLower = idadeStr.toLowerCase();
      if (faixaLower.includes('18') || faixaLower.includes('jovem') || faixaLower.includes('youth')) return true;
      if (idadeStr.includes('/') || idadeStr.includes('-')) {
        try {
          const d = new Date(idadeStr);
          if (!isNaN(d.getTime())) {
            const agora = new Date();
            const diff = agora.getFullYear() - d.getFullYear();
            if (diff > 0 && diff <= 29) return true;
          }
        } catch {}
      }
      return false;
    }).length;
    
    const pcd = todosParaDiversidade.filter((a: any) => isPcdDeclaracaoPositiva(extractPcdColumnValue(a))).length;

    const bump = (m: Map<string, number>, k: string, n = 1) => m.set(k, (m.get(k) || 0) + n);
    const mapToArr = (m: Map<string, number>, max = 12) =>
      Array.from(m.entries())
        .map(([nome, qtd]) => ({ nome, qtd }))
        .filter((x) => x.qtd > 0)
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, max);

    const tryParseAgeYears = (idadeStr: string): number | null => {
      const n = parseInt(idadeStr, 10);
      if (Number.isFinite(n) && n >= 3 && n < 120) return n;
      const m = idadeStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (m) {
        const d = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
        if (!isNaN(d.getTime())) {
          const agora = new Date();
          let age = agora.getFullYear() - d.getFullYear();
          const mo = agora.getMonth() - d.getMonth();
          if (mo < 0 || (mo === 0 && agora.getDate() < d.getDate())) age--;
          if (age >= 0 && age < 120) return age;
        }
      }
      return null;
    };

    const idadeFaixaBucket = (a: any): string => {
      const idadeStr = findFieldValue(a, 'idade', 'faixa_etaria', 'Idade', 'Faixa Etária', 'data_nascimento', 'nascimento').trim();
      if (!idadeStr) return 'Não informado';
      const age = tryParseAgeYears(idadeStr);
      if (age !== null) {
        if (age <= 17) return '0–17 anos';
        if (age <= 29) return '18–29 anos';
        if (age <= 39) return '30–39 anos';
        if (age <= 49) return '40–49 anos';
        if (age <= 59) return '50–59 anos';
        return '60+ anos';
      }
      const fl = idadeStr.toLowerCase();
      if (fl.includes('jovem') || fl.includes('18 a 29') || fl.includes('18-29')) return '18–29 anos';
      if (fl.includes('0 a 17') || fl.includes('crianc')) return '0–17 anos';
      if (fl.includes('idoso') || fl.includes('60')) return '60+ anos';
      return 'Não informado';
    };

    const racaBucket = (a: any): string => {
      const r = findFieldValue(a, 'raca', 'etnia', 'autodeclaracao', 'Raça', 'Raça/Cor', 'raca_cor', 'Cor', 'cor').toLowerCase().trim();
      if (!r) return 'Não informado';
      if (r.includes('pret')) return 'Preta';
      if (r.includes('pard')) return 'Parda';
      if (r.includes('branc')) return 'Branca';
      if (r.includes('indig')) return 'Indígena';
      if (r.includes('amarel') || r.includes('asiát') || r.includes('asiatic')) return 'Amarela';
      if (r.includes('negr') || r.includes('afro')) return 'Preta / Parda';
      return 'Outras';
    };

    const generoBucket = (a: any): string => {
      const g = findFieldValue(a, 'genero', 'sexo', 'Gênero', 'Sexo', 'identidade_genero').toLowerCase().trim();
      if (!g) return 'Não informado';
      if (g.includes('feminino') || g.includes('mulher') || g === 'f' || g.includes('female')) return 'Mulheres';
      if (g.includes('masculino') || g.includes('homem') || g === 'm' || g.includes('male')) return 'Homens';
      if (g.includes('nao binario') || g.includes('não binario') || g.includes('nao-binario') || g.includes('fluido'))
        return 'Não binário / fluido';
      return 'Outro / pref. não informar';
    };

    const tipoPcdFromRaw = (raw: string): string => {
      const v = normalizeLooseKey(raw);
      if (v === 'sim' || v === 's' || v === 'yes') return '';
      if (v === 'nao' || v === 'não' || v === 'n') return '';
      if (v.includes('visual') || v.includes('cegueir') || v.includes('baixa vis')) return 'Visual / cegueira';
      if (v.includes('audit') || v.includes('surdez') || v.includes('surdo') || v.includes('surda')) return 'Auditiva / surdez';
      if (v.includes('fisic') || v.includes('motora') || v.includes('cadeira') || v.includes('ostom')) return 'Física / motora';
      if (v.includes('intelec') || v.includes('mental') || v.includes('cognit')) return 'Intelectual / cognitiva';
      if (v.includes('multipl')) return 'Múltipla';
      if (v.includes('autismo') || v.includes('tea')) return 'TEA / autismo';
      return 'Outras / não especificado';
    };

    const pcdTipoDetalhadoFromRow = (row: any): string => {
      if (!row || typeof row !== 'object') return '';
      for (const [k, v] of Object.entries(row)) {
        const kn = normalizeLooseKey(String(k || ''));
        const looksLikeTipoField =
          (kn.includes('pcd') && kn.includes('tipo')) ||
          (kn.includes('deficiencia') && (kn.includes('tipo') || kn.includes('qual'))) ||
          kn.includes('tipodedeficiencia');
        if (!looksLikeTipoField) continue;
        const raw = String(v || '').trim();
        if (!raw) continue;
        const mapped = tipoPcdFromRaw(raw);
        if (mapped) return mapped;
      }
      return '';
    };

    const detectPovoReferencia = (a: any): string | null => {
      const blob = [
        findFieldValue(a, 'comunidade', 'Comunidade', 'comunidadeTradicional'),
        findFieldValue(a, 'observacoes', 'Observações', 'obs'),
        String(a.bairro || ''),
        findFieldValue(a, 'raca', 'etnia', 'Raça/Cor'),
        String(a.nome || a.Nome || a.nomeProjeto || ''),
      ]
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (blob.includes('quilomb')) return 'Referência quilombola';
      if (blob.includes('indigen') || blob.includes('aldeia')) return 'Referência indígena';
      if (blob.includes('terreiro') || blob.includes('candombl')) return 'Matriz africana / terreiro';
      if (blob.includes('ribeir') || blob.includes('pesca artesanal')) return 'Ribeirinho / pesca';
      return null;
    };

    let diversityCharts: DiversityChartsPayload | null = null;
    if (todosParaDiversidade.length > 0) {
      /** Só colunas de orientação sexual — evita misturar raça ou outros textos no gráfico de resumo. */
      const orientacaoClassBucket = (a: any): string => {
        const orientacao = sanitizeOrientacaoSexualValue(
          findFieldValue(a, 'orientacao_sexual', 'Orientação Sexual', 'sexualidade', 'orientacao_sex')
        )
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
        if (!orientacao) return 'Não informado';
        if (orientacao.includes('hetero') || orientacao === 'h' || orientacao.includes('heterossexual')) return 'Heterossexual';
        if (
          orientacao.includes('lgbt') ||
          orientacao.includes('homossexual') ||
          orientacao.includes('bissexual') ||
          orientacao.includes('pansexual') ||
          orientacao.includes('assexual') ||
          orientacao.includes('queer') ||
          orientacao.includes('lesbica') ||
          orientacao.includes('gay')
        )
          return 'Orientação LGBTQ+';
        return 'Outro / não classificado';
      };

      const generoMap = new Map<string, number>();
      const racaMap = new Map<string, number>();
      const pcdMap = new Map<string, number>();
      const idadeMap = new Map<string, number>();
      const orientSexualMap = new Map<string, number>();
      const orientClassMap = new Map<string, number>();
      const identidadeGeneroMap = new Map<string, number>();
      const escolarMap = new Map<string, number>();
      const areaMap = new Map<string, number>();
      const estadoMap = new Map<string, number>();
      const rendaMap = new Map<string, number>();
      const expMap = new Map<string, number>();
      const natMap = new Map<string, number>();
      const povosMap = new Map<string, number>();
      const pcdTipoMap = new Map<string, number>();
      const cpfJaContouEstado = new Set<string>();

      todosParaDiversidade.forEach((a: any) => {
        bump(generoMap, generoBucket(a));
        bump(racaMap, racaBucket(a));
        bump(idadeMap, idadeFaixaBucket(a));

        const rawPcd = extractPcdColumnValue(a);
        if (!String(rawPcd || '').trim()) bump(pcdMap, 'Não informado');
        else if (isPcdDeclaracaoPositiva(rawPcd)) bump(pcdMap, 'Declara PcD');
        else {
          const v = normalizeLooseKey(rawPcd);
          if (
            v === 'nao' ||
            v === 'não' ||
            v.startsWith('nao ') ||
            v.startsWith('não ') ||
            v === 'nenhum' ||
            v === 'nenhuma' ||
            v === 'sem'
          ) {
            bump(pcdMap, 'Não');
          } else bump(pcdMap, 'Outro / ambíguo');
        }

        const oriS = sanitizeOrientacaoSexualValue(
          findFieldValue(a, 'orientacao_sexual', 'Orientação Sexual', 'sexualidade', 'orientacao_sex')
        ).trim();
        if (oriS) {
          const label = oriS.length > 36 ? `${oriS.slice(0, 33)}…` : oriS;
          bump(orientSexualMap, label);
        }
        bump(orientClassMap, orientacaoClassBucket(a));

        const idg = getIdentidadeGeneroValue(a).trim();
        if (idg) {
          const label = idg.length > 36 ? `${idg.slice(0, 33)}…` : idg;
          bump(identidadeGeneroMap, label);
        }

        const esc = findFieldValue(
          a,
          'escolaridade',
          'Escolaridade',
          'grau_instrucao',
          'Grau de instrução',
          'Instrução',
          'ensino'
        ).trim();
        if (esc) {
          const label = esc.length > 36 ? `${esc.slice(0, 33)}…` : esc;
          bump(escolarMap, label);
        }

        const area = findFieldValue(
          a,
          'linguagem',
          'Linguagem',
          'linguagem_cultural',
          'areaAtuacao',
          'categoria',
          'area',
          'Categoria',
          'tipo_cultural',
          'modalidade',
          'segmento',
          'Segmento cultural'
        ).trim();
        if (area) {
          const areas = splitAreaTokens(area);
          areas.forEach((areaItem) => bump(areaMap, areaItem));
        }

        const ec = normalizeEstadoCivil(findEstadoCivil(a) || findEstadoCivilFallback(a));
        if (ec) {
          bump(estadoMap, ec);
          const cpfDig = String(findFieldValue(a, 'cpf', 'CPF', 'documento', 'Documento') || '').replace(/\D/g, '');
          if (cpfDig.length >= 11) cpfJaContouEstado.add(cpfDig);
        }

        const rnda = (
          findFieldValue(a, 'renda', 'Renda', 'faixa_renda', 'Faixa de renda', 'renda_familiar', 'Renda familiar').trim() ||
          findRendaRawFallback(a)
        );
        const rndaNorm = normalizeRendaFaixa(rnda);
        if (rndaNorm) bump(rendaMap, rndaNorm);

        const exp = (
          findFieldValue(
          a,
          'tempo_atuacao',
          'Tempo de atuação',
          'experiencia',
          'anos',
          'Anos de atuação',
          'atuacao_cultural',
          'tempo de experiência'
        ).trim() || findExperienciaRawFallback(a)
        );
        if (exp) bump(expMap, exp.length > 32 ? `${exp.slice(0, 29)}…` : exp);

        const nat = findFieldValue(
          a,
          'naturalidade',
          'Naturalidade',
          'cidade_natal',
          'municipio',
          'Município',
          'cidade',
          'Cidade'
        ).trim();
        if (nat) bump(natMap, nat.length > 32 ? `${nat.slice(0, 29)}…` : nat);

        const povo = detectPovoReferencia(a);
        if (povo) bump(povosMap, povo);

        if (isPcdDeclaracaoPositiva(String(rawPcd || ''))) {
          const tipoPcd = pcdTipoDetalhadoFromRow(a) || tipoPcdFromRaw(String(rawPcd));
          if (tipoPcd) bump(pcdTipoMap, tipoPcd);
        }
      });

      // Linhas só no mapeamento cultural (não entram em todosParaDiversidade) podem trazer estado civil.
      try {
        const rawLs = localStorage.getItem('editais_imported_data');
        if (rawLs) {
          const p = normalizeProjetosOnParsed(JSON.parse(rawLs)) as Record<string, any>;
          const mapRows = Array.isArray(p.mapeamento) ? p.mapeamento : [];
          mapRows.forEach((row: any) => {
            const cpfDig = String(findFieldValue(row, 'cpf', 'CPF', 'documento', 'Documento') || '').replace(/\D/g, '');
            if (cpfDig.length >= 11 && cpfJaContouEstado.has(cpfDig)) return;
            const ec = normalizeEstadoCivil(findEstadoCivil(row));
            if (!ec) return;
            bump(estadoMap, ec);
            if (cpfDig.length >= 11) cpfJaContouEstado.add(cpfDig);
          });
        }
      } catch {
        /* ignore */
      }

      const comTradRegistros = todosParaDiversidade.filter((a: any) => {
        const isProjeto = editaisFinais.includes(a);
        return ehComunidadeTradicionalRegistro(a, { includeNomeProjeto: isProjeto });
      }).length;

      const genSeg = [
        { nome: 'Agentes', arr: agentesFinais as any[] },
        { nome: 'Grupos', arr: gruposImportados as any[] },
        { nome: 'Espaços', arr: espacosImportados as any[] },
        { nome: 'Projetos', arr: editaisFinais as any[] },
      ].filter((s) => s.arr.length > 0);

      const generoPorOrigem = genSeg.map(({ nome, arr }) => {
        let mw = 0;
        let hm = 0;
        let ot = 0;
        arr.forEach((row: any) => {
          const b = generoBucket(row);
          if (b === 'Mulheres') mw++;
          else if (b === 'Homens') hm++;
          else ot++;
        });
        return { nome, mulheres: mw, homens: hm, outros: ot, total: arr.length };
      });

      const negrosPorOrigem = genSeg.map(({ nome, arr }) => {
        const ng = arr.filter((row: any) => {
          const raca = findFieldValue(row, 'raca', 'etnia', 'autodeclaracao', 'Raça', 'Raça/Cor', 'raca_cor', 'Cor', 'cor').toLowerCase();
          return raca.includes('pret') || raca.includes('pard') || raca.includes('negr') || raca.includes('afro');
        }).length;
        return { nome, negros: ng, demais: arr.length - ng };
      });

      const lgbtqiaPorTipoCadastro = genSeg.map(({ nome, arr }) => ({
        nome,
        qtd: arr.filter((row: any) => {
          const f = lgbtAxesFrom(row);
          return f.isLgbtOrientacao || f.isLgbtIdGenero || f.isLgbtGenero;
        }).length,
      }));

      const bTot = todosParaDiversidade.length || 1;
      const indicesPerfilRacial = [{ nome: '% Negros/pardos (cor/raça)', qtd: Math.round((negros / bTot) * 100) }];
      const indicesLgbtqia = [
        { nome: 'Orientação sexual LGBTQ+', qtd: lgbtOrientacaoSexual },
        { nome: 'Identidade de gênero LGBTQ+', qtd: lgbtIdentidadeGenero },
      ];
      const indicesDemograficos = [
        { nome: '% Mulheres', qtd: Math.round((mulheres / bTot) * 100) },
        { nome: '% Homens', qtd: Math.round((homens / bTot) * 100) },
        { nome: '% Jovens (até 29)', qtd: Math.round((jovens / bTot) * 100) },
        { nome: '% PcD', qtd: Math.round((pcd / bTot) * 100) },
        { nome: '% Comun. trad.', qtd: Math.round((comTradRegistros / bTot) * 100) },
      ];

      diversityCharts = {
        totalBase: todosParaDiversidade.length,
        lgbtqiaUniao: lgbtqia,
        genero: mapToArr(generoMap, 10),
        raca: mapToArr(racaMap, 10),
        pcd: mapToArr(pcdMap, 8),
        idadeFaixa: mapToArr(idadeMap, 10),
        origemTipo: [
          { nome: 'Agentes', qtd: agentesFinais.length },
          { nome: 'Grupos', qtd: gruposImportados.length },
          { nome: 'Espaços', qtd: espacosImportados.length },
          { nome: 'Projetos / editais', qtd: editaisFinais.length },
        ].filter((x) => x.qtd > 0),
        tradVinculo: [
          { nome: 'Comunidade tradicional', qtd: comTradRegistros },
          { nome: 'Sem vínculo', qtd: Math.max(0, todosParaDiversidade.length - comTradRegistros) },
        ],
        negrosComparativoBase: [
          { nome: 'Negros / pardos (cor/raça)', qtd: negros },
          { nome: 'Demais registros', qtd: Math.max(0, todosParaDiversidade.length - negros) },
        ],
        inclusaoSemRacaELgbt: [
          { nome: 'Mulheres', qtd: mulheres },
          { nome: 'Homens', qtd: homens },
          { nome: 'Jovens (até 29)', qtd: jovens },
          { nome: 'PcD', qtd: pcd },
          { nome: 'Comun. trad. (vínculo)', qtd: comTradRegistros },
        ].filter((x) => x.qtd > 0),
        orientacaoSexual: mapToArr(orientSexualMap, 10),
        orientacaoSexualClassificada: mapToArr(orientClassMap, 8),
        identidadeGeneroDistrib: mapToArr(identidadeGeneroMap, 10),
        escolaridade: mapToArr(escolarMap, 10),
        lgbtqComparativo: [
          { nome: 'Orientação sexual LGBTQ+', qtd: lgbtOrientacaoSexual },
          { nome: 'Identidade de gênero LGBTQ+', qtd: lgbtIdentidadeGenero },
        ],
        homensMulheres: [
          { nome: 'Mulheres', qtd: mulheres },
          { nome: 'Homens', qtd: homens },
          { nome: 'Outros / NI', qtd: Math.max(0, todosParaDiversidade.length - mulheres - homens) },
        ],
        lgbtqiaPorTipoCadastro,
        generoPorOrigem,
        negrosPorOrigem,
        areaCultural: mapToArr(areaMap, 12),
        indicesPerfilRacial,
        indicesLgbtqia,
        indicesDemograficos,
        estadoCivil: mapToArr(estadoMap, 10),
        rendaFaixa: mapToArr(rendaMap, 10),
        pcdTipos: mapToArr(pcdTipoMap, 10),
        experienciaCultural: mapToArr(expMap, 10),
        naturalidadeTop: mapToArr(natMap, 10),
        povosReferencia: mapToArr(povosMap, 8),
      };
    }
    
    // 🎯 Recalcula totais a partir do breakdown (que já inclui overrides)
    const totalInscritosFinal = breakdownEditais.reduce((a, e) => a + e.inscritos, 0);
    const totalContempladosFinal = breakdownEditais.reduce((a, e) => a + e.contemplados, 0);
    const totalValorFinal = breakdownEditais.reduce((a, e) => a + e.valor, 0);

    const totaisPublicos = computeEstatisticasPublicas({
      agentes: agentesImportados,
      grupos: gruposImportados,
      espacos: espacosImportados,
      projetos: editaisImportados,
      mapeamento: baseMapeamento,
    });
    
    // Adiciona IDs únicos para cada edital (previne warnings de keys duplicadas no React/Recharts)
    breakdownEditais.forEach((ed, idx) => {
      (ed as any).id = `${ed.nome}-${idx}`;
    });
    
    return {
      totalProjetos: totalContempladosFinal,
      totalInscritos: totalInscritosFinal,
      totalValor: totalValorFinal,
      totalValorBrl: formatBRL(totalValorFinal),
      totaisPublicos,
      qtdEditais: breakdownEditais.length,
      trad,
      percTrad,
      comunidadesOficiais: COMUNIDADES_TRADICIONAIS.length,
      faixaAnos,
      inscricoesTotais,
      totalDiversidade: todosParaDiversidade.length,
      totalAgentes,
      totalGrupos,
      totalEspacos,
      // 🆕 Novos indicadores
      negros,
      lgbtqia,
      lgbtOrientacaoSexual,
      lgbtIdentidadeGenero,
      mulheres,
      percMulheres,
      jovens,
      pcd,
      homens,
      diversityCharts,
      // 🆕 Breakdown por edital (demanda vs oferta) — espelho dos dados salvos no Admin
      breakdownEditais,
      customEditalLinks,
      // 🆕 Itens para o mapa (com lat/lng)
      todosItens: [
        ...agentesFinais.map(a => ({ ...a, tipo: 'agente' as const })),
        ...gruposImportados.map(g => ({ ...g, tipo: 'grupo' as const })),
        ...espacosImportados.map(e => ({ ...e, tipo: 'espaco' as const })),
        ...editaisFinais.map(p => ({ ...p, tipo: 'edital' as const }))
      ]
    };
  }, [refreshKey]);

  // 🆕 CALCULA AUTOMATICAMENTE DISTRIBUIÇÃO POR BAIRRO (para o gráfico "Distribuição Geográfica")
  const distribuicaoPorBairro = useMemo(() => {
    const loadedData = localStorage.getItem('editais_imported_data');

    try {
      const parsed = loadedData
        ? (normalizeProjetosOnParsed(JSON.parse(loadedData)) as Record<string, any>)
        : (DADOS_ESTATICOS as unknown as Record<string, any>);
      const todosCadastro = [
        ...(parsed.agentes || []),
        ...(parsed.grupos || []),
        ...(parsed.espacos || []),
        ...(Array.isArray(parsed.mapeamento) ? parsed.mapeamento : []),
      ];
      const projetos = (parsed.projetos || []) as any[];
      
      const labelBairroCadastro = (item: any): string => {
        const end = String(
          item.enderecoCompleto ||
            item['Endereço completo'] ||
            item['Endereco completo'] ||
            item['Endereço Completo'] ||
            ''
        ).trim();
        const raw = String(
          item.bairro ||
            item.Bairro ||
            item.BAIRRO ||
            item.localidade ||
            item.Localidade ||
            item.local ||
            item.regiao ||
            item.Região ||
            item['Bairro / localidade'] ||
            item['Bairro do proponente'] ||
            item['Bairro Proponente'] ||
            item['Bairro onde reside'] ||
            item['bairro onde reside'] ||
            item.comunidade ||
            item.Comunidade ||
            ''
        ).trim();
        const c = canonicalBairroIlhabela(raw, end);
        const label = (c || raw).replace(/\s+/g, ' ').trim();
        if (!label || label.length > 60 || looksLikeEnderecoCompleto(label)) return '';
        return label;
      };

      // Agrupa por bairro (cadastro + mapeamento + proponentes de editais)
      const map = new Map<string, number>();
      const add = (b: string) => {
        if (b) map.set(b, (map.get(b) || 0) + 1);
      };
      todosCadastro.forEach((item: any) => {
        add(labelBairroCadastro(item));
      });
      projetos.forEach((item: any) => {
        add(labelBairroCadastro(item));
      });
      
      // Converte para array e ordena (todos os bairros/localidades com pelo menos 1 registro)
      return Array.from(map.entries())
        .map(([nome, qtd]) => ({ nome, qtd: Number(qtd) || 0, valor: 0 }))
        .filter((d) => d.qtd > 0)
        .sort((a, b) => b.qtd - a.qtd);
    } catch (e) {
      console.error('Erro ao calcular distribuição por bairro:', e);
      return [];
    }
  }, [refreshKey]);

  const rankingProponentes = useMemo(() => {
    const map = new Map<string, { count: number; displayName: string }>();
    const raw = localStorage.getItem('editais_imported_data');
    let projetos: any[] = [];
    try {
      if (raw) {
        const parsed = normalizeProjetosOnParsed(JSON.parse(raw)) as Record<string, any>;
        projetos = parsed.projetos || [];
      } else {
        projetos = DADOS_ESTATICOS.projetos;
      }
    } catch {
      projetos = DADOS_ESTATICOS.projetos;
    }
    for (const p of projetos) {
      const name = String(
        p.proponente ?? p.Proponente ?? p.nome ?? p.Nome ?? p.responsavel ?? p.Responsável ?? ''
      ).trim();
      if (name.length < 2) continue;
      const key = normalizeFullPersonNameForRanking(name);
      if (!key) continue;
      const cur = map.get(key) || { count: 0, displayName: '' };
      cur.count += 1;
      if (!cur.displayName || (name.length > cur.displayName.length && name.toLowerCase() !== 'pessoa física')) {
        cur.displayName = name;
      }
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([, v]) => ({ name: v.displayName || '', count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [refreshKey]);

  /** Exibe evolução de investimento — usa dados estáticos quando localStorage estiver vazio. */
  const evolucaoInvestimentoCharts = useMemo(() => {
    const raw = localStorage.getItem('editais_imported_data');
    try {
      const parsed = raw
        ? (normalizeProjetosOnParsed(JSON.parse(raw)) as Record<string, any>)
        : (DADOS_ESTATICOS as unknown as Record<string, any>);
      const projetos = (parsed.projetos || []) as any[];
      if (projetos.length === 0) return [];
      const anoMap = new Map<number, number>();
      projetos.forEach((p: any) => {
        const st = (p.status || p.Status || '').toLowerCase();
        const isContempByStatus =
          st.includes('contemplado') ||
          st.includes('aprovado') ||
          st.includes('classificado') ||
          st.includes('selecionado');
        const isContempByFlag = p.eh_contemplado === true || p.eh_contemplado === 'true' || p.eh_contemplado === 1;
        if (!isContempByStatus && !isContempByFlag) return;
        let ano = parseInt(String(p._anoOrigem || p.ano || ''), 10);
        if (!Number.isFinite(ano) || ano < 1990) {
          const m = String(p._editalOrigem || p.edital || p.Edital || p['Edital'] || '').match(/(\d{4})/);
          ano = m ? parseInt(m[1], 10) : 0;
        }
        if (!ano || ano < 1990) return;
        const valor = parseBRLValue(p.valor || p.Valor || p.value || p['Valor (R$)'] || 0);
        anoMap.set(ano, (anoMap.get(ano) || 0) + valor);
      });
      const arr = Array.from(anoMap.entries())
        .map(([ano, valor]) => ({ ano: String(ano), valor }))
        .sort((a, b) => parseInt(a.ano, 10) - parseInt(b.ano, 10));
      if (arr.length === 0) return [];
      return fillYearGaps(arr.map((r) => ({ ...r, valor: Number(r.valor) || 0 })));
    } catch {
      return [];
    }
  }, [refreshKey]);

  const categoriasCharts = useMemo(() => {
    const raw = localStorage.getItem('editais_imported_data');
    try {
      const parsed = raw
        ? (normalizeProjetosOnParsed(JSON.parse(raw)) as Record<string, any>)
        : (DADOS_ESTATICOS as unknown as Record<string, any>);
      const projetos = (parsed.projetos || []) as any[];
      if (projetos.length === 0) return [];
      const catMap = new Map<string, { qtd: number; valor: number }>();
      projetos.forEach((p: any) => {
        const rawCat = (p.areaAtuacao || p.categoria || p.area || p.Categoria || '').toString().trim();
        const categories = splitAreaTokens(rawCat);
        if (categories.length === 0) {
          // Fallback seguro: só classifica como "Outros" quando não há texto util de linguagem.
          const normalized = normalizeLooseKey(rawCat);
          const looksLikeNoise =
            !normalized ||
            normalized === '-' ||
            normalized.includes('modulo') ||
            normalized.includes('módulo') ||
            normalized.includes('faixa') ||
            normalized.includes('projetos com valor') ||
            normalized.includes('demais areas culturais') ||
            normalized.includes('demais áreas culturais') ||
            /r\$\s*\d/.test(rawCat.toLowerCase());
          if (looksLikeNoise) return;
          categories.push('Outros');
        }
        const st = (p.status || p.Status || '').toLowerCase();
        const isContemp =
          st.includes('contemplado') ||
          st.includes('aprovado') ||
          st.includes('classificado') ||
          st.includes('selecionado');
        const valorProjeto = isContemp ? parseBRLValue(p.valor || p.Valor || p.value || 0) : 0;
        for (const cat of categories) {
          const current = catMap.get(cat) || { qtd: 0, valor: 0 };
          current.qtd += 1;
          current.valor += valorProjeto;
          catMap.set(cat, current);
        }
      });
      const arr = Array.from(catMap.entries())
        .map(([nome, data]) => ({ nome, ...data }))
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 10);
      return arr;
    } catch {
      return [];
    }
  }, [refreshKey]);

  // 🔧 Dados memoizados com IDs únicos para evitar warnings de keys duplicadas no Recharts
  const evolucaoComIds = useMemo(() => {
    return evolucaoInvestimentoCharts.map((item, idx) => ({
      ...item,
      id: `evolucao-${item.ano}-${idx}`,
      _chartId: `evolucao-${idx}-${item.ano}`
    }));
  }, [evolucaoInvestimentoCharts]);
  
  const categoriasComIds = useMemo(() => {
    return categoriasCharts.slice(0, 8).map((item, idx) => ({
      ...item,
      qtd: Number(item.qtd) || 0,
      valor: Number(item.valor) || 0,
      id: `categoria-${item.nome}-${idx}`,
      _chartId: `categoria-${idx}-${item.nome.replace(/\s+/g, '-')}`
    }));
  }, [categoriasCharts]);
  
  const bairrosComIds = useMemo(() => {
    return distribuicaoPorBairro.map((item, idx) => ({
      ...item,
      qtd: Number(item.qtd) || 0,
      id: `bairro-${item.nome}-${idx}`,
      _chartId: `bairro-${idx}-${item.nome.replace(/\s+/g, '-')}`
    }));
  }, [distribuicaoPorBairro]);

  /** Altura controlada (evita gráfico desproporcional com muitos bairros). */
  const bairrosChartHeight = useMemo(() => {
    const n = distribuicaoPorBairro.length;
    if (n === 0) return 280;
    return Math.min(520, Math.max(320, n * 16 + 64));
  }, [distribuicaoPorBairro.length]);

  const bairrosYAxisWidth = useMemo(() => {
    let maxLen = 12;
    for (const r of distribuicaoPorBairro) {
      maxLen = Math.max(maxLen, String(r.nome || '').length);
    }
    return Math.min(220, Math.max(108, Math.round(maxLen * 6.4)));
  }, [distribuicaoPorBairro]);
  
  const breakdownComIds = useMemo(() => {
    if (!resumoGlobal.breakdownEditais || resumoGlobal.breakdownEditais.length === 0) return [];
    return resumoGlobal.breakdownEditais.map((ed, idx) => ({
      nome: ed.nome.length > 15 ? ed.nome.substring(0, 15) + '...' : ed.nome,
      contemplados: ed.contemplados,
      valor: ed.valor,
      id: `breakdown-${ed.nome}-${idx}`,
      _chartId: `breakdown-${idx}-${ed.nome.replace(/\s+/g, '-').substring(0, 20)}`
    }));
  }, [resumoGlobal.breakdownEditais]);

  /** Rosca: contemplados vs inscritos não contemplados (soma do breakdown por edital — mesma base do Admin) */
  const ofertaDemandaPieData = useMemo(() => {
    const rows = resumoGlobal.breakdownEditais || [];
    const i = rows.reduce((a, e) => a + (Number(e.inscritos) || 0), 0);
    const c = rows.reduce((a, e) => a + (Number(e.contemplados) || 0), 0);
    const nao = Math.max(0, i - c);
    if (c === 0 && nao === 0) return [];
    return [
      { name: 'Contemplados', value: c, _id: 'pie-c' },
      { name: 'Inscritos (não contemplados)', value: nao, _id: 'pie-nc' },
    ].filter((x) => x.value > 0);
  }, [resumoGlobal.breakdownEditais]);

  /** Pizza: distribuição de gênero (base diversidade) */
  const generoPieData = useMemo(() => {
    const m = resumoGlobal.mulheres;
    const h = resumoGlobal.homens;
    const o = Math.max(0, resumoGlobal.totalDiversidade - m - h);
    const rows = [
      { name: 'Mulheres', value: m, _id: 'g-m' },
      { name: 'Homens', value: h, _id: 'g-h' },
      { name: 'Outros / NI', value: o, _id: 'g-o' },
    ].filter((x) => x.value > 0);
    return rows;
  }, [resumoGlobal.mulheres, resumoGlobal.homens, resumoGlobal.totalDiversidade]);

  /** Pizza: investimento por edital (top 5 + demais) */
  const editalValorPieData = useMemo(() => {
    const rows = resumoGlobal.breakdownEditais || [];
    if (!rows.length) return [];
    const sorted = [...rows].sort((a, b) => (Number(b.valor) || 0) - (Number(a.valor) || 0));
    const top = sorted.slice(0, 5);
    const total = sorted.reduce((a, e) => a + (Number(e.valor) || 0), 0);
    const topSum = top.reduce((a, e) => a + (Number(e.valor) || 0), 0);
    const rest = Math.max(0, total - topSum);
    const out = top.map((e, idx) => ({
      name: e.nome.length > 18 ? `${e.nome.slice(0, 16)}…` : e.nome,
      value: Number(e.valor) || 0,
      _id: `vp-${idx}`,
    }));
    if (rest > 0 && sorted.length > 5) {
      out.push({ name: 'Demais editais', value: rest, _id: 'vp-rest' });
    }
    return out.filter((x) => x.value > 0);
  }, [resumoGlobal.breakdownEditais]);

  if (!isMounted) return <div className="min-h-screen ds-dash-page" />;

  return (
    <div className="ds-dash-page min-h-screen pb-20 font-sans text-[#1b1b1f]">
      {/* Hero — painel executivo */}
      <section className="relative overflow-hidden border-b border-slate-800/40">
        <div
          className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(59,130,246,0.22),transparent),linear-gradient(165deg,#070b14_0%,#0f172a_45%,#0c1a33_100%)]"
          aria-hidden
        />

        <div className="absolute inset-0 z-[1] bg-slate-950/20" aria-hidden />

        <div
          className="pointer-events-none absolute inset-0 z-[2] opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
          aria-hidden
        />

        <div className="container relative z-10 mx-auto px-6 pb-10 pt-10 md:pb-12 md:pt-14 lg:pt-16">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <div className="mb-4 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-200 backdrop-blur-md sm:text-[0.72rem]">
              <ShieldCheck size={15} className="shrink-0 text-sky-300" aria-hidden />
              <span className="text-slate-100/95">SMIIC</span>
              <span className="hidden text-white/25 sm:inline" aria-hidden>
                ·
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <MapPin size={14} className="shrink-0 text-sky-300/90" aria-hidden />
                Município de Ilhabela · Secretaria de Cultura
              </span>
            </div>

            <h1 className="text-[1.65rem] font-bold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[2.65rem]">
              Painel de Indicadores Culturais
            </h1>
            <p className="mt-2 max-w-xl text-sm font-semibold text-sky-200/90 sm:text-base">
              Cadastro Cultural — dados municipais em gráficos e indicadores
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => onNavigate('painel')}
                variant="contained"
                size="large"
                sx={{
                  bgcolor: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 800,
                  borderRadius: '10px',
                  textTransform: 'none',
                  px: 3.5,
                  py: 1.35,
                  fontSize: '0.92rem',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                  '&:hover': { bgcolor: '#f1f5f9', transform: 'translateY(-1px)' },
                }}
                endIcon={<ArrowRight />}
              >
                Abrir painel analítico
              </Button>
              <Button
                onClick={() => onNavigate('transparencia')}
                variant="outlined"
                size="large"
                sx={{
                  color: '#e2e8f0',
                  borderColor: 'rgba(255,255,255,0.28)',
                  bgcolor: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(10px)',
                  fontWeight: 700,
                  borderRadius: '10px',
                  textTransform: 'none',
                  px: 3.5,
                  py: 1.35,
                  fontSize: '0.92rem',
                  borderWidth: '1.5px',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.45)',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    borderWidth: '1.5px',
                  },
                }}
                endIcon={<FileText />}
              >
                Transparência e fontes
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MAPA STORE LOCATOR - Demo */}
      <section className="container relative z-20 mx-auto mb-12 max-w-7xl px-6 md:mb-14">
        <div className="rounded-2xl ring-1 ring-slate-900/[0.04] overflow-hidden" style={{ boxShadow: '0 4px 24px -8px rgba(15,23,42,0.10)' }}>
          <div className="border-b border-slate-100 bg-white px-5 py-4 md:px-8 md:py-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00A38C]" />
              <p className="ds-dash-kicker text-[#00A38C]">Mapa interativo</p>
            </div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 md:text-xl">
              Agentes culturais no território
            </h2>
            <p className="mt-1 max-w-3xl text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">
              Pesquise e filtre agentes por bairro, categoria ou tipo. Visualize a distribuição no mapa.
            </p>
          </div>
          <div className="h-[500px] bg-slate-50">
            <StoreLocatorMap 
              items={resumoGlobal.todosItens.filter(i => i.lat && i.lng).slice(0, 50)}
              center={[-23.82, -45.36]}
              zoom={12}
            />
          </div>
        </div>
      </section>

      {/* KPIs + gráficos principais — logo no início */}
      <section className="container relative z-20 mx-auto -mt-6 mb-12 max-w-7xl px-6 md:-mt-10 md:mb-14">
        <div className="ds-dash-panel overflow-hidden rounded-2xl ring-1 ring-slate-900/[0.04] md:rounded-3xl" style={{ boxShadow: '0 4px 24px -8px rgba(15,23,42,0.10), 0 1px 3px rgba(15,23,42,0.06)' }}>
          <div className="border-b border-slate-100 bg-white px-5 py-4 md:px-8 md:py-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0b57d0]" />
              <p className="ds-dash-kicker text-[#0b57d0]">Painel público</p>
            </div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 md:text-xl">
              Indicadores e análise gráfica
            </h2>
            <p className="mt-1 max-w-3xl text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">
              Cadastro no mapa de totais = apenas mapeamento cultural (deduplicado). Editais seguem o breakdown do Admin.
            </p>
          </div>
          <div className="bg-[#f8fafc] p-4 sm:p-5 md:p-7">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12 lg:gap-4">
            <motion.div className="min-w-0 xl:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.4, ease: [0.22,1,0.36,1] }}>
              <KpiMetricCard
                borderColor="#1a56db"
                icon={<Users size={18} strokeWidth={2.5} />}
                chipLabel="Mapeamento"
                value={<p className="m-0 text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none text-white">{Math.max(resumoGlobal.totaisPublicos.cadastroPorTipoMapeamento.agentes, resumoGlobal.totalAgentes)}</p>}
                subtitle="Agentes cadastrados no mapeamento cultural"
              />
            </motion.div>

            <motion.div className="min-w-0 xl:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4, ease: [0.22,1,0.36,1] }}>
              <KpiMetricCard
                borderColor="#0f766e"
                icon={<Award size={18} strokeWidth={2.5} />}
                chipLabel="Mapeamento"
                value={<p className="m-0 text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none text-white">{Math.max(resumoGlobal.totaisPublicos.cadastroPorTipoMapeamento.grupos, resumoGlobal.totalGrupos)}</p>}
                subtitle="Grupos e coletivos cadastrados"
              />
            </motion.div>

            <motion.div className="min-w-0 xl:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4, ease: [0.22,1,0.36,1] }}>
              <KpiMetricCard
                borderColor="#4338ca"
                icon={<Building2 size={18} strokeWidth={2.5} />}
                chipLabel="Mapeamento"
                value={<p className="m-0 text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none text-white">{Math.max(resumoGlobal.totaisPublicos.cadastroPorTipoMapeamento.espacos, resumoGlobal.totalEspacos)}</p>}
                subtitle="Espaços culturais cadastrados"
              />
            </motion.div>

            <motion.div className="min-w-0 xl:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4, ease: [0.22,1,0.36,1] }}>
              <KpiMetricCard
                borderColor="#15803d"
                icon={<Trophy size={18} strokeWidth={2.5} />}
                chipLabel={resumoGlobal.totaisPublicos.totalEditais > 0 ? `${resumoGlobal.totaisPublicos.totalEditais} edital(is)` : 'Editais'}
                value={<p className="m-0 text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none text-white">{resumoGlobal.totaisPublicos.totalContemplados}</p>}
                subtitle="Projetos contemplados nos editais"
              />
            </motion.div>

            <motion.div className="min-w-0 sm:col-span-2 xl:col-span-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4, ease: [0.22,1,0.36,1] }}>
              <KpiMetricCard
                borderColor="#be123c"
                icon={<BarChart3 size={18} strokeWidth={2.5} />}
                chipLabel="Investimento"
                value={
                  <p className="m-0 font-black tabular-nums leading-tight tracking-tight break-words text-white text-[1.4rem] min-[400px]:text-2xl sm:text-3xl lg:text-[1.95rem]">
                    {formatBRL(resumoGlobal.totaisPublicos.totalValorInvestido)}
                  </p>
                }
                subtitle="Recursos públicos destinados (contemplados)"
              />
            </motion.div>

            <motion.div className="min-w-0 xl:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4, ease: [0.22,1,0.36,1] }}>
              <KpiMetricCard
                borderColor="#6d28d9"
                icon={<FileText size={18} strokeWidth={2.5} />}
                chipLabel="Chamadas"
                value={<p className="m-0 text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none text-white">{resumoGlobal.totaisPublicos.totalEditais}</p>}
                subtitle="Editais distintos nos projetos"
              />
            </motion.div>

            <motion.div className="min-w-0 sm:col-span-2 xl:col-span-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4, ease: [0.22,1,0.36,1] }}>
              <KpiMetricCard
                borderColor="#b45309"
                icon={<MapPin size={18} strokeWidth={2.5} />}
                chipLabel={`${resumoGlobal.trad} registros`}
                value={<p className="m-0 text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none text-white">{resumoGlobal.comunidadesOficiais}</p>}
                subtitle="Comunidades da lista oficial municipal (Ilhabela, SP)"
              />
            </motion.div>

            <motion.div className="min-w-0 xl:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4, ease: [0.22,1,0.36,1] }}>
              <KpiMetricCard
                borderColor="#be185d"
                icon={<Users size={18} strokeWidth={2.5} />}
                chipLabel={resumoGlobal.totalDiversidade > 0 ? `${resumoGlobal.percMulheres}%` : 'Diversidade'}
                value={<p className="m-0 text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none text-white">{resumoGlobal.mulheres}</p>}
                subtitle="Mulheres no campo cultural (agentes e proponentes)"
              />
            </motion.div>

            <motion.div className="min-w-0 sm:col-span-2 xl:col-span-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4, ease: [0.22,1,0.36,1] }}>
              <KpiMetricCard
                borderColor="#7c3aed"
                icon={<PieChartIcon size={18} strokeWidth={2.5} />}
                chipLabel={resumoGlobal.faixaAnos ? resumoGlobal.faixaAnos : 'Diversidade'}
                value={<p className="m-0 text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none text-white">{resumoGlobal.negros}</p>}
                subtitle="Negros e pardos autodeclarados (agentes e proponentes)"
              />
            </motion.div>
          </div>
          </div>

          <div className="min-w-0 border-t border-slate-100 bg-white px-4 py-5 sm:px-6 md:px-7 md:py-6">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Análise gráfica</p>
            <h3 className="mb-4 text-base font-black text-slate-800 tracking-tight">Evolução, editais e linguagens culturais</h3>
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
              <Card key="card-evolucao-line-lead" sx={{ ...chartCardSx, minWidth: 0, overflow: 'hidden' }}>
                <CardContent className="p-4 md:p-5">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0b57d0]">Investimento</p>
                  <h3 className="mb-0.5 text-sm font-bold text-[#0f172a] md:text-base">Evolução do investimento</h3>
                  <p className="mb-3 text-[11px] text-slate-500">Valores contemplados por ano</p>
                  <ResponsiveContainer width="100%" height={LEAD_CHART_HEIGHT}>
                    {evolucaoInvestimentoCharts.length > 0 ? (
                      <ComposedChart
                        key="evolucao-composed-lead"
                        data={evolucaoComIds}
                        syncId={`evolucaoLineLead-${chartUid}`}
                        margin={{ top: 4, right: 6, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id={`homeFillEvolLead-${chartUid}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CORES_CADASTRO.principal} stopOpacity={0.22} />
                            <stop offset="100%" stopColor={CORES_CADASTRO.principal} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="ano" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dy={6} />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => `${value / 1000}k`}
                          width={40}
                        />
                        <RechartsTooltip contentStyle={chartTooltipContentStyle} formatter={(value: any) => formatBRL(value)} />
                        <Area type="monotone" dataKey="valor" stroke="none" fill={`url(#homeFillEvolLead-${chartUid})`} isAnimationActive={false} />
                        <Line
                          type="monotone"
                          dataKey="valor"
                          stroke={CORES_CADASTRO.principal}
                          strokeWidth={2.25}
                          dot={{ fill: CORES_CADASTRO.principal, strokeWidth: 0, r: 3 }}
                          activeDot={{ r: 5, fill: CORES_CADASTRO.principal, strokeWidth: 2, stroke: '#fff' }}
                          name="Valor investido"
                        />
                      </ComposedChart>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-center text-xs font-medium text-slate-300">
                          Aguardando importação
                          <br />
                          de dados
                        </p>
                      </div>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card key="card-breakdown-bar-lead" sx={{ ...chartCardSx, minWidth: 0, overflow: 'hidden' }}>
                <CardContent className="p-4 md:p-5">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0b57d0]">Editais</p>
                  <h3 className="mb-0.5 text-sm font-bold text-[#0f172a] md:text-base">Contemplados por edital</h3>
                  <p className="mb-2 text-[11px] text-slate-500">Projetos aprovados · valor investido (R$)</p>
                  <ResponsiveContainer width="100%" height={LEAD_CHART_HEIGHT}>
                    {breakdownComIds.length > 0 ? (
                      <BarChart
                        key="breakdown-bar-chart-lead"
                        data={breakdownComIds}
                        margin={{ top: 4, right: 6, left: 0, bottom: 0 }}
                        barCategoryGap="28%"
                        barGap={3}
                      >
                        <defs>
                          <linearGradient id={`homeGradContLead-${chartUid}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#db2777" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#db2777" stopOpacity={0.65} />
                          </linearGradient>
                          <linearGradient id={`homeGradValorLead-${chartUid}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CORES_CADASTRO.principal} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={CORES_CADASTRO.principal} stopOpacity={0.65} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="nome"
                          tick={{ fontSize: 8, fill: '#64748b', fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                          dy={6}
                          interval={0}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 9, fill: '#db2777', fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                          width={28}
                          allowDecimals={false}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 9, fill: CORES_CADASTRO.principal, fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                          width={44}
                          tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}k`)}
                        />
                        <RechartsTooltip
                          contentStyle={chartTooltipContentStyle}
                          formatter={(value: number, name: string) =>
                            name === 'Valor (R$)' ? formatBRL(value) : value
                          }
                          cursor={{ fill: 'rgba(11,87,208,0.05)', radius: 6 }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: 4 }} iconType="circle" iconSize={7} />
                        <Bar
                          yAxisId="left"
                          dataKey="contemplados"
                          fill={`url(#homeGradContLead-${chartUid})`}
                          radius={[5, 5, 0, 0]}
                          maxBarSize={22}
                          name="Contemplados"
                          isAnimationActive={false}
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="valor"
                          fill={`url(#homeGradValorLead-${chartUid})`}
                          radius={[5, 5, 0, 0]}
                          maxBarSize={22}
                          name="Valor (R$)"
                          isAnimationActive={false}
                        />
                      </BarChart>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-center text-xs font-medium text-slate-300">
                          Aguardando importação
                          <br />
                          de dados
                        </p>
                      </div>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card key="card-categoria-bar-lead" sx={{ ...chartCardSx, minWidth: 0, overflow: 'hidden' }}>
                <CardContent className="p-4 md:p-5">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0b57d0]">Linguagens</p>
                  <h3 className="mb-0.5 text-sm font-bold text-[#0f172a] md:text-base">Por categoria</h3>
                  <p className="mb-3 text-[11px] text-slate-500">Volume de projetos</p>
                  <ResponsiveContainer width="100%" height={LEAD_CHART_HEIGHT}>
                    {categoriasCharts.length > 0 ? (
                      <BarChart
                        key="categoria-bar-chart-lead"
                        data={categoriasComIds}
                        syncId={`categoriaBarLead-${chartUid}`}
                        margin={{ top: 2, right: 6, left: 0, bottom: 2 }}
                      >
                        <defs>
                          <linearGradient id={`homeGradCatLead-${chartUid}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CORES_CADASTRO.secundario} stopOpacity={1} />
                            <stop offset="100%" stopColor={CORES_CADASTRO.principal} stopOpacity={0.85} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="nome"
                          tick={{ fontSize: 8, fill: '#64748b', fontWeight: 600 }}
                          angle={-38}
                          textAnchor="end"
                          height={64}
                          interval={0}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} width={26} />
                        <RechartsTooltip contentStyle={chartTooltipContentStyle} cursor={{ fill: 'rgba(11, 87, 208, 0.06)' }} />
                        <Bar dataKey="qtd" fill={`url(#homeGradCatLead-${chartUid})`} radius={[6, 6, 0, 0]} maxBarSize={32} name="Projetos" />
                      </BarChart>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-center text-xs font-medium text-slate-300">
                          Aguardando importação
                          <br />
                          de dados
                        </p>
                      </div>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="col-span-full mt-2 border-t border-slate-100 pt-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-100" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 shrink-0">
                    Perfil e seleção
                  </p>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-100" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
                  <Card sx={chartCardSx}>
                    <CardContent className="p-4 md:p-5">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600">Oferta</p>
                      <h3 className="mb-0.5 text-sm font-bold text-slate-900 md:text-base">Seleção pública</h3>
                      <p className="mb-2 text-[11px] text-slate-500">Contemplados vs. fila de inscritos</p>
                      <ResponsiveContainer width="100%" height={LEAD_CHART_HEIGHT + 24}>
                        {ofertaDemandaPieData.length > 0 ? (
                          <PieChart>
                            <Pie
                              data={ofertaDemandaPieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={52}
                              outerRadius={76}
                              paddingAngle={2}
                              stroke="#fff"
                              strokeWidth={2}
                            >
                              {ofertaDemandaPieData.map((entry, i) => (
                                <Cell key={entry._id} fill={CHART_VIVID[i % CHART_VIVID.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip contentStyle={chartTooltipContentStyle} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} iconType="circle" iconSize={8} />
                          </PieChart>
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs font-medium text-slate-400">
                            Importe planilhas com inscritos e contemplados
                          </div>
                        )}
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card sx={chartCardSx}>
                    <CardContent className="p-4 md:p-5">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-fuchsia-600">Perfil</p>
                      <h3 className="mb-0.5 text-sm font-bold text-slate-900 md:text-base">Gênero declarado</h3>
                      <p className="mb-2 text-[11px] text-slate-500">Universo usado nos indicadores de diversidade</p>
                      <ResponsiveContainer width="100%" height={LEAD_CHART_HEIGHT + 24}>
                        {generoPieData.length > 0 ? (
                          <PieChart>
                            <Pie
                              data={generoPieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={52}
                              outerRadius={76}
                              paddingAngle={2}
                              stroke="#fff"
                              strokeWidth={2}
                            >
                              {generoPieData.map((entry, i) => (
                                <Cell key={entry._id} fill={CHART_VIVID[(i + 2) % CHART_VIVID.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip contentStyle={chartTooltipContentStyle} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} iconType="circle" iconSize={8} />
                          </PieChart>
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs font-medium text-slate-400">
                            Sem colunas de gênero classificáveis na base
                          </div>
                        )}
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card sx={chartCardSx}>
                    <CardContent className="p-4 md:p-5">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-600">Orçamento</p>
                      <h3 className="mb-0.5 text-sm font-bold text-slate-900 md:text-base">Investimento por edital</h3>
                      <p className="mb-2 text-[11px] text-slate-500">Top 5 + demais (valores contemplados)</p>
                      <ResponsiveContainer width="100%" height={LEAD_CHART_HEIGHT + 24}>
                        {editalValorPieData.length > 0 ? (
                          <PieChart>
                            <Pie
                              data={editalValorPieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={48}
                              outerRadius={76}
                              paddingAngle={1.5}
                              stroke="#fff"
                              strokeWidth={2}
                            >
                              {editalValorPieData.map((entry, i) => (
                                <Cell key={entry._id} fill={CHART_VIVID[(i + 1) % CHART_VIVID.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip contentStyle={chartTooltipContentStyle} formatter={(v: number) => formatBRL(v)} />
                            <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} iconType="circle" iconSize={7} />
                          </PieChart>
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs font-medium text-slate-400">
                            Sem breakdown de editais com valores
                          </div>
                        )}
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🆕 SEÇÃO: Breakdown por Edital - Demanda vs Oferta */}
      {resumoGlobal.breakdownEditais && resumoGlobal.breakdownEditais.length > 0 && (
        <section className="container mx-auto px-6 mb-16 max-w-7xl">
          <DashboardSectionHeader
            kicker="Demanda e oferta"
            title="Editais: inscritos e contemplados"
            description="Comparativo por edital com os mesmos totais do painel Admin — inclui planilhas importadas, ajustes manuais e linhas ocultas na vitrine."
          />

          <AdminImportCharts
            totalInscritos={resumoGlobal.totalInscritos}
            contemplados={resumoGlobal.totalProjetos}
            suplentes={0}
            naoContemplados={Math.max(0, resumoGlobal.totalInscritos - resumoGlobal.totalProjetos)}
            porEdital={resumoGlobal.breakdownEditais.map((ed: any) => ({
              chave: ed.chave,
              nome: ed.nome,
              total: ed.inscritos,
              contemplados: ed.contemplados,
              naoContemplados: Math.max(0, ed.inscritos - ed.contemplados),
              suplentes: 0,
            }))}
          />
          
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_8px_30px_-10px_rgba(15,23,42,0.1)] overflow-hidden ring-1 ring-slate-900/[0.03]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-4 font-black text-[#1b1b1f] uppercase tracking-wider text-xs">Edital</th>
                    <th className="text-center px-4 py-4 font-black text-[#1b1b1f] uppercase tracking-wider text-xs">Inscritos</th>
                    <th className="text-center px-4 py-4 font-black text-[#10b981] uppercase tracking-wider text-xs">Contemplados</th>
                    <th className="text-center px-4 py-4 font-black text-[#5f5f6a] uppercase tracking-wider text-xs" title="Taxa de contemplação = contemplados / inscritos">
                      Taxa de Contemplação
                    </th>
                    <th className="text-right px-6 py-4 font-black text-[#0b57d0] uppercase tracking-wider text-xs">Valor Investido</th>
                    <th className="text-center px-4 py-4 font-black text-[#5f5f6a] uppercase tracking-wider text-xs">Links</th>
                  </tr>
                </thead>
                <tbody>
                  {resumoGlobal.breakdownEditais.map((ed, idx) => (
                    <tr key={`edital-row-${(ed as { chave?: string }).chave ?? ed.nome}-${idx}`} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#1b1b1f]">{ed.nome}</td>
                      <td className="text-center px-4 py-4">
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full text-xs">
                          {ed.inscritos}
                        </span>
                      </td>
                      <td className="text-center px-4 py-4">
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-xs">
                          {ed.contemplados}
                        </span>
                      </td>
                      <td className="text-center px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full" 
                              style={{ width: `${ed.inscritos > 0 ? Math.round((ed.contemplados / ed.inscritos) * 100) : 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-[#5f5f6a]">
                            {ed.inscritos > 0 ? Math.round((ed.contemplados / ed.inscritos) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                      <td className="text-right px-6 py-4 font-black text-[#0b57d0]">{formatBRL(ed.valor)}</td>
                      <td className="text-center px-4 py-4">
                        {(() => {
                          const links = resolveEditalLinks(ed.nome, resumoGlobal.customEditalLinks);
                          return links ? (
                            <div className="flex flex-wrap justify-center gap-1">
                              {links.resultado && (
                                <a href={links.resultado} target="_blank" rel="noopener noreferrer" className="no-underline">
                                  <Chip label="📄 Resultado" size="small" clickable sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 600, fontSize: '0.65rem', height: 22, '&:hover': { bgcolor: '#bfdbfe' } }} />
                                </a>
                              )}
                              {links.resumo && (
                                <a href={links.resumo} target="_blank" rel="noopener noreferrer" className="no-underline">
                                  <Chip label="📊 Resumo" size="small" clickable sx={{ bgcolor: '#d1fae5', color: '#065f46', fontWeight: 600, fontSize: '0.65rem', height: 22, '&:hover': { bgcolor: '#a7f3d0' } }} />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td className="px-6 py-4 font-black text-[#1b1b1f] uppercase text-xs">Total Geral</td>
                    <td className="text-center px-4 py-4 font-black text-blue-800">{resumoGlobal.breakdownEditais.reduce((a, e) => a + e.inscritos, 0)}</td>
                    <td className="text-center px-4 py-4 font-black text-emerald-800">{resumoGlobal.breakdownEditais.reduce((a, e) => a + e.contemplados, 0)}</td>
                    <td className="text-center px-4 py-4 font-bold text-[#5f5f6a] text-xs">
                      {(() => { const ti = resumoGlobal.breakdownEditais.reduce((a, e) => a + e.inscritos, 0); const tc = resumoGlobal.breakdownEditais.reduce((a, e) => a + e.contemplados, 0); return ti > 0 ? Math.round((tc / ti) * 100) : 0; })()}%
                    </td>
                    <td className="text-right px-6 py-4 font-black text-[#0b57d0]">{formatBRL(resumoGlobal.breakdownEditais.reduce((a, e) => a + e.valor, 0))}</td>
                    <td className="text-center px-4 py-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <p className="mt-3 text-xs text-[#5f5f6a] italic">
            * Dados das planilhas importadas no painel Admin. Inscritos = propostas recebidas; contemplados = aprovadas ou selecionadas. A porcentagem é taxa de contemplação (não percentual de execução financeira). Para corrigir totais, links ou ocultar uma linha na página inicial, use o painel Admin.
          </p>
        </section>
      )}

      {/* 🆕 NOVA SEÇÃO: Indicadores de Diversidade e Inclusão */}
      {(resumoGlobal.totaisPublicos.totalInscritos > 0 || resumoGlobal.totalInscritos > 0) && (
        <section className="container mx-auto px-6 mb-16 max-w-7xl">
          <DashboardSectionHeader
            kicker="Inclusão e perfil"
            title="Indicadores de diversidade"
            description="Perfil agregado de agentes, grupos e espaços do cadastro cultural. Cor/raça (negros e pardos) e LGBTQIA+ são eixos diferentes: o primeiro usa só autodeclaração de cor ou raça; o segundo usa orientação sexual, identidade de gênero e gênero — sem misturar um no outro. O total de PcD prioriza colunas de deficiência ou PcD e evita “Sim” genérico de outras perguntas."
          />
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card sx={{ borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', height: '100%', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                      <Users className="text-white" size={20} />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-1">{resumoGlobal.mulheres}</h3>
                    <p className="text-white/80 text-xs font-semibold">Mulheres</p>
                    <Chip label={`${resumoGlobal.percMulheres}%`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, fontSize: '0.65rem', mt: 1 }} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card sx={{ borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', height: '100%', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                      <Users className="text-white" size={20} />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-1">{resumoGlobal.negros}</h3>
                    <p className="text-white/80 text-xs font-semibold">Cor / raça — pretos e pardos</p>
                    <Chip label={resumoGlobal.totalDiversidade > 0 ? `${Math.round((resumoGlobal.negros / resumoGlobal.totalDiversidade) * 100)}%` : '0%'} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, fontSize: '0.65rem', mt: 1 }} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card sx={{ borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', height: '100%', background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }}>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                      <Users className="text-white" size={20} />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-1">{resumoGlobal.lgbtqia}</h3>
                    <p className="text-white/80 text-xs font-semibold">LGBTQIA+ (cadastros únicos)</p>
                    <p className="text-white/70 text-[10px] leading-snug mt-0.5">
                      Orient.: {resumoGlobal.lgbtOrientacaoSexual} · Ident.: {resumoGlobal.lgbtIdentidadeGenero}
                    </p>
                    <Chip label={resumoGlobal.totalDiversidade > 0 ? `${Math.round((resumoGlobal.lgbtqia / resumoGlobal.totalDiversidade) * 100)}%` : '0%'} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, fontSize: '0.65rem', mt: 1 }} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card sx={{ borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', height: '100%', background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                      <Users className="text-white" size={20} />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-1">{resumoGlobal.jovens}</h3>
                    <p className="text-white/80 text-xs font-semibold">Jovens (até 29)</p>
                    <Chip label={resumoGlobal.totalDiversidade > 0 ? `${Math.round((resumoGlobal.jovens / resumoGlobal.totalDiversidade) * 100)}%` : '0%'} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, fontSize: '0.65rem', mt: 1 }} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card sx={{ borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', height: '100%', background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                      <Users className="text-white" size={20} />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-1">{resumoGlobal.pcd}</h3>
                    <p className="text-white/80 text-xs font-semibold">PcD</p>
                    <Chip label={resumoGlobal.totalDiversidade > 0 ? `${Math.round((resumoGlobal.pcd / resumoGlobal.totalDiversidade) * 100)}%` : '0%'} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, fontSize: '0.65rem', mt: 1 }} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Card sx={{ borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', height: '100%', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                      <MapPin className="text-white" size={20} />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-1">{resumoGlobal.comunidadesOficiais}</h3>
                    <p className="text-white/80 text-xs font-semibold">Comunidades Trad.</p>
                    <Chip label={`${resumoGlobal.trad} cadastro(s)`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, fontSize: '0.65rem', mt: 1 }} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <HomeDiversityCharts data={resumoGlobal.diversityCharts} chartUid={chartUid} />
          
          {/* 📝 Nota explicativa sobre dados de diversidade */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-900 font-medium">
              <strong>ℹ️ Nota:</strong> Os indicadores combinam <strong>agentes culturais</strong> (mapeamento) e <strong>proponentes de editais</strong>.
              <strong> Negros/pardos</strong> vêm apenas de cor/raça declarada. <strong>LGBTQIA+</strong> combina orientação sexual, identidade de gênero e gênero (cadastro único no total); nos gráficos, orientação e identidade aparecem em eixos separados, apartados do racial.
              Gênero, idade e deficiência dependem dos campos na planilha. <strong>Comunidades tradicionais</strong> seguem a mesma regra do painel <strong>Admin</strong> (vínculo identificável); &quot;Sim&quot; genérico sem comunidade não entra no total.
              {resumoGlobal.mulheres === 0 && resumoGlobal.negros === 0 && resumoGlobal.lgbtqia === 0 && (
                <span className="block mt-1 text-blue-700"> As planilhas importadas ainda não trazem gênero, cor/raça ou dados de orientação/identidade LGBTQIA+ de forma classificável.</span>
              )}
            </p>
          </div>
        </section>
      )}

      {/* Seção: Lei Aldir Blanc 2020 — visual moderno (gradiente, elevação, hierarquia) */}
      <section className="container mx-auto px-6 mb-16 font-sans">
        <Box
          sx={{
            fontFamily: 'inherit',
            '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiCard-root, & .MuiPaper-root': {
              fontFamily: 'inherit',
            },
          }}
        >
          <Card
            sx={{
              borderRadius: '28px',
              overflow: 'hidden',
              fontFamily: 'inherit',
              border: '1px solid rgba(227, 6, 19, 0.14)',
              boxShadow:
                '0 2px 6px rgba(227,6,19,0.06), 0 20px 56px rgba(15,23,42,0.09)',
              transition: 'box-shadow 0.3s ease',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(227,6,19,0.08), 0 28px 72px rgba(15,23,42,0.11)',
              },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                overflow: 'hidden',
                px: { xs: 2.5, md: 4 },
                py: { xs: 3, md: 3.75 },
                background:
                  'linear-gradient(125deg, rgba(227,6,19,0.11) 0%, rgba(255,255,255,1) 38%, rgba(11,87,208,0.07) 100%)',
                borderBottom: '1px solid rgba(15,23,42,0.06)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 5,
                  borderRadius: '0 6px 6px 0',
                  background: `linear-gradient(180deg, ${CORES_CADASTRO.aldir} 0%, #9f0510 100%)`,
                  zIndex: 1,
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  right: '-18%',
                  top: '-55%',
                  width: 'min(52vw, 420px)',
                  height: 'min(52vw, 420px)',
                  borderRadius: '50%',
                  background: `radial-gradient(circle at center, ${CORES_CADASTRO.aldir}22 0%, transparent 68%)`,
                  filter: 'blur(2px)',
                  pointerEvents: 'none',
                },
              }}
            >
              {/* Orbe decorativo (profundidade sem competir com o texto) */}
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  left: '8%',
                  bottom: '-40%',
                  width: 'min(40vw, 280px)',
                  height: 'min(40vw, 280px)',
                  borderRadius: '50%',
                  background: `radial-gradient(circle at center, ${CORES_CADASTRO.principal}18 0%, transparent 70%)`,
                  filter: 'blur(1px)',
                  pointerEvents: 'none',
                }}
              />
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'relative', zIndex: 2 }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'center' }}>
                  <motion.div
                    initial={{ scale: 0.88, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.06 }}
                    style={{ flexShrink: 0 }}
                  >
                    <motion.div
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(145deg, #E30613 0%, #ff5a5f 50%, #b5050f 100%)',
                      }}
                      animate={{
                        boxShadow: [
                          '0 12px 32px rgba(227,6,19,0.34)',
                          '0 18px 44px rgba(227,6,19,0.48)',
                          '0 12px 32px rgba(227,6,19,0.34)',
                        ],
                      }}
                      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Award size={30} color="#fff" strokeWidth={2} />
                    </motion.div>
                  </motion.div>
                  <Box sx={{ minWidth: 0 }}>
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.05 }}
                    >
                      <Chip
                        label="Lei Federal · emergência cultural"
                        size="small"
                        sx={{
                          mb: 1,
                          height: 26,
                          fontWeight: 800,
                          fontSize: '0.62rem',
                          letterSpacing: '0.07em',
                          borderRadius: '999px',
                          fontFamily: 'inherit',
                          bgcolor: 'rgba(227, 6, 19, 0.12)',
                          color: CORES_CADASTRO.aldir,
                          border: '1px solid rgba(227, 6, 19, 0.22)',
                          backdropFilter: 'blur(8px)',
                        }}
                      />
                    </motion.div>
                    <Typography
                      component="h2"
                      sx={{
                        fontFamily: 'inherit',
                        fontWeight: 900,
                        fontSize: { xs: '1.35rem', sm: '1.7rem' },
                        color: '#0f172a',
                        letterSpacing: '-0.025em',
                        lineHeight: 1.15,
                        textShadow: '0 1px 0 rgba(255,255,255,0.85)',
                      }}
                    >
                      Lei Emergencial Aldir Blanc
                    </Typography>
                    <Box
                      sx={{
                        mt: 0.75,
                        width: 72,
                        height: 4,
                        borderRadius: '999px',
                        background: `linear-gradient(90deg, ${CORES_CADASTRO.aldir} 0%, ${CORES_CADASTRO.principal} 100%)`,
                        opacity: 0.92,
                      }}
                    />
                    <Stack spacing={0.75} sx={{ mt: 1.25 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'inherit',
                          color: '#475569',
                          fontWeight: 700,
                          fontSize: { xs: '0.85rem', sm: '0.95rem' },
                          lineHeight: 1.45,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        Lei Federal nº 14.017/2020
                      </Typography>
                      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            bgcolor: 'rgba(100,116,139,0.35)',
                          }}
                        />
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{
                            fontFamily: 'inherit',
                            fontWeight: 800,
                            fontSize: { xs: '0.85rem', sm: '0.95rem' },
                            lineHeight: 1.45,
                            letterSpacing: '-0.02em',
                            backgroundImage: `linear-gradient(115deg, ${CORES_CADASTRO.aldir} 0%, #ff5a6d 42%, ${CORES_CADASTRO.principal} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          Primeiros editais em Ilhabela
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>
                </Stack>
              </motion.div>
            </Box>

            <CardContent sx={{ p: { xs: 3, md: 4.5 }, pt: { xs: 3, md: 4 }, bgcolor: '#ffffff', fontFamily: 'inherit' }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 2.5, md: 3.25 },
                      borderRadius: '20px',
                      border: '1px solid rgba(15,23,42,0.06)',
                      borderLeft: `4px solid ${CORES_CADASTRO.aldir}`,
                      bgcolor: 'rgba(248, 250, 252, 0.85)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 28px rgba(15,23,42,0.04)',
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: 'inherit',
                        fontSize: { xs: '1rem', sm: '1.0625rem' },
                        color: '#475569',
                        lineHeight: 1.75,
                        fontWeight: 500,
                      }}
                    >
                      <Box component="strong" sx={{ color: '#0f172a', fontWeight: 800 }}>
                        Seleção e premiação
                      </Box>{' '}
                      de pessoas que tenham prestado relevante contribuição ao desenvolvimento artístico e cultural do município Ilhabela – SP, que foram apoiados com recursos emergenciais da{' '}
                      <Box component="strong" sx={{ color: CORES_CADASTRO.aldir, fontWeight: 800 }}>
                        Lei Federal de Emergência Cultural Aldir Blanc nº 14.017/2020
                      </Box>
                      .
                    </Typography>
                  </Paper>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {EDITAIS_ALDIR_BLANC_2020.map((edital, idx) => (
                      <motion.div
                        key={`aldir-blanc-${edital.numero}-${idx}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                      >
                        <Card
                          sx={{
                            fontFamily: 'inherit',
                            borderRadius: '22px',
                            height: '100%',
                            overflow: 'hidden',
                            position: 'relative',
                            border: '1px solid rgba(15,23,42,0.07)',
                            bgcolor: '#fff',
                            boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
                            transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                            '&:hover': {
                              transform: 'translateY(-5px)',
                              boxShadow: '0 18px 44px rgba(15,23,42,0.1)',
                            },
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: 0,
                              height: 4,
                              background: `linear-gradient(90deg, ${edital.cor} 0%, ${edital.cor}99 55%, transparent 100%)`,
                            },
                          }}
                        >
                          <CardContent sx={{ p: 2.75, pt: 3.25 }}>
                            <Stack direction="row" spacing={2} alignItems="flex-start">
                              <Box
                                sx={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: '14px',
                                  flexShrink: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#fff',
                                  fontWeight: 900,
                                  fontSize: '0.9rem',
                                  fontFamily: 'inherit',
                                  background: `linear-gradient(145deg, ${edital.cor} 0%, ${edital.cor}cc 100%)`,
                                  boxShadow: `0 8px 20px ${edital.cor}55`,
                                }}
                              >
                                {edital.numero.split('/')[0]}
                              </Box>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Chip
                                  label={`Chamada ${edital.chamada}`}
                                  size="small"
                                  sx={{
                                    height: 22,
                                    mb: 0.75,
                                    fontWeight: 800,
                                    fontSize: '0.62rem',
                                    letterSpacing: '0.06em',
                                    borderRadius: '8px',
                                    fontFamily: 'inherit',
                                    bgcolor: 'rgba(15,23,42,0.06)',
                                    color: '#475569',
                                  }}
                                />
                                <Typography
                                  sx={{
                                    fontFamily: 'inherit',
                                    fontWeight: 800,
                                    fontSize: '0.95rem',
                                    color: '#0f172a',
                                    letterSpacing: '0.02em',
                                    mb: 0.5,
                                  }}
                                >
                                  EDITAL Nº {edital.numero}
                                </Typography>
                                <Typography variant="caption" sx={{ fontFamily: 'inherit', color: '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>
                                  {edital.tipo}
                                </Typography>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <Stack spacing={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: '22px',
                      border: '1px solid rgba(15,23,42,0.06)',
                      bgcolor: 'rgba(248, 250, 252, 0.92)',
                      boxShadow: '0 8px 28px rgba(15,23,42,0.05)',
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2.5 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'rgba(11, 87, 208, 0.1)',
                        }}
                      >
                        <ShieldCheck size={22} className="text-[#0b57d0]" />
                      </Box>
                      <Typography sx={{ fontFamily: 'inherit', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                        Sobre a lei
                      </Typography>
                    </Stack>
                    <Stack spacing={1.75}>
                      {[
                        'Lei Federal nº 14.017/2020',
                        'Decreto Municipal nº 8280/2020',
                        'Decretos Federais: nº 10.464 e 10.489',
                        'Parceria com Conselho de Cultura',
                      ].map((line) => (
                        <Stack key={line} direction="row" spacing={1.25} alignItems="flex-start">
                          <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                          <Typography sx={{ fontFamily: 'inherit', fontSize: '0.875rem', color: '#475569', fontWeight: 600, lineHeight: 1.45 }}>
                            {line}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: '22px',
                      border: '1px solid rgba(11, 87, 208, 0.18)',
                      background: 'linear-gradient(165deg, rgba(239,246,255,0.95) 0%, rgba(255,255,255,0.98) 55%, rgba(219,234,254,0.35) 100%)',
                      boxShadow: '0 10px 36px rgba(11,87,208,0.08)',
                    }}
                  >
                    <Typography sx={{ fontFamily: 'inherit', fontWeight: 800, fontSize: '1.05rem', color: '#0b57d0', mb: 1 }}>
                      Resultados oficiais
                    </Typography>
                    <Typography sx={{ fontFamily: 'inherit', fontSize: '0.875rem', color: '#64748b', fontWeight: 600, mb: 2.5, lineHeight: 1.5 }}>
                      Confira a lista completa de contemplados nos editais de 2020.
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => window.open('https://cadastrocultural.com.br/editais/', '_blank')}
                      endIcon={<ArrowRight size={18} />}
                      sx={{
                        fontFamily: 'inherit',
                        fontWeight: 800,
                        textTransform: 'none',
                        borderRadius: '999px',
                        py: 1.35,
                        fontSize: '0.9rem',
                        background: 'linear-gradient(135deg, #0b57d0 0%, #1967d2 45%, #1557b0 100%)',
                        boxShadow: '0 4px 14px rgba(11,87,208,0.35)',
                        '&:hover': {
                          boxShadow: '0 8px 24px rgba(11,87,208,0.42)',
                          background: 'linear-gradient(135deg, #174ea6 0%, #0b57d0 100%)',
                        },
                      }}
                    >
                      Acessar resultados
                    </Button>
                  </Paper>
                </Stack>
              </div>
            </CardContent>
          </Card>
        </Box>
      </section>

      {/* Gráficos de Dados Culturais */}
      <section className="container mx-auto px-6 mb-16 max-w-7xl">
        <DashboardSectionHeader
          kicker="Painel público"
          title="Território e investimento (detalhe)"
          description="Mapa de Ilhabela (OpenStreetMap), distribuição por bairro e investimento anual — cartões no estilo de dashboards analíticos corporativos."
        />

        <div className="mt-4 space-y-5 md:space-y-6">
          <InciclePanel
            kicker="Mapa"
            title="Ilhabela no território"
            subtitle="Círculos proporcionais à quantidade de registros por bairro (somente onde há coordenadas na base de bairros)."
            contentMinHeight={0}
          >
            <IlhabelaTerritoryMap bairros={distribuicaoPorBairro} height={320} />
          </InciclePanel>

          <div className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-2">
            <InciclePanel
              kicker="Território"
              title="Distribuição geográfica"
              subtitle={`Cadastro, mapeamento e proponentes com bairro identificável — ${distribuicaoPorBairro.length} localidade${distribuicaoPorBairro.length === 1 ? '' : 's'} (ordenadas por quantidade).`}
              contentMinHeight={bairrosChartHeight}
            >
              <div className="rounded-xl border border-slate-100/90 bg-slate-50/40">
                <ResponsiveContainer width="100%" height={bairrosChartHeight} debounce={32}>
                  {distribuicaoPorBairro.length > 0 ? (
                    <BarChart key="bairro-bar-chart" data={bairrosComIds} layout="horizontal" syncId="bairroBar" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                      <defs>
                        <linearGradient id={`homeGradBairro-${chartUid}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={CORES_CADASTRO.principal} stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.9} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
                      <XAxis
                        type="number"
                        domain={[0, (max: number) => Math.max(Number(max) || 0, 1)]}
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="nome"
                        tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        width={bairrosYAxisWidth}
                      />
                      <RechartsTooltip contentStyle={chartTooltipContentStyle} cursor={{ fill: 'rgba(11, 87, 208, 0.05)' }} />
                      <Bar
                        dataKey="qtd"
                        fill={`url(#homeGradBairro-${chartUid})`}
                        radius={[0, 8, 8, 0]}
                        maxBarSize={22}
                        minPointSize={4}
                        name="Registros"
                        isAnimationActive={false}
                      />
                    </BarChart>
                  ) : (
                    <div className="flex items-center justify-center h-[280px]">
                      <p className="text-slate-300 text-xs text-center font-medium">Aguardando importação de dados</p>
                    </div>
                  )}
                </ResponsiveContainer>
              </div>
            </InciclePanel>

            <InciclePanel kicker="Orçamento" title="Investimento anual" subtitle="Total de recursos públicos contemplados por ano (dados importados)." contentMinHeight={300}>
              <ResponsiveContainer width="100%" height={280}>
                {evolucaoInvestimentoCharts.length > 0 ? (
                  <BarChart key="evolucao-bar-chart" data={evolucaoComIds} syncId="evolucaoBar" margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id={`homeGradEvolBar-${chartUid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CORES_CADASTRO.secundario} stopOpacity={1} />
                        <stop offset="100%" stopColor={CORES_CADASTRO.principal} stopOpacity={0.88} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="ano" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${value / 1000}k`}
                      width={48}
                    />
                    <RechartsTooltip
                      contentStyle={chartTooltipContentStyle}
                      formatter={(value: any) => formatBRL(value)}
                      cursor={{ fill: 'rgba(11, 87, 208, 0.06)' }}
                    />
                    <Bar dataKey="valor" fill={`url(#homeGradEvolBar-${chartUid})`} radius={[10, 10, 0, 0]} maxBarSize={56} name="Investimento" />
                  </BarChart>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-300 text-xs text-center font-medium">Aguardando importação de dados</p>
                  </div>
                )}
              </ResponsiveContainer>
            </InciclePanel>
          </div>
        </div>
      </section>

      {/* Todos os Editais - Dados Reais (UI inspirada em botões/cartões Material Design) */}
      {resumoGlobal.breakdownEditais && resumoGlobal.breakdownEditais.length > 0 && (
        <section className="container mx-auto px-6 mb-16 font-sans">
          <Box
            sx={{
              fontFamily: 'inherit',
              '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiCard-root, & .MuiPaper-root': {
                fontFamily: 'inherit',
              },
            }}
          >
          <Box sx={{ mb: 4, maxWidth: 720 }}>
            <Chip
              label="Chamadas públicas"
              size="small"
              sx={{
                mb: 1.5,
                fontWeight: 800,
                letterSpacing: '0.06em',
                fontSize: '0.65rem',
                height: 28,
                borderRadius: '999px',
                bgcolor: 'rgba(11, 87, 208, 0.08)',
                color: '#0b57d0',
                border: '1px solid rgba(11, 87, 208, 0.18)',
                fontFamily: 'inherit',
              }}
            />
            <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
              <FileText className="text-[#0b57d0]" size={28} strokeWidth={2} />
              <Typography component="h2" sx={{ fontFamily: 'inherit', fontWeight: 900, fontSize: { xs: '1.5rem', sm: '1.75rem' }, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Editais e chamadas públicas
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ fontFamily: 'inherit', mt: 1, color: '#64748b', fontWeight: 500, maxWidth: 560 }}>
              Acesse resultados e resumos oficiais. Estilo de ações em destaque (filled / outlined), alinhado a padrões de interface Material.
            </Typography>
          </Box>

          <Card sx={{ borderRadius: '24px', border: '1px solid rgba(15, 23, 42, 0.07)', boxShadow: '0 10px 30px rgba(15,23,42,0.06)' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 }, fontFamily: 'inherit' }}>
              <div className="h-[360px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={resumoGlobal.breakdownEditais.map((ed) => ({
                      ...ed,
                      nomeCurto: ed.nome.length > 30 ? `${ed.nome.slice(0, 29)}…` : ed.nome,
                    }))}
                    margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                    <XAxis
                      dataKey="nomeCurto"
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-16}
                      textAnchor="end"
                      height={74}
                    />
                    <YAxis
                      yAxisId="qtd"
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={36}
                    />
                    <YAxis
                      yAxisId="valor"
                      orientation="right"
                      tick={{ fontSize: 10, fill: '#0b57d0', fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                      width={58}
                    />
                    <RechartsTooltip
                      contentStyle={chartTooltipContentStyle}
                      labelFormatter={(_, payload: any) => String(payload?.[0]?.payload?.nome || '')}
                      formatter={(value: number, name: string) => {
                        if (name === 'Valor Investido') return formatBRL(value);
                        return value;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 8 }} iconType="circle" iconSize={8} />
                    <Bar yAxisId="qtd" dataKey="inscritos" name="Inscritos" fill="#94a3b8" radius={[8, 8, 0, 0]} maxBarSize={26} />
                    <Bar yAxisId="qtd" dataKey="contemplados" name="Contemplados" fill="#16a34a" radius={[8, 8, 0, 0]} maxBarSize={26} />
                    <Line
                      yAxisId="valor"
                      type="monotone"
                      dataKey="valor"
                      name="Valor Investido"
                      stroke="#0b57d0"
                      strokeWidth={2.2}
                      dot={{ r: 3, fill: '#0b57d0', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#0b57d0', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {resumoGlobal.breakdownEditais.map((edital) => {
                  const links = resolveEditalLinks(edital.nome, resumoGlobal.customEditalLinks);
                  if (!links || (!links.resultado && !links.resumo && !links.diarioOficial)) return null;
                  return (
                    <div key={`links-compact-${edital.nome}`} className="rounded-xl border border-slate-100 bg-slate-50/75 p-3">
                      <p className="mb-2 text-xs font-black text-[#0b57d0]">{edital.nome}</p>
                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        {links.resultado && (
                          <Button
                            component="a"
                            href={links.resultado}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                            size="small"
                            startIcon={<FileText size={14} />}
                            sx={{ textTransform: 'none', borderRadius: '999px', fontWeight: 700 }}
                          >
                            Resultado
                          </Button>
                        )}
                        {links.resumo && (
                          <Button
                            component="a"
                            href={links.resumo}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                            size="small"
                            startIcon={<BarChart3 size={14} />}
                            sx={{ textTransform: 'none', borderRadius: '999px', fontWeight: 700 }}
                          >
                            Resumo
                          </Button>
                        )}
                        {links.diarioOficial && (
                          <Button
                            component="a"
                            href={links.diarioOficial}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="text"
                            size="small"
                            startIcon={<ScrollText size={14} />}
                            sx={{ textTransform: 'none', borderRadius: '999px', fontWeight: 700 }}
                          >
                            Diário Oficial
                          </Button>
                        )}
                      </Stack>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          </Box>
        </section>
      )}

      {/* Timeline de Editais */}
      <section className="container mx-auto px-6 mb-16">
        <Card sx={{ borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
          <CardContent className="p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Calendar className="text-[#0b57d0]" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#1b1b1f]">Linha do Tempo</h3>
                <p className="text-[#5f5f6a] text-sm">Histórico de editais</p>
              </div>
            </div>
            <Timeline />
          </CardContent>
        </Card>
      </section>

      {/* CTA Final */}
      <section className="container mx-auto px-6">
        <div className="bg-gradient-to-br from-[#f8fafc] to-[#eef6ff] border border-[#dbe7ff] rounded-[32px] p-12 md:p-16 text-center relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-[#1b1b1f] mb-6">
              Transparência e Cultura
            </h2>
            <p className="text-[#4b5563] text-lg mb-8 leading-relaxed">
              O Sistema Municipal de Informações e Indicadores Culturais é uma ferramenta viva para o fortalecimento das políticas públicas de cultura em Ilhabela.
            </p>
            <Button 
              onClick={() => onNavigate('transparencia')}
              variant="contained" 
              size="large"
              sx={{ 
                bgcolor: '#FFC857', 
                color: '#1b1b1f', 
                fontWeight: 800, 
                borderRadius: '50px', 
                textTransform: 'none', 
                px: 6, 
                py: 2,
                fontSize: '1.1rem',
                '&:hover': { bgcolor: '#e0b04c' }
              }}
            >
              Portal da Transparência
            </Button>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-35 animate-blob"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-35 animate-blob animation-delay-2000"></div>
        </div>
      </section>
    </div>
  );
}