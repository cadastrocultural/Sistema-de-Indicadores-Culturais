import React, { useMemo } from 'react';
import { Card, CardContent } from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export type DiversityNamedQty = { nome: string; qtd: number };

export type GeneroPorOrigemRow = { nome: string; mulheres: number; homens: number; outros: number; total: number };
export type NegrosPorOrigemRow = { nome: string; negros: number; demais: number };

export type DiversityChartsPayload = {
  totalBase: number;
  genero: DiversityNamedQty[];
  raca: DiversityNamedQty[];
  pcd: DiversityNamedQty[];
  idadeFaixa: DiversityNamedQty[];
  origemTipo: DiversityNamedQty[];
  tradVinculo: DiversityNamedQty[];
  /** Gênero, juventude, PcD e comunidades trad. — sem cor/raça e sem LGBTQIA+. */
  inclusaoSemRacaELgbt: DiversityNamedQty[];
  /** Cor/raça: população negra declarada vs. demais (eixo apartado de LGBTQIA+). */
  negrosComparativoBase: DiversityNamedQty[];
  /** Somente campos de orientação sexual (não identidade de gênero). */
  orientacaoSexual: DiversityNamedQty[];
  /** Campo identidade de gênero (separado de orientação sexual e de cor/raça). */
  identidadeGeneroDistrib: DiversityNamedQty[];
  /** Orientação sexual agregada (apenas colunas de orientação — hetero / LGBTQ+ / outro / não informado). */
  orientacaoSexualClassificada: DiversityNamedQty[];
  escolaridade: DiversityNamedQty[];
  lgbtqComparativo: DiversityNamedQty[];
  homensMulheres: DiversityNamedQty[];
  /** Cadastros LGBTQIA+ (união orientação + identidade/gênero) por tipo de base. */
  lgbtqiaPorTipoCadastro: DiversityNamedQty[];
  /** Novos: cultura + cruzamentos */
  generoPorOrigem: GeneroPorOrigemRow[];
  negrosPorOrigem: NegrosPorOrigemRow[];
  areaCultural: DiversityNamedQty[];
  /** % negros/pardos apenas — eixo racial separado. */
  indicesPerfilRacial: DiversityNamedQty[];
  /** % orientação sexual LGBTQ+ e % identidade de gênero LGBTQ+ (eixos separados; apartado do racial). */
  indicesLgbtqia: DiversityNamedQty[];
  /** % gênero, juventude, PcD e comunidades trad. (sem cor/raça e sem LGBTQIA+). */
  indicesDemograficos: DiversityNamedQty[];
  estadoCivil: DiversityNamedQty[];
  rendaFaixa: DiversityNamedQty[];
  pcdTipos: DiversityNamedQty[];
  experienciaCultural: DiversityNamedQty[];
  naturalidadeTop: DiversityNamedQty[];
  povosReferencia: DiversityNamedQty[];
};

const tooltipSx = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  fontSize: 12,
  fontWeight: 600,
};

const PIE_COLORS = ['#0b57d0', '#4285f4', '#06b6d4', '#8b5cf6', '#db2777', '#059669', '#d97706', '#64748b'];

function withIds(rows: DiversityNamedQty[], prefix: string) {
  return rows.map((r, i) => ({ ...r, _id: `${prefix}-${i}-${r.nome.slice(0, 12)}` }));
}

function hasAnyQty(rows: DiversityNamedQty[]) {
  return rows.some((r) => (Number(r.qtd) || 0) > 0);
}

