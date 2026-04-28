import React, { type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './app/App';
import './styles/index.css';

const muiTheme = createTheme({
  typography: {
    fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  shape: {
    borderRadius: 12,
  },
  palette: {
    primary: { main: '#00A38C', contrastText: '#ffffff' },
    secondary: { main: '#006B5A', contrastText: '#ffffff' },
    text: { primary: '#101828', secondary: '#52645d' },
  },
});

class RootErrorBoundary extends React.Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: 'Poppins, system-ui, sans-serif',
            color: '#101828',
            background: '#f8fafc',
          }}
        >
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <p style={{ fontWeight: 800, marginBottom: 8 }}>Não foi possível carregar o site.</p>
            <p style={{ fontSize: 14, opacity: 0.85 }}>{this.state.error.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Elemento #root não encontrado no HTML.');
}

createRoot(rootEl).render(
  <ThemeProvider theme={muiTheme}>
    <CssBaseline />
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </ThemeProvider>
);
  