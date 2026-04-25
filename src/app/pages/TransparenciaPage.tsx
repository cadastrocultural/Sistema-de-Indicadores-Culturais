import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  History, FileText, Download, ExternalLink, Award, Users, 
  Calendar, CheckCircle2, TrendingUp, Search, Filter, Trophy 
} from 'lucide-react';
import { 
  Button, Card, CardContent, Typography, Divider, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Tooltip, Box
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
import { projectId, publicAnonKey } from '/utils/supabase/info';
import {
  normalizeProjetosOnParsed,
  computeDemandaOfertaPorEdital,
  getProjetoValorNormalizado,
  isProjetoContemplado,
  getEditalNomeExibicaoProjeto,
  getRankingProponentKey,
  getRankingProponentDisplayName,
  pickRicherCadastroPayload,
} from './admin/projetosDemandaOferta';
import { findEditalLinks as resolveEditalLinks } from './admin/editalUtils';
import { computeEstatisticasPublicas } from '../data/estatisticas-publicas';

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
            let merged: Record<string, unknown> = normalized as Record<string, unknown>;
            try {
              const loc = localStorage.getItem('editais_imported_data');
              if (loc) {
                merged = pickRicherCadastroPayload(normalized, JSON.parse(loc)) as Record<string, unknown>;
              }
            } catch {
              /* mantém servidor */
            }
            setServerData(normalizeProjetosOnParsed(merged));
            try {
              localStorage.setItem('editais_imported_data', JSON.stringify(merged));
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
            let merged: Record<string, unknown> = normalized as Record<string, unknown>;
            try {
              const loc = localStorage.getItem('editais_imported_data');
              if (loc) merged = pickRicherCadastroPayload(normalized, JSON.parse(loc)) as Record<string, unknown>;
            } catch {
              /* mantém servidor */
            }
            setServerData(normalizeProjetosOnParsed(merged));
            try {
              localStorage.setItem('editais_imported_data', JSON.stringify(merged));
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

  // Timeline corrigida (sem "Lei Aldir Blanc II")
  const timelineData = [
    {
      year: '2020',
      title: 'Lei Aldir Blanc I (Ilhabela)',
      desc: 'Execucao emergencial com 3 editais de premiacao: Agentes Culturais (010/2020), Grupos e Coletivos (011/2020) e Espacos Culturais (013/2020).',
      links: [
        { label: 'Portal do Cadastro Cultural', url: 'https://www.ilhabela.sp.gov.br/cadastro-cultural-de-ilhabela#linha-tempo' }
      ]
    },
    {
      year: '2021',
      title: 'Edital de Fomento (Chamada 221/2020)',
      desc: 'Selecao e fomento de projetos culturais com recursos da Lei Aldir Blanc.',
      links: [
        { label: 'Resultados Historicos', url: 'https://www.ilhabela.sp.gov.br/arquivos/resultado_%E2%80%93_agentes_13081549.pdf' }
      ]
    },
    {
      year: '2024',
      title: 'PNAB - Ciclo I (Editais de Fomento)',
      desc: 'Implementacao da Politica Nacional Aldir Blanc com editais de fomento a projetos culturais.',
      links: [
        { label: 'Plano de Acao PNAB', url: 'https://drive.google.com/file/d/1nz6r4k6cbi7YSVjGMIbzn5iWQtiV5-o0/view' }
      ]
    }
  ];

  // Ranking de contemplados: apenas dados importados (controlados no Admin)
  const rankingProponentes = useMemo(() => {
    const map = new Map<string, { count: number; total: number; editais: Set<string>; displayName: string }>();

    dadosReais.projetos.filter(isProjetoContemplado).forEach((p: any) => {
      const key = getRankingProponentKey(p);
      if (!key) return;
      const displayName = getRankingProponentDisplayName(p);
      const edital = getEditalNomeExibicaoProjeto(p);
      const valor = getProjetoValorNormalizado(p);

      const current = map.get(key) || { count: 0, total: 0, editais: new Set<string>(), displayName: '' };
      current.count += 1;
      current.total += valor;
      current.editais.add(edital);
      if (!current.displayName && displayName) current.displayName = displayName;
      else if (displayName && displayName !== 'Proponente não informado' && displayName.length > (current.displayName || '').length) {
        current.displayName = displayName;
      }
      map.set(key, current);
    });

    return Array.from(map.entries())
      .map(([internalKey, data]) => {
        const editalNomes = Array.from(data.editais).sort((a, b) => a.localeCompare(b, 'pt-BR')).join(' · ');
        return {
          internalKey,
          name: data.displayName || internalKey.replace(/^nome:/, '').replace(/^doc:/, 'Cadastro '),
          count: data.count,
          total: data.total,
          editalNomes: editalNomes || 'Edital não informado',
        };
      })
      .sort((a, b) => b.total - a.total || b.count - a.count);
  }, [dadosReais]);

  // Breakdown por edital
  const breakdownEditais = useMemo(() => {
    return computeDemandaOfertaPorEdital(
      dadosReais.projetos,
      dadosReais.editalResumoOverrides
    ).map(ed => ({
      nome: ed.nome,
      inscritos: ed.inscritos,
      contemplados: ed.contemplados,
      valor: ed.valorInvestido,
    }));
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

  const statsData = [
    { label: 'Inscricoes no Sistema', value: stats.totalInscritos > 0 ? stats.totalInscritos.toString() : '-', sub: 'Historico Acumulado', icon: <Search size={24} /> },
    { label: 'Contemplados', value: stats.totalContemplados > 0 ? stats.totalContemplados.toString() : '-', sub: `${stats.totalEditais} edital(is)`, icon: <CheckCircle2 size={24} /> },
    { label: 'Prestacao de Contas', value: '100%', sub: 'Regularidade', icon: <FileText size={24} /> },
    { label: 'Total Investido', value: stats.totalValorInvestido > 0 ? formatBRL(stats.totalValorInvestido) : '-', sub: 'Dados Reais', icon: <TrendingUp size={24} /> },
  ];

  return (
    <div className="container mx-auto min-w-0 px-6 py-8 flex flex-col gap-10 bg-[#f8f9fa] min-h-screen font-sans text-[#1b1b1f]">
      <section className="min-w-0 rounded-2xl border border-[#9ec5ff] bg-white p-3 shadow-[0_1px_2px_rgba(11,87,208,0.08)]">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {statsData.map((stat) => (
            <Card
              key={stat.label}
              sx={{
                borderRadius: '10px',
                border: '1px solid #93c5fd',
                boxShadow: 'none',
                minWidth: 0,
              }}
            >
              <CardContent className="p-3 text-center">
                <p className="m-0 text-[0.72rem] font-semibold text-slate-500">{stat.label}</p>
                <p className="m-0 mt-1 text-3xl font-black leading-tight text-[#0b57d0]">{stat.value}</p>
                <p className="m-0 mt-0.5 text-[0.68rem] font-semibold text-slate-500">{stat.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {breakdownEditais.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card sx={{ borderRadius: '10px', border: '1px solid #93c5fd', boxShadow: 'none' }}>
              <CardContent className="p-3">
                <p className="mb-1 text-xs font-bold text-slate-600">Inscritos x Contemplados</p>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={breakdownEditaisChart} margin={{ top: 6, right: 6, left: 0, bottom: 6 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis dataKey="nomeCurto" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} interval={0} angle={-15} textAnchor="end" height={70} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="qtd" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} width={34} />
                      <RechartsTooltip contentStyle={chartTooltipStyle} labelFormatter={(_, payload) => String(payload?.[0]?.payload?.nome || '')} />
                      <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} iconType="circle" iconSize={8} />
                      <Bar yAxisId="qtd" dataKey="inscritos" name="Inscritos" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={22} />
                      <Bar yAxisId="qtd" dataKey="contemplados" name="Contemplados" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: '10px', border: '1px solid #93c5fd', boxShadow: 'none' }}>
              <CardContent className="p-3">
                <p className="mb-1 text-xs font-bold text-slate-600">Valor Investido por Edital</p>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={breakdownEditaisChart} margin={{ top: 6, right: 8, left: 0, bottom: 6 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis dataKey="nomeCurto" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} interval={0} angle={-15} textAnchor="end" height={70} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} width={44} />
                      <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatBRL(value)} labelFormatter={(_, payload) => String(payload?.[0]?.payload?.nome || '')} />
                      <Bar dataKey="valor" name="Valor Investido" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: '10px', border: '1px solid #93c5fd', boxShadow: 'none' }}>
              <CardContent className="p-3">
                <p className="mb-1 text-xs font-bold text-slate-600">Taxa de contemplação por edital</p>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={breakdownEditaisChart} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
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

            <Card sx={{ borderRadius: '10px', border: '1px solid #93c5fd', boxShadow: 'none' }}>
              <CardContent className="p-3">
                <p className="mb-2 text-xs font-bold text-slate-600">Links por edital</p>
                <div className="max-h-[220px] space-y-2 overflow-auto pr-1">
                  {breakdownEditaisChart.map((ed) => (
                    <div key={`links-${ed.nome}`} className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                      <p className="mb-1 text-[11px] font-bold text-[#0b57d0]">{ed.nome}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ed.links?.resultado ? <a href={ed.links.resultado} target="_blank" rel="noopener noreferrer" className="no-underline"><Chip label="Resultado" size="small" clickable sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '0.66rem' }} /></a> : <Chip label="Resultado" size="small" sx={{ bgcolor: '#f1f5f9', color: '#94a3b8', fontSize: '0.66rem' }} />}
                        {ed.links?.resumo ? <a href={ed.links.resumo} target="_blank" rel="noopener noreferrer" className="no-underline"><Chip label="Resumo" size="small" clickable sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '0.66rem' }} /></a> : <Chip label="Resumo" size="small" sx={{ bgcolor: '#f1f5f9', color: '#94a3b8', fontSize: '0.66rem' }} />}
                        {ed.links?.diarioOficial && <a href={ed.links.diarioOficial} target="_blank" rel="noopener noreferrer" className="no-underline"><Chip label="Diário Oficial" size="small" clickable sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700, fontSize: '0.66rem' }} /></a>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6 xl:gap-8">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-8">
            <Trophy size={32} className="text-[#FFC857]" />
            <h2 className="text-3xl font-black text-[#0b57d0]">Ranking Geral de Contemplados</h2>
          </div>
          
          {rankingProponentes.length > 0 ? (
            <TableContainer component={Paper} sx={{ borderRadius: '2rem', boxShadow: 'none', border: '1px solid #e5e7eb', overflowX: 'auto', bgcolor: '#ffffff' }}>
              <Table sx={{ minWidth: 780 }}>
                <TableHead sx={{ bgcolor: '#0b57d0' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 900, minWidth: 56 }} align="center">#</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 900, minWidth: 180 }}>PROPONENTE</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 900, minWidth: 220 }}>EDITAL</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 900, minWidth: 90 }} align="center">PROJETOS</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 900, minWidth: 140 }} align="right">TOTAL</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rankingProponentes.map((row, idx) => (
                    <TableRow
                      key={row.internalKey}
                      hover
                      sx={{
                        '&:nth-of-type(even)': { bgcolor: '#f8fbff' },
                        '& td': { borderBottomColor: '#e8eef7' },
                      }}
                    >
                      <TableCell align="center">
                        <Chip
                          label={idx + 1}
                          size="small"
                          sx={{
                            minWidth: 36,
                            fontWeight: 900,
                            bgcolor: '#eaf2ff',
                            color: '#4b5563',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#0b57d0' }}>{row.name}</TableCell>
                      <TableCell sx={{ maxWidth: 360, verticalAlign: 'middle' }}>
                        <Tooltip title={row.editalNomes} placement="top" enterDelay={400}>
                          <Box
                            sx={{
                              px: 1.5,
                              py: 1,
                              borderRadius: '12px',
                              border: '1px solid #bfdbfe',
                              bgcolor: '#eff6ff',
                              maxWidth: '100%',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              color: '#1d4ed8',
                              lineHeight: 1.3,
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textAlign: 'left',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                            }}
                          >
                            {row.editalNomes}
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={row.count}
                          size="small"
                          sx={{
                            minWidth: 42,
                            fontWeight: 900,
                            bgcolor: '#eef2ff',
                            color: '#3730a3',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: '#0b57d0', pr: 1.5 }}>
                        <Box
                          component="span"
                          sx={{
                            bgcolor: '#e8f5e9',
                            color: '#166534',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: '999px',
                            fontSize: '0.8rem',
                            fontWeight: 900,
                            display: 'inline-flex',
                          }}
                        >
                          {formatBRL(row.total)}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Card sx={{ borderRadius: '2rem', p: 6, textAlign: 'center', border: '1px solid #e5e7eb' }}>
              <Typography color="textSecondary">Nenhum dado de contemplados disponivel. Importe dados no painel administrativo.</Typography>
            </Card>
          )}
          <div className="mt-6 p-6 bg-[#FFC857]/10 rounded-2xl border border-[#FFC857]/20 flex items-center gap-4 text-[#0b57d0]">
            <TrendingUp size={24} className="shrink-0" />
            <p className="text-sm font-medium italic">
              * Dados reais consolidados a partir dos diarios oficiais e editais municipais de Ilhabela.
            </p>
          </div>
        </div>

        <div className="space-y-6 xl:max-w-[280px]">
          <Card sx={{ borderRadius: '1.5rem', bgcolor: '#0b57d0', color: 'white', p: 3.5 }}>
            <h3 className="text-lg font-bold mb-3 text-[#FFC857]">Links de Prestacao de Contas</h3>
            <div className="space-y-3">
              {timelineData.map(item => (
                <div key={item.year} className="bg-white/10 p-3 rounded-xl">
                  <p className="text-xs font-black uppercase mb-1">{item.year}</p>
                  <p className="text-sm font-bold truncate">{item.title}</p>
                </div>
              ))}
            </div>
            <Button fullWidth sx={{ mt: 3, bgcolor: '#FFC857', color: '#0b57d0', fontWeight: 900, borderRadius: '12px', textTransform: 'none', fontSize: '0.8rem', '&:hover': { bgcolor: '#e0b04c' } }}>
              Baixar Documentos Oficiais
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
}