function MiniCard({
  kicker = 'Perfil',
  title,
  subtitle,
  children,
  empty,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty: boolean;
}) {
  return (
    <Card
      sx={{
        borderRadius: '16px',
        border: '1px solid #e8ecf3',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)',
        height: '100%',
        minHeight: 300,
      }}
    >
      <CardContent className="p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0b57d0] mb-1">{kicker}</p>
        <h3 className="text-sm font-black text-[#0f172a] mb-0.5 leading-snug">{title}</h3>
        {subtitle ? <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">{subtitle}</p> : <div className="mb-3" />}
        {empty ? (
          <div className="flex h-[220px] items-center justify-center rounded-xl bg-slate-50 text-center text-xs font-medium text-slate-400">
            Sem dados classificáveis neste campo nas planilhas importadas.
          </div>
        ) : (
          <div className="h-[240px] w-full">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

type Props = {
  data: DiversityChartsPayload | null;
  chartUid: string;
};

export function HomeDiversityCharts({ data, chartUid }: Props) {
  const gGenero = useMemo(() => (data ? withIds(data.genero, 'gen') : []), [data]);
  const gRaca = useMemo(() => (data ? withIds(data.raca, 'raca') : []), [data]);
  const gPcd = useMemo(() => (data ? withIds(data.pcd, 'pcd') : []), [data]);
  const gIdade = useMemo(() => (data ? withIds(data.idadeFaixa, 'idade') : []), [data]);
  const gOrigem = useMemo(() => (data ? withIds(data.origemTipo, 'orig') : []), [data]);
  const gTrad = useMemo(() => (data ? withIds(data.tradVinculo, 'trad') : []), [data]);
  const gIncSoc = useMemo(() => (data ? withIds(data.inclusaoSemRacaELgbt, 'incs') : []), [data]);
  const gNegBase = useMemo(() => (data ? withIds(data.negrosComparativoBase, 'negb') : []), [data]);
  const gOriSex = useMemo(() => (data ? withIds(data.orientacaoSexual, 'oris') : []), [data]);
  const gIdGen = useMemo(() => (data ? withIds(data.identidadeGeneroDistrib, 'idg') : []), [data]);
  const gOriClass = useMemo(() => (data ? withIds(data.orientacaoSexualClassificada, 'oric') : []), [data]);
  const gEsc = useMemo(() => (data ? withIds(data.escolaridade, 'esc') : []), [data]);
  const gLgbt = useMemo(() => (data ? withIds(data.lgbtqComparativo, 'lgbt') : []), [data]);
  const gHM = useMemo(() => (data ? withIds(data.homensMulheres, 'hm') : []), [data]);
  const gLgbtTipo = useMemo(() => (data ? withIds(data.lgbtqiaPorTipoCadastro, 'lgbt-t') : []), [data]);
  const gGenOrig = useMemo(
    () => (data?.generoPorOrigem || []).map((r, i) => ({ ...r, _id: `go-${i}` })),
    [data]
  );
  const gNegOrig = useMemo(
    () => (data?.negrosPorOrigem || []).map((r, i) => ({ ...r, _id: `no-${i}` })),
    [data]
  );
  const gArea = useMemo(() => (data ? withIds(data.areaCultural, 'area') : []), [data]);
  const gIndRacial = useMemo(() => (data ? withIds(data.indicesPerfilRacial, 'eqr') : []), [data]);
  const gIndLgbt = useMemo(() => (data ? withIds(data.indicesLgbtqia, 'eql') : []), [data]);
  const gIndDemo = useMemo(() => (data ? withIds(data.indicesDemograficos, 'eqd') : []), [data]);
  const gEstCiv = useMemo(() => (data ? withIds(data.estadoCivil, 'eciv') : []), [data]);
  const gRenda = useMemo(() => (data ? withIds(data.rendaFaixa, 'renda') : []), [data]);
  const gPcdTipo = useMemo(() => (data ? withIds(data.pcdTipos, 'pcdt') : []), [data]);
  const gExp = useMemo(() => (data ? withIds(data.experienciaCultural, 'exp') : []), [data]);
  const gNat = useMemo(() => (data ? withIds(data.naturalidadeTop, 'nat') : []), [data]);
  const gPovos = useMemo(() => (data ? withIds(data.povosReferencia, 'pov') : []), [data]);

  if (!data || data.totalBase <= 0) return null;

  return (
    <div className="mt-10">
      <div className="mb-6 max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0b57d0]">Painel gráfico</p>
        <h3 className="text-xl md:text-2xl font-black tracking-tight text-[#0f172a]">Diversidade cultural e inclusão em gráficos</h3>
        <p className="mt-1 text-sm font-medium text-[#5f5f6a] leading-relaxed">
          Dezenas de visualizações a partir do mesmo universo de agentes, grupos, espaços e proponentes de editais — perfil demográfico, práticas culturais e
          cruzamentos por tipo de cadastro. O que não constar na planilha aparece como &quot;Não informado&quot; ou o cartão indica ausência de dados.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <MiniCard
          title="Distribuição por gênero"
          subtitle="Campos gênero / sexo nas planilhas."
          empty={!hasAnyQty(data.genero)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gGenero} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id={`div-g-${chartUid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0b57d0" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} interval={0} height={68} angle={-28} textAnchor="end" axisLine={false} tickLine={false} />
              <YAxis width={32} allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill={`url(#div-g-${chartUid})`} radius={[8, 8, 0, 0]} maxBarSize={40} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          title="Autodeclaração racial / étnica"
          subtitle="Agregação a partir de raça, cor e etnia."
          empty={!hasAnyQty(data.raca)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gRaca} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id={`div-r-${chartUid}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={100} tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill={`url(#div-r-${chartUid})`} radius={[0, 8, 8, 0]} maxBarSize={18} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          title="PcD — declaração"
          subtitle="Sim, não ou não informado (colunas de deficiência / PcD)."
          empty={!hasAnyQty(data.pcd)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={gPcd} dataKey="qtd" nameKey="nome" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2} isAnimationActive={false}>
                {gPcd.map((_, i) => (
                  <Cell key={_._id} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={1} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
              <RechartsTooltip contentStyle={tooltipSx} />
            </PieChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          title="Faixa etária"
          subtitle="Idade numérica, data de nascimento ou faixa declarada."
          empty={!hasAnyQty(data.idadeFaixa)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gIdade} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id={`div-i-${chartUid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={1} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis width={28} allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill={`url(#div-i-${chartUid})`} radius={[8, 8, 0, 0]} maxBarSize={44} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          title="Origem dos registros"
          subtitle="Agentes, grupos, espaços culturais e linhas de editais."
          empty={!hasAnyQty(data.origemTipo)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={gOrigem} dataKey="qtd" nameKey="nome" cx="50%" cy="50%" outerRadius={82} isAnimationActive={false}>
                {gOrigem.map((_, i) => (
                  <Cell key={_._id} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} stroke="#fff" strokeWidth={1} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
              <RechartsTooltip contentStyle={tooltipSx} />
            </PieChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          title="Comunidades tradicionais"
          subtitle="Vínculo reconhecido com comunidades oficiais (mesma regra do Admin)."
          empty={!hasAnyQty(data.tradVinculo)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={gTrad} dataKey="qtd" nameKey="nome" cx="50%" cy="50%" innerRadius={48} outerRadius={80} isAnimationActive={false}>
                {gTrad.map((_, i) => (
                  <Cell key={_._id} fill={PIE_COLORS[(i + 4) % PIE_COLORS.length]} stroke="#fff" strokeWidth={1} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
              <RechartsTooltip contentStyle={tooltipSx} />
            </PieChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="Cor / raça"
          title="População negra declarada (pretos e pardos)"
          subtitle="Eixo racial: autodeclaração em cor/raça — independente de orientação sexual ou identidade LGBTQIA+."
          empty={!hasAnyQty(data.negrosComparativoBase)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gNegBase} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id={`div-neg-${chartUid}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1e1b4b" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.88} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={132} tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill={`url(#div-neg-${chartUid})`} radius={[0, 8, 8, 0]} maxBarSize={22} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="LGBTQIA+"
          title="Orientação vs. identidade (contagem)"
          subtitle="Dois eixos distintos na mesma base: orientação sexual LGBTQ+ e identidade de gênero LGBTQ+ (sem duplicar quem só entra por orientação). Eixo apartado do racial."
          empty={!hasAnyQty(data.lgbtqComparativo)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gLgbt} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={168} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill="#be185d" radius={[0, 8, 8, 0]} maxBarSize={22} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="Gênero e acessibilidade"
          title="Gênero, juventude, PcD e comunidades trad."
          subtitle="Sem cor/raça e sem LGBTQIA+ — eixos distintos dos cartões anteriores."
          empty={!hasAnyQty(data.inclusaoSemRacaELgbt)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gIncSoc} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id={`div-inc-${chartUid}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#e11d48" stopOpacity={0.92} />
                  <stop offset="100%" stopColor="#fb7185" stopOpacity={0.88} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill={`url(#div-inc-${chartUid})`} radius={[0, 8, 8, 0]} maxBarSize={20} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="LGBTQIA+"
          title="Orientação sexual (texto livre)"
          subtitle="Apenas campos de orientação sexual — não inclui identidade de gênero."
          empty={!hasAnyQty(data.orientacaoSexual)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gOriSex} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill="#db2777" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="LGBTQIA+"
          title="Identidade de gênero (texto livre)"
          subtitle="Campos específicos de identidade de gênero — separados de orientação sexual e de cor/raça."
          empty={!hasAnyQty(data.identidadeGeneroDistrib)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gIdGen} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill="#a21caf" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          title="Escolaridade"
          subtitle="Grau de instrução ou escolaridade declarada."
          empty={!hasAnyQty(data.escolaridade)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gEsc} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill="#0d9488" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          title="Mulheres e homens (declarado)"
          subtitle="Apenas onde o campo gênero/sexo permite classificar."
          empty={!hasAnyQty(data.homensMulheres)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={gHM} dataKey="qtd" nameKey="nome" cx="50%" cy="50%" innerRadius={44} outerRadius={76} isAnimationActive={false}>
                {gHM.map((_, i) => (
                  <Cell key={_._id} fill={PIE_COLORS[(i + 1) % PIE_COLORS.length]} stroke="#fff" strokeWidth={1} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
              <RechartsTooltip contentStyle={tooltipSx} />
            </PieChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="Inclusão"
          title="Orientação sexual (resumo)"
          subtitle="Classificação só a partir de colunas de orientação sexual (não usa cor/raça nem identidade de gênero). Valores fora dos padrões vão em &quot;Outro / não classificado&quot;."
          empty={!hasAnyQty(data.orientacaoSexualClassificada)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gOriClass} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={148} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill="#7c3aed" radius={[0, 8, 8, 0]} maxBarSize={20} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="Inclusão"
          title="LGBTQIA+ por tipo de cadastro"
          subtitle="Quantos registros em cada base (agentes, grupos, espaços, projetos) entram na união LGBTQIA+ usada nos KPIs."
          empty={!hasAnyQty(data.lgbtqiaPorTipoCadastro)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gLgbtTipo} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={88} tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill="#be185d" radius={[0, 8, 8, 0]} maxBarSize={22} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <div className="col-span-full mt-2 border-t border-slate-200 pt-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#059669]">Indicadores culturais</p>
          <h4 className="text-lg font-black text-[#0f172a]">Práticas, territórios de fala e cruzamentos por cadastro</h4>
          <p className="mt-1 max-w-3xl text-sm font-medium text-[#5f5f6a]">
            Linguagens e categorias culturais, tempo de atuação, renda e naturalidade quando existirem nas planilhas. Cor/raça e LGBTQIA+ são tratados em eixos
            distintos (sem misturar autodeclaração racial com orientação ou identidade de gênero).
          </p>
        </div>

        <MiniCard
          kicker="Indicadores culturais"
          title="Gênero por tipo de cadastro"
          subtitle="Barras empilhadas: mulheres, homens e outros em cada base."
          empty={gGenOrig.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gGenOrig} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={32} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
              <Bar dataKey="mulheres" name="Mulheres" stackId="g" fill="#f59e0b" radius={[0, 0, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="homens" name="Homens" stackId="g" fill="#2563eb" isAnimationActive={false} />
              <Bar dataKey="outros" name="Outros / NI" stackId="g" fill="#cbd5e1" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="Indicadores culturais"
          title="População negra por tipo de cadastro"
          subtitle="Negros / pardos (mesma regra dos KPI) vs. demais, por segmento."
          empty={gNegOrig.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gNegOrig} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={32} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
              <Bar dataKey="negros" name="Negros / pardos" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              <Bar dataKey="demais" name="Demais" fill="#e2e8f0" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="Indicadores culturais"
          title="Áreas e linguagens culturais"
          subtitle="Categoria, área, linguagem ou segmento mais citados."
          empty={!hasAnyQty(data.areaCultural)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gArea} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={118} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill="#059669" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="Cor / raça"
          title="Índice racial (% na base)"
          subtitle="Somente negros/pardos sobre o total — eixo separado de LGBTQIA+."
          empty={gIndRacial.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gIndRacial} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} formatter={(v: number | string) => [`${v}%`, '']} />
              <Bar dataKey="qtd" name="Percentual" fill="#312e81" radius={[0, 6, 6, 0]} maxBarSize={20} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="LGBTQIA+"
          title="Registros por eixo (base importada)"
          subtitle="Quantidade de registros com marcação em orientação sexual LGBTQ+ e em identidade de gênero LGBTQ+ (eixos separados)."
          empty={gIndLgbt.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gIndLgbt} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={168} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill="#be185d" radius={[0, 6, 6, 0]} maxBarSize={20} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="Demografia"
          title="Outros percentuais (%)"
          subtitle="Gênero, juventude, PcD e comunidades tradicionais — sem cor/raça e sem LGBTQIA+."
          empty={gIndDemo.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gIndDemo} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} formatter={(v: number | string) => [`${v}%`, '']} />
              <Bar dataKey="qtd" name="Percentual" fill="#0b57d0" radius={[0, 6, 6, 0]} maxBarSize={18} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="Indicadores culturais"
          title="Estado civil"
          subtitle="Categorias padronizadas (casado, solteiro, união estável etc.); ignora valores inconsistentes para preservar privacidade."
          empty={!hasAnyQty(data.estadoCivil)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={gEstCiv} dataKey="qtd" nameKey="nome" cx="50%" cy="50%" outerRadius={78} isAnimationActive={false}>
                {gEstCiv.map((_, i) => (
                  <Cell key={_._id} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={1} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 10, fontWeight: 600 }} />
              <RechartsTooltip contentStyle={tooltipSx} />
            </PieChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="Indicadores culturais"
          title="Renda ou faixa declarada"
          subtitle="Somente faixas de renda pessoal/familiar normalizadas (sem faixas de edital/projeto)."
          empty={!hasAnyQty(data.rendaFaixa)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gRenda} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill="#d97706" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="Indicadores culturais"
          title="PcD — tipo declarado"
          subtitle="Agrupamento a partir do texto quando há declaração positiva."
          empty={!hasAnyQty(data.pcdTipos)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gPcdTipo} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={132} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill="#0891b2" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="Indicadores culturais"
          title="Tempo de atuação / experiência"
          subtitle="Valores textuais mais frequentes (anos, tempo de carreira etc.)."
          empty={!hasAnyQty(data.experienciaCultural)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gExp} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill="#7c3aed" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="Indicadores culturais"
          title="Naturalidade / cidade"
          subtitle="Município de Ilhabela (SP): naturalidade ou cidade/município informado no cadastro, quando o campo existe na planilha."
          empty={!hasAnyQty(data.naturalidadeTop)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gNat} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Registros" fill="#ea580c" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard
          kicker="Indicadores culturais"
          title="Povos e comunidades (referências textuais)"
          subtitle="Palavras-chave em comunidade, observações, raça ou nome — não substitui autodeclaração oficial."
          empty={!hasAnyQty(data.povosReferencia)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gPovos} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Bar dataKey="qtd" name="Ocorrências" fill="#16a34a" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>
      </div>
    </div>
  );
}
