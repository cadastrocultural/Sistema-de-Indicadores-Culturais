import { useMemo } from 'react';
import { Card, CardContent } from '@mui/material';
import { AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';
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
  LabelList,
} from 'recharts';

export type DiversityNamedQty = { nome: string; qtd: number };

export type GeneroPorOrigemRow = { nome: string; mulheres: number; homens: number; outros: number; total: number };
export type NegrosPorOrigemRow = { nome: string; negros: number; demais: number };

export type DiversityChartsPayload = {
  totalBase: number;
  lgbtqiaUniao?: number;
  genero: DiversityNamedQty[];
  raca: DiversityNamedQty[];
  pcd: DiversityNamedQty[];
  idadeFaixa: DiversityNamedQty[];
  origemTipo: DiversityNamedQty[];
  tradVinculo: DiversityNamedQty[];
  inclusaoSemRacaELgbt: DiversityNamedQty[];
  negrosComparativoBase: DiversityNamedQty[];
  orientacaoSexual: DiversityNamedQty[];
  identidadeGeneroDistrib: DiversityNamedQty[];
  orientacaoSexualClassificada: DiversityNamedQty[];
  escolaridade: DiversityNamedQty[];
  lgbtqComparativo: DiversityNamedQty[];
  homensMulheres: DiversityNamedQty[];
  lgbtqiaPorTipoCadastro: DiversityNamedQty[];
  generoPorOrigem: GeneroPorOrigemRow[];
  negrosPorOrigem: NegrosPorOrigemRow[];
  areaCultural: DiversityNamedQty[];
  indicesPerfilRacial: DiversityNamedQty[];
  indicesLgbtqia: DiversityNamedQty[];
  indicesDemograficos: DiversityNamedQty[];
  estadoCivil: DiversityNamedQty[];
  rendaFaixa: DiversityNamedQty[];
  pcdTipos: DiversityNamedQty[];
  experienciaCultural: DiversityNamedQty[];
  naturalidadeTop: DiversityNamedQty[];
  povosReferencia: DiversityNamedQty[];
};

/* ─── Constantes visuais ─── */
const INTER = 'Poppins, ui-sans-serif, system-ui, sans-serif';

const tooltipSx = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: INTER,
  boxShadow: '0 8px 24px rgba(15,23,42,0.10)',
  padding: '10px 14px',
};

const PIE_COLORS = ['#00A38C', '#2ED6A3', '#006B5A', '#F2B84B', '#8b5cf6', '#059669', '#d97706', '#64748b'];

/* ─── Helpers ─── */
function formatYCategoryNome(v: unknown) {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return s.length <= 32 ? s : `${s.slice(0, 31)}…`;
}

