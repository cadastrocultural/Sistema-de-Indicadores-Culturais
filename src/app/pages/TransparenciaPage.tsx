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
      editalResumoOverrides: data.editalResumoOverrides || {},
      customEditalLinks: { ...getCustomEditalLinks(), ...fromServer },
    };
  }, [serverData]);

  // Calcular totais reais DINAMICAMENTE dos projetos importados
  const stats = useMemo(() => {
    const totalMapeamento = dadosReais.agentes.length + dadosReais.grupos.length + dadosReais.espacos.length;
    
    // Projetos importados contemplados
    const projetosImportados = dadosReais.projetos;
    const contemImportados = projetosImportados.filter(isProjetoContemplado);
    
    // Valor dos importados (com parser BRL correto)
    const valorImportados = contemImportados.reduce((acc: number, p: any) => acc + getProjetoValorNormalizado(p), 0);
    
    const totalContemplados = contemImportados.length;
    const totalValorInvestido = valorImportados;
    const totalInscritos = totalMapeamento + projetosImportados.length;
    
    // Contagem de editais unicos
    const editaisSet = new Set<string>();
    projetosImportados.forEach((p: any) => {
      const ed = getEditalNomeExibicaoProjeto(p).trim();
      if (ed && ed !== 'Edital não informado') editaisSet.add(ed);
    });
    return {
      totalInscritos,
      totalMapeamento,
      totalContemplados,
      totalValorInvestido,
      totalEditais: editaisSet.size,
      projetosImportados: projetosImportados.length,
    };
  }, [dadosReais]);

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

  const statsData = [
    { label: 'Inscricoes no Sistema', value: stats.totalInscritos > 0 ? stats.totalInscritos.toString() : '-', sub: 'Historico Acumulado', icon: <Search size={24} /> },
    { label: 'Contemplados', value: stats.totalContemplados > 0 ? stats.totalContemplados.toString() : '-', sub: `${stats.totalEditais} edital(is)`, icon: <CheckCircle2 size={24} /> },
    { label: 'Prestacao de Contas', value: '100%', sub: 'Regularidade', icon: <FileText size={24} /> },
    { label: 'Total Investido', value: stats.totalValorInvestido > 0 ? formatBRL(stats.totalValorInvestido) : '-', sub: 'Dados Reais', icon: <TrendingUp size={24} /> },
  ];

  return (
    <div className="container mx-auto px-6 py-12 flex flex-col gap-16 bg-[#f8f9fa] min-h-screen">
      <section className="text-center max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#0b57d0]/10 text-[#0b57d0] text-[0.7rem] font-black uppercase tracking-widest mb-4">
            Transparencia Cultural - Ilhabela
          </div>
          <h1 className="text-5xl font-black text-[#0b57d0] mb-6">Dados Reais e Rankings</h1>
          <p className="text-xl text-[#5f5f6a] leading-relaxed">
            Consulte as estatisticas oficiais extraidas do Cadastro Cultural de Ilhabela. Informacoes atualizadas sobre editais e contemplados.
          </p>
        </motion.div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, i) => (
          <Card key={stat.label} sx={{ borderRadius: '24px', border: '1px solid #e5e7eb', boxShadow: 'none' }}>
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-[#0b57d0]/10 rounded-2xl flex items-center justify-center text-[#0b57d0] mb-6">
                {stat.icon}
              </div>
              <Typography variant="h4" fontWeight="900" color="#0b57d0">{stat.value}</Typography>
              <Typography variant="subtitle2" fontWeight="700" color="#0b57d0" sx={{ opacity: 0.7 }}>{stat.label}</Typography>
              <Typography variant="caption" color="textSecondary">{stat.sub}</Typography>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Breakdown por Edital */}
      {breakdownEditais.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-[#0b57d0]" size={28} />
            <h2 className="text-2xl font-black text-[#1b1b1f]">Detalhamento por Edital</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {breakdownEditais.map((ed, idx) => (
              <Card key={ed.nome} sx={{ borderRadius: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
                <CardContent className="p-6">
                  <Chip label={ed.nome} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 700, mb: 2 }} />
                  <div className="space-y-3 mt-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <span className="text-xs font-semibold text-gray-600 uppercase">Inscritos</span>
                      <span className="font-black text-gray-800">{ed.inscritos}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                      <span className="text-xs font-semibold text-green-700 uppercase">Contemplados</span>
                      <span className="font-black text-green-600">{ed.contemplados}</span>
                    </div>
                    {ed.valor > 0 && (
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                        <span className="text-xs font-semibold text-blue-700 uppercase">Valor Investido</span>
                        <span className="font-black text-blue-600">{formatBRL(ed.valor)}</span>
                      </div>
                    )}
                    {/* 🔗 Links oficiais */}
                    {(() => {
                      const links = resolveEditalLinks(ed.nome, dadosReais.customEditalLinks);
                      return (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                          {links?.resultado ? (
                            <a href={links.resultado} target="_blank" rel="noopener noreferrer" className="no-underline">
                              <Chip 
                                label="📄 Resultado Oficial" 
                                size="small" 
                                clickable
                                sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 600, fontSize: '0.7rem', '&:hover': { bgcolor: '#bfdbfe' } }} 
                              />
                            </a>
                          ) : (
                            <Chip label="📄 Resultado" size="small" sx={{ bgcolor: '#f3f4f6', color: '#9ca3af', fontSize: '0.7rem' }} />
                          )}
                          {links?.resumo ? (
                            <a href={links.resumo} target="_blank" rel="noopener noreferrer" className="no-underline">
                              <Chip 
                                label="📊 Resumo" 
                                size="small" 
                                clickable
                                sx={{ bgcolor: '#d1fae5', color: '#065f46', fontWeight: 600, fontSize: '0.7rem', '&:hover': { bgcolor: '#a7f3d0' } }} 
                              />
                            </a>
                          ) : (
                            <Chip label="📊 Resumo" size="small" sx={{ bgcolor: '#f3f4f6', color: '#9ca3af', fontSize: '0.7rem' }} />
                          )}
                          {links?.diarioOficial && (
                            <a href={links.diarioOficial} target="_blank" rel="noopener noreferrer" className="no-underline">
                              <Chip 
                                label="📰 Diário Oficial" 
                                size="small" 
                                clickable
                                sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, fontSize: '0.7rem', '&:hover': { bgcolor: '#fde68a' } }} 
                              />
                            </a>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

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
