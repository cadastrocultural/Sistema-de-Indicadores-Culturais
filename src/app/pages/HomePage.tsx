import React, { useMemo, useState, useEffect, useId, useCallback, useRef } from 'react';
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
  ResponsiveContainer, Line, Legend, Area, ComposedChart, PieChart, Pie, Cell, LabelList,
} from 'recharts';

import { formatBRL, COMUNIDADES_TRADICIONAIS } from '../data/pnab-data';
import { useSuppressRechartsWarning } from '../hooks/useSuppressRechartsWarning';
import { findEditalLinks as resolveEditalLinks } from './admin/editalUtils';
import {
  computeDemandaOfertaPorEdital,
  getEditalNomeExibicaoProjeto,
  getProjetoValorNormalizado,
  isProjetoContempladoParaEstatistica,
  normalizeProjetosOnParsed,
  OFFICIAL_ALDIR_BLANC_2020_VALUES,
  normalizeFullPersonNameForRanking,
  withOfficialAldirBlanc2020Context,
} from './admin/projetosDemandaOferta';
import { buildCadastroUnionRows, cadastroChaveDedupe, computeEstatisticasPublicas } from '../data/estatisticas-publicas';
import { IlhabelaTerritoryMap } from '../components/maps/IlhabelaTerritoryMap';
import StoreLocatorMap from '../components/maps/StoreLocatorMap';
import { InciclePanel } from '../components/dashboard/InciclePanel';
import { resolveComunidadeTradicional } from './admin/comunidadeTradicionalUtils';

import { parseBRLValue } from '../data/editais-data';
import { DADOS_ESTATICOS } from '../data/dados-estaticos';
import { canonicalBairroIlhabela, getBairroCoords, looksLikeEnderecoCompleto } from '../data/bairros-coords';
import { Timeline } from '../components/Timeline';
import { AdminImportCharts } from '../components/admin/AdminImportCharts';
import { HomeDiversityCharts, type DiversityChartsPayload } from '../components/HomeDiversityCharts';
import {
  extractPcdColumnValue as extractPcdColumnValueShared,
  findFieldValue,
  isPcdDeclaracaoPositiva as isPcdDeclaracaoPositivaShared,
} from '../utils/dashboardDiversityFields';
import { loadHeroBackgroundVideoUrls } from '../data/hero-videos';

// Helper: adiciona IDs únicos a arrays de dados para evitar warnings de keys duplicadas no Recharts
const addUniqueIds = <T extends Record<string, any>>(arr: T[], prefix = 'item'): T[] => {
  return arr.map((item, idx) => ({ ...item, _chartId: `${prefix}-${idx}-${Math.random().toString(36).substr(2, 9)}` }));
};

interface HomePageProps {
  onNavigate: (page: string) => void;
}

// Cores do Cadastro Cultural de Ilhabela - ATUALIZADO (Azul Institucional / Ocean)
const CORES_CADASTRO = {
  principal: '#00A38C',
  secundario: '#2ED6A3',
  destaque: '#FFC857',      // Amarelo (Mantido para contraste)
  aldir: '#00A38C',         // Verde institucional da paleta atual
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

const diversityStatCardSx = (gradient: string) => ({
  borderRadius: '20px',
  boxShadow: '0 10px 30px -14px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.24)',
  height: '100%',
  background: gradient,
  overflow: 'hidden',
  position: 'relative',
  transition: 'transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s',
  '&:before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.18), transparent 52%)',
    pointerEvents: 'none',
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 18px 44px -18px rgba(15,23,42,0.38), inset 0 1px 0 rgba(255,255,255,0.28)',
  },
} as const);

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