function normalizeText(v: unknown) {
  return String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/** Filtra entradas "Não informado" / vazias de um array de dados para gráficos */
function filterInformados(rows: DiversityNamedQty[]): DiversityNamedQty[] {
  return rows.filter((r) => {
    const n = normalizeText(r.nome);
    return n && n !== 'nao informado' && n !== 'nao declarado' && n !== '-' && n !== 'n/i' && n !== 'n/a';
  });
}

function withIds(rows: DiversityNamedQty[], prefix: string) {
  return rows.map((r, i) => ({ ...r, _id: `${prefix}-${i}-${r.nome.slice(0, 12)}` }));
}

/** Tem algum dado com valor > 0 (excluindo "Não informado") */
function hasUsefulQty(rows: DiversityNamedQty[]) {
  return filterInformados(rows).some((r) => (Number(r.qtd) || 0) > 0);
}

function hasAnyQty(rows: DiversityNamedQty[]) {
  return rows.some((r) => (Number(r.qtd) || 0) > 0);
}

/* ─── Custom tooltip rico ─── */
function CustomTooltip({ active, payload, label, totalBase }: any) {
  if (!active || !payload?.length) return null;
  const val = Number(payload[0]?.value ?? 0);
  const pct = totalBase > 0 ? ((val / totalBase) * 100).toFixed(1) : null;
  return (
    <div style={tooltipSx}>
      <div className="font-bold text-slate-600 text-[10px] uppercase tracking-wide mb-1.5">{label ?? payload[0]?.name}</div>
      <div className="text-slate-900 font-black text-sm">{val.toLocaleString('pt-BR')} <span className="text-slate-400 text-[11px] font-semibold">registros</span></div>
      {pct && (
        <div className="mt-1 text-[11px] font-bold" style={{ color: payload[0]?.fill ?? '#00A38C' }}>
          {pct}% do total
        </div>
      )}
    </div>
  );
}

/* ─── Ícone de pessoa racial ─── */
function RacialPersonIcon({ fill, size = 26 }: { fill: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden>
      <circle cx="13" cy="13" r="13" fill={fill} opacity={0.14} />
      <circle cx="13" cy="9.5" r="4" fill={fill} />
      <path d="M5,22 C5,16.5 21,16.5 21,22" fill={fill} />
    </svg>
  );
}

type RacialRadialItem = {
  label: string;
  value: number;
  color: string;
  percentLabel: string;
  muted?: boolean;
};

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeDonutSegment(cx: number, cy: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

function RacialRadialChart({ items }: { items: RacialRadialItem[] }) {
  const total = Math.max(1, items.reduce((acc, item) => acc + Math.max(0, Number(item.value) || 0), 0));
  const cx = 75;
  const cy = 112;
  const innerRadius = 33;
  const outerRadius = 62;
  const visibleItems = items.filter((item) => item.value > 0);
  let cursor = -118;

  return (
    <div className="relative mx-auto h-[230px] w-full max-w-[360px]" style={{ fontFamily: INTER }}>
      <svg viewBox="0 0 360 230" className="h-full w-full overflow-visible" role="img" aria-label="Distribuição de cor e raça">
        <circle cx={cx} cy={cy} r={outerRadius + 16} fill="#f8fafc" />
        <circle cx={cx} cy={cy} r={outerRadius + 8} fill="none" stroke="#dbe4ef" strokeWidth="8" strokeDasharray="5 17" strokeLinecap="round" />

        {visibleItems.map((item, index) => {
          const sweep = Math.max(8, (Math.max(0, item.value) / total) * 312);
          const startAngle = cursor;
          const endAngle = Math.min(212, cursor + sweep);
          cursor = endAngle + 5;
          const mid = (startAngle + endAngle) / 2;
          const dot = polarToCartesian(cx, cy, outerRadius + 10, mid);
          const lineStart = polarToCartesian(cx, cy, outerRadius + 15, mid);
          const labelY = 28 + index * 31;
          const elbowX = index % 2 === 0 ? 128 : 144;
          const labelX = 188;

          return (
            <g key={item.label}>
              <path
                d={describeDonutSegment(cx, cy, innerRadius, outerRadius, startAngle, endAngle)}
                fill={item.color}
                opacity={item.muted ? 0.38 : 0.96}
              />
              <circle cx={dot.x} cy={dot.y} r="3.4" fill="#ffffff" stroke={item.color} strokeWidth="2" />
              <path
                d={`M ${lineStart.x} ${lineStart.y} C ${elbowX} ${lineStart.y}, ${elbowX - 8} ${labelY}, ${labelX - 30} ${labelY}`}
                fill="none"
                stroke={item.muted ? '#cbd5e1' : item.color}
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <circle cx={labelX - 30} cy={labelY} r="2.6" fill={item.muted ? '#94a3b8' : item.color} />
              <g transform={`translate(${labelX - 5} ${labelY - 13})`}>
                <circle cx="13" cy="13" r="13" fill={item.muted ? '#f1f5f9' : '#ffffff'} stroke={item.muted ? '#cbd5e1' : item.color} strokeWidth="1.8" />
                <circle cx="13" cy="9.8" r="3.6" fill={item.muted ? '#94a3b8' : item.color} opacity="0.82" />
                <path d="M6,22 C6,16.8 20,16.8 20,22" fill={item.muted ? '#94a3b8' : item.color} opacity="0.82" />
              </g>
              <text x={labelX + 30} y={labelY - 2} fill={item.muted ? '#64748b' : '#334155'} fontSize="10.5" fontWeight="700">
                {item.label}
              </text>
              <text x={330} y={labelY - 2} fill={item.muted ? '#94a3b8' : item.color} fontSize="11" fontWeight="900" textAnchor="end">
                {item.percentLabel}
              </text>
            </g>
          );
        })}

        <circle cx={cx} cy={cy} r={innerRadius - 4} fill="#ffffff" />
        <text x={cx} y={cy - 4} fill="#0f172a" fontSize="18" fontWeight="900" textAnchor="middle">
          {visibleItems.length}
        </text>
        <text x={cx} y={cy + 12} fill="#94a3b8" fontSize="8.5" fontWeight="800" textAnchor="middle" letterSpacing="0.08em">
          GRUPOS
        </text>
      </svg>
    </div>
  );
}

/* ─── Insight banner ─── */
type InsightLevel = 'info' | 'warn' | 'ok';

function InsightBanner({ level, text }: { level: InsightLevel; text: string }) {
  const cfg = {
    info: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', Icon: Lightbulb },
    warn: { bg: '#fefce8', border: '#fde68a', color: '#92400e', Icon: AlertTriangle },
    ok:   { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', Icon: CheckCircle2 },
  }[level];
  const Icon = cfg.Icon;
  return (
    <div
      className="flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs font-semibold leading-relaxed"
      style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <Icon className="mt-0.5 shrink-0" size={15} aria-hidden />
      <span>{text}</span>
    </div>
  );
}

/* ─── MiniCard ─── */
function MiniCard({
  kicker = 'Perfil',
  title,
  subtitle,
  children,
  empty,
  insight,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty: boolean;
  insight?: { level: InsightLevel; text: string };
}) {
  return (
    <Card
      sx={{
        borderRadius: '22px',
        border: '1px solid rgba(15,23,42,0.07)',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04), 0 18px 42px -22px rgba(15,23,42,0.26)',
        height: '100%',
        minHeight: insight ? 380 : 330,
        minWidth: 0,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
        transition: 'box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease',
        '&:hover': {
          borderColor: 'rgba(11,87,208,0.16)',
          boxShadow: '0 4px 10px rgba(15,23,42,0.06), 0 24px 56px -24px rgba(15,23,42,0.34)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent className="p-5" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00A38C] mb-0.5">{kicker}</p>
        <h3 className="text-sm font-black text-[#0f172a] mb-0.5 leading-snug">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">{subtitle}</p>}
        {!subtitle && <div className="mb-3" />}
        <div className="flex-1 min-h-0">
          {empty ? (
            <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 text-center text-xs font-semibold text-slate-400">
              Sem dados classificáveis neste campo.
            </div>
          ) : (
            <div className="h-[240px] w-full min-w-0 max-w-full overflow-hidden">{children}</div>
          )}
        </div>
        {insight && !empty && (
          <div className="mt-3">
            <InsightBanner level={insight.level} text={insight.text} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Radar de cor/raça ─── */
export type DiversityRadialItem = { label: string; value: number };

export function DiversityRadial({
  items,
  totalBase,
  size = 280,
  maxSpoke = 90,
}: {
  items: DiversityRadialItem[];
  totalBase: number;
  size?: number;
  maxSpoke?: number;
}) {
  const n = Math.max(1, items.length);
  const maxVal = Math.max(1, ...items.map((i) => Number(i.value) || 0));
  const c = size / 2;
  const rings = [maxSpoke, Math.round(maxSpoke * (70 / 90)), Math.round(maxSpoke * (40 / 90))];

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center">
      <svg width={size} height={size} className="shrink-0" aria-hidden>
        <g transform={`translate(${c},${c})`}>
          {rings.map((r, i) => (
            <circle key={i} r={r} fill="none" stroke="#e5e7eb" strokeWidth={1} />
          ))}
          {items.map((item, i) => {
            const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
            const frac = maxVal > 0 ? (Number(item.value) || 0) / maxVal : 0;
            const r = Math.max(8, maxSpoke * frac);
            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);
            const labelR = maxSpoke + 18;
            const lx = labelR * Math.cos(angle);
            const ly = labelR * Math.sin(angle);
            const anchor = Math.abs(lx) < 10 ? 'middle' : lx >= 0 ? 'start' : 'end';
            const pct = totalBase > 0 ? Math.round(((Number(item.value) || 0) / totalBase) * 100) : 0;
            return (
              <g key={`${item.label}-${i}`}>
                <line x1={0} y1={0} x2={x} y2={y} stroke="#bae6fd" strokeWidth={1} />
                <circle cx={x} cy={y} r={5} fill="#0ea5e9" />
                <text textAnchor={anchor} style={{ fontFamily: INTER }}>
                  <tspan x={lx} y={ly} fontSize={11} fill="#374151" fontWeight={600}>{item.label}</tspan>
                  <tspan x={lx} dy="1.15em" fontSize={10} fill="#6b7280" fontWeight={500}>{pct}%</tspan>
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════ */
type Props = {
  data: DiversityChartsPayload | null;
  chartUid: string;
};

export function HomeDiversityCharts({ data, chartUid }: Props) {
  const gGenero   = useMemo(() => (data ? withIds(data.genero, 'gen') : []), [data]);
  const gRaca     = useMemo(() => (data ? withIds(data.raca, 'raca') : []), [data]);
  const gPcd      = useMemo(() => (data ? withIds(filterInformados(data.pcd), 'pcd') : []), [data]);
  const gIdade    = useMemo(() => (data ? withIds(data.idadeFaixa, 'idade') : []), [data]);
  const gOrigem   = useMemo(() => (data ? withIds(filterInformados(data.origemTipo), 'orig') : []), [data]);
  const gTrad     = useMemo(() => (data ? withIds(filterInformados(data.tradVinculo), 'trad') : []), [data]);
  const gIncSoc   = useMemo(() => (data ? withIds(data.inclusaoSemRacaELgbt, 'incs') : []), [data]);
  const gNegBase  = useMemo(() => (data ? withIds(data.negrosComparativoBase, 'negb') : []), [data]);
  const gOriSex   = useMemo(() => (data ? withIds(data.orientacaoSexual, 'oris') : []), [data]);
  const gIdGen    = useMemo(() => (data ? withIds(data.identidadeGeneroDistrib, 'idg') : []), [data]);
  const gOriClass = useMemo(() => (data ? withIds(data.orientacaoSexualClassificada, 'oric') : []), [data]);
  const gEsc      = useMemo(() => (data ? withIds(data.escolaridade, 'esc') : []), [data]);
  const gLgbt     = useMemo(() => (data ? withIds(data.lgbtqComparativo, 'lgbt') : []), [data]);
  const gHM       = useMemo(() => (data ? withIds(data.homensMulheres, 'hm') : []), [data]);
  const gLgbtTipo = useMemo(() => (data ? withIds(data.lgbtqiaPorTipoCadastro, 'lgbt-t') : []), [data]);
  const gGenOrig  = useMemo(() => (data?.generoPorOrigem || []).map((r, i) => ({ ...r, _id: `go-${i}` })), [data]);
  const gNegOrig  = useMemo(() => (data?.negrosPorOrigem || []).map((r, i) => ({ ...r, _id: `no-${i}` })), [data]);
  const gArea     = useMemo(() => (data ? withIds(data.areaCultural, 'area') : []), [data]);
  const gIndRacial= useMemo(() => (data ? withIds(data.indicesPerfilRacial, 'eqr') : []), [data]);
  const gIndLgbt  = useMemo(() => (data ? withIds(data.indicesLgbtqia, 'eql') : []), [data]);
  const gIndDemo  = useMemo(() => (data ? withIds(data.indicesDemograficos, 'eqd') : []), [data]);
  const gEstCiv   = useMemo(() => (data ? withIds(filterInformados(data.estadoCivil), 'eciv') : []), [data]);
  const gRenda    = useMemo(() => (data ? withIds(data.rendaFaixa, 'renda') : []), [data]);
  const gPcdTipo  = useMemo(() => (data ? withIds(data.pcdTipos, 'pcdt') : []), [data]);
  const gExp      = useMemo(() => (data ? withIds(data.experienciaCultural, 'exp') : []), [data]);
  const gNat      = useMemo(() => (data ? withIds(data.naturalidadeTop, 'nat') : []), [data]);
  const gPovos    = useMemo(() => (data ? withIds(data.povosReferencia, 'pov') : []), [data]);

  const generoResumo = useMemo(() => {
    const src = gHM.length > 0 ? gHM : gGenero;
    const grouped = src.reduce(
      (acc, row) => {
        const nome = normalizeText(row.nome);
        const qtd = Number(row.qtd) || 0;
        if (nome.includes('homem') || nome.includes('homens') || nome.includes('masc')) acc.homens += qtd;
        else if (nome.includes('mulher') || nome.includes('femin')) acc.mulheres += qtd;
        else acc.outros += qtd;
        return acc;
      },
      { homens: 0, mulheres: 0, outros: 0 }
    );
    const total = grouped.homens + grouped.mulheres + grouped.outros;
    return { ...grouped, total: Math.max(1, total) };
  }, [gHM, gGenero]);

  const idadeTop     = useMemo(() => gIdade.slice(0, 6), [gIdade]);
  const idadePiramide = useMemo(() => {
    const declaredBinary = generoResumo.homens + generoResumo.mulheres;
    const maleRatio   = declaredBinary > 0 ? generoResumo.homens   / declaredBinary : 0.5;
    const femaleRatio = declaredBinary > 0 ? generoResumo.mulheres / declaredBinary : 0.5;
    return idadeTop.map((r) => {
      const qtd     = Number(r.qtd) || 0;
      const homens  = Math.round(qtd * maleRatio);
      const mulheres = Math.round(qtd * femaleRatio);
      return { nome: r.nome, homens: -homens, mulheres };
    });
  }, [idadeTop, generoResumo]);

  const resumoRapido = useMemo(() => {
    const jovens = data?.indicesDemograficos?.find((x) => normalizeText(x.nome).includes('jovens'))?.qtd ?? 0;
    const pcd    = data?.pcd?.find((x) => normalizeText(x.nome).includes('declara pcd'))?.qtd ?? 0;
    const lgbtFromUnion = Number(data?.lgbtqiaUniao || 0);
    const lgbtFromAxes  = (data?.lgbtqComparativo || []).reduce((acc, cur) => Math.max(acc, Number(cur.qtd) || 0), 0);
    const lgbt = Math.max(lgbtFromUnion, lgbtFromAxes);
    const trad = data?.tradVinculo?.find((x) => String(x.nome).toLowerCase().includes('comunidade'))?.qtd ?? 0;
    return { jovens, pcd, lgbt, trad };
  }, [data]);

  const inclusaoModeloDados = useMemo(() => {
    const etnia = { amarelo: 0, branco: 0, pardo: 0, preto: 0, indigena: 0, nao_declarado: 0 };
    gRaca.forEach((row) => {
      const nome = normalizeText(row.nome);
      const qtd  = Number(row.qtd) || 0;
      if      (nome.includes('amarel') || nome.includes('asiat')) etnia.amarelo      += qtd;
      else if (nome.includes('branc'))                             etnia.branco       += qtd;
      else if (nome.includes('pard'))                              etnia.pardo        += qtd;
      else if (nome.includes('pret'))                              etnia.preto        += qtd;
      else if (nome.includes('indigen'))                           etnia.indigena     += qtd;
      else                                                         etnia.nao_declarado+= qtd;
    });
    return {
      genero: { mulheres: generoResumo.mulheres, homens: generoResumo.homens, outros: generoResumo.outros },
      etnia,
      grupos_prioritarios: {
        pcd:                    Number(resumoRapido.pcd)    || 0,
        lgbt:                   Number(resumoRapido.lgbt)   || 0,
        juventude:              Number(resumoRapido.jovens) || 0,
        comunidades_tradicionais: Number(resumoRapido.trad) || 0,
      },
    };
  }, [gRaca, generoResumo, resumoRapido]);

  /* Insight central do painel de diversidade */
  const inclusionInsight = useMemo(() => {
    const total = data?.totalBase ?? 1;
    const percMulheres = (inclusaoModeloDados.genero.mulheres / total) * 100;
    const percNegros   = ((inclusaoModeloDados.etnia.preto + inclusaoModeloDados.etnia.pardo) / total) * 100;
    if (percMulheres < 35) return { level: 'warn' as InsightLevel, text: `Apenas ${percMulheres.toFixed(1)}% de mulheres nos registros — considere criar editais com cotas ou chamadas específicas para ampliar a representação feminina.` };
    if (percNegros < 30)   return { level: 'warn' as InsightLevel, text: `Apenas ${percNegros.toFixed(1)}% de pessoas negras (pretas + pardas) — foco em ações afirmativas e parceria com coletivos de cultura afro-brasileira pode ampliar esse alcance.` };
    if (inclusaoModeloDados.grupos_prioritarios.pcd < 5) return { level: 'warn' as InsightLevel, text: 'Baixa inclusão de PcD — verifique se editais têm critérios de acessibilidade e se espaços culturais são adaptados.' };
    return { level: 'ok' as InsightLevel, text: `Indicadores de diversidade equilibrados para o recorte atual (${total} registros). Continue monitorando tendências ao adicionar novos cadastros.` };
  }, [inclusaoModeloDados, data]);

  const radarItems = useMemo(
    () => [
      { label: 'Amarelo',   value: inclusaoModeloDados.etnia.amarelo },
      { label: 'Branco',    value: inclusaoModeloDados.etnia.branco },
      { label: 'Indígena',  value: inclusaoModeloDados.etnia.indigena },
      { label: 'Pardo',     value: inclusaoModeloDados.etnia.pardo },
      { label: 'Preto',     value: inclusaoModeloDados.etnia.preto },
      { label: 'Outros / NI', value: inclusaoModeloDados.etnia.nao_declarado },
    ],
    [inclusaoModeloDados]
  );

  const totalRacaRadar = useMemo(
    () => Math.max(1, radarItems.reduce((acc, item) => acc + (Number(item.value) || 0), 0)),
    [radarItems]
  );

  const totalRacaDeclarada = useMemo(
    () => Math.max(0, radarItems.filter((item) => item.label !== 'Outros / NI').reduce((acc, item) => acc + (Number(item.value) || 0), 0)),
    [radarItems]
  );

  const idadeAbsMax = useMemo(() => {
    const max = idadePiramide.reduce((acc, row) => Math.max(acc, Math.abs(Number(row.homens) || 0), Math.abs(Number(row.mulheres) || 0)), 0);
    return Math.max(10, Math.ceil(max / 10) * 10);
  }, [idadePiramide]);

  const totalBase = data?.totalBase ?? 1;

  /* Insights específicos por gráfico */
  const insightGenero = useMemo(() => {
    if (!hasAnyQty(data?.genero ?? [])) return undefined;
    const pct = ((generoResumo.mulheres / generoResumo.total) * 100);
    if (pct < 35) return { level: 'warn' as InsightLevel, text: `Mulheres representam ${pct.toFixed(0)}% — foco em chamadas específicas pode ampliar a participação feminina.` };
    if (pct >= 50) return { level: 'ok' as InsightLevel, text: `Mulheres representam ${pct.toFixed(0)}% — equilíbrio de gênero acima da média. Manter ações de manutenção.` };
    return { level: 'info' as InsightLevel, text: `Mulheres representam ${pct.toFixed(0)}% — acompanhe a tendência ao longo dos editais para detectar regressão.` };
  }, [data, generoResumo]);

  const insightRaca = useMemo(() => {
    if (!hasAnyQty(data?.raca ?? [])) return undefined;
    const negros = inclusaoModeloDados.etnia.preto + inclusaoModeloDados.etnia.pardo;
    const baseDeclarada = Math.max(1, totalRacaDeclarada);
    const pct = (negros / baseDeclarada) * 100;
    if (pct < 30) return { level: 'warn' as InsightLevel, text: `Negros/pardos: ${pct.toFixed(0)}% — sub-representação relevante. Considere ações afirmativas nos próximos editais.` };
    return { level: 'ok' as InsightLevel, text: `Negros/pardos: ${pct.toFixed(0)}% da base com cor/raça declarada. Continue monitorando.` };
  }, [data, inclusaoModeloDados, totalRacaDeclarada]);

  const insightIdade = useMemo(() => {
    if (!hasAnyQty(data?.idadeFaixa ?? [])) return undefined;
    const jovens = Number(resumoRapido.jovens) || 0;
    const pct = (jovens / totalBase) * 100;
    if (pct < 15) return { level: 'warn' as InsightLevel, text: `Jovens (até 29 anos): ${pct.toFixed(0)}% — considere editais de fomento à cultura jovem e formação de novos agentes.` };
    return { level: 'info' as InsightLevel, text: `Jovens: ${pct.toFixed(0)}% do cadastro. Políticas de formação e residências culturais podem ampliar esse índice.` };
  }, [data, resumoRapido, totalBase]);

  const insightArea = useMemo(() => {
    if (!hasAnyQty(data?.areaCultural ?? [])) return undefined;
    const top = [...(data?.areaCultural ?? [])].sort((a, b) => b.qtd - a.qtd)[0];
    if (!top) return undefined;
    const pct = ((top.qtd / totalBase) * 100).toFixed(0);
    return { level: 'info' as InsightLevel, text: `"${top.nome}" lidera com ${pct}% das inscrições — diversifique os editais para contemplar linguagens com menor representação.` };
  }, [data, totalBase]);

  if (!data || data.totalBase <= 0) return null;

  return (
    <div className="mt-12">
      {/* Cabeçalho */}
      <div className="mb-7 max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00A38C] mb-1">Painel gráfico</p>
        <h3 className="text-xl md:text-2xl font-black tracking-tight text-[#0f172a]">Diversidade cultural e inclusão em gráficos</h3>
        <p className="mt-2 text-sm font-medium text-[#5f5f6a] leading-relaxed max-w-2xl">
          Visualizações a partir do universo de agentes, grupos, espaços e proponentes de editais. Cada gráfico traz um insight direto para subsidiar decisões de política cultural.
        </p>
      </div>

      {/* ═══ Painel principal de diversidade — estilo HR analytics ═══ */}
      <Card
        sx={{
          borderRadius: '28px',
          border: '1px solid rgba(15,23,42,0.07)',
          boxShadow: '0 2px 8px rgba(15,23,42,0.05), 0 28px 70px -32px rgba(15,23,42,0.35)',
          overflow: 'hidden',
          mb: 4,
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          {/* Cabeçalho do card */}
          <div className="flex items-start justify-between flex-wrap gap-3 mb-7">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00A38C] mb-1">Perfil agregado</p>
              <h3 className="text-xl font-black text-[#0f172a] leading-tight">Diversidade</h3>
              <p className="text-[11px] text-slate-400 mt-0.5" style={{ fontFamily: INTER }}>Cor/raça · Gênero · Faixa etária</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-50 border border-slate-100 px-3 py-1.5" style={{ fontFamily: INTER }}>
              <span className="w-2 h-2 rounded-full bg-[#00A38C] inline-block opacity-70" />
              <span className="text-xs font-bold tabular-nums text-slate-500">
                {data.totalBase.toLocaleString('pt-BR')} registros
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

            {/* ── COL 1: Cor / Raça — donut + lista com ícones de pessoa ── */}
            {(() => {
              const RACE_COLORS = ['#F2B84B', '#2F80ED', '#00A38C', '#8B5CF6', '#64748B'];
              const declared = radarItems.filter(r => r.value > 0 && r.label !== 'Outros / NI');
              const niVal = radarItems.find(r => r.label === 'Outros / NI')?.value ?? 0;
              const niPct = totalRacaRadar > 0 ? Math.round((niVal / totalRacaRadar) * 100) : 0;
              const declaredTotal = declared.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
              const hasDeclared = declared.length > 0;
              const radialItems: RacialRadialItem[] = [
                ...declared.map((item, i) => {
                  const pct = declaredTotal > 0 ? Math.round((item.value / declaredTotal) * 100) : 0;
                  return {
                    label: item.label,
                    value: item.value,
                    color: RACE_COLORS[i % RACE_COLORS.length],
                    percentLabel: `${pct}%`,
                  };
                }),
                ...(niVal > 0
                  ? [{
                      label: 'Não declarado',
                      value: niVal,
                      color: '#94a3b8',
                      percentLabel: `${niPct}% total`,
                      muted: true,
                    }]
                  : []),
              ];
              return (
                <div className="flex flex-col">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 text-center">Cor / Raça</p>
                  {hasDeclared && (
                    <p className="mb-2 text-center text-[10px] font-semibold leading-snug text-slate-400">
                      Percentual sobre {declaredTotal.toLocaleString('pt-BR')} registro(s) com declaração.
                    </p>
                  )}
                  {hasDeclared ? (
                    <>
                      <RacialRadialChart items={radialItems} />
                      {niPct > 0 && (
                        <p className="-mt-2 text-center text-[9px] font-bold text-slate-400" style={{ fontFamily: INTER }}>
                          “Não declarado” continua calculado sobre a base total.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-[140px] w-full items-center justify-center rounded-xl bg-slate-50 text-xs font-medium text-slate-400 text-center px-4">
                        Nenhuma raça/etnia declarada nos registros atuais.
                      </div>
                      {niPct > 0 && (
                        <div className="flex items-center gap-2 w-full px-1">
                          <RacialPersonIcon fill="#94a3b8" size={22} />
                          <span className="text-[11px] font-semibold text-slate-400 flex-1">Não declarado</span>
                          <span className="text-[11px] font-black tabular-nums text-slate-400">{niPct}% da base total</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── COL 2: Gênero — figura única dividida + donut ── */}
            <div className="flex flex-col items-center justify-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Gênero</p>
              {/* Donut semicírculo */}
              <div style={{ height: 60, width: 110 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { n: 'Homens',  v: Math.max(generoResumo.homens, generoResumo.total === 1 ? 0 : 0) },
                        { n: 'Mulheres',v: generoResumo.mulheres },
                        { n: 'Não binário / LGBTQIA+',  v: generoResumo.outros },
                      ].filter(d => d.v > 0)}
                      dataKey="v" nameKey="n"
                      startAngle={180} endAngle={0}
                      innerRadius={22} outerRadius={38}
                      isAnimationActive={false}
                    >
                      <Cell fill="#f59e0b" />
                      <Cell fill="#d946ef" />
                      <Cell fill="#94a3b8" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Figuras distintas: homem (esquerda, calças retas) e mulher (direita, vestido evasê) */}
              <svg width="160" height="200" viewBox="0 0 160 200" aria-hidden>
                {/* ── Homem (âmbar) — torso retangular + pernas retas ── */}
                <g fill="#f59e0b">
                  <circle cx="40" cy="24" r="16" />
                  <rect x="26" y="43" width="28" height="56" rx="4" />
                  <rect x="7"  y="47" width="17" height="48" rx="8" />
                  <rect x="56" y="47" width="17" height="48" rx="8" />
                  <rect x="24" y="101" width="16" height="76" rx="7" />
                  <rect x="40" y="101" width="16" height="76" rx="7" />
                </g>
                {/* ── Mulher (rosa) — torso estreito + vestido evasê ── */}
                <g fill="#d946ef">
                  <circle cx="120" cy="24" r="16" />
                  <rect x="112" y="43" width="16" height="34" rx="4" />
                  <path d="M111,77 L129,77 L150,152 L90,152 Z" />
                  <rect x="96"  y="47" width="14" height="32" rx="6" />
                  <rect x="130" y="47" width="14" height="32" rx="6" />
                  <rect x="104" y="155" width="14" height="36" rx="6" />
                  <rect x="122" y="155" width="14" height="36" rx="6" />
                </g>
                {/* Linha divisória */}
                <line x1="80" y1="6" x2="80" y2="194" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="5 4" />
              </svg>
              {/* Percentuais */}
              <div className="flex justify-center gap-6 mt-2" style={{ fontFamily: INTER }}>
                <div className="text-center">
                  <div className="text-lg font-black" style={{ color: '#f59e0b' }}>
                    {Math.round((generoResumo.homens / generoResumo.total) * 100)}%
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">Homens</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black" style={{ color: '#d946ef' }}>
                    {Math.round((generoResumo.mulheres / generoResumo.total) * 100)}%
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">Mulheres</div>
                </div>
                {generoResumo.outros > 0 && (
                  <div className="text-center">
                    <div className="text-lg font-black text-slate-400">
                      {Math.round((generoResumo.outros / generoResumo.total) * 100)}%
                    </div>
                    <div className="text-[10px] font-black text-slate-500">LGBTQIA+</div>
                    <div className="text-[9px] font-semibold leading-tight text-slate-400">Não binário / outro</div>
                  </div>
                )}
              </div>
            </div>

            {/* ── COL 3: Pirâmide etária ── */}
            <div className="flex flex-col items-center w-full">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Faixa etária</p>
              {idadePiramide.length > 0 ? (
                <>
                  <div className="flex justify-center gap-4 mb-2">
                    <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: '#2563eb', fontFamily: INTER }}>
                      <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: '#2563eb' }} /> Homens
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: '#e11d48', fontFamily: INTER }}>
                      <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: '#e11d48' }} /> Mulheres
                    </span>
                  </div>
                  <div style={{ height: 200, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={idadePiramide}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                      >
                        <XAxis
                          type="number"
                          domain={[-idadeAbsMax, idadeAbsMax]}
                          tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: INTER }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v: number) => String(Math.abs(v))}
                        />
                        <YAxis
                          type="category"
                          dataKey="nome"
                          width={58}
                          tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600, fontFamily: INTER }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={formatYCategoryNome}
                        />
                        <RechartsTooltip
                          contentStyle={tooltipSx}
                          formatter={(v: number) => Math.abs(Number(v))}
                        />
                        <Bar dataKey="homens"   fill="#2563eb" radius={[4, 0, 0, 4]} maxBarSize={18} isAnimationActive={false} />
                        <Bar dataKey="mulheres" fill="#e11d48" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="flex h-[200px] items-center justify-center rounded-xl bg-slate-50 w-full text-xs text-slate-400 font-medium text-center px-4">
                  Sem dados de faixa etária nas planilhas importadas.
                </div>
              )}
            </div>
          </div>

          {/* ── KPI chips — estilo referência ── */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3 text-center" style={{ fontFamily: INTER }}>
              Grupos prioritários
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              {[
                { label: "Jovens (até 29)", value: inclusaoModeloDados.grupos_prioritarios.juventude, bg: '#fef3c7', border: '#fde68a', color: '#92400e' },
                { label: "PcDs",              value: inclusaoModeloDados.grupos_prioritarios.pcd,       bg: '#dbeafe', border: '#bfdbfe', color: '#1e40af' },
                { label: "LGBTQIA+",          value: inclusaoModeloDados.grupos_prioritarios.lgbt,      bg: '#fce7f3', border: '#fbcfe8', color: '#9d174d' },
                { label: "Com. Trad.",         value: inclusaoModeloDados.grupos_prioritarios.comunidades_tradicionais, bg: '#dcfce7', border: '#bbf7d0', color: '#166534' },
              ].map(({ label, value, bg, border, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-2xl px-4 py-2.5 transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: bg, border: `1px solid ${border}` }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                  <div style={{ fontFamily: INTER }}>
                    <span className="text-xl font-black leading-none" style={{ color }}>{value}</span>
                    <span className="text-[10px] font-semibold ml-1.5" style={{ color }}>{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <InsightBanner level={inclusionInsight.level} text={inclusionInsight.text} />
          </div>
        </CardContent>
      </Card>

      {/* Grid de gráficos */}
      <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3" style={{ alignItems: 'stretch' }}>

        <MiniCard title="Distribuição por gênero" subtitle="Campos gênero / sexo nas planilhas." empty={!hasAnyQty(data.genero)} insight={insightGenero}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gGenero} margin={{ top: 18, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id={`div-g-${chartUid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00A38C" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600, fontFamily: INTER }} interval={0} height={64} angle={-28} textAnchor="end" axisLine={false} tickLine={false} />
              <YAxis width={28} allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
              <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
              <Bar dataKey="qtd" name="Registros" fill={`url(#div-g-${chartUid})`} radius={[8, 8, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="top" style={{ fontSize: 10, fill: '#00A38C', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard title="Autodeclaração racial / étnica" subtitle="Cor, raça e etnia auto declaradas." empty={!hasAnyQty(data.raca)} insight={insightRaca}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gRaca} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id={`div-r-${chartUid}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={108} tick={{ fontSize: 10, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
              <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
              <Bar dataKey="qtd" name="Registros" fill={`url(#div-r-${chartUid})`} radius={[0, 8, 8, 0]} maxBarSize={18} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#7c3aed', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard title="PcD — declaração" subtitle="Apenas declarações positivas de deficiência." empty={gPcd.length === 0}
          insight={hasAnyQty(data.pcd) ? { level: 'info', text: 'Garanta que os formulários tenham campo de PcD. Baixa resposta pode indicar falta de campo ou constrangimento na declaração.' } : undefined}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={gPcd} dataKey="qtd" nameKey="nome" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2} isAnimationActive={false}>
                {gPcd.map((_, i) => (
                  <Cell key={_._id} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, fontFamily: INTER }} />
              <RechartsTooltip contentStyle={tooltipSx} />
            </PieChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard title="Faixa etária" subtitle="Idade numérica, data de nascimento ou faixa declarada." empty={!hasAnyQty(data.idadeFaixa)} insight={insightIdade}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gIdade} margin={{ top: 18, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id={`div-i-${chartUid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={1} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} />
              <YAxis width={28} allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
              <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
              <Bar dataKey="qtd" name="Registros" fill={`url(#div-i-${chartUid})`} radius={[8, 8, 0, 0]} maxBarSize={44} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="top" style={{ fontSize: 10, fill: '#059669', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard title="Origem dos registros" subtitle="Agentes, grupos, espaços culturais e linhas de editais." empty={gOrigem.length === 0}
          insight={{ level: 'info', text: 'A distribuição por tipo de cadastro mostra onde há maior volume de inscrições — útil para calibrar chamadas públicas específicas.' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={gOrigem} dataKey="qtd" nameKey="nome" cx="50%" cy="50%" innerRadius={42} outerRadius={78} paddingAngle={2} isAnimationActive={false}>
                {gOrigem.map((_, i) => (
                  <Cell key={_._id} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, fontFamily: INTER }} />
              <RechartsTooltip contentStyle={tooltipSx} />
            </PieChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard title="Comunidades tradicionais" subtitle="Vínculo reconhecido com comunidades oficiais." empty={false}
          insight={{ level: 'info', text: 'Comunidades tradicionais têm direito a acesso prioritário em editais do PNAB. Verifique o percentual e planeje chamadas específicas.' }}>
          {gTrad.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl bg-slate-50">
              <span className="text-5xl font-black text-slate-200" style={{ fontFamily: INTER }}>0</span>
              <p className="text-center text-xs font-semibold text-slate-400 px-6 leading-relaxed">
                Nenhum vínculo com comunidades tradicionais declarado nos registros atuais.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={gTrad} dataKey="qtd" nameKey="nome" cx="50%" cy="50%" innerRadius={48} outerRadius={80} isAnimationActive={false}>
                  {gTrad.map((_, i) => (
                    <Cell key={_._id} fill={PIE_COLORS[(i + 4) % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, fontFamily: INTER }} />
                <RechartsTooltip contentStyle={tooltipSx} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </MiniCard>

        <MiniCard kicker="Cor / raça" title="População negra declarada" subtitle="Pretos e pardos vs. demais — eixo racial separado." empty={!hasAnyQty(data.negrosComparativoBase)}
          insight={{ level: 'info', text: 'Compare com o IBGE local: a sub-representação de negros indica barreiras de acesso que podem ser removidas com editais afirmativos.' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gNegBase} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id={`div-neg-${chartUid}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1e1b4b" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.88} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={132} tick={{ fontSize: 10, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
              <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
              <Bar dataKey="qtd" name="Registros" fill={`url(#div-neg-${chartUid})`} radius={[0, 8, 8, 0]} maxBarSize={22} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#312e81', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard kicker="LGBTQIA+" title="Orientação vs. identidade (contagem)" subtitle="Dois eixos distintos: orientação e identidade de gênero LGBTQ+ (sem duplicar)." empty={!hasAnyQty(data.lgbtqComparativo)}
          insight={{ level: 'info', text: 'Diferencie orientação sexual de identidade de gênero nos formulários para capturar ambos os eixos corretamente.' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gLgbt} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={168} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
              <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
              <Bar dataKey="qtd" name="Registros" fill="#be185d" radius={[0, 8, 8, 0]} maxBarSize={22} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#be185d', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard kicker="Gênero e acessibilidade" title="Gênero, juventude, PcD e comunidades trad." subtitle="Eixos distintos de cor/raça e LGBTQIA+." empty={!hasAnyQty(data.inclusaoSemRacaELgbt)}
          insight={{ level: 'info', text: 'Estes grupos têm marcadores específicos de vulnerabilidade — use os valores para construir cotas ou pontuações extras em editais.' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gIncSoc} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id={`div-inc-${chartUid}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#e11d48" stopOpacity={0.92} />
                  <stop offset="100%" stopColor="#fb7185" stopOpacity={0.88} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
              <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
              <Bar dataKey="qtd" name="Registros" fill={`url(#div-inc-${chartUid})`} radius={[0, 8, 8, 0]} maxBarSize={20} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#e11d48', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard kicker="LGBTQIA+" title="Orientação sexual (texto livre)" subtitle="Apenas campos de orientação sexual." empty={!hasAnyQty(data.orientacaoSexual)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gOriSex} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={128} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
              <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
              <Bar dataKey="qtd" name="Registros" fill="#db2777" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#db2777', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        {hasAnyQty(data.identidadeGeneroDistrib) && (
          <MiniCard kicker="LGBTQIA+" title="Identidade de gênero (texto livre)" subtitle="Campos específicos de identidade de gênero." empty={false}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={gIdGen} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" width={128} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
                <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
                <Bar dataKey="qtd" name="Registros" fill="#a21caf" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false}>
                  <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#a21caf', fontFamily: INTER, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </MiniCard>
        )}

        <MiniCard title="Escolaridade" subtitle="Grau de instrução declarado." empty={!hasAnyQty(data.escolaridade)}
          insight={{ level: 'info', text: 'Escolaridade alta pode indicar viés de seleção — pessoas com menor instrução podem ter dificuldade de acessar editais. Considere oficinas de auxílio à inscrição.' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gEsc} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={128} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
              <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
              <Bar dataKey="qtd" name="Registros" fill="#0d9488" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#0d9488', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard title="Mulheres e homens (declarado)" subtitle="Apenas onde o campo gênero/sexo permite classificar." empty={!hasUsefulQty(data.homensMulheres)}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={gHM.filter(r => { const n = normalizeText(r.nome); return n && n !== 'nao informado' && n !== '-'; })} dataKey="qtd" nameKey="nome" cx="50%" cy="50%" innerRadius={44} outerRadius={76} isAnimationActive={false}>
                {gHM.map((_, i) => (
                  <Cell key={_._id} fill={PIE_COLORS[(i + 1) % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, fontFamily: INTER }} />
              <RechartsTooltip contentStyle={tooltipSx} />
            </PieChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard kicker="Inclusão" title="Orientação sexual (resumo)" subtitle="Classificação de colunas de orientação sexual." empty={!hasAnyQty(data.orientacaoSexualClassificada)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gOriClass} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={148} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
              <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
              <Bar dataKey="qtd" name="Registros" fill="#7c3aed" radius={[0, 8, 8, 0]} maxBarSize={20} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#7c3aed', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard kicker="Inclusão" title="LGBTQIA+ por tipo de cadastro" subtitle="Registros em cada base que entram na união LGBTQIA+." empty={!hasAnyQty(data.lgbtqiaPorTipoCadastro)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gLgbtTipo} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={96} tick={{ fontSize: 10, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
              <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
              <Bar dataKey="qtd" name="Registros" fill="#be185d" radius={[0, 8, 8, 0]} maxBarSize={22} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#be185d', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        {/* ─── Separador: Indicadores Culturais ─── */}
        <div className="col-span-full mt-4 border-t border-slate-200 pt-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="w-1 h-6 rounded-full bg-[#059669] inline-block shrink-0" />
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#059669]">Indicadores culturais</p>
          </div>
          <h4 className="text-lg font-black text-[#0f172a] ml-4">Práticas, territórios de fala e cruzamentos por cadastro</h4>
          <p className="mt-1 max-w-3xl text-sm font-medium text-[#5f5f6a] ml-4">
            Linguagens, tempo de atuação, renda e naturalidade. Cada insight aponta oportunidades concretas de política cultural.
          </p>
        </div>

        <MiniCard kicker="Indicadores culturais" title="Gênero por tipo de cadastro" subtitle="Mulheres, homens e outros por segmento." empty={gGenOrig.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gGenOrig} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} width={32} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, fontFamily: INTER }} />
              <Bar dataKey="mulheres" name="Mulheres"    stackId="g" fill="#f59e0b" isAnimationActive={false} />
              <Bar dataKey="homens"   name="Homens"      stackId="g" fill="#2563eb" isAnimationActive={false} />
              <Bar dataKey="outros"   name="Outros / NI" stackId="g" fill="#cbd5e1" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard kicker="Indicadores culturais" title="População negra por tipo de cadastro" subtitle="Negros / pardos vs. demais por segmento." empty={gNegOrig.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gNegOrig} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} width={32} />
              <RechartsTooltip contentStyle={tooltipSx} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, fontFamily: INTER }} />
              <Bar dataKey="negros" name="Negros / pardos" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              <Bar dataKey="demais" name="Demais"          fill="#e2e8f0" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard kicker="Indicadores culturais" title="Áreas e linguagens culturais" subtitle="Categoria, área ou linguagem mais citados." empty={!hasAnyQty(data.areaCultural)} insight={insightArea}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gArea} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={118} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
              <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
              <Bar dataKey="qtd" name="Registros" fill="#059669" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#059669', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard kicker="Cor / raça" title="Índice racial (% na base)" subtitle="Negros/pardos sobre o total." empty={gIndRacial.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gIndRacial} margin={{ top: 4, right: 48, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
              <RechartsTooltip contentStyle={tooltipSx} formatter={(v: number | string) => [`${v}%`, '']} />
              <Bar dataKey="qtd" name="Percentual" fill="#312e81" radius={[0, 6, 6, 0]} maxBarSize={20} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fill: '#312e81', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard kicker="LGBTQIA+" title="Registros por eixo (base importada)" subtitle="Orientação sexual e identidade de gênero LGBTQ+." empty={gIndLgbt.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gIndLgbt} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={168} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
              <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
              <Bar dataKey="qtd" name="Registros" fill="#be185d" radius={[0, 6, 6, 0]} maxBarSize={20} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#be185d', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard kicker="Demografia" title="Outros percentuais (%)" subtitle="Gênero, juventude, PcD e comunidades tradicionais." empty={gIndDemo.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gIndDemo} margin={{ top: 4, right: 48, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
              <RechartsTooltip contentStyle={tooltipSx} formatter={(v: number | string) => [`${v}%`, '']} />
              <Bar dataKey="qtd" name="Percentual" fill="#00A38C" radius={[0, 6, 6, 0]} maxBarSize={18} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fill: '#00A38C', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        {gEstCiv.length > 0 && (
          <MiniCard kicker="Indicadores culturais" title="Estado civil" subtitle="Categorias declaradas (exceto não informado)." empty={false}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={gEstCiv} dataKey="qtd" nameKey="nome" cx="50%" cy="50%" innerRadius={40} outerRadius={76} paddingAngle={2} isAnimationActive={false}>
                  {gEstCiv.map((_, i) => (
                    <Cell key={_._id} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 600, fontFamily: INTER }} />
                <RechartsTooltip contentStyle={tooltipSx} />
              </PieChart>
            </ResponsiveContainer>
          </MiniCard>
        )}

        {hasUsefulQty(data.rendaFaixa) && (
          <MiniCard kicker="Indicadores culturais" title="Renda ou faixa declarada" subtitle="Faixas de renda pessoal/familiar normalizadas." empty={false}
            insight={{ level: 'info', text: 'Baixa renda concentrada indica necessidade de facilitar acesso a editais com menores exigências burocráticas e valores menores por projeto.' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={gRenda} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" width={128} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
                <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
                <Bar dataKey="qtd" name="Registros" fill="#d97706" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false}>
                  <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#d97706', fontFamily: INTER, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </MiniCard>
        )}

        {hasUsefulQty(data.pcdTipos) && (
          <MiniCard kicker="Indicadores culturais" title="PcD — tipo declarado" subtitle="Agrupamento a partir do texto quando há declaração positiva." empty={false}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={gPcdTipo} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" width={132} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
                <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
                <Bar dataKey="qtd" name="Registros" fill="#0891b2" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false}>
                  <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#0891b2', fontFamily: INTER, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </MiniCard>
        )}

        {hasAnyQty(data.experienciaCultural) && (
          <MiniCard kicker="Indicadores culturais" title="Tempo de atuação / experiência" subtitle="Valores textuais mais frequentes (anos, tempo de carreira)." empty={false}
            insight={{ level: 'info', text: 'Alta experiência pode indicar que novos agentes têm dificuldade de entrar — crie categorias específicas para iniciantes e fomento à formação.' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={gExp} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" width={128} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
                <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
                <Bar dataKey="qtd" name="Registros" fill="#7c3aed" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false}>
                  <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#7c3aed', fontFamily: INTER, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </MiniCard>
        )}

        <MiniCard kicker="Indicadores culturais" title="Naturalidade / cidade" subtitle="Município de nascimento ou cidade informada no cadastro." empty={!hasAnyQty(data.naturalidadeTop)}
          insight={{ level: 'info', text: 'Naturalidade predominante fora de Ilhabela indica tradição migratória — políticas culturais devem valorizar tanto raízes locais quanto novas influências.' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gNat} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={128} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
              <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
              <Bar dataKey="qtd" name="Registros" fill="#ea580c" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#ea580c', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>

        <MiniCard kicker="Indicadores culturais" title="Povos e comunidades (referências textuais)" subtitle="Palavras-chave em comunidade, observações, raça ou nome." empty={!hasAnyQty(data.povosReferencia)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={gPovos} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: INTER }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={formatYCategoryNome} />
              <RechartsTooltip content={<CustomTooltip totalBase={totalBase} />} />
              <Bar dataKey="qtd" name="Ocorrências" fill="#16a34a" radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false}>
                <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: '#16a34a', fontFamily: INTER, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </MiniCard>
      </div>
    </div>
  );
}
