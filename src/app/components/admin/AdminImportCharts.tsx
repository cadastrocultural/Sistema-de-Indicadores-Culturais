import { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LabelList,
} from 'recharts';

export type PorEditalChartRow = {
  chave: string;
  nome: string;
  total: number;
  contemplados: number;
  naoContemplados: number;
  suplentes: number;
};

const TOOLTIP_SX = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  fontSize: 12,
  fontWeight: 600,
  boxShadow: '0 8px 24px rgba(15,23,42,0.10)',
  fontFamily: 'Inter, sans-serif',
  padding: '10px 14px',
};

type Props = {
  totalInscritos: number;
  contemplados: number;
  suplentes: number;
  naoContemplados: number;
  porEdital: PorEditalChartRow[];
};

const STATUS_COLORS = ['#059669', '#f59e0b', '#ef4444', '#94a3b8'];
const STATUS_LABELS = ['Contemplados', 'Suplentes', 'Não contemplados', 'Outros'];

function TaxaChip({ taxa }: { taxa: number }) {
  const color = taxa >= 50 ? '#059669' : taxa >= 30 ? '#f59e0b' : '#ef4444';
  const bg = taxa >= 50 ? '#d1fae5' : taxa >= 30 ? '#fef3c7' : '#fee2e2';
  const label = taxa >= 50 ? 'Alta aprovação' : taxa >= 30 ? 'Aprovação moderada' : 'Baixa aprovação';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ color, backgroundColor: bg }}
    >
      {label} · {taxa.toFixed(1)}%
    </span>
  );
}

function InsightBanner({ icon, text, color }: { icon: string; text: string; color: string }) {
  const bg = color === 'green' ? '#f0fdf4' : color === 'yellow' ? '#fefce8' : '#fef2f2';
  const border = color === 'green' ? '#bbf7d0' : color === 'yellow' ? '#fde68a' : '#fecaca';
  const textColor = color === 'green' ? '#166534' : color === 'yellow' ? '#92400e' : '#991b1b';
  return (
    <div
      className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-semibold leading-relaxed"
      style={{ backgroundColor: bg, border: `1px solid ${border}`, color: textColor }}
    >
      <span className="shrink-0 text-sm">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={TOOLTIP_SX}>
      <div className="font-bold text-slate-800">{d.name}</div>
      <div className="text-slate-500 text-[11px]">{d.value} inscritos</div>
    </div>
  );
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.find((p: any) => p.dataKey === 'Inscritos')?.value ?? 0;
  const cont = payload.find((p: any) => p.dataKey === 'Contemplados')?.value ?? 0;
  const taxa = total > 0 ? ((cont / total) * 100).toFixed(1) : '0';
  return (
    <div style={{ ...TOOLTIP_SX, minWidth: 180 }}>
      <div className="font-bold text-slate-800 mb-1 text-[11px]">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
          <span className="text-slate-600">{p.dataKey}:</span>
          <span className="font-bold text-slate-800">{p.value}</span>
        </div>
      ))}
      <div className="mt-1 pt-1 border-t border-slate-100 text-[10px] font-bold text-slate-500">
        Taxa de aprovação: {taxa}%
      </div>
    </div>
  );
};