const formatCompactBRL = (value: unknown) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);

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
    <div className="mb-6 flex max-w-4xl gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06),0_16px_40px_-28px_rgba(15,23,42,0.12)] md:mb-8 md:gap-5 md:p-5">
      <div
        className="hidden w-1 shrink-0 rounded-full bg-gradient-to-b from-teal-600 via-slate-400 to-slate-200 sm:block sm:min-h-[4.75rem]"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="ds-dash-kicker mb-2 inline-flex rounded-md border border-teal-100 bg-teal-50/90 px-2.5 py-1 text-teal-800">{kicker}</p>
        <h2 className="ds-dash-section-title mb-2">{title}</h2>
        <p className="text-sm font-normal leading-relaxed text-slate-600 md:text-[0.9375rem]">{description}</p>
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
      className="flex h-full min-h-[150px] flex-col"
      style={{
        minWidth: 0,
        borderRadius: '20px',
        background: `linear-gradient(145deg, ${borderColor} 0%, ${borderColor} 54%, rgba(15,23,42,0.24) 100%)`,
        padding: '16px 18px 18px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 10px 28px -14px ${borderColor}, 0 1px 4px rgba(0,0,0,0.12)`,
        transition: 'transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 18px 40px -18px ${borderColor}, 0 2px 8px rgba(0,0,0,0.15)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 10px 28px -14px ${borderColor}, 0 1px 4px rgba(0,0,0,0.12)`;
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
      {/* Value — monoespaçado herdado nos filhos (KPIs grandes) */}
      <div className="flex-1 text-white [&_p]:m-0 [&_p]:font-mono [&_p]:font-semibold [&_p]:tabular-nums [&_p]:tracking-tight" style={{ minWidth: 0 }}>
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
  const [heroVideoIndex, setHeroVideoIndex] = useState(0);
  const [activeHeroSlot, setActiveHeroSlot] = useState(0);
  const [heroSlotSources, setHeroSlotSources] = useState<[string, string]>(['', '']);
  const [failedHeroVideos, setFailedHeroVideos] = useState<Set<string>>(() => new Set());
  const heroVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [heroVideoBaseUrls, setHeroVideoBaseUrls] = useState<string[]>([]);
  const [serverPayload, setServerPayload] = useState<Record<string, any> | null>(null);
  /** Evita mostrar o fallback estático (~76 linhas) antes do `load-data` quando não há cache local. */
  const [remoteDataAttemptDone, setRemoteDataAttemptDone] = useState(false);
  const availableHeroVideos = useMemo(
    () => heroVideoBaseUrls.filter((url) => !failedHeroVideos.has(url)),
    [heroVideoBaseUrls, failedHeroVideos]
  );
  const heroVideosKey = useMemo(() => availableHeroVideos.join('|'), [availableHeroVideos]);

  
  useEffect(() => {
    let cancelled = false;
    void loadHeroBackgroundVideoUrls().then((urls) => {
      if (!cancelled) setHeroVideoBaseUrls(urls);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    if (availableHeroVideos.length > 0 && heroVideoIndex >= availableHeroVideos.length) {
      setHeroVideoIndex(0);
    }
  }, [availableHeroVideos.length, heroVideoIndex]);

  useEffect(() => {
    if (availableHeroVideos.length === 0) {
      setHeroSlotSources(['', '']);
      return;
    }

    setHeroVideoIndex(0);
    setActiveHeroSlot(0);
    setHeroSlotSources([
      availableHeroVideos[0],
      availableHeroVideos.length > 1 ? availableHeroVideos[1] : availableHeroVideos[0],
    ]);
  }, [heroVideosKey, availableHeroVideos]);

  const playHeroVideoSlot = useCallback((slot: number) => {
    window.requestAnimationFrame(() => {
      const video = heroVideoRefs.current[slot];
      if (!video) return;
      video.currentTime = video.ended ? 0 : video.currentTime;
      const playPromise = video.play();
      if (playPromise) playPromise.catch(() => undefined);
    });
  }, []);

  const advanceHeroVideo = useCallback(() => {
    if (availableHeroVideos.length === 0) return;

    if (availableHeroVideos.length === 1) {
      const video = heroVideoRefs.current[activeHeroSlot];
      if (video) {
        video.currentTime = 0;
        const playPromise = video.play();
        if (playPromise) playPromise.catch(() => undefined);
      }
      return;
    }

    const nextIndex = (heroVideoIndex + 1) % availableHeroVideos.length;
    const nextSlot = activeHeroSlot === 0 ? 1 : 0;
    const slotToPreload = activeHeroSlot;
    const followingIndex = (nextIndex + 1) % availableHeroVideos.length;

    setHeroVideoIndex(nextIndex);
    setActiveHeroSlot(nextSlot);
    playHeroVideoSlot(nextSlot);

    window.setTimeout(() => {
      setHeroSlotSources((prev) => {
        const next: [string, string] = [...prev] as [string, string];
        next[slotToPreload] = availableHeroVideos[followingIndex];
        return next;
      });
    }, 120);
  }, [activeHeroSlot, availableHeroVideos, heroVideoIndex, playHeroVideoSlot]);

  // Mesma fonte do Dashboard/Admin: servidor primeiro, depois cache no localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { projectId, publicAnonKey } = await import('../../lib/supabaseProjectInfo');
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
          setServerPayload(normalized);
          try {
            localStorage.setItem('editais_imported_data', JSON.stringify(normalized));
          } catch {
            /* quota ou modo privado restrito */
          }
          setRefreshKey((k) => k + 1);
        }
      } catch {
        /* offline ou função indisponível — permanece o que já estiver no localStorage */
      } finally {
        if (!cancelled) setRemoteDataAttemptDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * KPIs do hero e mapa: aguardam o primeiro `load-data` (sucesso ou falha no `finally`).
   * Se dependêssemos só da ausência de localStorage, um cache antigo/parcial mostrava totais errados
   * (ex.: ~76) e depois saltava para os dados do servidor (~965).
   */
  /** Sem `isMounted`: no primeiro frame já evita cache local (~76) antes do `load-data` (~965). */
  const showCadastroLoadingShell = !remoteDataAttemptDone;

  const resumoGlobal = useMemo(() => {
    // Carrega dados importados do localStorage
    const loadedData = serverPayload ? '' : localStorage.getItem('editais_imported_data');
    let parsed: Record<string, any> | null = null;
    let agentesImportados: any[] = [];
    let gruposImportados: any[] = [];
    let espacosImportados: any[] = [];
    let editaisImportados: any[] = [];
    let usandoDadosReais = false;
    let customEditalLinks: Record<string, { resultado?: string; resumo?: string; diarioOficial?: string }> = {};
    let editalResumoOverrides: Record<string, unknown> = {};
    let demandaOfertaExcluidosHome: string[] = [];
    
    if (serverPayload) {
      parsed = normalizeProjetosOnParsed(serverPayload) as Record<string, any>;
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
    } else if (loadedData) {
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
          console.warn('⚠️ NENHUM AGENTE IMPORTADO! Usando dados estáticos embutidos.');
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

    /** Planilha “Mapeamento” no Admin; senão base WordPress embutida (DADOS_ESTATICOS.mapeamento). */
    let mForUnion =
      parsed && Array.isArray(parsed.mapeamento) && parsed.mapeamento.length > 0 ? parsed.mapeamento : [];
    if (
      mForUnion.length === 0 &&
      Array.isArray(DADOS_ESTATICOS.mapeamento) &&
      DADOS_ESTATICOS.mapeamento.length > 0
    ) {
      mForUnion = DADOS_ESTATICOS.mapeamento as any[];
    }

    const unionCadastro = buildCadastroUnionRows(mForUnion, agentesFinais, gruposImportados, espacosImportados);
    const inscricoesTotais = unionCadastro.length;
    
    /** Mesma lógica do painel Admin: edital+ano, overrides e exclusões da vitrine "Demanda vs Oferta". */
    const porEditalAll = computeDemandaOfertaPorEdital(editaisFinais, editalResumoOverrides as any);
    const breakdownEditais: { chave: string; nome: string; ano: string; inscritos: number; contemplados: number; valor: number }[] = porEditalAll
      .filter(r => !demandaOfertaExcluidosHome.includes(r.chave))
      .map(r => ({
        chave: r.chave,
        nome: r.nome,
        ano: String(r.ano || ''),
        inscritos: r.inscritos,
        contemplados: r.contemplados,
        valor: r.valorInvestido,
      }));

    const upsertOfficialAldir2020 = (
      tipo: 'agentes' | 'grupos' | 'espacos',
      sourceRows: any[],
      matcher: (text: string) => boolean
    ) => {
      const official = OFFICIAL_ALDIR_BLANC_2020_VALUES[tipo];
      if (!sourceRows.length && !breakdownEditais.some((ed) => matcher(normalizeLooseKey(`${ed.nome} ${ed.chave}`)))) return;
      const existing = breakdownEditais.find((ed) => matcher(normalizeLooseKey(`${ed.nome} ${ed.chave}`)));
      const row = {
        chave: official.chave,
        nome: official.nome,
        ano: String(official.ano),
        inscritos: existing?.inscritos && existing.inscritos > 0 ? existing.inscritos : sourceRows.length || official.contemplados,
        contemplados: official.contemplados,
        valor: official.valorInvestido,
      };
      if (existing) Object.assign(existing, row);
      else breakdownEditais.push(row);
    };

    upsertOfficialAldir2020('agentes', agentesFinais, (text) => text.includes('agentes culturais') || text.includes('premiacao de agentes'));
    upsertOfficialAldir2020('grupos', gruposImportados, (text) => text.includes('grupos') || text.includes('coletivos'));
    upsertOfficialAldir2020('espacos', espacosImportados, (text) => text.includes('espacos') || text.includes('espaco cultural'));

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
    for (const row of unionCadastro.map((u) => u.row)) {
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
          (kn.includes('condicao') && kn.includes('civil')) ||
          (kn.includes('status') && kn.includes('civil')) ||
          (kn.includes('relacionamento') && !kn.includes('projeto')) ||
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
      if (v.includes('solteir') || v === 'single') return 'Solteiro(a)';
      if (v.includes('casad')) return 'Casado(a)';
      if (v.includes('divorci') || v.includes('desquit')) return 'Divorciado(a)';
      if (v.includes('viuv')) return 'Viúvo(a)';
      if (v.includes('separad')) return 'Separado(a)';
      if (v.includes('uniao estavel') || v.includes('união estavel') || v.includes('companheir')) return 'União estável';
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
      if (v.includes('sem renda') || v.includes('nao possui renda') || v.includes('não possui renda')) return 'Sem renda declarada';
      if (
        v.includes('ate 1 salario') ||
        v.includes('até 1 salario') ||
        v.includes('ate um salario') ||
        v.includes('menos de 1 salario') ||
        v.includes('meio salario') ||
        v.includes('1 sm') ||
        v.includes('1 s.m')
      ) return 'Até 1 salário mínimo';
      if (v.includes('1 a 3 salario') || v.includes('de 1 a 3 salario') || v.includes('1 e 3 salario') || v.includes('1 a 2 salario')) return 'De 1 a 3 salários mínimos';
      if (v.includes('3 a 5 salario') || v.includes('de 3 a 5 salario') || v.includes('3 e 5 salario')) return 'De 3 a 5 salários mínimos';
      if (v.includes('acima de 5 salario') || v.includes('mais de 5 salario') || v.includes('superior a 5 salario')) return 'Acima de 5 salários mínimos';

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
          kn.includes('ganho') ||
          kn.includes('ganhos') ||
          kn.includes('faixaeconomica') ||
          kn.includes('vulnerabilidade') ||
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
        const compact = kn.replace(/[^a-z0-9]/g, '');
        if (
          kn.includes('experiencia') ||
          kn.includes('experiência') ||
          (kn.includes('tempo') && kn.includes('atuacao')) ||
          (kn.includes('tempo') && kn.includes('cultura')) ||
          kn.includes('anosdeatuacao') ||
          compact.includes('anosdeatuacao') ||
          compact.includes('tempodeatuacao') ||
          compact.includes('desdequandoatua') ||
          compact.includes('inicioatividade') ||
          compact.includes('anoinicio') ||
          compact.includes('anodeinicio') ||
          compact.includes('anofundacao') ||
          kn.includes('carreira') ||
          kn.includes('trajetoria') ||
          kn.includes('trajetória')
        ) {
          const raw = String(v || '').trim();
          if (raw && raw.length <= 80) return raw;
        }
      }
      return '';
    };

    const normalizarExperienciaCultural = (raw: string): string => {
      const txt = String(raw || '').replace(/\s+/g, ' ').trim();
      if (!txt || txt.length > 80) return '';
      const n = normalizeLooseKey(txt);
      if (!n || n === 'nao informado' || n === 'nao se aplica' || n === '-') return '';

      const yearMatch = n.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
      if (yearMatch) {
        const anos = new Date().getFullYear() - Number(yearMatch[1]);
        if (anos >= 0 && anos <= 80) {
          if (anos <= 2) return 'Até 2 anos';
          if (anos <= 5) return '3 a 5 anos';
          if (anos <= 10) return '6 a 10 anos';
          if (anos <= 20) return '11 a 20 anos';
          return 'Mais de 20 anos';
        }
      }

      const numberMatch = n.match(/\b(\d{1,2})\s*(anos?|ano|a)\b/) || n.match(/\b(\d{1,2})\b/);
      if (numberMatch) {
        const anos = Number(numberMatch[1]);
        if (Number.isFinite(anos) && anos >= 0 && anos <= 80) {
          if (anos <= 2) return 'Até 2 anos';
          if (anos <= 5) return '3 a 5 anos';
          if (anos <= 10) return '6 a 10 anos';
          if (anos <= 20) return '11 a 20 anos';
          return 'Mais de 20 anos';
        }
      }

      if (n.includes('iniciante') || n.includes('inicio') || n.includes('menos de 1') || n.includes('ate 2') || n.includes('até 2') || n.includes('0 a 2')) return 'Até 2 anos';
      if (n.includes('mais de 20') || n.includes('acima de 20')) return 'Mais de 20 anos';
      if (n.includes('mais de 10') || n.includes('acima de 10')) return '11 a 20 anos';
      if (n.includes('5 a 10') || n.includes('6 a 10') || n.includes('ate 10') || n.includes('até 10')) return '6 a 10 anos';
      if (n.includes('3 a 5') || n.includes('2 a 5') || n.includes('ate 5') || n.includes('até 5')) return '3 a 5 anos';

      return txt.length > 32 ? `${txt.slice(0, 29)}…` : txt;
    };
    
    // 🎯 Indicadores de diversidade: cadastro cultural (união) + cada linha importada nos editais/projetos
    // (percentuais e o gráfico de cor/raça usam esse universo completo dos dados enviados).
    const todosParaDiversidade = unionCadastro.map((u) => u.row);
    const linhasDiversidadeCompleto = [...todosParaDiversidade, ...editaisFinais];
    const baseParaPercentual = linhasDiversidadeCompleto.length || 1;
    
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

    const tradCadastroBase = linhasDiversidadeCompleto.filter((a: any) => {
      const isProj = Boolean(
        (a as any).nomeProjeto || (a as any).projeto || (a as any)._editalOrigem || (a as any).edital
      );
      return ehComunidadeTradicionalRegistro(a, { includeNomeProjeto: isProj });
    }).length;
    const trad = tradCadastroBase;
    const percTrad = baseParaPercentual > 0 ? Math.round((trad / baseParaPercentual) * 100) : 0;
    
    const negros = linhasDiversidadeCompleto.filter((a: any) => {
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
      const direto = findFieldValue(
        row,
        'identidade_genero',
        'Identidade de gênero',
        'Identidade de genero',
        'Identidade Genero',
        'identidade de genero',
        'genero_identidade',
        'gênero identidade',
        'autoidentificacao_genero',
        'autoidentificação de gênero'
      ).trim();
      if (direto) return direto;
      for (const [k, v] of Object.entries(row || {})) {
        const kn = normalizeLooseKey(String(k || '')).replace(/[^a-z0-9]/g, '');
        const looksLikeIdentityKey =
          (kn.includes('identidade') && kn.includes('genero')) ||
          (kn.includes('autoidentificacao') && kn.includes('genero')) ||
          kn.includes('generoidentidade');
        if (!looksLikeIdentityKey) continue;
        const raw = String(v || '').trim();
        if (raw && raw.length <= 80) return raw;
      }
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

    const lgbtOrientacaoSexual = linhasDiversidadeCompleto.filter((a: any) => lgbtAxesFrom(a).isLgbtOrientacao).length;
    /** Identidade/gênero LGBTQIA+: eixo independente do eixo de orientação sexual. */
    const lgbtIdentidadeGenero = linhasDiversidadeCompleto.filter((a: any) => {
      const f = lgbtAxesFrom(a);
      return f.isLgbtIdGenero || f.isLgbtGenero;
    }).length;
    const lgbtqia = linhasDiversidadeCompleto.filter((a: any) => {
      const f = lgbtAxesFrom(a);
      return f.isLgbtOrientacao || f.isLgbtIdGenero || f.isLgbtGenero;
    }).length;
    
    const mulheres = linhasDiversidadeCompleto.filter((a: any) => {
      const genero = findFieldValue(a, 'genero', 'sexo', 'Gênero', 'Sexo', 'identidade_genero').toLowerCase();
      return genero.includes('feminino') || genero.includes('mulher') || genero === 'f' || genero.includes('female');
    }).length;
    const homens = linhasDiversidadeCompleto.filter((a: any) => {
      const genero = findFieldValue(a, 'genero', 'sexo', 'Gênero', 'Sexo', 'identidade_genero').toLowerCase();
      return genero.includes('masculino') || genero.includes('homem') || genero === 'm' || genero.includes('male');
    }).length;
    const percMulheres = baseParaPercentual > 0 ? Math.round((mulheres / baseParaPercentual) * 100) : 0;
    
    const jovens = linhasDiversidadeCompleto.filter((a: any) => {
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
    
    const pcd = linhasDiversidadeCompleto.filter((a: any) => isPcdDeclaracaoPositivaShared(extractPcdColumnValueShared(a))).length;

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
      const r = findFieldValue(
        a,
        'raca',
        'etnia',
        'autodeclaracao',
        'Raça',
        'Raça/Cor',
        'raca_cor',
        'Cor',
        'cor',
        'cor_raca',
        'corRaca',
        'Autodeclaração racial',
        'autodeclaracao_racial',
        'cor ou raca',
        'Cor ou raça'
      ).toLowerCase().trim();
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
          (kn.includes('necessidade') && kn.includes('especial')) ||
          kn.includes('tipodedeficiencia') ||
          kn.includes('qualdeficiencia') ||
          kn.includes('deficienciadescrita') ||
          kn.includes('deficienciadeclarada');
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
    if (linhasDiversidadeCompleto.length > 0) {
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

      linhasDiversidadeCompleto.forEach((a: any) => {
        bump(generoMap, generoBucket(a));
        bump(racaMap, racaBucket(a));
        bump(idadeMap, idadeFaixaBucket(a));

        const rawPcd = extractPcdColumnValueShared(a);
        if (!String(rawPcd || '').trim()) bump(pcdMap, 'Não informado');
        else if (isPcdDeclaracaoPositivaShared(rawPcd)) bump(pcdMap, 'Declara PcD');
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
          'tempo de atuação',
          'experiencia',
          'Experiência',
          'experiência',
          'experiencia_cultural',
          'Experiência cultural',
          'experiencia profissional',
          'Experiência profissional',
          'ano_inicio',
          'Ano de início',
          'ano de inicio',
          'ano de início das atividades',
          'início das atividades',
          'inicio das atividades',
          'inicio_atividade',
          'Início da atividade',
          'desde quando atua',
          'Desde quando atua',
          'há quanto tempo atua',
          'Quanto tempo atua',
          'anos',
          'Anos de atuação',
          'anos_atuacao',
          'anos de atuação cultural',
          'tempo_atividade',
          'tempo de atividade',
          'atuacao_cultural',
          'atuação cultural',
          'tempo de experiência',
          'trajetória cultural',
          'carreira cultural',
          'ano_fundacao',
          'Ano de fundação'
        ).trim() || findExperienciaRawFallback(a)
        );
        const expNorm = normalizarExperienciaCultural(exp);
        if (expNorm) bump(expMap, expNorm);

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

        if (isPcdDeclaracaoPositivaShared(String(rawPcd || ''))) {
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
            if (ec) bump(estadoMap, ec);
            const exp = normalizarExperienciaCultural(
              findFieldValue(
                row,
                'tempo_atuacao',
                'Tempo de atuação',
                'tempo de atuação',
                'experiencia',
                'Experiência',
                'experiência',
                'ano_inicio',
                'Ano de início',
                'desde quando atua',
                'anos'
              ).trim() || findExperienciaRawFallback(row)
            );
            if (exp) bump(expMap, exp);
            if (cpfDig.length >= 11) cpfJaContouEstado.add(cpfDig);
          });
        }
      } catch {
        /* ignore */
      }

      const comTradRegistros = linhasDiversidadeCompleto.filter((a: any) => {
        const isProj = Boolean(
          (a as any).nomeProjeto || (a as any).projeto || (a as any)._editalOrigem || (a as any).edital
        );
        return ehComunidadeTradicionalRegistro(a, { includeNomeProjeto: isProj });
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

      const bTot = linhasDiversidadeCompleto.length || 1;
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
        totalBase: linhasDiversidadeCompleto.length,
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
          { nome: 'Sem vínculo', qtd: Math.max(0, linhasDiversidadeCompleto.length - comTradRegistros) },
        ],
        negrosComparativoBase: [
          { nome: 'Negros / pardos (cor/raça)', qtd: negros },
          { nome: 'Demais registros', qtd: Math.max(0, linhasDiversidadeCompleto.length - negros) },
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
          { nome: 'Outros / NI', qtd: Math.max(0, linhasDiversidadeCompleto.length - mulheres - homens) },
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
      agentes: agentesFinais.map((row) => withOfficialAldirBlanc2020Context(row, 'agentes')),
      grupos: gruposImportados.map((row) => withOfficialAldirBlanc2020Context(row, 'grupos')),
      espacos: espacosImportados.map((row) => withOfficialAldirBlanc2020Context(row, 'espacos')),
      projetos: editaisImportados,
      mapeamento: mForUnion,
    });
    const totaisPublicosAjustados = {
      ...totaisPublicos,
      totalContemplados: totalContempladosFinal,
      totalValorInvestido: totalValorFinal,
      totalEditais: breakdownEditais.length,
    };
    
    // Adiciona IDs únicos para cada edital (previne warnings de keys duplicadas no React/Recharts)
    breakdownEditais.forEach((ed, idx) => {
      (ed as any).id = `${ed.nome}-${idx}`;
    });

    const mapCoordsForRow = (row: any) => {
      const end = String(
        row?.enderecoCompleto ||
          row?.['Endereço completo'] ||
          row?.['Endereco completo'] ||
          row?.endereco ||
          row?.Endereço ||
          ''
      ).trim();
      const bairroRaw = String(
        row?.bairro ||
          row?.Bairro ||
          row?.localidade ||
          row?.Localidade ||
          row?.comunidade ||
          row?.Comunidade ||
          ''
      ).trim();
      const bairro = canonicalBairroIlhabela(bairroRaw, end).replace(/\s+/g, ' ').trim() || bairroRaw || 'Não informado';
      // Prioridade: bairros-coords.ts (coordenadas validadas e atualizadas)
      const coords = getBairroCoords(bairro);
      if (coords) return { bairro, lat: coords.lat, lng: coords.lng };
      // Fallback: GPS direto do registro (só se o bairro não tiver mapeamento)
      const directLat = Number(row?.lat ?? row?.latitude ?? row?.Latitude);
      const directLng = Number(row?.lng ?? row?.longitude ?? row?.Longitude);
      if (Number.isFinite(directLat) && Number.isFinite(directLng) && Math.abs(directLat) > 1e-6 && Math.abs(directLng) > 1e-6) {
        return { bairro, lat: directLat, lng: directLng };
      }
      return { bairro, lat: undefined, lng: undefined };
    };

    /** Projetos: priorizar bairro/endereço de execução (mapa e totais por território da ação), não só o do proponente. */
    const mapCoordsForProjetoRow = (row: any) => {
      const execBairro = findFieldValue(
        row,
        'bairro_execucao',
        'bairro_execução',
        'Bairro da execução',
        'Bairro de execução',
        'local_execucao',
        'localExecucao',
        'local_de_execucao',
        'Local de execução',
        'local_execução',
        'local_de_realizacao',
        'local_realizacao',
        'Local de realização',
        'regiao_execucao',
        'Região de execução',
        'bairro_projeto',
        'Bairro do projeto',
      ).trim();
      const execEnd = findFieldValue(
        row,
        'endereco_execucao',
        'enderecoExecucao',
        'endereco_de_execucao',
        'Endereço de execução',
        'endereco_realizacao',
        'Endereço de realização',
      ).trim();
      if (!execBairro && !execEnd) return mapCoordsForRow(row);
      const merged = { ...row };
      if (execBairro) merged.bairro = execBairro;
      if (execEnd) {
        merged.enderecoCompleto = execEnd;
        merged.endereco = execEnd;
      }
      return mapCoordsForRow(merged);
    };

    const comunidadeTradicionalForMap = (row: any, includeNomeProjeto = false) => {
      const rawField = findFieldValue(
        row,
        'comunidadeTradicional',
        'comunidade_tradicional',
        'comunidade tradicional',
        'povo_tradicional',
        'povos tradicionais',
        'Comunidade Tradicional',
      );
      const { eh, nome } = resolveComunidadeTradicional({
        rawField,
        bairro: String(row?.bairro || row?.Bairro || ''),
        enderecoCompleto: String(row?.enderecoCompleto || row?.endereco || row?.Endereço || ''),
        extras: includeNomeProjeto ? [String(row?.nome || row?.nomeProjeto || row?.projeto || row?.titulo || '')] : [],
      });
      return eh ? nome : '';
    };

    const cadastroMapItem = (row: any, tipo: 'agente' | 'grupo' | 'espaco', idx: number) => {
      const coords = mapCoordsForRow(row);
      const nome = String(row?.nome || row?.Nome || row?.razao_social || row?.RazãoSocial || 'Sem nome').trim();
      const editaisDoCadastro = editaisFinais
        .filter((p) => {
          const pNome = String(p.proponente || p.nome || p.Nome || '').toLowerCase();
          const cNome = nome.toLowerCase();
          return pNome && cNome && (pNome.includes(cNome) || cNome.includes(pNome));
        })
        .map((p) => getEditalNomeExibicaoProjeto(p));
      return {
        ...row,
        id: `${tipo}-${idx}`,
        tipo,
        nome,
        proponente: nome,
        bairro: coords.bairro,
        lat: coords.lat,
        lng: coords.lng,
        categoria: row?.categoria || row?.Categoria || (tipo === 'grupo' ? 'Grupos e coletivos' : tipo === 'espaco' ? 'Espaços culturais' : 'Agentes culturais'),
        comunidadeTradicional: comunidadeTradicionalForMap(row),
        editais: [...new Set(editaisDoCadastro)],
      };
    };

    const projetoMapItem = (row: any, idx: number) => {
      const coords = mapCoordsForProjetoRow(row);
      const nomeProjeto = String(row?.nomeProjeto || row?.projeto || row?.Projeto || row?.titulo || row?.Título || row?.nome || 'Projeto sem nome').trim();
      const proponente = String(row?.proponente || row?.nomeProponente || row?.responsavel || row?.nome || '').trim();
      const contemplado = isProjetoContempladoParaEstatistica(row);
      // Aldir Blanc 2020 prize registers (agentes/grupos/espaços) end up in the projetos
      // array but are not project submissions — assign the correct cadastro tipo.
      const editalDisplay = getEditalNomeExibicaoProjeto(row);
      let tipoResolvido: 'projeto' | 'agente' | 'grupo' | 'espaco' = 'projeto';
      for (const [tab, cfg] of Object.entries(OFFICIAL_ALDIR_BLANC_2020_VALUES)) {
        if (editalDisplay.includes((cfg as any).nomeBase) || editalDisplay === (cfg as any).nome) {
          tipoResolvido = tab === 'agentes' ? 'agente' : tab === 'grupos' ? 'grupo' : 'espaco';
          break;
        }
      }
      return {
        ...row,
        id: `projeto-${idx}`,
        tipo: tipoResolvido,
        nome: nomeProjeto,
        proponente,
        bairro: coords.bairro,
        lat: coords.lat,
        lng: coords.lng,
        categoria: row?.categoria || row?.Categoria || row?.areaAtuacao || row?.linguagem || 'Projeto cultural',
        comunidadeTradicional: comunidadeTradicionalForMap({ ...row, bairro: coords.bairro }, true),
        edital: getEditalNomeExibicaoProjeto(row),
        editais: [getEditalNomeExibicaoProjeto(row)],
        eh_contemplado: contemplado,
        valor: contemplado ? getProjetoValorNormalizado(row) : 0,
      };
    };
    
    return {
      totalProjetos: totalContempladosFinal,
      totalInscritos: totalInscritosFinal,
      totalValor: totalValorFinal,
      totalValorBrl: formatBRL(totalValorFinal),
      totaisPublicos: totaisPublicosAjustados,
      qtdEditais: breakdownEditais.length,
      trad,
      percTrad,
      comunidadesOficiais: COMUNIDADES_TRADICIONAIS.length,
      faixaAnos,
      inscricoesTotais,
      totalDiversidade: linhasDiversidadeCompleto.length,
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
      // 🆕 Itens para o mapa (com lat/lng e editais que participou)
      todosItens: (() => {
        const cadastroItems = unionCadastro.map((u, idx) => cadastroMapItem(u.row, u.tipo, idx));
        const usedKeys = new Set<string>(
          cadastroItems.map((item) => cadastroChaveDedupe(item)).filter(Boolean),
        );
        const projetoItems = editaisFinais
          .filter((p) => isProjetoContempladoParaEstatistica(p))
          .map((p, idx) => projetoMapItem(p, idx))
          .filter((item) => {
            // Skip reclassified cadastro rows already covered by unionCadastro
            if (item.tipo !== 'projeto') {
              const key = cadastroChaveDedupe(item);
              if (key && usedKeys.has(key)) return false;
            }
            return true;
          });
        return [...cadastroItems, ...projetoItems];
      })()
    };
  }, [refreshKey, serverPayload]);

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
        const label = canonicalBairroIlhabela(raw, end).replace(/\s+/g, ' ').trim();
        if (!label || label.length > 60 || looksLikeEnderecoCompleto(label)) return '';
        // Só entra no gráfico se for uma localidade reconhecida; evita ruas/endereços virarem "bairros".
        if (!getBairroCoords(label)) return '';
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

  /** Exibe evolução de investimento — usa dados estáticos quando localStorage estiver vazio ou projetos ausentes. */
  const evolucaoInvestimentoCharts = useMemo(() => {
    const fallbackFromBreakdown = () => {
      const anoMap = new Map<number, number>();
      (resumoGlobal.breakdownEditais || []).forEach((ed: any) => {
        const valor = Number(ed.valor) || 0;
        if (valor <= 0) return;
        const yearText = String(ed.ano || ed.nome || ed.chave || '');
        const yearMatch = yearText.match(/(19[5-9]\d|20[0-4]\d)/);
        const ano = yearMatch ? Number(yearMatch[1]) : 0;
        if (!ano || ano < 1990) return;
        anoMap.set(ano, (anoMap.get(ano) || 0) + valor);
      });
      return Array.from(anoMap.entries())
        .map(([ano, valor]) => ({ ano: String(ano), valor: Number(valor) || 0 }))
        .filter((row) => row.valor > 0)
        .sort((a, b) => parseInt(a.ano, 10) - parseInt(b.ano, 10));
    };

    try {
      const raw = serverPayload ? '' : localStorage.getItem('editais_imported_data');
      const parsed = serverPayload
        ? (normalizeProjetosOnParsed(serverPayload) as Record<string, any>)
        : raw
        ? (normalizeProjetosOnParsed(JSON.parse(raw)) as Record<string, any>)
        : (DADOS_ESTATICOS as unknown as Record<string, any>);
      const rawProjetos = (parsed.projetos || []) as any[];
      const projetos = rawProjetos.length > 0 ? rawProjetos : (DADOS_ESTATICOS.projetos as any[]);
      const mapeamento2020 = Array.isArray(parsed.mapeamento) && parsed.mapeamento.length > 0
        ? parsed.mapeamento
        : (DADOS_ESTATICOS.mapeamento as any[]);
      const cadastrosComValor = [
        ...((parsed.agentes || []) as any[]).map((row) => withOfficialAldirBlanc2020Context(row, 'agentes')),
        ...((parsed.grupos || []) as any[]).map((row) => withOfficialAldirBlanc2020Context(row, 'grupos')),
        ...((parsed.espacos || []) as any[]).map((row) => withOfficialAldirBlanc2020Context(row, 'espacos')),
        ...mapeamento2020,
      ];
      if (projetos.length === 0 && cadastrosComValor.length === 0) return [];
      const anoMap = new Map<number, number>();

      const getAnoRegistro = (p: any, fallbackAno = 0) => {
        let ano = parseInt(String(p._anoOrigem || p.ano || p.Ano || p.edital_ano || p.anoEdital || ''), 10);
        if (!Number.isFinite(ano) || ano < 1990) {
          const m = String(p._editalOrigem || p.edital || p.Edital || p['Edital'] || '').match(/(\d{4})/);
          ano = m ? parseInt(m[1], 10) : fallbackAno;
        }
        return ano;
      };

      const getValorRegistro = (p: any) => getProjetoValorNormalizado(p);

      projetos.forEach((p: any) => {
        const valor = getValorRegistro(p);
        const isContemp = isProjetoContempladoParaEstatistica(p);
        if (!isContemp || valor <= 0) return;
        const ano = getAnoRegistro(p);
        if (!ano || ano < 1990) return;
        anoMap.set(ano, (anoMap.get(ano) || 0) + valor);
      });

      cadastrosComValor.forEach((p: any) => {
        const valor = getValorRegistro(p);
        const isContemp = p.eh_contemplado === true || p.eh_contemplado === 'true' || p.contemplado === true || valor > 0;
        if (!isContemp || valor <= 0) return;
        const ano = getAnoRegistro(p, 2020);
        if (!ano || ano < 1990) return;
        anoMap.set(ano, (anoMap.get(ano) || 0) + valor);
      });

      const arr = Array.from(anoMap.entries())
        .map(([ano, valor]) => ({ ano: String(ano), valor }))
        .sort((a, b) => parseInt(a.ano, 10) - parseInt(b.ano, 10));
      if (arr.length === 0) return fallbackFromBreakdown();
      return arr.map((r) => ({ ...r, valor: Number(r.valor) || 0 }));
    } catch {
      return fallbackFromBreakdown();
    }
  }, [refreshKey, resumoGlobal.breakdownEditais, serverPayload]);

  const categoriasCharts = useMemo(() => {
    try {
      const raw = serverPayload ? '' : localStorage.getItem('editais_imported_data');
      const parsed = serverPayload
        ? (normalizeProjetosOnParsed(serverPayload) as Record<string, any>)
        : raw
        ? (normalizeProjetosOnParsed(JSON.parse(raw)) as Record<string, any>)
        : (DADOS_ESTATICOS as unknown as Record<string, any>);
      const rawProjetos = (parsed.projetos || []) as any[];
      const projetos = rawProjetos.length > 0 ? rawProjetos : (DADOS_ESTATICOS.projetos as any[]);
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
        const isContemp = isProjetoContempladoParaEstatistica(p);
        const valorProjeto = isContemp ? getProjetoValorNormalizado(p) : 0;
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
  }, [refreshKey, serverPayload]);

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
    const top = distribuicaoPorBairro.slice(0, 14);
    const demais = distribuicaoPorBairro.slice(14);
    const rows = [...top];
    const demaisQtd = demais.reduce((acc, item) => acc + (Number(item.qtd) || 0), 0);
    if (demaisQtd > 0) rows.push({ nome: 'Demais localidades', qtd: demaisQtd, valor: 0 });

    return rows.map((item, idx) => ({
      ...item,
      qtd: Number(item.qtd) || 0,
      id: `bairro-${item.nome}-${idx}`,
      _chartId: `bairro-${idx}-${item.nome.replace(/\s+/g, '-')}`
    }));
  }, [distribuicaoPorBairro]);

  const evolucaoComAcumulado = useMemo(() => {
    let acumulado = 0;
    return evolucaoComIds.map((item) => {
      acumulado += Number(item.valor) || 0;
      return { ...item, acumulado };
    });
  }, [evolucaoComIds]);

  /** Altura controlada (evita gráfico desproporcional com muitos bairros). */
  const bairrosChartHeight = useMemo(() => {
    const n = bairrosComIds.length;
    if (n === 0) return 280;
    return Math.min(460, Math.max(320, n * 24 + 72));
  }, [bairrosComIds.length]);

  const bairrosYAxisWidth = useMemo(() => {
    let maxLen = 12;
    for (const r of bairrosComIds) {
      maxLen = Math.max(maxLen, String(r.nome || '').length);
    }
    return Math.min(220, Math.max(108, Math.round(maxLen * 6.4)));
  }, [bairrosComIds]);
  
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

  const editalResumoVisualData = useMemo(() => {
    return (resumoGlobal.breakdownEditais || []).map((ed, idx) => ({
      ...ed,
      nomeCurto: ed.nome.length > 24 ? `${ed.nome.slice(0, 23)}…` : ed.nome,
      naoContemplados: Math.max(0, (Number(ed.inscritos) || 0) - (Number(ed.contemplados) || 0)),
      taxa: ed.inscritos > 0 ? Math.round((ed.contemplados / ed.inscritos) * 100) : 0,
      _chartId: `edital-visual-${idx}-${ed.nome.replace(/\s+/g, '-')}`,
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
    let rows = (resumoGlobal.breakdownEditais || []).filter((e) => (Number(e.valor) || 0) > 0);

    if (!rows.length) {
      try {
        const raw = serverPayload ? '' : localStorage.getItem('editais_imported_data');
        const parsed = serverPayload
          ? (normalizeProjetosOnParsed(serverPayload) as Record<string, any>)
          : raw
            ? (normalizeProjetosOnParsed(JSON.parse(raw)) as Record<string, any>)
            : (DADOS_ESTATICOS as unknown as Record<string, any>);
        const projetos = Array.isArray(parsed.projetos) && parsed.projetos.length > 0
          ? parsed.projetos
          : (DADOS_ESTATICOS.projetos as any[]);
        const cadastros = [
          ...(Array.isArray(parsed.mapeamento) ? parsed.mapeamento : []),
          ...(Array.isArray(parsed.agentes) ? parsed.agentes.map((row: any) => withOfficialAldirBlanc2020Context(row, 'agentes')) : []),
          ...(Array.isArray(parsed.grupos) ? parsed.grupos.map((row: any) => withOfficialAldirBlanc2020Context(row, 'grupos')) : []),
          ...(Array.isArray(parsed.espacos) ? parsed.espacos.map((row: any) => withOfficialAldirBlanc2020Context(row, 'espacos')) : []),
        ];

        const byEdital = new Map<string, number>();
        const addValor = (nome: string, valor: number) => {
          if (!nome || !Number.isFinite(valor) || valor <= 0) return;
          byEdital.set(nome, (byEdital.get(nome) || 0) + valor);
        };

        projetos.forEach((p: any) => {
          const valor = getProjetoValorNormalizado(p);
          if (isProjetoContempladoParaEstatistica(p) && valor > 0) {
            addValor(getEditalNomeExibicaoProjeto(p), valor);
          }
        });

        cadastros.forEach((row: any) => {
          const valor = getProjetoValorNormalizado(row);
          if (valor <= 0) return;
          const nome = String(
            row._editalOrigem ||
              row.edital_contemplado ||
              row.edital ||
              row.Edital ||
              row.programa ||
              row.Programa ||
              'Mapeamento Cultural 2020'
          ).trim();
          addValor(nome, valor);
        });

        rows = Array.from(byEdital.entries()).map(([nome, valor], idx) => ({
          chave: `valor-${idx}`,
          nome,
          ano: '',
          inscritos: 0,
          contemplados: 0,
          valor,
        }));
      } catch {
        rows = [];
      }
    }

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
  }, [resumoGlobal.breakdownEditais, serverPayload]);

  const aldirBlancEditais = useMemo(() => {
    const rows = resumoGlobal.breakdownEditais || [];
    const normalizeNum = (value: string) => value.replace(/\D/g, '').replace(/^0+/, '') || value.replace(/\D/g, '');
    const normalizedRows = rows.map((ed) => ({
      ed,
      text: normalizeLooseKey(`${ed.nome} ${ed.chave} ${ed.ano}`).replace(/\//g, ' '),
      digits: `${ed.nome} ${ed.chave} ${ed.ano}`.replace(/\D/g, ' ').split(/\s+/).filter(Boolean),
    }));

    return EDITAIS_ALDIR_BLANC_2020.map((base) => {
      const numeroSemAno = base.numero.split('/')[0];
      const numeroKey = normalizeNum(numeroSemAno);
      const chamadaKey = normalizeNum(base.chamada.split('/')[0]);
      const tipoText = normalizeLooseKey(base.tipo);
      const tipoKeywords = tipoText.includes('agentes')
        ? ['agentes', 'agente']
        : tipoText.includes('grupos')
          ? ['grupos', 'coletivos', 'coletivo']
          : tipoText.includes('espacos')
            ? ['espacos', 'espaco']
            : ['projetos', 'projeto', 'fomento', 'premiacao', 'premiacao cultural'];

      const match = normalizedRows.find(({ ed, text, digits }) => {
        const numberMatch =
          text.includes(base.numero.toLowerCase().replace('/', ' ')) ||
          digits.some((part) => normalizeNum(part) === numeroKey);
        const chamadaMatch =
          text.includes(base.chamada.toLowerCase().replace('/', ' ')) ||
          digits.some((part) => normalizeNum(part) === chamadaKey);
        const yearMatch = String(ed.ano || '').includes('2020') || text.includes('2020');
        const aldirLike = text.includes('aldir') || text.includes('14 017') || text.includes('14017') || text.includes('emergencial');
        const typeMatch = tipoKeywords.some((kw) => text.includes(kw));
        return (numberMatch || chamadaMatch || (yearMatch && typeMatch && (aldirLike || text.includes('chamada')))) && yearMatch;
      })?.ed;
      const links = resolveEditalLinks(match?.nome || `Edital nº ${base.numero}`, resumoGlobal.customEditalLinks);
      const inscritos = Number(match?.inscritos) || 0;
      const contemplados = Number(match?.contemplados) || 0;
      return {
        ...base,
        nomeEditavel: match?.nome || `Edital nº ${base.numero}`,
        inscritos,
        contemplados,
        valor: Number(match?.valor) || 0,
        taxa: inscritos > 0 ? Math.round((contemplados / inscritos) * 100) : 0,
        links,
        origemAdmin: Boolean(match),
      };
    });
  }, [resumoGlobal.breakdownEditais, resumoGlobal.customEditalLinks]);

  if (!isMounted) return <div className="min-h-screen ds-dash-page" />;

  return (
    <div className="ds-dash-page min-h-screen pb-20 font-sans text-[#1b1b1f] antialiased">
      {/* Hero — painel executivo */}
      <section className="relative overflow-hidden border-b border-slate-800/40">
        {availableHeroVideos.length > 0 && heroSlotSources.map((source, slot) => (
          source ? (
            <video
              key={`${slot}-${source}`}
              ref={(node) => {
                heroVideoRefs.current[slot] = node;
              }}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-75 ${
                activeHeroSlot === slot ? 'z-0 opacity-95' : '-z-10 opacity-0'
              }`}
              src={source}
              autoPlay={activeHeroSlot === slot}
              muted
              loop={availableHeroVideos.length === 1}
              playsInline
              preload={activeHeroSlot === slot ? 'metadata' : 'none'}
              onCanPlay={(event) => {
                if (activeHeroSlot !== slot) return;
                const video = event.currentTarget;
                const playPromise = video.play();
                if (playPromise) playPromise.catch(() => undefined);
              }}
              onEnded={() => {
                if (activeHeroSlot === slot) advanceHeroVideo();
              }}
              onError={() => {
                setFailedHeroVideos((prev) => new Set(prev).add(source));
                if (activeHeroSlot === slot) advanceHeroVideo();
              }}
              aria-hidden
            />
          ) : null
        ))}
        <div
          className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(0,163,140,0.18),transparent),linear-gradient(165deg,rgba(7,11,20,0.46)_0%,rgba(15,23,42,0.34)_48%,rgba(12,26,51,0.50)_100%)]"
          aria-hidden
        />

        <div className="absolute inset-0 z-[2] bg-slate-950/0" aria-hidden />

        <div
          className="pointer-events-none absolute inset-0 z-[3] opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
          aria-hidden
        />

        <div className="container relative z-10 mx-auto px-4 pb-5 pt-4 sm:px-6 md:pb-6 md:pt-5 lg:pb-7 lg:pt-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-5xl"
          >
            <div className="mb-3 inline-flex flex-wrap items-center gap-2 rounded-lg border border-white/12 bg-slate-950/35 px-3 py-1.5 font-mono text-[0.58rem] font-medium uppercase tracking-[0.16em] text-slate-200/95 backdrop-blur-md sm:text-[0.62rem]">
              <ShieldCheck size={14} className="shrink-0 text-teal-300" aria-hidden />
              <span>SMIIC</span>
              <span className="hidden text-white/30 sm:inline" aria-hidden>
                ·
              </span>
              <span className="flex items-center gap-1.5 font-sans font-semibold normal-case tracking-normal text-slate-300">
                <MapPin size={13} className="shrink-0 text-teal-300/90" aria-hidden />
                Ilhabela · Cultura
              </span>
            </div>

            <h1 className="max-w-3xl text-balance text-[1.65rem] font-bold leading-[1.08] tracking-[-0.035em] text-white sm:text-2xl md:text-3xl lg:text-[2.15rem]">
              Painel de Indicadores Culturais
            </h1>
            <p className="mt-2.5 max-w-2xl text-[0.8125rem] font-normal leading-relaxed text-slate-300 sm:text-sm">
              Base municipal integrada: mapas, séries e KPIs para leitura do território cultural com rastreabilidade e transparência.
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                onClick={() => onNavigate('painel')}
                variant="contained"
                size="large"
                sx={{
                  width: { xs: '100%', sm: 'auto' },
                  bgcolor: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 600,
                  borderRadius: '10px',
                  textTransform: 'none',
                  px: 3.5,
                  py: 0.9,
                  fontSize: '0.8125rem',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  '&:hover': { bgcolor: '#f8fafc', transform: 'translateY(-1px)' },
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
                  width: { xs: '100%', sm: 'auto' },
                  color: '#e2e8f0',
                  borderColor: 'rgba(255,255,255,0.22)',
                  bgcolor: 'rgba(15,23,42,0.35)',
                  backdropFilter: 'blur(12px)',
                  fontWeight: 600,
                  borderRadius: '10px',
                  textTransform: 'none',
                  px: 3.5,
                  py: 0.9,
                  fontSize: '0.8125rem',
                  borderWidth: '1px',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.38)',
                    bgcolor: 'rgba(15,23,42,0.45)',
                    borderWidth: '1px',
                  },
                }}
                endIcon={<FileText />}
              >
                Transparência e fontes
              </Button>
            </div>

            <div className="mt-4 grid max-w-3xl grid-cols-1 gap-2.5 sm:grid-cols-3">
              {[
                {
                  label: 'Território',
                  value: showCadastroLoadingShell
                    ? 'Carregando dados…'
                    : `${(resumoGlobal.totaisPublicos.totalInscritos || resumoGlobal.inscricoesTotais || resumoGlobal.todosItens.length).toLocaleString('pt-BR')} registros consolidados`,
                },
                {
                  label: 'Editais',
                  value: showCadastroLoadingShell
                    ? 'Carregando dados…'
                    : `${resumoGlobal.totaisPublicos.totalEditais || resumoGlobal.breakdownEditais.length} bases consolidadas`,
                },
                {
                  label: 'Investimento',
                  value: showCadastroLoadingShell ? 'Carregando dados…' : formatBRL(resumoGlobal.totaisPublicos.totalValorInvestido),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/10 border-l-teal-400/90 bg-slate-950/40 p-3 backdrop-blur-md"
                >
                  <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-teal-200/85">{item.label}</p>
                  <p className="ds-metric-value mt-1.5 text-[0.8125rem] leading-snug text-white sm:text-[0.875rem]">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* MAPA STORE LOCATOR - Demo */}
      <section className="container relative z-20 mx-auto -mt-4 mb-8 max-w-7xl px-4 sm:px-6 md:-mt-5 md:mb-10">
        <div
          className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white ring-1 ring-slate-900/[0.03]"
          style={{ boxShadow: '0 20px 56px -32px rgba(15,23,42,0.18), 0 4px 20px -8px rgba(15,23,42,0.08)' }}
        >
          <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50/50 to-white px-5 py-4 md:px-8 md:py-5">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-sm bg-teal-600 shadow-sm shadow-teal-600/30" />
              <p className="ds-dash-kicker text-teal-800">Exploração geográfica</p>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 md:text-xl">
              Agentes culturais no território
            </h2>
            <p className="mt-1 max-w-3xl text-xs font-normal leading-relaxed text-slate-600 sm:text-sm">
              Busca, filtros e mapa interativo. Use <strong className="font-semibold text-slate-700">Ver território</strong> para enquadrar os pontos; o zoom com o scroll do mouse funciona diretamente sobre o mapa. Cadastros sem coordenadas aparecem só na lista.
            </p>
          </div>
          <div className="relative min-h-[min(72vh,620px)] h-[min(72vh,620px)] bg-slate-100/80 sm:min-h-[420px] sm:h-[420px] lg:min-h-[460px] lg:h-[460px]">
            {showCadastroLoadingShell && (
              <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center gap-2 bg-white/90 px-4 text-center">
                <p className="text-sm font-extrabold text-slate-700">Carregando cadastro cultural…</p>
                <p className="max-w-md text-xs font-medium text-slate-500">
                  Sincronizando com o servidor. Em seguida os totais e o mapa refletem a base completa.
                </p>
              </div>
            )}
            <StoreLocatorMap
              items={showCadastroLoadingShell ? [] : resumoGlobal.todosItens}
              editais={resumoGlobal.breakdownEditais}
              center={[-23.793, -45.362]}
              zoom={12}
              sidebarWidth={336}
            />
          </div>
        </div>
      </section>

      {/* KPIs + gráficos principais — logo no início */}
      <section className="container relative z-20 mx-auto mb-12 max-w-7xl px-4 sm:px-6 md:mb-14">
        <div
          className="ds-dash-panel overflow-hidden rounded-2xl border border-slate-200/70 md:rounded-2xl"
          style={{ boxShadow: '0 4px 24px -8px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.05)' }}
        >
          <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50/40 to-white px-5 py-4 md:px-8 md:py-5">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-sm bg-teal-600 shadow-sm shadow-teal-600/25" />
              <p className="ds-dash-kicker text-teal-800">Síntese quantitativa</p>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 md:text-xl">
              Indicadores e análise gráfica
            </h2>
            <p className="mt-1 max-w-3xl text-xs font-normal leading-relaxed text-slate-600 sm:text-sm">
              Cadastro no território = mesma união deduplicada do mapa (mapeamento + agentes, grupos e espaços). Editais seguem o breakdown do Admin.
            </p>
          </div>
          <div className="bg-slate-50/80 p-4 sm:p-5 md:p-7">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12 lg:gap-4">
            <motion.div className="min-w-0 xl:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.4, ease: [0.22,1,0.36,1] }}>
              <KpiMetricCard
                borderColor="#1a56db"
                icon={<Users size={18} strokeWidth={2.5} />}
                chipLabel="Mapeamento 2020"
                value={<p className="m-0 text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none text-white">{resumoGlobal.totaisPublicos.cadastroPorTipoMapeamento.agentes}</p>}
                subtitle="Agentes cadastrados no mapeamento cultural"
              />
            </motion.div>

            <motion.div className="min-w-0 xl:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4, ease: [0.22,1,0.36,1] }}>
              <KpiMetricCard
                borderColor="#0f766e"
                icon={<Award size={18} strokeWidth={2.5} />}
                chipLabel="Mapeamento 2020"
                value={<p className="m-0 text-4xl sm:text-5xl font-black tabular-nums tracking-tight leading-none text-white">{Math.max(resumoGlobal.totaisPublicos.cadastroPorTipoMapeamento.grupos, resumoGlobal.totalGrupos)}</p>}
                subtitle="Grupos e coletivos cadastrados"
              />
            </motion.div>

            <motion.div className="min-w-0 xl:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4, ease: [0.22,1,0.36,1] }}>
              <KpiMetricCard
                borderColor="#4338ca"
                icon={<Building2 size={18} strokeWidth={2.5} />}
                chipLabel="Mapeamento 2020"
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
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#00A38C]">Investimento</p>
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
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#00A38C]">Editais</p>
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
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#00A38C]">Linguagens</p>
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
        <section className="container mx-auto mb-14 max-w-7xl px-4 sm:px-6 md:mb-16">
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
          
          <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card sx={chartCardSx}>
              <CardContent className="p-4 md:p-5">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#00A38C]">Participação</p>
                <h3 className="mb-0.5 text-sm font-black text-slate-900 md:text-base">Inscritos x contemplados</h3>
                <p className="mb-3 text-[11px] font-medium text-slate-500">Comparação direta por edital.</p>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={editalResumoVisualData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="nomeCurto" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} interval={0} angle={-18} textAnchor="end" height={78} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} width={34} />
                    <RechartsTooltip contentStyle={chartTooltipContentStyle} labelFormatter={(_, payload) => String(payload?.[0]?.payload?.nome || '')} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} iconType="circle" iconSize={8} />
                    <Bar dataKey="inscritos" name="Inscritos" fill="#60a5fa" radius={[8, 8, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="contemplados" name="Contemplados" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={28} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card sx={chartCardSx}>
              <CardContent className="p-4 md:p-5">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600">Eficiência</p>
                <h3 className="mb-0.5 text-sm font-black text-slate-900 md:text-base">Taxa de contemplação</h3>
                <p className="mb-3 text-[11px] font-medium text-slate-500">Percentual de contemplados entre inscritos.</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={editalResumoVisualData} layout="vertical" margin={{ top: 6, right: 34, left: 8, bottom: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                    <YAxis type="category" dataKey="nomeCurto" tick={{ fontSize: 9, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} width={118} />
                    <RechartsTooltip contentStyle={chartTooltipContentStyle} formatter={(value: number) => `${value}%`} labelFormatter={(_, payload) => String(payload?.[0]?.payload?.nome || '')} />
                    <Bar dataKey="taxa" name="Taxa" fill="#10b981" radius={[0, 8, 8, 0]} maxBarSize={22}>
                      <LabelList dataKey="taxa" position="right" formatter={(value: unknown) => `${Number(value) || 0}%`} style={{ fontSize: 10, fill: '#0f172a', fontWeight: 800 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card sx={chartCardSx}>
              <CardContent className="p-4 md:p-5">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#00A38C]">Orçamento</p>
                <h3 className="mb-0.5 text-sm font-black text-slate-900 md:text-base">Valor investido</h3>
                <p className="mb-3 text-[11px] font-medium text-slate-500">Recursos contemplados por edital.</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={editalResumoVisualData} margin={{ top: 16, right: 10, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="nomeCurto" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} interval={0} angle={-18} textAnchor="end" height={78} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={formatCompactBRL} width={70} />
                    <RechartsTooltip contentStyle={chartTooltipContentStyle} formatter={(value: number) => formatBRL(value)} labelFormatter={(_, payload) => String(payload?.[0]?.payload?.nome || '')} />
                    <Bar dataKey="valor" name="Valor investido" fill="#00A38C" radius={[9, 9, 0, 0]} maxBarSize={42}>
                      <LabelList dataKey="valor" position="top" formatter={(value: unknown) => formatCompactBRL(value)} style={{ fontSize: 9, fill: '#0f172a', fontWeight: 800 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {editalResumoVisualData.map((ed, idx) => {
              const links = resolveEditalLinks(ed.nome, resumoGlobal.customEditalLinks);
              return (
                <div
                  key={`edital-big-${(ed as { chave?: string }).chave ?? ed.nome}-${idx}`}
                  className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_-26px_rgba(15,23,42,0.45)]"
                >
                  <p className="m-0 line-clamp-2 min-h-[2.35rem] text-[0.78rem] font-black leading-snug text-slate-900">
                    {ed.nome}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-emerald-50 p-2">
                      <p className="m-0 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#006B5A]">Inscritos</p>
                      <p className="m-0 text-xl font-black tabular-nums text-[#00A38C]">{ed.inscritos.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-2">
                      <p className="m-0 text-[0.58rem] font-black uppercase tracking-[0.12em] text-emerald-500">Contemplados</p>
                      <p className="m-0 text-xl font-black tabular-nums text-emerald-700">{ed.contemplados.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="mt-2 rounded-2xl bg-slate-50 p-2">
                    <p className="m-0 text-[0.58rem] font-black uppercase tracking-[0.12em] text-slate-400">Taxa</p>
                    <p className="m-0 text-lg font-black tabular-nums text-slate-800">{ed.taxa}%</p>
                  </div>
                  <div className="mt-2 rounded-2xl bg-[#00A38C] p-2 text-white">
                    <p className="m-0 text-[0.58rem] font-black uppercase tracking-[0.12em] text-emerald-50">Valor investido</p>
                    <p className="m-0 text-base font-black tabular-nums">{formatBRL(ed.valor)}</p>
                  </div>
                  {links && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {links.resultado && (
                        <a href={links.resultado} target="_blank" rel="noopener noreferrer" className="no-underline">
                          <Chip label="Resultado" size="small" clickable sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 800, fontSize: '0.62rem', height: 21 }} />
                        </a>
                      )}
                      {links.resumo && (
                        <a href={links.resumo} target="_blank" rel="noopener noreferrer" className="no-underline">
                          <Chip label="Resumo" size="small" clickable sx={{ bgcolor: '#d1fae5', color: '#065f46', fontWeight: 800, fontSize: '0.62rem', height: 21 }} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_16px_44px_-24px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/[0.03]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90">
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-[#1b1b1f]">Edital</th>
                    <th className="px-4 py-4 text-center text-xs font-black uppercase tracking-wider text-[#1b1b1f]">Inscritos</th>
                    <th className="px-4 py-4 text-center text-xs font-black uppercase tracking-wider text-[#10b981]">Contemplados</th>
                    <th className="px-4 py-4 text-center text-xs font-black uppercase tracking-wider text-[#5f5f6a]" title="Taxa de contemplação = contemplados / inscritos">
                      Taxa de Contemplação
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-[#00A38C]">Valor Investido</th>
                    <th className="px-4 py-4 text-center text-xs font-black uppercase tracking-wider text-[#5f5f6a]">Links</th>
                  </tr>
                </thead>
                <tbody>
                  {resumoGlobal.breakdownEditais.map((ed, idx) => (
                    <tr key={`edital-row-${(ed as { chave?: string }).chave ?? ed.nome}-${idx}`} className="border-b border-slate-100 transition-colors hover:bg-emerald-50/50">
                      <td className="px-6 py-4 font-bold text-[#1b1b1f]">{ed.nome}</td>
                      <td className="text-center px-4 py-4">
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-[#006B5A] font-bold px-3 py-1 rounded-full text-xs">
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
                      <td className="text-right px-6 py-4 font-black text-[#00A38C]">{formatBRL(ed.valor)}</td>
                      <td className="text-center px-4 py-4">
                        {(() => {
                          const links = resolveEditalLinks(ed.nome, resumoGlobal.customEditalLinks);
                          return links ? (
                            <div className="flex flex-wrap justify-center gap-1">
                              {links.resultado && (
                                <a href={links.resultado} target="_blank" rel="noopener noreferrer" className="no-underline">
                                  <Chip label="Resultado" size="small" clickable sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '0.65rem', height: 22, '&:hover': { bgcolor: '#bfdbfe' } }} />
                                </a>
                              )}
                              {links.resumo && (
                                <a href={links.resumo} target="_blank" rel="noopener noreferrer" className="no-underline">
                                  <Chip label="Resumo" size="small" clickable sx={{ bgcolor: '#d1fae5', color: '#065f46', fontWeight: 700, fontSize: '0.65rem', height: 22, '&:hover': { bgcolor: '#a7f3d0' } }} />
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
                  <tr className="border-t-2 border-slate-300 bg-slate-50">
                    <td className="px-6 py-4 font-black text-[#1b1b1f] uppercase text-xs">Total Geral</td>
                    <td className="text-center px-4 py-4 font-black text-[#006B5A]">{resumoGlobal.breakdownEditais.reduce((a, e) => a + e.inscritos, 0)}</td>
                    <td className="text-center px-4 py-4 font-black text-emerald-800">{resumoGlobal.breakdownEditais.reduce((a, e) => a + e.contemplados, 0)}</td>
                    <td className="text-center px-4 py-4 font-bold text-[#5f5f6a] text-xs">
                      {(() => { const ti = resumoGlobal.breakdownEditais.reduce((a, e) => a + e.inscritos, 0); const tc = resumoGlobal.breakdownEditais.reduce((a, e) => a + e.contemplados, 0); return ti > 0 ? Math.round((tc / ti) * 100) : 0; })()}%
                    </td>
                    <td className="text-right px-6 py-4 font-black text-[#00A38C]">{formatBRL(resumoGlobal.breakdownEditais.reduce((a, e) => a + e.valor, 0))}</td>
                    <td className="text-center px-4 py-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <p className="mt-3 text-xs font-medium leading-relaxed text-slate-500">
            * Dados das planilhas importadas no painel Admin. Inscritos = propostas recebidas; contemplados = aprovadas ou selecionadas. A porcentagem é taxa de contemplação (não percentual de execução financeira). Para corrigir totais, links ou ocultar uma linha na página inicial, use o painel Admin.
          </p>
        </section>
      )}

      {/* 🆕 NOVA SEÇÃO: Indicadores de Diversidade e Inclusão */}
      {(resumoGlobal.totaisPublicos.totalInscritos > 0 || resumoGlobal.totalInscritos > 0) && (
        <section className="container mx-auto mb-14 max-w-7xl px-4 sm:px-6 md:mb-16">
          <DashboardSectionHeader
            kicker="Inclusão e perfil"
            title="Indicadores de diversidade"
            description="Perfil agregado de agentes, grupos e espaços do cadastro cultural. Cor/raça (negros e pardos) e LGBTQIA+ são eixos diferentes: o primeiro usa só autodeclaração de cor ou raça; o segundo usa orientação sexual, identidade de gênero e gênero — sem misturar um no outro. O total de PcD prioriza colunas de deficiência ou PcD e evita “Sim” genérico de outras perguntas."
          />
          
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card sx={diversityStatCardSx('linear-gradient(135deg, #f59e0b 0%, #d97706 100%)')}>
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
              <Card sx={diversityStatCardSx('linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)')}>
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
              <Card sx={diversityStatCardSx('linear-gradient(135deg, #ec4899 0%, #be185d 100%)')}>
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
              <Card sx={diversityStatCardSx('linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)')}>
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
              <Card sx={diversityStatCardSx('linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)')}>
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
              <Card sx={diversityStatCardSx('linear-gradient(135deg, #22c55e 0%, #16a34a 100%)')}>
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
          <div className="mt-6 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <ScrollText className="mt-0.5 shrink-0 text-[#006B5A]" size={18} aria-hidden />
            <p className="text-sm font-medium leading-relaxed text-[#063B31]">
              <strong>Nota metodológica:</strong> Os indicadores combinam <strong>agentes culturais</strong> (mapeamento) e <strong>proponentes de editais</strong>.
              <strong> Negros/pardos</strong> vêm apenas de cor/raça declarada. <strong>LGBTQIA+</strong> combina orientação sexual, identidade de gênero e gênero (cadastro único no total); nos gráficos, orientação e identidade aparecem em eixos separados, apartados do racial.
              Gênero, idade e deficiência dependem dos campos na planilha. <strong>Comunidades tradicionais</strong> seguem a mesma regra do painel <strong>Admin</strong> (vínculo identificável); &quot;Sim&quot; genérico sem comunidade não entra no total.
              {resumoGlobal.mulheres === 0 && resumoGlobal.negros === 0 && resumoGlobal.lgbtqia === 0 && (
                <span className="mt-1 block text-[#006B5A]">As planilhas importadas ainda não trazem gênero, cor/raça ou dados de orientação/identidade LGBTQIA+ de forma classificável.</span>
              )}
            </p>
          </div>
        </section>
      )}

      {/* Seção: Lei Aldir Blanc 2020 — visual moderno (gradiente, elevação, hierarquia) */}
      <section className="container mx-auto mb-14 px-4 font-sans sm:px-6 md:mb-16">
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
              border: '1px solid rgba(0, 163, 140, 0.18)',
              boxShadow:
                '0 2px 6px rgba(0,163,140,0.07), 0 20px 56px rgba(15,23,42,0.09)',
              transition: 'box-shadow 0.3s ease',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,163,140,0.11), 0 28px 72px rgba(15,23,42,0.11)',
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
                  'linear-gradient(125deg, rgba(46,214,163,0.18) 0%, rgba(255,255,255,1) 42%, rgba(242,184,75,0.16) 100%)',
                borderBottom: '1px solid rgba(15,23,42,0.06)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 5,
                  borderRadius: '0 6px 6px 0',
                  background: `linear-gradient(180deg, #00A38C 0%, #006B5A 100%)`,
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
                  background: 'radial-gradient(circle at center, rgba(46,214,163,0.22) 0%, transparent 68%)',
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
                        background: 'linear-gradient(145deg, #2ED6A3 0%, #00A38C 55%, #006B5A 100%)',
                      }}
                      animate={{
                        boxShadow: [
                          '0 12px 32px rgba(0,163,140,0.28)',
                          '0 18px 44px rgba(0,163,140,0.42)',
                          '0 12px 32px rgba(0,163,140,0.28)',
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
                          bgcolor: 'rgba(0, 163, 140, 0.12)',
                          color: '#006B5A',
                          border: '1px solid rgba(0, 163, 140, 0.24)',
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
                        backgroundImage: 'linear-gradient(115deg, #00A38C 0%, #2ED6A3 48%, #F2B84B 100%)',
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
                      borderLeft: '4px solid #00A38C',
                      bgcolor: 'rgba(246, 251, 247, 0.9)',
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
                      <Box component="strong" sx={{ color: '#006B5A', fontWeight: 800 }}>
                        Lei Federal de Emergência Cultural Aldir Blanc nº 14.017/2020
                      </Box>
                      .
                    </Typography>
                  </Paper>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aldirBlancEditais.map((edital, idx) => (
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
                              background: 'linear-gradient(90deg, #00A38C 0%, rgba(46,214,163,0.75) 55%, transparent 100%)',
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
                                  background: 'linear-gradient(145deg, #2ED6A3 0%, #00A38C 100%)',
                                  boxShadow: '0 8px 20px rgba(0,163,140,0.28)',
                                }}
                              >
                                {edital.numero.split('/')[0]}
                              </Box>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 0.75 }}>
                                <Chip
                                  label={`Chamada ${edital.chamada}`}
                                  size="small"
                                  sx={{
                                    height: 22,
                                    fontWeight: 800,
                                    fontSize: '0.62rem',
                                    letterSpacing: '0.06em',
                                    borderRadius: '8px',
                                    fontFamily: 'inherit',
                                    bgcolor: 'rgba(15,23,42,0.06)',
                                    color: '#475569',
                                  }}
                                />
                                  <Chip
                                    label={edital.origemAdmin ? 'Dados do Admin' : 'Editável no Admin'}
                                    size="small"
                                    sx={{
                                      height: 22,
                                      fontWeight: 800,
                                      fontSize: '0.62rem',
                                      borderRadius: '8px',
                                      fontFamily: 'inherit',
                                      bgcolor: edital.origemAdmin ? 'rgba(16,185,129,0.12)' : 'rgba(0,163,140,0.10)',
                                      color: edital.origemAdmin ? '#047857' : '#006B5A',
                                    }}
                                  />
                                </Stack>
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
                                {edital.origemAdmin && (
                                  <>
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                      <div className="rounded-xl bg-slate-50 px-2 py-2 text-center">
                                        <p className="text-[0.62rem] font-black uppercase tracking-wide text-slate-400">Inscritos</p>
                                        <p className="text-sm font-black text-slate-900">{edital.inscritos}</p>
                                      </div>
                                      <div className="rounded-xl bg-emerald-50 px-2 py-2 text-center">
                                        <p className="text-[0.62rem] font-black uppercase tracking-wide text-emerald-500">Aprovados</p>
                                        <p className="text-sm font-black text-emerald-700">{edital.contemplados}</p>
                                      </div>
                                      <div className="rounded-xl bg-amber-50 px-2 py-2 text-center">
                                        <p className="text-[0.62rem] font-black uppercase tracking-wide text-amber-600">Taxa</p>
                                        <p className="text-sm font-black text-amber-700">{edital.taxa}%</p>
                                      </div>
                                    </div>
                                    {edital.valor > 0 && (
                                      <p className="mt-2 text-xs font-black text-[#006B5A]">
                                        {formatBRL(edital.valor)} investidos
                                      </p>
                                    )}
                                  </>
                                )}
                                {(edital.links?.resultado || edital.links?.resumo || edital.links?.diarioOficial) && (
                                  <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
                                    {edital.links.resultado && (
                                      <Button
                                        component="a"
                                        href={edital.links.resultado}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        size="small"
                                        variant="outlined"
                                        startIcon={<FileText size={14} />}
                                        sx={{ borderRadius: '999px', fontWeight: 800, textTransform: 'none', fontSize: '0.72rem' }}
                                      >
                                        Resultado
                                      </Button>
                                    )}
                                    {edital.links.resumo && (
                                      <Button
                                        component="a"
                                        href={edital.links.resumo}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        size="small"
                                        variant="outlined"
                                        startIcon={<BarChart3 size={14} />}
                                        sx={{ borderRadius: '999px', fontWeight: 800, textTransform: 'none', fontSize: '0.72rem' }}
                                      >
                                        Resumo
                                      </Button>
                                    )}
                                  </Stack>
                                )}
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
                          bgcolor: 'rgba(0, 163, 140, 0.12)',
                        }}
                      >
                        <ShieldCheck size={22} className="text-[#00A38C]" />
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
                      border: '1px solid rgba(0, 163, 140, 0.18)',
                      background: 'linear-gradient(165deg, rgba(240,251,244,0.96) 0%, rgba(255,255,255,0.98) 55%, rgba(242,184,75,0.16) 100%)',
                      boxShadow: '0 10px 36px rgba(0,163,140,0.09)',
                    }}
                  >
                    <Typography sx={{ fontFamily: 'inherit', fontWeight: 800, fontSize: '1.05rem', color: '#006B5A', mb: 1 }}>
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
                        background: 'linear-gradient(135deg, #00A38C 0%, #2ED6A3 48%, #006B5A 100%)',
                        boxShadow: '0 4px 14px rgba(0,163,140,0.32)',
                        '&:hover': {
                          boxShadow: '0 8px 24px rgba(0,163,140,0.42)',
                          background: 'linear-gradient(135deg, #006B5A 0%, #00A38C 100%)',
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
      <section className="container mx-auto mb-14 max-w-7xl px-4 sm:px-6 md:mb-16">
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
              subtitle={`Bairros reconhecidos na base de Ilhabela — ${distribuicaoPorBairro.length} localidade${distribuicaoPorBairro.length === 1 ? '' : 's'} identificada${distribuicaoPorBairro.length === 1 ? '' : 's'}. O gráfico mostra as principais e agrupa o restante.`}
              contentMinHeight={bairrosChartHeight}
            >
              <div className="rounded-xl border border-slate-100/90 bg-slate-50/40">
                <ResponsiveContainer width="100%" height={bairrosChartHeight} debounce={32}>
                  {distribuicaoPorBairro.length > 0 ? (
                    <BarChart key="bairro-bar-chart" data={bairrosComIds} layout="vertical" syncId="bairroBar" margin={{ top: 6, right: 38, left: 4, bottom: 4 }}>
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
                      >
                        <LabelList dataKey="qtd" position="right" style={{ fontSize: 11, fill: '#0f172a', fontWeight: 800 }} />
                      </Bar>
                    </BarChart>
                  ) : (
                    <div className="flex items-center justify-center h-[280px]">
                      <p className="text-slate-300 text-xs text-center font-medium">Aguardando importação de dados</p>
                    </div>
                  )}
                </ResponsiveContainer>
              </div>
            </InciclePanel>

            <InciclePanel kicker="Orçamento" title="Investimento anual" subtitle="Barras mostram o investimento do ano; a linha mostra o acumulado no período." contentMinHeight={320}>
              <ResponsiveContainer width="100%" height={300}>
                {evolucaoComAcumulado.length > 0 ? (
                  <ComposedChart key="evolucao-composed-chart" data={evolucaoComAcumulado} syncId="evolucaoBar" margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id={`homeGradEvolBar-${chartUid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CORES_CADASTRO.secundario} stopOpacity={1} />
                        <stop offset="100%" stopColor={CORES_CADASTRO.principal} stopOpacity={0.88} />
                      </linearGradient>
                      <linearGradient id={`homeGradEvolArea-${chartUid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00A38C" stopOpacity={0.16} />
                        <stop offset="100%" stopColor="#00A38C" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="ano" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                    <YAxis
                      yAxisId="ano"
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatCompactBRL}
                      width={74}
                    />
                    <YAxis
                      yAxisId="acumulado"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#00A38C', fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatCompactBRL}
                      width={74}
                    />
                    <RechartsTooltip
                      contentStyle={chartTooltipContentStyle}
                      formatter={(value: any, name: string) => [formatBRL(value), name]}
                      cursor={{ fill: 'rgba(11, 87, 208, 0.06)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 8 }} iconType="circle" iconSize={8} />
                    <Area
                      yAxisId="acumulado"
                      type="monotone"
                      dataKey="acumulado"
                      name="Acumulado"
                      stroke="transparent"
                      fill={`url(#homeGradEvolArea-${chartUid})`}
                      isAnimationActive={false}
                    />
                    <Bar yAxisId="ano" dataKey="valor" fill={`url(#homeGradEvolBar-${chartUid})`} radius={[10, 10, 0, 0]} maxBarSize={58} name="Investimento anual">
                      <LabelList dataKey="valor" position="top" formatter={(value: unknown) => formatCompactBRL(value)} style={{ fontSize: 10, fill: '#0f172a', fontWeight: 800 }} />
                    </Bar>
                    <Line
                      yAxisId="acumulado"
                      type="monotone"
                      dataKey="acumulado"
                      name="Acumulado"
                      stroke="#00A38C"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#00A38C', stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#00A38C', stroke: '#fff', strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
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
        <section className="container mx-auto mb-14 px-4 font-sans sm:px-6 md:mb-16">
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
                color: '#00A38C',
                border: '1px solid rgba(11, 87, 208, 0.18)',
                fontFamily: 'inherit',
              }}
            />
            <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
              <FileText className="text-[#00A38C]" size={28} strokeWidth={2} />
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
                      tick={{ fontSize: 10, fill: '#00A38C', fontWeight: 700 }}
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
                      stroke="#00A38C"
                      strokeWidth={2.2}
                      dot={{ r: 3, fill: '#00A38C', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#00A38C', stroke: '#fff', strokeWidth: 2 }}
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
                      <p className="mb-2 text-xs font-black text-[#006B5A]">{edital.nome}</p>
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
      <section className="container mx-auto mb-14 px-4 sm:px-6 md:mb-16">
        <Card sx={{ borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
          <CardContent className="p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <Calendar className="text-[#00A38C]" size={24} />
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
      <section className="container mx-auto px-4 sm:px-6">
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
          <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-35 animate-blob"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-35 animate-blob animation-delay-2000"></div>
        </div>
      </section>
    </div>
  );
}