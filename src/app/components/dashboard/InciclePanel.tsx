import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

type Props = {
  kicker?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Altura mínima da área de conteúdo (mapas, gráficos) */
  contentMinHeight?: number | string;
};

/**
 * Cartão de seção no estilo dashboards corporativos (borda esquerda em destaque, fundo branco, sombra suave).
 * Referência visual: painéis tipo InCicle / HR analytics.
 */
export function InciclePanel({ kicker, title, subtitle, children, contentMinHeight }: Props) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '22px',
        border: '1px solid #e8ecf1',
        boxShadow: '0 14px 48px rgba(15, 23, 42, 0.07)',
        overflow: 'hidden',
        bgcolor: '#fff',
      }}
    >
      <Box
        sx={{
          borderLeft: '4px solid #2563eb',
          px: { xs: 2, sm: 2.5 },
          py: 2,
          borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(90deg, #f8fafc 0%, #ffffff 45%)',
        }}
      >
        {kicker ? (
          <Typography
            variant="caption"
            sx={{ display: 'block', fontWeight: 900, letterSpacing: '0.12em', color: '#2563eb', mb: 0.5 }}
          >
            {kicker}
          </Typography>
        ) : null}
        <Typography variant="h6" sx={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" sx={{ mt: 0.75, color: '#64748b', fontWeight: 500, maxWidth: 720 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 2.25 }, minHeight: contentMinHeight }}>{children}</Box>
    </Paper>
  );
}
