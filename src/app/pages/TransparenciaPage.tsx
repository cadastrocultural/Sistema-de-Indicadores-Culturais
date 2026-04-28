import React, { useMemo, useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, TrendingUp, Search, Trophy,
  AlertTriangle,
} from 'lucide-react';
import { 
  Card, CardContent, Typography, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Tooltip, Box,
  TextField, Alert,
} from '@mui/material';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  Line,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

import { formatBRL } from '../data/pnab-data';
import { projectId, publicAnonKey } from '../../lib/supabaseProjectInfo';
import {
  normalizeProjetosOnParsed,
  computeDemandaOfertaPorEdital,
  getProjetoValorNormalizado,
  isProjetoContempladoParaEstatistica,
  getEditalNomeExibicaoProjeto,
  OFFICIAL_ALDIR_BLANC_2020_VALUES,
  getRankingProponentKey,
  getRankingProponentDisplayName,
  getProjetoPapelOuFuncao,
  forEachRankingContempladoRow,
} from './admin/projetosDemandaOferta';
import { findEditalLinks as resolveEditalLinks } from './admin/editalUtils';
import { computeEstatisticasPublicas } from '../data/estatisticas-publicas';

/** Exibição: evita nomes só em MAIÚSCULAS; mantém texto misto como veio da planilha. */
function formatRankingDisplayName(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return s;
  const letters = s.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  if (letters.length < 4) return s;
  const upperCount = (s.match(/[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/g) || []).length;
  const mostlyUpper = upperCount / letters.length > 0.65;
  if (!mostlyUpper) return s;
  const lower = s.toLowerCase();
  return lower
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      if (part.length <= 3 && /^(da|de|do|das|dos|e|a|o|em|no|na|ao|à)$/i.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

function rankBadgeSx(index: number) {
  if (index === 0) return { bgcolor: '#fffbeb', color: '#b45309', border: '2px solid #fcd34d', boxShadow: '0 1px 0 rgba(180,83,9,0.12)' };
  if (index === 1) return { bgcolor: '#f8fafc', color: '#475569', border: '2px solid #cbd5e1' };
  if (index === 2) return { bgcolor: '#fff7ed', color: '#9a3412', border: '2px solid #fdba74' };
  return { bgcolor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' };
}

// Carrega links customizados salvos pelo Admin no mesmo payload principal.
const getCustomEditalLinks = (): Record<string, { resultado?: string; resumo?: string; diarioOficial?: string }> => {
  try {
    const savedMain = localStorage.getItem('editais_imported_data');
    if (savedMain) {
      const parsed = JSON.parse(savedMain);
      if (parsed?.customEditalLinks && typeof parsed.customEditalLinks === 'object') {
        return parsed.customEditalLinks;
      }
    }
    // fallback legado
    const legacy = localStorage.getItem('custom_edital_links');
    return legacy ? JSON.parse(legacy) : {};
  } catch { return {}; }
};

export function TransparenciaPage() {
  const [serverData, setServerData] = useState<any>(null);
  const [buscaParticipante, setBuscaParticipante] = useState('');
  const [activeTransparenciaTab, setActiveTransparenciaTab] = useState<'visaoGeral' | 'participacoes'>('visaoGeral');
  const chartTooltipStyle: React.CSSProperties = {
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 32px rgba(15,23,42,0.12)',
    fontSize: 12,
    fontWeight: 600,
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.98)',
  };

  // Carregar dados do servidor como fonte primaria
  useEffect(() => {
    const loadFromServer = async () => {
      const base = `https://${projectId}.supabase.co/functions/v1/make-server-2320c79f`;
      const headers = {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      };
      try {
        const resp = await fetch(`${base}/load-data`, { method: 'GET', headers });
        if (resp.ok) {
          const result = await resp.json();
          if (result?.success && result.data && typeof result.data === 'object') {
            const normalized = normalizeProjetosOnParsed(result.data);
            setServerData(normalized);
            try {
              localStorage.setItem('editais_imported_data', JSON.stringify(normalized));
            } catch {
              /* quota */
            }
            return;
          }
        }
      } catch {
        /* continua */
      }
      try {
        const resp = await fetch(`${base}/data`, { headers });
        if (resp.ok) {
          const data = await resp.json();
          if (data && typeof data === 'object') {
            const normalized = normalizeProjetosOnParsed(data);
            setServerData(normalized);
            try {
              localStorage.setItem('editais_imported_data', JSON.stringify(normalized));
            } catch {
              /* quota */
            }
            return;
          }
        }
      } catch {
        console.warn('Servidor indisponivel, usando localStorage');
      }
      try {
        const stored = localStorage.getItem('editais_imported_data');
        if (stored) setServerData(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    };
    loadFromServer();
  }, []);

  // 🔥 Dados consolidados
  const dadosReais = useMemo(() => {
    const data = normalizeProjetosOnParsed(serverData || {});
    const fromServer =
      typeof data.customEditalLinks === 'object' && data.customEditalLinks ? data.customEditalLinks : {};
    return {
      agentes: data.agentes || [],
      grupos: data.grupos || [],
      espacos: data.espacos || [],
      projetos: data.projetos || [],
      mapeamento: Array.isArray(data.mapeamento) ? data.mapeamento : [],
      editalResumoOverrides: data.editalResumoOverrides || {},
      customEditalLinks: { ...getCustomEditalLinks(), ...fromServer },
    };
  }, [serverData]);

  // Mesmos totais da home (KPIs) — função única em `estatisticas-publicas`
  const stats = useMemo(
    () =>
      computeEstatisticasPublicas({
        agentes: dadosReais.agentes,
        grupos: dadosReais.grupos,
        espacos: dadosReais.espacos,
        projetos: dadosReais.projetos,
        mapeamento: dadosReais.mapeamento,
      }),
    [dadosReais]
  );

  // Ranking de contemplados: apenas dados importados (controlados no Admin)
  const rankingProponentes = useMemo(() => {
    const map = new Map<string, { count: number; total: number; editais: Set<string>; displayName: string }>();

    forEachRankingContempladoRow(
      {
        projetos: dadosReais.projetos,
        agentes: dadosReais.agentes,
        grupos: dadosReais.grupos,
        espacos: dadosReais.espacos,
        mapeamento: dadosReais.mapeamento,
      },
      (p: any) => {
        const key = getRankingProponentKey(p);
        if (!key) return;
        const displayName = getRankingProponentDisplayName(p);
        const edital = getEditalNomeExibicaoProjeto(p);
        const valor = getProjetoValorNormalizado(p);
        const contemplado = isProjetoContempladoParaEstatistica(p);
        if (!contemplado) return;

        const current = map.get(key) || { count: 0, total: 0, editais: new Set<string>(), displayName: '' };
        current.count += 1;
        current.total += Math.max(0, valor);
        current.editais.add(edital);
        if (!current.displayName && displayName) current.displayName = displayName;
        else if (displayName && displayName !== 'Proponente não informado' && displayName.length > (current.displayName || '').length) {
          current.displayName = displayName;
        }
        map.set(key, current);
      },
    );

    return Array.from(map.entries())
      .map(([internalKey, data]) => {
        const editaisArray = Array.from(data.editais).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const editalNomes = editaisArray.join(' · ');
        const fallbackName = internalKey.startsWith('nome:')
          ? internalKey
              .slice(5)
              .split(' ')
              .filter(Boolean)
              .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w))
              .join(' ')
          : internalKey.startsWith('doc:')
            ? `Cadastro ${internalKey.slice(4)}`
            : internalKey;
        const rawName =
          data.displayName && data.displayName !== 'Proponente não informado'
            ? data.displayName
            : fallbackName;
        return {
          internalKey,
          name: formatRankingDisplayName(rawName),
          count: data.count,
          total: data.total,
          editaisArray,
          editalNomes: editalNomes || 'Edital não informado',
        };
      })
      .filter((row) => row.count > 0)
      .sort((a, b) => b.total - a.total || b.count - a.count);
  }, [dadosReais]);

  // Breakdown por edital
  const breakdownEditais = useMemo(() => {
    const rows = computeDemandaOfertaPorEdital(
      dadosReais.projetos,
      dadosReais.editalResumoOverrides
    ).map(ed => ({
      nome: ed.nome,
      chave: ed.chave,
      inscritos: ed.inscritos,
      contemplados: ed.contemplados,
      valor: ed.valorInvestido,
    }));

    const norm = (v: string) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const upsertOfficial = (tipo: 'agentes' | 'grupos' | 'espacos', sourceRows: any[], matcher: (text: string) => boolean) => {
      const official = OFFICIAL_ALDIR_BLANC_2020_VALUES[tipo];
      const existing = rows.find((ed) => matcher(norm(`${ed.nome} ${(ed as any).chave || ''}`)));
      if (!sourceRows.length && !existing) return;
      const row = {
        nome: official.nome,
        chave: official.chave,
        inscritos: existing?.inscritos && existing.inscritos > 0 ? existing.inscritos : sourceRows.length || official.contemplados,
        contemplados: official.contemplados,
        valor: official.valorInvestido,
      };
      if (existing) Object.assign(existing, row);
      else rows.push(row);
    };
    upsertOfficial('agentes', dadosReais.agentes, (text) => text.includes('agentes culturais') || text.includes('premiacao de agentes'));
    upsertOfficial('grupos', dadosReais.grupos, (text) => text.includes('grupos') || text.includes('coletivos'));
    upsertOfficial('espacos', dadosReais.espacos, (text) => text.includes('espacos') || text.includes('espaco cultural'));
    return rows;
  }, [dadosReais]);

  const breakdownEditaisChart = useMemo(() => {
    return breakdownEditais.map((ed) => {
      const links = resolveEditalLinks(ed.nome, dadosReais.customEditalLinks);
      const nomeCurto = ed.nome.length > 28 ? `${ed.nome.slice(0, 27)}…` : ed.nome;
      const taxa = ed.inscritos > 0 ? Math.round((ed.contemplados / ed.inscritos) * 100) : 0;
      return {
        ...ed,
        nomeCurto,
        taxa,
        links,
      };
    });
  }, [breakdownEditais, dadosReais.customEditalLinks]);

  const participantesAnalise = useMemo(() => {
    const projetos = dadosReais.projetos || [];
    const map = new Map<string, {
      nomeDisplay: string;
      projetos: Array<{ nomeProjeto: string; edital: string; anoLabel: string; valor: number; contemplado: boolean; funcao: string }>;
      editaisCount: Map<string, number>;
      totalProjetos: number;
      totalContemplados: number;
      valorTotal: number;
      alertas: string[];
    }>();

    projetos.forEach((p: any) => {
      const key = getRankingProponentKey(p);
      if (!key) return;
      const nomeDisplay = getRankingProponentDisplayName(p);
      const edital = getEditalNomeExibicaoProjeto(p);
      const anoLabel = String(p._anoOrigem || p.ano || p.Ano || '').trim();
      const valor = getProjetoValorNormalizado(p);
      const contemplado = isProjetoContempladoParaEstatistica(p);
      const nomeProjeto = String(p.nomeProjeto || p.projeto || p.Projeto || p.titulo || p.Título || p.nome || '').trim();
      const funcao = getProjetoPapelOuFuncao(p);

      const current = map.get(key) || {
        nomeDisplay,
        projetos: [],
        editaisCount: new Map<string, number>(),
        totalProjetos: 0,
        totalContemplados: 0,
        valorTotal: 0,
        alertas: [],
      };
      if (!current.nomeDisplay || current.nomeDisplay === 'Proponente não informado') current.nomeDisplay = nomeDisplay;
      current.projetos.push({
        nomeProjeto: nomeProjeto || '(sem nome)',
        edital,
        anoLabel,
        valor: contemplado ? valor : 0,
        contemplado,
        funcao,
      });
      current.totalProjetos += 1;
      current.totalContemplados += contemplado ? 1 : 0;
      current.valorTotal += contemplado ? valor : 0;
      const editalKey = `${edital}||${anoLabel}`;
      current.editaisCount.set(editalKey, (current.editaisCount.get(editalKey) || 0) + 1);
      map.set(key, current);
    });

    const rows = Array.from(map.entries()).map(([internalKey, row]) => {
      const maxProjetosMesmoEdital =
        row.editaisCount.size > 0 ? Math.max(...Array.from(row.editaisCount.values())) : 0;
      const alertas = Array.from(row.editaisCount.entries())
        .filter(([, count]) => count > 4)
        .map(([key, count]) => {
          const [edital] = key.split('||');
          return `${edital}: ${count} inscrições no mesmo edital`;
        });
      return {
        internalKey,
        ...row,
        maxProjetosMesmoEdital,
        alertas,
        /* getEditalNomeExibicaoProjeto já inclui o ano; não repetir (evita "Edital X (2020) (2020)") */
        editaisUnicos: Array.from(row.editaisCount.keys()).map((k) => k.split('||')[0]),
      };
    }).sort((a, b) => b.totalProjetos - a.totalProjetos || b.valorTotal - a.valorTotal);

    const busca = buscaParticipante.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const filtrados = busca
      ? rows.filter((row) => {
          const haystack = [
            row.nomeDisplay,
            row.editaisUnicos.join(' '),
            row.projetos.map((p) => [p.nomeProjeto, p.funcao].filter(Boolean).join(' ')).join(' '),
          ].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return haystack.includes(busca);
        })
      : rows;

    return {
      totalInscricoes: projetos.length,
      totalParticipantes: rows.length,
      totalAlertas: rows.filter((row) => row.alertas.length > 0).length,
      comContemplacao: rows.filter((row) => row.totalContemplados > 0).length,
      rows,
      filtrados,
    };
  }, [dadosReais.projetos, buscaParticipante]);

  const statsData = [
    { label: 'Inscricoes no Sistema', value: stats.totalInscritos > 0 ? stats.totalInscritos.toString() : '-', sub: 'Historico Acumulado', icon: <Search size={24} /> },
    { label: 'Contemplados', value: stats.totalContemplados > 0 ? stats.totalContemplados.toString() : '-', sub: `${stats.totalEditais} edital(is)`, icon: <CheckCircle2 size={24} /> },
    { label: 'Total Investido', value: stats.totalValorInvestido > 0 ? formatBRL(stats.totalValorInvestido) : '-', sub: 'Dados Reais', icon: <TrendingUp size={24} /> },
  ];

  return (
    <div className="container mx-auto flex min-h-screen min-w-0 flex-col gap-10 bg-transparent px-4 py-8 font-sans text-slate-900 sm:px-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.2)] md:p-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-teal-400/15 blur-3xl" aria-hidden />
        <div className="absolute bottom-0 left-8 h-40 w-64 rounded-full bg-slate-400/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="ds-dash-kicker mb-2 text-teal-800">Transparência · dados abertos</p>
            <h1 className="m-0 max-w-3xl text-balance text-3xl font-bold tracking-[-0.03em] text-slate-900 sm:text-4xl">
              Indicadores, editais e participação cultural
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-normal leading-relaxed text-slate-600">
              Valores investidos, contemplações e análise de participantes — alinhado ao painel administrativo e às fontes oficiais.
            </p>
          </div>
          <div className="grid min-w-0 max-w-full grid-cols-2 gap-2 sm:min-w-[320px]">
            <div className="ds-analytics-stat-card min-w-0 overflow-hidden p-4">
              <p className="m-0 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Editais</p>
              <p className="m-0 mt-1 font-mono text-3xl font-semibold tabular-nums text-teal-700">{stats.totalEditais}</p>
            </div>
            <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200/90 border-l-amber-500/90 bg-gradient-to-br from-amber-50/90 to-white p-4">
              <p className="m-0 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-amber-900/80">Investido</p>
              <p className="m-0 mt-1 min-w-0 break-words text-left font-mono text-sm font-semibold leading-snug [overflow-wrap:anywhere] tabular-nums text-amber-950 sm:text-base md:text-lg">
                {stats.totalValorInvestido > 0 ? formatBRL(stats.totalValorInvestido) : '-'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <nav
        className="flex flex-col gap-2 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-[0_12px_40px_-32px_rgba(15,23,42,0.15)] sm:flex-row"
        aria-label="Abas da página de transparência"
      >
        {[
          { id: 'visaoGeral', label: 'Visão geral', helper: 'Indicadores, gráficos e ranking de contemplados' },
          { id: 'participacoes', label: 'Análise de participações', helper: 'Participantes, editais, valores e alertas' },
        ].map((tab) => {
          const selected = activeTransparenciaTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTransparenciaTab(tab.id as 'visaoGeral' | 'participacoes')}
              className={`flex-1 rounded-xl px-4 py-3 text-left transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                selected
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="block text-sm font-semibold">{tab.label}</span>
              <span className={`mt-0.5 block text-[0.72rem] font-medium ${selected ? 'text-slate-300' : 'text-slate-400'}`}>{tab.helper}</span>
            </button>
          );
        })}
      </nav>

      {activeTransparenciaTab === 'visaoGeral' && (
        <>
      <section className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_16px_48px_-36px_rgba(15,23,42,0.14)]">
        <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3">
          {statsData.map((stat) => (
            <Card
              key={stat.label}
              sx={{
                borderRadius: '22px',
                border: '1px solid rgba(0, 163, 140, 0.16)',
                boxShadow: '0 16px 36px -32px rgba(0,107,90,0.45)',
                minWidth: 0,
                maxWidth: '100%',
                overflow: 'hidden',
                background: 'linear-gradient(180deg, #ffffff 0%, #f6fbf7 100%)',
              }}
            >
              <CardContent className="flex min-w-0 flex-col items-stretch p-3 text-center">
                <p className="m-0 min-w-0 break-words text-[0.72rem] font-semibold text-slate-500 [overflow-wrap:anywhere]">{stat.label}</p>
                <p
                  className="m-0 mt-1 min-w-0 max-w-full break-words text-[#00A38C] [overflow-wrap:anywhere] tabular-nums"
                  style={{
                    fontSize: 'clamp(1.05rem, 2.1vw + 0.4rem, 1.75rem)',
                    fontWeight: 900,
                    lineHeight: 1.15,
                    wordBreak: 'break-word',
                  }}
                >
                  {stat.value}
                </p>
                <p className="m-0 mt-0.5 min-w-0 break-words text-[0.68rem] font-semibold text-slate-500 [overflow-wrap:anywhere]">{stat.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {breakdownEditais.length > 0 && (
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
            <Card sx={{ borderRadius: '22px', border: '1px solid rgba(0, 163, 140, 0.16)', boxShadow: '0 16px 40px -34px rgba(0,107,90,0.45)', minWidth: 0, overflow: 'hidden' }}>
              <CardContent className="min-w-0 p-3">
                <p className="mb-1 text-xs font-bold text-slate-600">Inscritos x Contemplados</p>
                <div className="h-[220px] w-full min-w-0 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={breakdownEditaisChart} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis dataKey="nomeCurto" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} interval={0} angle={-15} textAnchor="end" height={70} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="qtd" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} width={34} />
                      <RechartsTooltip contentStyle={chartTooltipStyle} labelFormatter={(_, payload) => String(payload?.[0]?.payload?.nome || '')} />
                      <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} iconType="circle" iconSize={8} />
                      <Bar yAxisId="qtd" dataKey="inscritos" name="Inscritos" fill="#2ED6A3" radius={[4, 4, 0, 0]} maxBarSize={22} />
                      <Bar yAxisId="qtd" dataKey="contemplados" name="Contemplados" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: '22px', border: '1px solid rgba(0, 163, 140, 0.16)', boxShadow: '0 16px 40px -34px rgba(0,107,90,0.45)', minWidth: 0, overflow: 'hidden' }}>
              <CardContent className="min-w-0 p-3">
                <p className="mb-1 text-xs font-bold text-slate-600">Valor Investido por Edital</p>
                <div className="h-[220px] w-full min-w-0 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={breakdownEditaisChart} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis dataKey="nomeCurto" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} interval={0} angle={-15} textAnchor="end" height={70} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} width={52} />
                      <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatBRL(value)} labelFormatter={(_, payload) => String(payload?.[0]?.payload?.nome || '')} />
                      <Bar dataKey="valor" name="Valor Investido" fill="#00A38C" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: '22px', border: '1px solid rgba(0, 163, 140, 0.16)', boxShadow: '0 16px 40px -34px rgba(0,107,90,0.45)', minWidth: 0, overflow: 'hidden' }}>
              <CardContent className="min-w-0 p-3">
                <p className="mb-1 text-xs font-bold text-slate-600">Taxa de contemplação por edital</p>
                <div className="h-[220px] w-full min-w-0 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={breakdownEditaisChart} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis dataKey="nomeCurto" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} interval={0} angle={-15} textAnchor="end" height={70} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={34} unit="%" />
                      <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value: number) => `${value}%`} labelFormatter={(_, payload) => String(payload?.[0]?.payload?.nome || '')} />
                      <Line type="monotone" dataKey="taxa" name="Taxa" stroke="#16a34a" strokeWidth={2.3} dot={{ r: 3, fill: '#16a34a', strokeWidth: 0 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

        </>
      )}

      {activeTransparenciaTab === 'participacoes' && (
      <section className="min-w-0 rounded-[30px] border border-emerald-100/90 bg-white/90 p-5 shadow-[0_18px_60px_-44px_rgba(0,107,90,0.45)] backdrop-blur-xl md:p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Users size={26} className="text-[#00A38C]" />
              <h2 className="m-0 text-2xl font-black tracking-tight text-[#006B5A]">Análise de participantes</h2>
            </div>
            <p className="m-0 max-w-3xl text-sm font-medium leading-relaxed text-slate-600">
              Consulta pública de participantes agrupados por proponente, com total de inscrições, contemplações, editais e alertas de mais de 4 projetos no mesmo edital.
            </p>
          </div>
          {participantesAnalise.totalAlertas > 0 && (
            <Chip
              icon={<AlertTriangle size={14} />}
              label={`${participantesAnalise.totalAlertas} alerta(s)`}
              sx={{ alignSelf: 'flex-start', bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 900 }}
            />
          )}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total de inscrições', value: participantesAnalise.totalInscricoes, color: '#006B5A', bg: '#e8f5ee' },
            { label: 'Participantes únicos', value: participantesAnalise.totalParticipantes, color: '#2e7d32', bg: '#e8f5e9' },
            { label: 'Alertas > 4 por edital', value: participantesAnalise.totalAlertas, color: '#c62828', bg: '#fce4ec' },
            { label: 'Com contemplação', value: participantesAnalise.comContemplacao, color: '#e65100', bg: '#fff3e0' },
          ].map((item) => (
            <Paper key={item.label} elevation={0} sx={{ p: 2, borderRadius: 4, bgcolor: item.bg, border: '1px solid rgba(0,107,90,0.10)', textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.65rem', md: '2rem' }, color: item.color, lineHeight: 1 }}>
                {item.value.toLocaleString('pt-BR')}
              </Typography>
              <Typography sx={{ mt: 0.75, color: item.color, fontWeight: 800, fontSize: '0.76rem' }}>
                {item.label}
              </Typography>
            </Paper>
          ))}
        </div>

        <TextField
          fullWidth
          size="small"
          placeholder="Buscar por participante, projeto ou edital..."
          value={buscaParticipante}
          onChange={(event) => setBuscaParticipante(event.target.value)}
          sx={{ mb: 3, bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 4, fontWeight: 700 } }}
          InputProps={{ startAdornment: <Search size={16} className="mr-2 text-slate-400" /> }}
        />

        {participantesAnalise.rows.length === 0 ? (
          <Alert severity="warning">Nenhum projeto importado para análise de participantes.</Alert>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 5, boxShadow: 'none', border: '1px solid #d7efe3', overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f6fbf7' }}>
                  <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }}>Participante</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, fontSize: '0.75rem' }}>
                    <Tooltip title="Total de inscrições deste participante em todos os editais. O limite de alerta é por edital (mesmo nome + ano): mais de 4 inscrições no mesmo edital.">
                      <span style={{ cursor: 'help', borderBottom: '1px dotted #94a3b8' }}>Projetos (total)</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, fontSize: '0.75rem' }}>Contemplados</TableCell>
                  <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }}>Editais</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, fontSize: '0.75rem' }}>Valor recebido</TableCell>
                  <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }}>
                    <Tooltip title="Nome do projeto, edital, função ou papel (quando a planilha tiver coluna identificável) e status.">
                      <span style={{ cursor: 'help', borderBottom: '1px dotted #94a3b8' }}>Projetos / função</span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {participantesAnalise.filtrados.slice(0, 120).map((pessoa) => (
                  <TableRow
                    key={pessoa.internalKey}
                    hover
                    sx={{
                      bgcolor: pessoa.alertas.length > 0 ? '#fff7ed' : 'transparent',
                      '& td': { borderBottomColor: '#edf2f7' },
                    }}
                  >
                    <TableCell sx={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', minWidth: 190 }}>
                      {pessoa.alertas.length > 0 && (
                        <Chip label="+4 por edital" size="small" sx={{ bgcolor: '#f97316', color: 'white', fontWeight: 900, fontSize: '0.6rem', mr: 0.5, mb: 0.75 }} />
                      )}
                      <span className="block">{pessoa.nomeDisplay}</span>
                      {pessoa.alertas.length > 0 && (
                        <span className="mt-1 block text-[0.68rem] font-bold leading-snug text-orange-700">
                          {pessoa.alertas.join(' · ')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={`Total em todos os editais: ${pessoa.totalProjetos}. Maior concentração num único edital: ${pessoa.maxProjetosMesmoEdital} inscrição(ões).`}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.35 }}>
                          <Chip label={pessoa.totalProjetos} size="small" sx={{ fontWeight: 900, bgcolor: pessoa.totalProjetos > 4 ? '#ef4444' : pessoa.totalProjetos > 2 ? '#f59e0b' : '#e2e8f0', color: pessoa.totalProjetos > 2 ? 'white' : '#1e293b' }} />
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, fontSize: '0.62rem', lineHeight: 1.2 }}>
                            máx. {pessoa.maxProjetosMesmoEdital} / edital
                          </Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      {pessoa.totalContemplados > 0 ? (
                        <Chip label={pessoa.totalContemplados} size="small" sx={{ bgcolor: '#16a34a', color: 'white', fontWeight: 900 }} />
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>-</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 280 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.65 }}>
                        {pessoa.editaisUnicos.slice(0, 4).map((edital: string, idx: number) => (
                          <Box
                            key={`${pessoa.internalKey}-edital-${idx}`}
                            sx={{
                              px: 1,
                              py: 0.65,
                              borderRadius: '10px',
                              bgcolor: '#f0fbf4',
                              border: '1px solid #d7efe3',
                              color: '#006b5a',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              lineHeight: 1.25,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {edital}
                          </Box>
                        ))}
                        {pessoa.editaisUnicos.length > 4 && (
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800 }}>
                            + {pessoa.editaisUnicos.length - 4} edital(is)
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.78rem', fontWeight: 900, color: pessoa.valorTotal > 0 ? '#166534' : '#94a3b8' }}>
                      {pessoa.valorTotal > 0 ? formatBRL(pessoa.valorTotal) : '-'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <div className="flex flex-col gap-1">
                        {pessoa.projetos.slice(0, 5).map((projeto, idx) => (
                          <div key={`${pessoa.internalKey}-${idx}`} className="flex flex-col gap-0.5 text-[0.68rem] leading-snug text-slate-600">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className={projeto.contemplado ? 'font-bold text-emerald-700' : 'font-medium'}>{projeto.nomeProjeto}</span>
                              <Chip label={projeto.edital} size="small" sx={{ height: 17, fontSize: '0.55rem', bgcolor: '#e8f5ee', color: '#006b5a', fontWeight: 700 }} />
                              {projeto.contemplado && <Chip label="Contemplado" size="small" sx={{ height: 17, fontSize: '0.55rem', bgcolor: '#dcfce7', color: '#166534', fontWeight: 800 }} />}
                            </div>
                            {projeto.funcao ? (
                              <span className="text-[0.62rem] font-semibold text-slate-500">Função / papel: {projeto.funcao}</span>
                            ) : (
                              <span className="text-[0.6rem] font-medium italic text-slate-400">Função / papel: não informado na planilha</span>
                            )}
                          </div>
                        ))}
                        {pessoa.projetos.length > 5 && (
                          <span className="text-[0.68rem] font-bold text-slate-400">+ {pessoa.projetos.length - 5} projeto(s)</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {participantesAnalise.filtrados.length > 120 && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                  Exibindo 120 de {participantesAnalise.filtrados.length} participantes. Use a busca para filtrar.
                </Typography>
              </Box>
            )}
          </TableContainer>
        )}
      </section>

      )}

      {activeTransparenciaTab === 'visaoGeral' && (
      <section className="min-w-0">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F2B84B] to-amber-600 shadow-md shadow-amber-900/20">
                <Trophy size={28} className="text-white" strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-[#006b5a] sm:text-3xl">Ranking de contemplados</h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Inclui <strong className="font-semibold text-slate-800">projetos de fomento</strong> (valores por faixa na planilha) e{' '}
                  <strong className="font-semibold text-slate-800">cadastro Aldir 2020</strong> (agentes R$ 2.016,80; grupos R$ 3.000; espaços R$ 9.000) quando contemplado/habilitado nas abas ou no mapeamento.
                  Linhas só em projetos não duplicam o mesmo proponente do cadastro.
                </p>
              </div>
            </div>
            {rankingProponentes.length > 0 && (
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem' }}>
                {rankingProponentes.length} proponente{rankingProponentes.length !== 1 ? 's' : ''} no ranking
              </Typography>
            )}
          </div>
          
          {rankingProponentes.length > 0 ? (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: '1.25rem',
                border: '1px solid #e2e8f0',
                overflow: 'auto',
                bgcolor: '#fafafa',
                boxShadow: '0 4px 24px -12px rgba(15, 23, 42, 0.12)',
              }}
            >
              <Table stickyHeader sx={{ minWidth: 720 }} size="small">
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        width: 56,
                        bgcolor: '#f8fafc',
                        color: '#475569',
                        fontWeight: 800,
                        fontSize: '0.65rem',
                        letterSpacing: '0.06em',
                        borderBottom: '2px solid #e2e8f0',
                        py: 1.5,
                      }}
                      align="center"
                    >
                      Pos.
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: '#f8fafc',
                        color: '#475569',
                        fontWeight: 800,
                        fontSize: '0.65rem',
                        letterSpacing: '0.06em',
                        borderBottom: '2px solid #e2e8f0',
                        py: 1.5,
                        minWidth: 160,
                      }}
                    >
                      Proponente
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: '#f8fafc',
                        color: '#475569',
                        fontWeight: 800,
                        fontSize: '0.65rem',
                        letterSpacing: '0.06em',
                        borderBottom: '2px solid #e2e8f0',
                        py: 1.5,
                        minWidth: 220,
                      }}
                    >
                      Editais (contemplado / habilitado)
                    </TableCell>
                    <TableCell
                      sx={{
                        width: 88,
                        bgcolor: '#f8fafc',
                        color: '#475569',
                        fontWeight: 800,
                        fontSize: '0.65rem',
                        letterSpacing: '0.06em',
                        borderBottom: '2px solid #e2e8f0',
                        py: 1.5,
                      }}
                      align="center"
                    >
                      Projetos
                    </TableCell>
                    <TableCell
                      sx={{
                        width: 128,
                        bgcolor: '#f8fafc',
                        color: '#475569',
                        fontWeight: 800,
                        fontSize: '0.65rem',
                        letterSpacing: '0.06em',
                        borderBottom: '2px solid #e2e8f0',
                        py: 1.5,
                      }}
                      align="right"
                    >
                      Total
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rankingProponentes.map((row, idx) => {
                    const editaisVisiveis = row.editaisArray.slice(0, 5);
                    const editaisRestantes = row.editaisArray.length - editaisVisiveis.length;
                    return (
                      <TableRow
                        key={row.internalKey}
                        hover
                        sx={{
                          '&:nth-of-type(even)': { bgcolor: 'rgba(255,255,255,0.92)' },
                          '&:nth-of-type(odd)': { bgcolor: '#ffffff' },
                          '& td': { borderBottom: '1px solid #f1f5f9', verticalAlign: 'top', py: 1.75 },
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <TableCell align="center" sx={{ pt: 2 }}>
                          <Box
                            sx={{
                              mx: 'auto',
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '0.8rem',
                              ...rankBadgeSx(idx),
                            }}
                          >
                            {idx + 1}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ pt: 2 }}>
                          <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.875rem', lineHeight: 1.35 }}>
                            {row.name}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ pt: 1.75 }}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                            {editaisVisiveis.map((edital: string, editalIdx: number) => (
                              <Chip
                                key={`${row.internalKey}-e-${editalIdx}`}
                                label={edital}
                                size="small"
                                variant="outlined"
                                sx={{
                                  height: 'auto',
                                  py: 0.35,
                                  '& .MuiChip-label': {
                                    whiteSpace: 'normal',
                                    overflowWrap: 'anywhere',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    lineHeight: 1.25,
                                    px: 0.75,
                                    py: 0.25,
                                  },
                                  borderColor: '#cbd5e1',
                                  color: '#334155',
                                  bgcolor: 'rgba(248,250,252,0.9)',
                                  maxWidth: '100%',
                                }}
                              />
                            ))}
                            {editaisRestantes > 0 && (
                              <Tooltip title={row.editaisArray.slice(5).join(' · ')} arrow placement="top">
                                <Chip
                                  label={`+${editaisRestantes}`}
                                  size="small"
                                  sx={{
                                    height: 22,
                                    fontSize: '0.62rem',
                                    fontWeight: 900,
                                    bgcolor: '#e0f2fe',
                                    color: '#0369a1',
                                  }}
                                />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ pt: 2 }}>
                          <Typography
                            component="span"
                            sx={{
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 900,
                              fontSize: '0.95rem',
                              color: '#006b5a',
                            }}
                          >
                            {row.count}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ pt: 2, pr: 2 }}>
                          <Typography
                            sx={{
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 900,
                              fontSize: '0.9rem',
                              color: row.total > 0 ? '#15803d' : '#94a3b8',
                            }}
                          >
                            {formatBRL(row.total)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Card sx={{ borderRadius: '1.25rem', p: 6, textAlign: 'center', border: '1px solid #e5e7eb', bgcolor: '#fafafa' }}>
              <Typography color="textSecondary" sx={{ fontWeight: 600 }}>
                Nenhum dado de contemplados disponível. Importe dados no painel administrativo.
              </Typography>
            </Card>
          )}
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/90 px-5 py-4 text-slate-700">
            <TrendingUp size={22} className="mt-0.5 shrink-0 text-[#00A38C]" />
            <p className="text-sm font-medium leading-relaxed">
              Dados consolidados a partir de diários oficiais e editais culturais do município, espelhando o que foi importado no painel.
            </p>
          </div>
      </section>
      )}
    </div>
  );
}
