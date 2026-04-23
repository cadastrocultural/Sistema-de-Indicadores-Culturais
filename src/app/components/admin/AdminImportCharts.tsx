import React from 'react';
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
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  fontSize: 12,
  fontWeight: 600,
  boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
};

type Props = {
  totalInscritos: number;
  contemplados: number;
  suplentes: number;
  naoContemplados: number;
  porEdital: PorEditalChartRow[];
};

const STATUS_COLORS = ['#2e7d32', '#ff9800', '#c62828', '#90a4ae'];

export function AdminImportCharts({ totalInscritos, contemplados, suplentes, naoContemplados, porEdital }: Props) {
  const statusData = [
    { name: 'Contemplados', value: contemplados },
    { name: 'Suplentes', value: suplentes },
    { name: 'Não contemplados', value: naoContemplados },
    {
      name: 'Outros',
      value: Math.max(0, totalInscritos - contemplados - suplentes - naoContemplados),
    },
  ].filter((d) => d.value > 0);

  const barData = porEdital.map((ed) => ({
    nome:
      ed.nome.length > 22
        ? `${ed.nome.slice(0, 20)}…`
        : ed.nome,
    Inscritos: ed.total,
    Contemplados: ed.contemplados,
  }));

  if (totalInscritos <= 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#0b57d0] mb-1">Distribuição</p>
        <h4 className="text-sm font-bold text-slate-900 mb-2">Inscritos por situação</h4>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_SX} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#0b57d0] mb-1">Por edital</p>
        <h4 className="text-sm font-bold text-slate-900 mb-2">Inscritos e contemplados</h4>
        <div style={{ height: 260 }}>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="nome" tick={{ fontSize: 9, fill: '#64748b' }} interval={0} angle={-28} textAnchor="end" height={56} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={TOOLTIP_SX} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Inscritos" fill="#2196f3" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Contemplados" fill="#2e7d32" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm text-center pt-16">Sem agrupamento por edital.</p>
          )}
        </div>
      </div>
    </div>
  );
}
