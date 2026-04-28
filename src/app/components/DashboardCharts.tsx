import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, ScatterChart, Scatter, ZAxis, LabelList
} from 'recharts';

const THEME = {
  primary:   '#00A38C',
  secondary: '#2ED6A3',
  accent:    '#FFC857',
  green:     '#00A38C',
  purple:    '#9333ea',
  pink:      '#e91e8a',
  gray:      '#5f5f6a',
  surface:   'rgba(255,255,255,0.35)',
  border:    'rgba(255,255,255,0.3)',
};

const PALETTE = [THEME.primary, THEME.secondary, THEME.accent, THEME.green, '#FF6B35', THEME.purple, THEME.pink];

const glassCard: React.CSSProperties = {
  background: THEME.surface,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${THEME.border}`,
  borderRadius: '1.5rem',
  padding: '1.75rem',
  boxShadow: '0 4px 24px rgba(0,107,90,0.08)',
};

const sectionTitle = (label: string, color = THEME.primary) => (
  <div style={{ marginBottom: '1.25rem' }}>
    <span style={{
      fontSize: '0.65rem',
      fontWeight: 800,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      color,
      display: 'block',
      marginBottom: 4,
    }}>Indicador</span>
    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1b1b1f', margin: 0 }}>{label}</h3>
  </div>
);

// ─── Tooltip customizado ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(11,87,208,0.15)',
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      minWidth: 140,
    }}>
      {label && <div style={{ fontWeight: 700, color: '#1b1b1f', marginBottom: 6, fontSize: '0.8rem' }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', marginBottom: 2 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: p.fill || p.color, display: 'inline-block' }} />
          <span style={{ color: THEME.gray }}>{p.name}:</span>
          <strong style={{ color: '#1b1b1f' }}>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ─── Dados mock ──────────────────────────────────────────────────────────────
const monthData = [
  { month: 'Jan', value: 450,  projects: 12 },
  { month: 'Fev', value: 520,  projects: 15 },
  { month: 'Mar', value: 840,  projects: 22 },
  { month: 'Abr', value: 610,  projects: 18 },
  { month: 'Mai', value: 920,  projects: 26 },
  { month: 'Jun', value: 780,  projects: 21 },
  { month: 'Jul', value: 1100, projects: 32 },
  { month: 'Ago', value: 890,  projects: 24 },
  { month: 'Set', value: 1250, projects: 35 },
  { month: 'Out', value: 1400, projects: 42 },
  { month: 'Nov', value: 1100, projects: 30 },
  { month: 'Dez', value: 950,  projects: 28 },
];

const categoryData = [
  { name: 'Música',        projects: 124 },
  { name: 'Audiovisual',   projects: 63  },
  { name: 'Artes Visuais', projects: 85  },
  { name: 'Patrimônio',    projects: 56  },
  { name: 'Teatro',        projects: 42  },
  { name: 'Dança',         projects: 38  },
  { name: 'Literatura',    projects: 20  },
];

const neighborhoodData = [
  { name: 'Perequê',     projects: 92 },
  { name: 'Vila',        projects: 74 },
  { name: 'Itaguaçu',   projects: 58 },
  { name: 'Água Branca', projects: 45 },
  { name: 'Cocaia',      projects: 38 },
  { name: 'Barra Velha', projects: 32 },
  { name: 'Bonete',      projects: 24 },
];

const tradData = [
  { name: 'Tradicional',     value: 112 },
  { name: 'Não Tradicional', value: 316 },
];

const typeData = [
  { name: 'PF', value: 278 },
  { name: 'PJ', value: 150 },
];

const bubbleData = [
  { year: 2024, value: 2.1, projects: 124, category: 'Música'     },
  { year: 2024, value: 1.2, projects: 45,  category: 'Audiovisual'},
  { year: 2025, value: 2.4, projects: 142, category: 'Música'     },
  { year: 2025, value: 1.8, projects: 68,  category: 'Patrimônio' },
  { year: 2026, value: 1.8, projects: 82,  category: 'Teatro'     },
];

// ─── Donut com texto central ──────────────────────────────────────────────────
function DonutChart({
  data,
  colors,
  total,
  title,
  legend,
}: {
  data: { name: string; value: number }[];
  colors: string[];
  total: number;
  title: string;
  legend: { label: string; color: string }[];
}) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: THEME.gray, marginBottom: 12 }}>
        {title}
      </p>
      <div style={{ height: 200, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Centro do donut */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: colors[0], lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: '0.55rem', fontWeight: 700, color: THEME.gray, textTransform: 'uppercase', letterSpacing: '0.05em' }}>total</div>
        </div>
      </div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
        {legend.map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', fontWeight: 700, color: '#1b1b1f' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, display: 'inline-block' }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Barra horizontal com progresso visual ────────────────────────────────────
function HorizontalBarChart({ data, color, label }: { data: { name: string; projects: number }[]; color: string; label: string }) {
  const max = Math.max(...data.map(d => d.projects));
  return (
    <div>
      {sectionTitle(label, color)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((d, i) => {
          const pct = Math.round((d.projects / max) * 100);
          return (
            <div key={d.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1b1b1f' }}>{d.name}</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color }}>
                  {d.projects} <span style={{ fontSize: '0.65rem', fontWeight: 600, color: THEME.gray }}>projetos</span>
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    borderRadius: 99,
                    background: i === 0
                      ? `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`
                      : color,
                    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export function DashboardCharts() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>

      {/* 1. Investimento e Projetos por Mês ─ full width */}
      <div style={{ ...glassCard }}>
        {sectionTitle('Investimento e Projetos por Mês')}
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthData} barGap={4}>
              <defs>
                <linearGradient id="gradInv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={THEME.primary} stopOpacity={1} />
                  <stop offset="100%" stopColor={THEME.primary} stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="gradProj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={THEME.green} stopOpacity={1} />
                  <stop offset="100%" stopColor={THEME.green} stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fontWeight: 600, fill: THEME.gray }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: THEME.primary }}
                tickFormatter={(v) => `${v}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: THEME.green }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(11,87,208,0.05)', radius: 8 }} />
              <Legend
                wrapperStyle={{ fontSize: '0.75rem', fontWeight: 700, paddingTop: 12 }}
                iconType="square"
                iconSize={10}
              />
              <Bar yAxisId="left" dataKey="value" fill="url(#gradInv)" radius={[6, 6, 0, 0]} name="Investimento (k)" maxBarSize={32} />
              <Bar yAxisId="right" dataKey="projects" fill="url(#gradProj)" radius={[6, 6, 0, 0]} name="Projetos" maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Grid 2 colunas: Categoria + Bairro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

        {/* Categoria */}
        <div style={glassCard}>
          <HorizontalBarChart
            data={categoryData}
            color={THEME.primary}
            label="Projetos por Categoria Cultural"
          />
        </div>

        {/* Bairro */}
        <div style={glassCard}>
          <HorizontalBarChart
            data={neighborhoodData}
            color={THEME.green}
            label="Projetos por Bairro"
          />
        </div>
      </div>

      {/* 3. Grid 2 colunas: Bubble + Donuts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

        {/* Bubble / Scatter */}
        <div style={glassCard}>
          {sectionTitle('Análise: Ano × Valor × Projetos')}
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  type="number"
                  dataKey="year"
                  name="Ano"
                  domain={[2023.5, 2026.5]}
                  ticks={[2024, 2025, 2026]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 600, fill: THEME.gray }}
                />
                <YAxis
                  type="number"
                  dataKey="value"
                  name="Valor (M)"
                  unit="M"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: THEME.gray }}
                />
                <ZAxis type="number" dataKey="projects" range={[80, 700]} name="Qtd Projetos" />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '4 4' }} />
                <Scatter
                  name="Projetos Culturais"
                  data={bubbleData}
                  fill={THEME.accent}
                  fillOpacity={0.8}
                  stroke={THEME.primary}
                  strokeWidth={1.5}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: '0.65rem', color: THEME.gray, textAlign: 'center', marginTop: 8 }}>
            Tamanho da bolha = quantidade de projetos
          </p>
        </div>

        {/* Donuts */}
        <div style={{ ...glassCard, display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <DonutChart
            data={tradData}
            colors={[THEME.green, THEME.secondary]}
            total={tradData.reduce((s, d) => s + d.value, 0)}
            title="Comunidades Tradicionais"
            legend={[
              { label: 'Tradicional', color: THEME.green },
              { label: 'Não', color: THEME.secondary },
            ]}
          />
          <div style={{ width: 1, height: 160, background: 'rgba(0,0,0,0.08)' }} />
          <DonutChart
            data={typeData}
            colors={[THEME.primary, THEME.accent]}
            total={typeData.reduce((s, d) => s + d.value, 0)}
            title="Tipo de Proponente"
            legend={[
              { label: 'Pessoa Física', color: THEME.primary },
              { label: 'Pessoa Jurídica', color: THEME.accent },
            ]}
          />
        </div>
      </div>

    </div>
  );
}