export function AdminImportCharts({ totalInscritos, contemplados, suplentes, naoContemplados, porEdital }: Props) {
  const statusData = [
    { name: STATUS_LABELS[0], value: contemplados },
    { name: STATUS_LABELS[1], value: suplentes },
    { name: STATUS_LABELS[2], value: naoContemplados },
    { name: STATUS_LABELS[3], value: Math.max(0, totalInscritos - contemplados - suplentes - naoContemplados) },
  ].filter((d) => d.value > 0);

  const taxaAprovacao = totalInscritos > 0 ? (contemplados / totalInscritos) * 100 : 0;

  const barData = porEdital.map((ed) => ({
    nome: ed.nome.length > 20 ? `${ed.nome.slice(0, 18)}…` : ed.nome,
    nomeCompleto: ed.nome,
    Inscritos: ed.total,
    Contemplados: ed.contemplados,
    taxa: ed.total > 0 ? ((ed.contemplados / ed.total) * 100).toFixed(1) : '0',
  }));

  const insights = useMemo(() => {
    const result: Array<{ icon: string; text: string; color: string }> = [];
    if (taxaAprovacao < 25) {
      result.push({ icon: '⚠️', text: `Taxa de aprovação de ${taxaAprovacao.toFixed(1)}% — considere ampliar o número de vagas ou rever critérios de seleção para aumentar o alcance do edital.`, color: 'red' });
    } else if (taxaAprovacao >= 60) {
      result.push({ icon: '✅', text: `Taxa de aprovação de ${taxaAprovacao.toFixed(1)}% — boa cobertura. Avalie se há demanda reprimida para ampliar o edital na próxima edição.`, color: 'green' });
    } else {
      result.push({ icon: '📊', text: `Taxa de aprovação de ${taxaAprovacao.toFixed(1)}% — patamar equilibrado. Monitore a distribuição territorial para identificar bairros sub-representados.`, color: 'yellow' });
    }
    if (suplentes > 0) {
      const percSup = ((suplentes / totalInscritos) * 100).toFixed(1);
      result.push({ icon: '📋', text: `${suplentes} suplentes (${percSup}%) — reserve reserva técnica para cobrir desistências. Ative a lista imediatamente em caso de vaga liberada.`, color: 'yellow' });
    }
    const edMaiorTaxa = [...porEdital].sort((a, b) => (b.contemplados / Math.max(1, b.total)) - (a.contemplados / Math.max(1, a.total)))[0];
    if (edMaiorTaxa && porEdital.length > 1) {
      result.push({ icon: '🏆', text: `"${edMaiorTaxa.nome}" tem a maior taxa de aprovação — use este edital como referência de critérios para os demais.`, color: 'green' });
    }
    return result;
  }, [taxaAprovacao, suplentes, totalInscritos, porEdital]);

  if (totalInscritos <= 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#00A38C]">Distribuição</p>
              <h4 className="text-sm font-bold text-slate-900">Inscritos por situação</h4>
            </div>
            <TaxaChip taxa={taxaAprovacao} />
          </div>
          <div className="flex items-center gap-2 mt-1 mb-3">
            <div className="h-2 flex-1 rounded-full overflow-hidden bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, taxaAprovacao)}%`, backgroundColor: '#059669' }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums" style={{ fontFamily: 'Inter, sans-serif', color: '#059669' }}>
              {contemplados}/{totalInscritos}
            </span>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={82}
                  paddingAngle={3}
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
                  formatter={(value: string, entry: any) => (
                    <span style={{ color: '#475569' }}>
                      {value} <span style={{ color: entry.color, fontWeight: 700 }}>{entry.payload.value}</span>
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar chart por edital */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#00A38C] mb-1">Por edital</p>
          <h4 className="text-sm font-bold text-slate-900 mb-1">Inscritos vs. contemplados</h4>
          <div style={{ height: 270 }}>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 16, right: 8, left: 0, bottom: 52 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="nome"
                    tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'Inter, sans-serif' }}
                    interval={0}
                    angle={-32}
                    textAnchor="end"
                    height={60}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'Inter, sans-serif' }}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    width={34}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600 }} />
                  <Bar dataKey="Inscritos" fill="#bfdbfe" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    <LabelList dataKey="Inscritos" position="top" style={{ fontSize: 9, fill: '#64748b', fontFamily: 'Inter, sans-serif', fontWeight: 700 }} />
                  </Bar>
                  <Bar dataKey="Contemplados" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    <LabelList dataKey="Contemplados" position="top" style={{ fontSize: 9, fill: '#059669', fontFamily: 'Inter, sans-serif', fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm text-center pt-16">Sem agrupamento por edital.</p>
            )}
          </div>
        </div>
      </div>

      {/* Insights de tomada de decisão */}
      {insights.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#00A38C] mb-2">Insights para decisão</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {insights.map((ins, i) => (
              <InsightBanner key={i} {...ins} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
