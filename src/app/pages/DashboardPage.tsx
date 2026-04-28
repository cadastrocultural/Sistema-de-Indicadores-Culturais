import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Filter, MapPin, Users, Info, Search, 
  ChevronRight, Calendar, FileText, AlertTriangle, 
  RefreshCw, FileSpreadsheet, LayoutDashboard,
  ExternalLink, List, Trophy, Map
} from 'lucide-react';
import { 
  Button, Card, CardContent, Typography, TextField, 
  InputAdornment, MenuItem, Select, FormControl, InputLabel, 
  Chip, Box, IconButton, Tooltip, Alert, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { 
  CATEGORIAS, BAIRROS, COMUNIDADES_TRADICIONAIS, 
  formatBRL, getTipoDoc, ProjetoPNAB 
} from '../data/pnab-data';
import { MAPEAMENTO_2020, STATS_MAPEAMENTO, AgenteCultural } from '../data/mapeamento-data';
import { DADOS_ESTATICOS } from '../data/dados-estaticos';
import {
  canonicalBairroIlhabela,
  coordsTemPinNoMapaIlhabela,
  looksLikeEnderecoCompleto,
  resolveCoordsForIlhabela,
} from '../data/bairros-coords';
import {
  getProjetoValorNormalizado,
  isProjetoContempladoParaEstatistica,
  normalizeProjetosOnParsed,
} from './admin/projetosDemandaOferta';
import { buildCadastroUnionRows } from '../data/estatisticas-publicas';
import {
  diversityFieldsFromRaw,
  itemIsLgbtqia,
  isPcdDeclaracaoPositiva,
} from '../utils/dashboardDiversityFields';
import { AdminImportCharts } from '../components/admin/AdminImportCharts';
// editais-data agora computa dinamicamente dos projetos importados

// Importar a imagem de fundo cultural
import bgImage from 'figma:asset/610c65fe18e207741b10ac500c3b0999ca3b1aaf.png';

// --- PALETA DE CORES (Paleta institucional Cadastro Cultural) ---
const THEME_COLORS = {
  primary: "#006B5A",
  secondary:  "#00A38C",
  accent:     "#FFC857",   // Amarelo
  danger:    "#D97706",
  gray:       "#CFD8DC",
  white:      "#FFFFFF",
  green:      "#00A38C",   // Verde para Mapeamento
};

// Fix for Leaflet default icon issues in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper: converte serial date do Excel (ex: 44091) para ano real (ex: 2020)
const excelSerialToYear = (val: any): number => {
  const n = typeof val === 'number' ? val : parseInt(String(val));
  if (isNaN(n)) return 2020;
  if (n >= 1900 && n <= 2100) return n; // Já é um ano
  if (n >= 15000 && n <= 60000) { // Serial date do Excel
    const d = new Date((n - 25569) * 86400000);
    return d.getFullYear();
  }
  return 2020;
};

// Interface unificada para visualização
interface ItemCultural {
  id: number;
  tipo: 'agente' | 'grupo' | 'espaco' | 'mapeamento' | 'edital';
  ano: number;
  nome: string;
  proponente: string;
  categoria: string;
  bairro: string;
  lat: number | null;
  lng: number | null;
  valor?: number;
  edital?: string;
  eh_contemplado?: boolean;
  status?: string;
  comunidadeTradicional?: string;
  genero?: string;
  /** Só gênero/sexo (para critério LGBTQIA+ trans/NB no gênero, como na Home). */
  genero_sexo?: string;
  identidade_genero?: string;
  raca?: string;
  orientacao_sexual?: string;
  idade?: string;
  deficiencia?: string;
  /** Endereço bruto (só para georreferência no mapa; não exibir em tabelas públicas). */
  enderecoCompleto?: string;
}

const itemTemCoordenadasMapa = (i: ItemCultural) => coordsTemPinNoMapaIlhabela(i.lat, i.lng);

// 🎯 Parser robusto para valores monetários brasileiros (R$ 336.000,00 → 336000)
const parseBRLValue = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  let s = String(val).replace(/[^0-9.,\-]/g, '').trim();
  if (!s) return 0;
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  } else if (s.includes('.') && !s.includes(',')) {
    const parts = s.split('.');
    if (parts.length === 2 && parts[1].length === 3 && parseInt(parts[0]) > 0) {
      s = s.replace('.', '');
    }
    if (parts.length > 2) {
      s = parts.join('');
    }
  }
  return parseFloat(s) || 0;
};

const bairroLabelParaPainel = (rawBairro: any, enderecoCompleto?: any): string => {
  const r0 = String(rawBairro || '').trim();
  const e = String(enderecoCompleto || '').trim();
  const r = r0 === 'Não informado' ? '' : r0;
  const c = canonicalBairroIlhabela(r, e);
  if (c) return c;
  if (!r0 || r0 === 'Não informado') return 'Não informado';
  if (looksLikeEnderecoCompleto(r0)) return 'Não informado';
  return r0;
};

const normalizeCoordsByBairro = (
  bairro: string,
  latRaw: any,
  lngRaw: any,
  enderecoCompleto?: string
): { lat: number | null; lng: number | null } =>
  resolveCoordsForIlhabela(bairro, latRaw, lngRaw, enderecoCompleto);

const normCategoriaKey = (v: unknown) =>
  String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const canonicalCategoriaCultural = (raw: unknown): string => {
  const n = normCategoriaKey(raw);
  if (!n || n === 'nao informado' || n === 'sem categoria' || n === 'outros') return '';
  if (n.includes('musica') || n.includes('musical') || n.includes('canto') || n.includes('coral')) return 'Música';
  if (n.includes('artesan')) return 'Artesanato';
  if (n.includes('caicara') || n.includes('tradicion') || n.includes('patrimonio') || n.includes('memoria') || n.includes('saber')) return 'Cultura Caiçara';
  if (n.includes('visual') || n.includes('fotografia') || n.includes('pintura') || n.includes('desenho') || n.includes('escultura') || n.includes('grafite')) return 'Artes Visuais';
  if (n.includes('audiovisual') || n.includes('cinema') || n.includes('video') || n.includes('documentario') || n.includes('podcast')) return 'Audiovisual';
  if (n.includes('danca') || n.includes('capoeira')) return 'Dança';
  if (n.includes('literatura') || n.includes('livro') || n.includes('leitura') || n.includes('poesia') || n.includes('conto')) return 'Literatura';
  if (n.includes('imaterial')) return 'Patrimônio Imaterial';
  if (n.includes('cenic') || n.includes('teatro') || n.includes('circo') || n.includes('performance')) return 'Artes Cênicas';
  if (n.includes('agente')) return 'Agentes Culturais';
  if (n.includes('grupo') || n.includes('coletivo')) return 'Grupos e Coletivos';
  if (n.includes('espaco') || n.includes('centro cultural') || n.includes('salao') || n.includes('ateli')) return 'Espaços Culturais';
  return '';
};

export function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [tabValue, setTabValue] = useState(0); // 0 = Mapeamento, 1 = Projetos Aprovados, 2 = Grupos, 3 = Espaços, 4 = Todos os Inscritos
  const [importedData, setImportedData] = useState<any>({});

  useEffect(() => {
    setIsMounted(true);
    
    // 🎯 CARREGA DADOS DO SERVIDOR (primário) com fallback para localStorage
    const loadData = async () => {
      try {
        const { projectId, publicAnonKey } = await import('../../lib/supabaseProjectInfo');
        const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-2320c79f/load-data`;
        const response = await fetch(serverUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const normalized = normalizeProjetosOnParsed(result.data);
            setImportedData(normalized);
            localStorage.setItem('editais_imported_data', JSON.stringify(normalized));
            console.log('📦 [Dashboard] Dados carregados do SERVIDOR:', {
              agentes: result.data.agentes?.length || 0,
              grupos: result.data.grupos?.length || 0,
              espacos: result.data.espacos?.length || 0,
              projetos: result.data.projetos?.length || 0,
            });
            return;
          }
        }
      } catch (err) {
        console.warn('⚠️ [Dashboard] Falha ao carregar do servidor, usando localStorage:', err);
      }
      
      // Fallback: localStorage
      try {
        const savedData = localStorage.getItem('editais_imported_data');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setImportedData(normalizeProjetosOnParsed(parsed));
          console.log('📦 [Dashboard] Dados carregados do localStorage:', {
            agentes: parsed.agentes?.length || 0,
            grupos: parsed.grupos?.length || 0,
            espacos: parsed.espacos?.length || 0,
            projetos: parsed.projetos?.length || 0,
          });
        }
      } catch (err) {
        console.error('❌ Erro ao carregar dados do localStorage:', err);
      }
      setImportedData((prev: any) => {
        if (prev && (prev.mapeamento?.length || prev.agentes?.length || prev.projetos?.length)) return prev;
        return normalizeProjetosOnParsed({
          ...prev,
          mapeamento: DADOS_ESTATICOS.mapeamento || [],
          agentes: prev?.agentes || [],
          grupos: prev?.grupos || [],
          espacos: prev?.espacos || [],
          projetos: prev?.projetos || [],
        });
      });
    };
    
    loadData();
  }, []);

  // States for filters
  const [fAno, setFAno] = useState<string>(''); 
  const [fCategoria, setFCategoria] = useState<string>('');
  const [fBairro, setFBairro] = useState<string>('');
  const [fTradicional, setFTradicional] = useState<string>('');
  const [fComunidade, setFComunidade] = useState<string>('');
  const [fQ, setFQ] = useState<string>('');
  const [fMes, setFMes] = useState<string>('');
  const [fEdital, setFEdital] = useState<string>('');

  // Unifica dados do Mapeamento 2020 e Editais PNAB
  const todosItens = useMemo((): ItemCultural[] => {
    const rawM =
      importedData.mapeamento && Array.isArray(importedData.mapeamento) && importedData.mapeamento.length > 0
        ? importedData.mapeamento
        : DADOS_ESTATICOS.mapeamento?.length
          ? (DADOS_ESTATICOS.mapeamento as any[])
          : (MAPEAMENTO_2020 as any[]);
    const rawA = importedData.agentes || [];
    const rawG = importedData.grupos || [];
    const rawE = importedData.espacos || [];
    const unionRows = buildCadastroUnionRows(rawM, rawA, rawG, rawE);

    const itensMapeamento: ItemCultural[] = unionRows.map((u, idx: number) => {
      const a = u.row;
      const endM = String(a.enderecoCompleto || a['Endereço completo'] || '').trim();
      const coords = normalizeCoordsByBairro(a.bairro || a.Bairro, a.lat, a.lng, endM);
      const div = diversityFieldsFromRaw(a);
      const bLabel = bairroLabelParaPainel(a.bairro || a.Bairro, endM);
      const tipoRow = u.tipo;
      const editalDefault =
        tipoRow === 'grupo'
          ? 'Edital de Grupos e Coletivos'
          : tipoRow === 'espaco'
            ? 'Edital de Espaços Culturais'
            : 'Mapeamento 2020';
      return {
        id: idx + 1,
        tipo: tipoRow,
        ano: a.ano || 2020,
        nome: a.nome || a.Nome || 'Sem nome',
        proponente: a.nome || a.Nome || 'Sem nome',
        categoria: a.categoria || a.Categoria || 'Não informado',
        bairro: bLabel,
        lat: coords.lat,
        lng: coords.lng,
        enderecoCompleto: endM,
        edital: a.edital_contemplado || a.edital || editalDefault,
        eh_contemplado: a.eh_contemplado,
        comunidadeTradicional: div.comunidadeTradicional || String(a.comunidadeTradicional || ''),
        genero: div.genero,
        genero_sexo: div.genero_sexo,
        identidade_genero: div.identidade_genero,
        raca: div.raca,
        orientacao_sexual: div.orientacao_sexual,
        idade: div.idade,
        deficiencia: div.deficiencia,
      };
    });

    const itensEditais: ItemCultural[] = [];

    const itensImportados: ItemCultural[] = [];

    // Projetos/Editais importados
    if (importedData.projetos && Array.isArray(importedData.projetos)) {
      importedData.projetos.forEach((p: any, idx: number) => {
        // Helpers para filtrar URLs e anexos do Google Forms
        const isUrlVal = (v: any) => {
          if (!v) return false;
          const s = String(v).trim().toLowerCase();
          return s.startsWith('http://') || s.startsWith('https://') || s.startsWith('www.');
        };
        const isAttachCol = (col: string) => {
          const l = col.toLowerCase();
          return l.includes('comprovante') || l.includes('documento') || l.includes('curriculo') ||
                 l.includes('anexo') || l.includes('download') || l.includes('foto') ||
                 l.includes('declaracao') || l.includes('declaro') || l.includes('termo de') || l.includes('etnico');
        };
        const getField = (...keys: string[]) => {
          for (const key of keys) {
            if (p[key] !== undefined && p[key] !== null && p[key] !== '' && !isUrlVal(p[key])) return p[key];
          }
          const pKeys = Object.keys(p);
          for (const key of keys) {
            const found = pKeys.find(k => !isAttachCol(k) && k.toLowerCase() === key.toLowerCase());
            if (found && p[found] !== undefined && p[found] !== null && p[found] !== '' && !isUrlVal(p[found])) return p[found];
          }
          // Partial matching (start-of-column)
          for (const key of keys) {
            const kn = key.toLowerCase();
            const found = pKeys.find(k => !isAttachCol(k) && k.toLowerCase().replace(/[;:]/g, '').trim().startsWith(kn));
            if (found && p[found] !== undefined && p[found] !== null && p[found] !== '' && !isUrlVal(p[found])) return p[found];
          }
          return null;
        };
        
        // Busca nome real, pulando "Pessoa Física" / "Pessoa Jurídica" e URLs
        const isGeneric = (v: any) => {
          if (!v) return true;
          const s = String(v).toLowerCase().trim();
          return s === 'pessoa física' || s === 'pessoa fisica' || s === 'pessoa jurídica' || s === 'pessoa juridica' || s === 'pf' || s === 'pj';
        };
        
        // Busca específica para Google Forms: "Nome do Proponente;"
        let nome = 'Não informado';
        const pKeys = Object.keys(p);
        const gfNameCol = pKeys.find(k => /^nome\s*(do|da)\s*proponente/i.test(k.replace(/[;:]/g, '').trim()) && !isAttachCol(k));
        if (gfNameCol && p[gfNameCol] && !isUrlVal(p[gfNameCol]) && !isGeneric(p[gfNameCol])) {
          nome = String(p[gfNameCol]);
        } else {
          const nameKeys = ['proponente', 'Proponente', 'nome', 'Nome', 'nomeProponente', 'nome_proponente', 'inscrito', 'responsavel', 'nomeProjeto', 'nome_projeto'];
          for (const k of nameKeys) {
            const v = getField(k);
            if (v && !isGeneric(v) && !isUrlVal(v)) { nome = String(v); break; }
          }
        }
        if (nome === 'Não informado') {
          const np = getField('nomeProjeto', 'nome_projeto', 'projeto', 'Projeto');
          if (np && !isUrlVal(np)) nome = String(np);
        }
        const categoria = getField('categoria', 'Categoria', 'linguagem', 'Linguagem', 'area') || 'Não informado';
        const bairro = getField('bairro', 'Bairro', 'localidade', 'local') || 'Não informado';
        const endP = String(
          getField('enderecoCompleto', 'endereco', 'Endereço', 'Endereço completo', 'endereço completo') || ''
        ).trim();
        const coords = normalizeCoordsByBairro(String(bairro), p.lat, p.lng, endP);
        const edital = getField('edital', 'Edital', 'editalNome', 'nome_edital') || 'Edital Importado';
        const projetoNormalizado = { ...p, edital, ano: parseInt(getField('ano', 'Ano') || '2020') || 2020 };
        const ehContemplado = isProjetoContempladoParaEstatistica(projetoNormalizado);
        const valor = ehContemplado ? getProjetoValorNormalizado(projetoNormalizado) : 0;
        const div = diversityFieldsFromRaw(p);

        itensImportados.push({
          id: 50000 + idx,
          tipo: 'edital',
          ano: parseInt(getField('ano', 'Ano') || '2020') || 2020,
          nome: nome,
          proponente: nome,
          categoria: categoria,
          bairro: bairroLabelParaPainel(bairro, endP),
          lat: coords.lat,
          lng: coords.lng,
          enderecoCompleto: endP,
          valor: valor,
          edital: edital,
          eh_contemplado: ehContemplado,
          status: String(getField('status', 'Status', 'situacao', 'resultado') || '').trim(),
          comunidadeTradicional: div.comunidadeTradicional || String(p.comunidadeTradicional || ''),
          genero: div.genero,
          genero_sexo: div.genero_sexo,
          identidade_genero: div.identidade_genero,
          raca: div.raca,
          orientacao_sexual: div.orientacao_sexual,
          idade: div.idade,
          deficiencia: div.deficiencia,
        });
      });
    }

    console.log('📊 Total de itens carregados:', {
      mapeamento: itensMapeamento.length,
      editais: itensEditais.length,
      agentesImportados: importedData.agentes?.length || 0,
      gruposImportados: importedData.grupos?.length || 0,
      espacosImportados: importedData.espacos?.length || 0,
      projetosImportados: importedData.projetos?.length || 0,
      totalImportados: itensImportados.length
    });
    
    // Debug diversidade
    const comDiversidade = itensImportados.filter(i => i.genero || i.raca || i.orientacao_sexual || i.deficiencia || i.idade);
    const comComunidade = itensImportados.filter(i => i.comunidadeTradicional && i.comunidadeTradicional.length > 1);
    console.log('🎭 [Dashboard] Dados de diversidade nos importados:', {
      comAlgumCampoDiversidade: comDiversidade.length,
      comComunidadeTradicional: comComunidade.length,
      amostra: itensImportados.slice(0, 2).map(i => ({
        nome: i.nome,
        genero: i.genero,
        raca: i.raca,
        comunidadeTradicional: i.comunidadeTradicional,
      }))
    });

    return [...itensMapeamento, ...itensEditais, ...itensImportados];
  }, [importedData]);

  // Filtering Logic
  const filteredItems = useMemo(() => {
    return todosItens.filter(item => {
      const matchAno = !fAno || excelSerialToYear(item.ano).toString() === fAno;
      const matchCat = !fCategoria || canonicalCategoriaCultural(item.categoria) === fCategoria;
      const matchBairro = !fBairro || item.bairro === fBairro;
      const matchEdital = !fEdital || (item.edital && item.edital.toLowerCase().includes(fEdital.toLowerCase()));
      const matchQ = !fQ || 
        item.nome.toLowerCase().includes(fQ.toLowerCase()) || 
        item.proponente.toLowerCase().includes(fQ.toLowerCase());
      
      // 🎯 ATUALIZADO: Agora mostra TODOS os tipos no mapeamento
      if (tabValue === 0) {
        // Mapeamento mostra: mapeamento + agentes + grupos + espaços importados
        const isMapeamentoTab = item.tipo === 'agente' || item.tipo === 'grupo' || item.tipo === 'espaco';
        return isMapeamentoTab && matchAno && matchCat && matchBairro && matchEdital && matchQ;
      } else {
        // Editais mostra apenas projetos de editais
        return item.tipo === 'edital' && matchAno && matchCat && matchBairro && matchEdital && matchQ;
      }
    });
  }, [todosItens, fAno, fCategoria, fBairro, fEdital, fQ, tabValue]);

  const categoriasCulturaisFiltradas = useMemo(() => {
    const set = new Set<string>();
    filteredItems.forEach((item) => {
      const categoria = canonicalCategoriaCultural(item.categoria);
      if (categoria) set.add(categoria);
    });
    return set;
  }, [filteredItems]);

  // 🎯 FUNÇÃO PARA COR DO MARCADOR COM BASE NO TIPO
  const getMarkerColor = (tipo: string) => {
    switch(tipo) {
      case 'agente': return '#00A38C'; // Verde para Agentes
      case 'grupo': return '#2ED6A3'; // Mint para Grupos
      case 'espaco': return '#F2B84B'; // Amarelo para Espaços
      case 'mapeamento': return '#00A38C'; // Verde para Mapeamento 2020
      case 'edital': return '#006B5A'; // Verde profundo para Editais
      default: return '#757575'; // Cinza padrão
    }
  };

  const getMarkerCoreColor = (item: ItemCultural) => {
    if (item.tipo === 'edital') return item.eh_contemplado ? '#10b981' : '#94a3b8';
    return getMarkerColor(item.tipo);
  };

  // 🎯 FUNÇÃO PARA EMOJI DO MARCADOR
  const getMarkerEmoji = (tipo: string) => {
    switch(tipo) {
      case 'agente': return '🎭';
      case 'grupo': return '👥';
      case 'espaco': return '🏛️';
      case 'mapeamento': return '🗺️';
      case 'edital': return '📋';
      default: return '📍';
    }
  };

  /**
   * Evita "sumiço visual" de pinos quando muitos itens compartilham exatamente a mesma coordenada.
   * Mantém a contagem real e espalha discretamente os pontos sobrepostos no mapa.
   */
  const mapPoints = useMemo(() => {
    const base = filteredItems.filter((i) => {
      if (!itemTemCoordenadasMapa(i)) return false;
      return i.tipo !== 'edital' || Boolean(i.eh_contemplado);
    });
    const seen = new globalThis.Map<string, number>();
    return base.map((item) => {
      const key = `${Number(item.lat).toFixed(5)}|${Number(item.lng).toFixed(5)}`;
      const idx = seen.get(key) || 0;
      seen.set(key, idx + 1);
      if (idx === 0) return { item, lat: item.lat, lng: item.lng };
      const angle = ((idx * 137.508) * Math.PI) / 180;
      const ring = 1 + Math.floor(idx / 10);
      const meters = 10 * ring;
      const latOffset = (meters / 111_320) * Math.cos(angle);
      const cosLat = Math.max(0.2, Math.cos((item.lat * Math.PI) / 180));
      const lngOffset = (meters / (111_320 * cosLat)) * Math.sin(angle);
      return {
        item,
        lat: item.lat + latOffset,
        lng: item.lng + lngOffset,
      };
    });
  }, [filteredItems]);

  const pinsComCoord = useMemo(() => mapPoints.length, [mapPoints]);
  const pinsPorTipo = useMemo(() => {
    const out = { agente: 0, grupo: 0, espaco: 0, edital: 0 };
    mapPoints.forEach(({ item }) => {
      if (item.tipo === 'agente' || item.tipo === 'mapeamento') out.agente += 1;
      else if (item.tipo === 'grupo') out.grupo += 1;
      else if (item.tipo === 'espaco') out.espaco += 1;
      else if (item.tipo === 'edital') out.edital += 1;
    });
    return out;
  }, [mapPoints]);

  // 🎯 Contagem dinâmica para aba de editais: inscritos vs contemplados
  const editaisItems = useMemo(() => todosItens.filter(i => i.tipo === 'edital'), [todosItens]);
  const editaisContemplados = useMemo(() => editaisItems.filter(i => i.eh_contemplado), [editaisItems]);
  const editaisInscritos = editaisItems.length;
  const editaisContempladosCount = editaisContemplados.length;
  
  // Contagem filtrada
  const filteredContemplados = useMemo(() => filteredItems.filter(i => i.eh_contemplado), [filteredItems]);
  const filteredSuplentes = useMemo(
    () =>
      filteredItems.filter((i) => {
        if (i.tipo !== 'edital') return false;
        const st = String(i.status || '').toLowerCase();
        return st.includes('suplente');
      }),
    [filteredItems]
  );
  const filteredNaoContemplados = useMemo(() => filteredItems.filter(i => !i.eh_contemplado && i.tipo === 'edital'), [filteredItems]);

  const filteredPorEditalCharts = useMemo(() => {
    const grouped = new globalThis.Map<string, { chave: string; nome: string; total: number; contemplados: number; suplentes: number }>();
    filteredItems
      .filter((i) => i.tipo === 'edital')
      .forEach((i) => {
        const nome = i.edital || 'Edital não informado';
        const ano = Number(i.ano || 0);
        const nomeExib = ano > 0 ? `${nome} (${ano})` : nome;
        const chave = `${nome}||${ano}`;
        const cur = grouped.get(chave) || { chave, nome: nomeExib, total: 0, contemplados: 0, suplentes: 0 };
        cur.total += 1;
        if (i.eh_contemplado) cur.contemplados += 1;
        const st = String(i.status || '').toLowerCase();
        if (st.includes('suplente')) cur.suplentes += 1;
        grouped.set(chave, cur);
      });
    return Array.from(grouped.values())
      .map((g) => ({
        chave: g.chave,
        nome: g.nome,
        total: g.total,
        contemplados: g.contemplados,
        suplentes: g.suplentes,
        naoContemplados: Math.max(0, g.total - g.contemplados - g.suplentes),
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredItems]);
  
  // Editais únicos nos dados
  const editaisUnicosSet = useMemo(() => {
    const s = new Set<string>();
    editaisItems.forEach(i => { if (i.edital) s.add(i.edital); });
    return s;
  }, [editaisItems]);

  // Estatísticas por bairro
  const estatisticasPorBairro = useMemo(() => {
    const stats: Record<string, { total: number; contemplados: number }> = {};
    filteredItems.forEach(item => {
      if (!stats[item.bairro]) {
        stats[item.bairro] = { total: 0, contemplados: 0 };
      }
      stats[item.bairro].total++;
      if (item.eh_contemplado) {
        stats[item.bairro].contemplados++;
      }
    });
    return Object.entries(stats)
      .map(([bairro, data]) => ({ bairro, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [filteredItems]);

  /** Percentual com uma casa decimal (evita 0% quando há contagem, ex. 3 negros em 741). */
  const pctUmDecimal = (n: number, t: number) => (t <= 0 ? 0 : Math.min(100, Math.round((n / t) * 1000) / 10));

  // 📊 Indicadores de Diversidade (calculados a partir dos itens filtrados)
  const diversidadeStats = useMemo(() => {
    const items = filteredItems;
    const total = items.length || 1;
    
    const comComunidade = items.filter(i => i.comunidadeTradicional && i.comunidadeTradicional.length > 1 && 
      i.comunidadeTradicional.toLowerCase() !== 'não' && i.comunidadeTradicional.toLowerCase() !== 'nao' &&
      i.comunidadeTradicional !== '-' && i.comunidadeTradicional !== 'N/I');
    
    const mulheres = items.filter(i => {
      const g = (i.genero || '').toLowerCase();
      return g.includes('feminino') || g.includes('mulher') || g === 'f' || g.includes('female');
    });
    
    const negros = items.filter(i => {
      const r = (i.raca || '').toLowerCase();
      return r.includes('pret') || r.includes('pard') || r.includes('negr') || r.includes('afro');
    });
    
    /** Mesmo critério da página Início: orientação + identidade de gênero + gênero/sexo (sem tratar “trans” como orientação). */
    const lgbtqia = items.filter(i =>
      itemIsLgbtqia({
        orientacao_sexual: i.orientacao_sexual || '',
        identidade_genero: i.identidade_genero || '',
        genero_sexo: i.genero_sexo || '',
      })
    );
    
    const jovens = items.filter(i => {
      const idadeStr = i.idade || '';
      const idadeNum = parseInt(idadeStr);
      if (idadeNum > 0 && idadeNum <= 29) return true;
      const lower = idadeStr.toLowerCase();
      return lower.includes('18 a 29') || lower.includes('jovem') || lower.includes('15 a') || lower.includes('16 a');
    });
    
    const pcd = items.filter(i => isPcdDeclaracaoPositiva(i.deficiencia || ''));
    
    return {
      total: items.length,
      comunidadeTrad: comComunidade.length,
      mulheres: mulheres.length,
      negros: negros.length,
      lgbtqia: lgbtqia.length,
      jovens: jovens.length,
      pcd: pcd.length,
      percMulheres: pctUmDecimal(mulheres.length, total),
      percNegros: pctUmDecimal(negros.length, total),
      percLgbtqia: pctUmDecimal(lgbtqia.length, total),
      percJovens: pctUmDecimal(jovens.length, total),
      percPcd: pctUmDecimal(pcd.length, total),
      percComunidade: pctUmDecimal(comComunidade.length, total),
    };
  }, [filteredItems]);

  const clearFilters = () => {
    setFAno('');
    setFCategoria('');
    setFBairro('');
    setFTradicional('');
    setFComunidade('');
    setFQ('');
    setFMes('');
    setFEdital('');
  };

  if (!isMounted) return <div className="min-h-screen ds-dash-page" />;

  const currentDatasetName = tabValue === 0 ? 'Mapeamento Cultural 2020' : 'Editais (PNAB, Aldir Blanc, etc)';
  const currentColor = tabValue === 0 ? THEME_COLORS.green : THEME_COLORS.primary;
  const eventosPublicos = Array.isArray(importedData.eventosCidade)
    ? importedData.eventosCidade
        .filter((evento: any) => evento?.publicado !== false && evento?.titulo && evento?.data)
        .sort((a: any, b: any) => `${a.data} ${a.hora || ''}`.localeCompare(`${b.data} ${b.hora || ''}`))
    : [];
  const proximosEventos = eventosPublicos.filter((evento: any) => {
    const eventDate = new Date(`${evento.data}T23:59:59`);
    return Number.isFinite(eventDate.getTime()) && eventDate >= new Date();
  });
  const eventosParaCalendario = (proximosEventos.length > 0 ? proximosEventos : eventosPublicos).slice(0, 6);
  const calendarioMesReferencia = eventosParaCalendario[0]?.data ? new Date(`${eventosParaCalendario[0].data}T00:00:00`) : new Date();
  const calendarDays = (() => {
    const year = calendarioMesReferencia.getFullYear();
    const month = calendarioMesReferencia.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const out: Array<{ day: number | null; hasEvent?: boolean }> = [];
    for (let i = 0; i < startOffset; i++) out.push({ day: null });
    for (let day = 1; day <= totalDays; day++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      out.push({ day, hasEvent: eventosPublicos.some((evento: any) => evento.data === iso) });
    }
    return out;
  })();

  return (
    <div className="relative min-h-screen pb-20 font-sans text-[#1b1b1f] ds-dash-page">
      {/* Todo conteúdo */}
      <div className="relative" style={{ zIndex: 1 }}>
        {/* Header Section - Aplicando Design System */}
        <section className="ds-container-hero ds-breathing-generous">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="ds-dash-panel mx-auto max-w-5xl rounded-2xl px-6 py-10 text-center sm:px-10 sm:py-12 md:rounded-3xl md:px-12 md:py-14"
          >
            {/* Badge do Sistema */}
            <div className="flex justify-center items-center gap-2 mb-6">
              <span className="ds-badge ds-badge-primary">
                Cadastro Cultural de Ilhabela
              </span>
            </div>

            {/* Título Hero */}
            <h1 className="ds-heading-hero mb-4 text-[#006B5A]">
              Painel Unificado de Transparência
            </h1>

            {/* Descrição */}
            <p className="ds-body-lg text-[#1b1b1f] mb-8 max-w-3xl mx-auto opacity-90">
              Visualização completa do Mapeamento Cultural 2020 e todos os editais (PNAB, Aldir Blanc, Lei Paulo Gustavo)
            </p>
            
            <motion.div 
              className="flex justify-center gap-4 mt-8 flex-wrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Button 
                onClick={clearFilters}
                className="ds-btn-primary ds-interactive"
                variant="contained" 
                sx={{ 
                  bgcolor: 'rgba(0, 163, 140, 0.95)', 
                  backdropFilter: 'blur(10px)',
                  fontWeight: 800, 
                  borderRadius: '14px', 
                  textTransform: 'none', 
                  px: 4,
                  py: 1.5, 
                  boxShadow: '0 4px 12px rgba(0, 107, 90, 0.22)',
                  '&:hover': { 
                    bgcolor: 'rgba(0, 107, 90, 1)',
                    boxShadow: '0 8px 20px rgba(0, 107, 90, 0.32)',
                    transform: 'translateY(-2px)'
                  } 
                }}
              >
                Limpar Filtros
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* Tabs - Centralizados com glassmorphism */}
        <section className="container mx-auto mb-6 px-6">
          <div className="ds-dash-panel mx-auto max-w-5xl overflow-hidden rounded-2xl md:rounded-3xl">
            <Tabs 
              value={tabValue} 
              onChange={(_, newValue) => setTabValue(newValue)}
              variant="fullWidth"
              centered
              sx={{ 
                borderBottom: 1, 
                borderColor: 'rgba(15, 23, 42, 0.08)',
                '& .MuiTab-root': { 
                  fontWeight: 700, 
                  textTransform: 'none', 
                  fontSize: '1rem', 
                  py: 2.5,
                  transition: 'color 0.2s ease, background-color 0.2s ease',
                },
                '& .Mui-selected': { color: currentColor }
              }}
            >
              <Tab 
                icon={<Map size={20} />} 
                iconPosition="start" 
                label={`🗺️ Mapeamento Cultural 2020 (${todosItens.filter((i) => i.tipo !== 'edital').length} cadastros)`} 
              />
              <Tab 
                icon={<Trophy size={20} />} 
                iconPosition="start" 
                label={`📋 Editais (${editaisInscritos} inscritos / ${editaisContempladosCount} contemplados)`} 
              />
            </Tabs>
          </div>
        </section>

        {/* KPIs — cartões claros estilo painel analítico */}
        <section className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-5 mb-10 max-w-5xl">
          {[
            {
              kicker: tabValue === 0 ? 'Cadastro' : 'Inscrições',
              title: tabValue === 0 ? 'Agentes culturais' : 'Total de inscritos',
              value: filteredItems.length,
              valueClass: 'text-5xl',
              sub: tabValue === 0 ? currentDatasetName : (
                <span>
                  <strong className="text-emerald-600">{filteredContemplados.length} contemplados</strong>
                  {filteredNaoContemplados.length > 0 && <span className="text-slate-500"> · {filteredNaoContemplados.length} não contemplados</span>}
                </span>
              ),
              icon: <Users size={20} />,
            },
            {
              kicker: tabValue === 0 ? 'Território' : 'Financeiro',
              title: tabValue === 0 ? 'Bairros atendidos' : 'Investimento (contemplados)',
              value: tabValue === 0
                ? new Set(
                    filteredItems
                      .map(i => i.bairro)
                      .filter(b => b && b !== 'Não informado')
                  ).size
                : formatBRL(filteredContemplados.reduce((acc, i) => acc + (i.valor || 0), 0)),
              valueClass: tabValue === 0 ? 'text-5xl' : 'text-3xl md:text-4xl tracking-tight',
              sub: tabValue === 0 ? 'Bairros distintos após normalização (não conta endereços soltos como bairros)' : 'Soma dos valores dos contemplados',
              icon: <MapPin size={20} />,
            },
            {
              kicker: tabValue === 0 ? 'Linguagens' : 'Chamadas',
              title: tabValue === 0 ? 'Categorias culturais' : 'Editais registrados',
              value: tabValue === 0 ? categoriasCulturaisFiltradas.size : editaisUnicosSet.size,
              valueClass: 'text-5xl',
              sub: tabValue === 0 ? 'Áreas normalizadas com dados válidos' : 'PEC, PNAB, LPG, Aldir Blanc…',
              icon: <Trophy size={20} />,
            },
          ].map((kpi) => (
            <div
              key={kpi.title}
              className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <div
                className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
                style={{ backgroundColor: currentColor }}
                aria-hidden
              />
              <div className="flex items-start justify-between gap-3 pl-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-1">{kpi.kicker}</p>
                  <h3 className="text-sm font-bold text-slate-800 mb-3">{kpi.title}</h3>
                  <div className={`font-black leading-none mb-2 ${kpi.valueClass}`} style={{ color: currentColor }}>
                    {kpi.value}
                  </div>
                  <p className="text-[0.8rem] text-slate-600 font-medium leading-snug">{kpi.sub}</p>
                </div>
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ color: currentColor, backgroundColor: `${currentColor}14` }}
                >
                  {kpi.icon}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Calendário público de eventos da cidade */}
        <section className="container mx-auto px-6 mb-10 max-w-5xl">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_360px]">
              <div className="p-6 md:p-7">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="m-0 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: currentColor }}>
                      Agenda cultural
                    </p>
                    <h2 className="m-0 mt-1 text-2xl font-black text-slate-900">Eventos importantes da cidade</h2>
                    <p className="m-0 mt-2 max-w-2xl text-sm font-semibold text-slate-500">
                      Calendário alimentado pelo painel administrativo com eventos, formações, encontros e ações culturais.
                    </p>
                  </div>
                  <Chip
                    icon={<Calendar size={15} />}
                    label={`${eventosPublicos.length} evento(s) publicado(s)`}
                    sx={{ bgcolor: `${currentColor}14`, color: currentColor, fontWeight: 800 }}
                  />
                </div>

                {eventosParaCalendario.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: 3 }}>
                    Nenhum evento publicado no momento. Cadastre eventos no Painel Administrativo para exibir a agenda aqui.
                  </Alert>
                ) : (
                  <div className="grid gap-3">
                    {eventosParaCalendario.map((evento: any) => {
                      const date = new Date(`${evento.data}T00:00:00`);
                      const day = Number.isFinite(date.getTime()) ? date.toLocaleDateString('pt-BR', { day: '2-digit' }) : '--';
                      const month = Number.isFinite(date.getTime()) ? date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : '';
                      return (
                        <div key={evento.id || `${evento.data}-${evento.titulo}`} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-sm" style={{ background: `linear-gradient(145deg, ${currentColor}, #284574)` }}>
                            <span className="text-2xl font-black leading-none">{day}</span>
                            <span className="mt-1 text-[0.62rem] font-black uppercase tracking-wide">{month}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <h3 className="m-0 text-base font-black text-slate-900">{evento.titulo}</h3>
                              <span className="rounded-full bg-white px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-wide text-slate-500">
                                {evento.categoria || 'Cultura'}
                              </span>
                            </div>
                            <p className="m-0 text-sm font-semibold text-slate-600">
                              {evento.hora ? `${evento.hora} · ` : ''}{evento.local || 'Local a confirmar'}
                            </p>
                            {evento.descricao && (
                              <p className="m-0 mt-2 text-sm leading-relaxed text-slate-500">{evento.descricao}</p>
                            )}
                            {evento.link && (
                              <a href={evento.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-xs font-black text-[#006B5A]">
                                Ver detalhes
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 bg-gradient-to-br from-slate-50 to-white p-6 lg:border-l lg:border-t-0">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="m-0 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Calendário</p>
                    <h3 className="m-0 text-lg font-black text-slate-900">
                      {calendarioMesReferencia.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h3>
                  </div>
                  <Calendar size={24} style={{ color: currentColor }} />
                </div>
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, idx) => (
                    <div key={`${label}-${idx}`} className="py-1 text-[0.65rem] font-black text-slate-400">{label}</div>
                  ))}
                  {calendarDays.map((cell, idx) => (
                    <div
                      key={idx}
                      className={`flex h-9 items-center justify-center rounded-xl text-xs font-black ${
                        cell.day
                          ? cell.hasEvent
                            ? 'text-white shadow-sm'
                            : 'bg-white text-slate-500'
                          : 'text-transparent'
                      }`}
                      style={cell.hasEvent ? { backgroundColor: currentColor } : undefined}
                    >
                      {cell.day || 0}
                    </div>
                  ))}
                </div>
                <p className="m-0 mt-4 text-xs font-semibold leading-relaxed text-slate-500">
                  Dias destacados indicam eventos publicados no painel administrativo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Insights estratégicos (gerados automaticamente dos dados filtrados) ── */}
        {filteredItems.length > 0 && (() => {
          const bairroTop = estatisticasPorBairro[0];
          const bairrosMapeados = estatisticasPorBairro.filter(b => b.bairro !== 'Não informado').length;
          const totalComBairro = filteredItems.filter(i => i.bairro && i.bairro !== 'Não informado').length;
          const concBairroTop = bairroTop ? ((bairroTop.total / Math.max(1, totalComBairro)) * 100) : 0;
          const taxaAprov = tabValue === 1 ? ((filteredContemplados.length / Math.max(1, filteredItems.filter(i => i.tipo === 'edital').length)) * 100) : 0;
          const percMulheres = diversidadeStats.percMulheres;
          const percNegros = diversidadeStats.percNegros;

          const insights: Array<{ icon: string; text: string; level: 'green' | 'yellow' | 'blue' }> = [];

          if (tabValue === 0) {
            if (concBairroTop > 40 && bairroTop)
              insights.push({ icon: '📍', level: 'yellow', text: `${bairroTop.bairro} concentra ${concBairroTop.toFixed(0)}% dos agentes — crie editais territorizados para bairros com menos de 5 agentes cadastrados.` });
            else if (bairrosMapeados > 8)
              insights.push({ icon: '✅', level: 'green', text: `${bairrosMapeados} bairros atendidos — boa cobertura territorial. Verifique os bairros sem representação no mapa.` });
            if (percMulheres > 0 && percMulheres < 35)
              insights.push({ icon: '⚠️', level: 'yellow', text: `Mulheres: ${percMulheres}% dos agentes — abaixo do ideal. Chamadas específicas e comunicação em espaços femininos podem ampliar a participação.` });
            if (percNegros > 0 && percNegros < 30)
              insights.push({ icon: '📉', level: 'yellow', text: `Negros/pardos: ${percNegros}% — sub-representação em relação à população local. Ações afirmativas e parceria com coletivos afro-culturais são recomendadas.` });
            if (percMulheres >= 45 && percNegros >= 30)
              insights.push({ icon: '🏆', level: 'green', text: `Perfil de diversidade equilibrado neste recorte — mantenha o monitoramento e use estes índices como meta para os próximos editais.` });
          } else {
            if (taxaAprov > 0 && taxaAprov < 25)
              insights.push({ icon: '⚠️', level: 'yellow', text: `Taxa de aprovação de ${taxaAprov.toFixed(1)}% — apenas 1 em cada 4 inscritos é contemplado. Avalie ampliar vagas ou criar chamadas menores e mais focadas.` });
            else if (taxaAprov >= 50)
              insights.push({ icon: '✅', level: 'green', text: `Taxa de aprovação de ${taxaAprov.toFixed(1)}% — boa cobertura do edital. Considere ampliar se houver demanda reprimida na lista de suplentes.` });
            const valorTotal = filteredContemplados.reduce((acc, i) => acc + (i.valor || 0), 0);
            const mediaValor = filteredContemplados.length > 0 ? valorTotal / filteredContemplados.length : 0;
            if (mediaValor > 0)
              insights.push({ icon: '💰', level: 'blue', text: `Valor médio por contemplado: ${formatBRL(mediaValor)}. Use esta referência para calibrar o teto de projetos em futuros editais.` });
          }

          if (insights.length === 0) return null;
          return (
            <section className="container mx-auto px-6 mb-8 max-w-5xl">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: currentColor }}>
                  Insights para tomada de decisão
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {insights.map((ins, i) => {
                    const cfg = {
                      green:  { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' },
                      yellow: { bg: '#fefce8', border: '#fde68a', color: '#92400e' },
                      blue:   { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
                    }[ins.level];
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold leading-relaxed"
                        style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
                      >
                        <span className="shrink-0 text-sm">{ins.icon}</span>
                        <span>{ins.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })()}

        {tabValue === 1 && (
          <section className="container mx-auto px-6 mb-10 max-w-6xl">
            <AdminImportCharts
              totalInscritos={filteredItems.length}
              contemplados={filteredContemplados.length}
              suplentes={filteredSuplentes.length}
              naoContemplados={Math.max(0, filteredNaoContemplados.length - filteredSuplentes.length)}
              porEdital={filteredPorEditalCharts}
            />
          </section>
        )}

        {/* Filters Surface - com glassmorphism */}
        <section className="container mx-auto px-6 mb-10 max-w-6xl">
          <div 
            className="p-8 rounded-[2rem] border border-white/30 shadow-lg"
            style={{
              background: 'rgba(255, 255, 255, 0.35)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <FormControl fullWidth size="small">
                <InputLabel>Ano</InputLabel>
                <Select 
                  value={fAno} 
                  label="Ano" 
                  onChange={(e) => setFAno(e.target.value)} 
                  sx={{ 
                    borderRadius: '12px',
                    bgcolor: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {[2020, 2021, 2022, 2023, 2024, 2025].map(a => <MenuItem key={a} value={a.toString()}>{a}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Categoria</InputLabel>
                <Select 
                  value={fCategoria} 
                  label="Categoria" 
                  onChange={(e) => setFCategoria(e.target.value)} 
                  sx={{ 
                    borderRadius: '12px',
                    bgcolor: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Bairro</InputLabel>
                <Select 
                  value={fBairro} 
                  label="Bairro" 
                  onChange={(e) => setFBairro(e.target.value)} 
                  sx={{ 
                    borderRadius: '12px',
                    bgcolor: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {BAIRROS.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField 
                fullWidth 
                size="small" 
                label={tabValue === 0 ? "Área de Atuação" : "Buscar por Edital"} 
                value={fEdital} 
                onChange={(e) => setFEdital(e.target.value)}
                InputProps={{ 
                  sx: { 
                    borderRadius: '12px',
                    bgcolor: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)'
                  } 
                }}
              />
              <TextField 
                fullWidth 
                size="small" 
                label="Buscar Nome" 
                value={fQ} 
                onChange={(e) => setFQ(e.target.value)}
                InputProps={{ 
                  startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment>, 
                  sx: { 
                    borderRadius: '12px',
                    bgcolor: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)'
                  } 
                }}
              />
            </div>
          </div>
        </section>

        {/* Mapa de Ilhabela Surface - com glassmorphism */}
        <section className="container mx-auto px-6 mb-10 max-w-6xl">
          <div 
            className="p-4 rounded-[2.5rem] border border-white/30 shadow-lg overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.35)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div className="h-[500px] rounded-[2rem] overflow-hidden relative z-0">
              <MapContainer center={[-23.82, -45.36]} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution="&copy; OpenStreetMap &copy; CARTO"
                />
                {mapPoints.map(({ item, lat, lng }, idx) => (
                  itemTemCoordenadasMapa(item) ? (
                    <React.Fragment key={`${item.tipo}-${item.id}-${idx}`}>
                      <CircleMarker
                        center={[lat, lng]}
                        radius={tabValue === 0 ? 9 : (item.eh_contemplado ? 11 : 8)}
                        pathOptions={{
                          fillColor: getMarkerCoreColor(item),
                          color: 'transparent',
                          weight: 0,
                          fillOpacity: 0.18,
                        }}
                      />
                      <CircleMarker 
                        center={[lat, lng]} 
                        radius={tabValue === 0 ? 5 : (item.eh_contemplado ? 7 : 4)} 
                        pathOptions={{ 
                          fillColor: getMarkerCoreColor(item),
                          color: '#ffffff',
                          weight: 2,
                          fillOpacity: tabValue === 0 ? 0.92 : (item.eh_contemplado ? 0.95 : 0.8),
                        }}
                      >
                        <Popup>
                          <div className="p-2 min-w-[220px]">
                            <div className="text-[0.6rem] font-black uppercase tracking-widest mb-1" style={{ color: currentColor }}>
                              {getMarkerEmoji(item.tipo)} {item.edital || item.ano} • {item.categoria}
                            </div>
                            <div className="font-bold text-sm leading-tight mb-2" style={{ color: currentColor }}>
                              {item.nome}
                            </div>
                            <div className="text-xs font-semibold text-[#5f5f6a] mb-3">{item.proponente}</div>
                            {item.tipo === 'edital' && (
                              <div className="mb-2">
                                {item.eh_contemplado ? (
                                  <span className="inline-block text-[0.6rem] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Contemplado</span>
                                ) : (
                                  <span className="inline-block text-[0.6rem] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Inscrito</span>
                                )}
                              </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                              <span className="text-[0.65rem] font-bold text-[#5f5f6a]">{item.bairro}</span>
                              {item.valor ? (
                                <span className="text-sm font-black" style={{ color: currentColor }}>{formatBRL(item.valor)}</span>
                              ) : null}
                            </div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    </React.Fragment>
                  ) : null
                ))}
              </MapContainer>
              
              {/* 🎯 LEGENDA DO MAPA */}
              <div 
                className="absolute top-4 right-4 p-4 rounded-2xl shadow-lg z-[1000]"
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '2px solid rgba(255, 255, 255, 0.3)'
                }}
              >
                <div className="text-xs font-black text-gray-700 mb-3 uppercase tracking-wide">Legenda</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00A38C', border: '2px solid white' }}></div>
                    <span className="text-xs font-semibold text-gray-700">🎭 Agentes Culturais</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00A38C', border: '2px solid white' }}></div>
                    <span className="text-xs font-semibold text-gray-700">👥 Grupos e Coletivos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF6B35', border: '2px solid white' }}></div>
                    <span className="text-xs font-semibold text-gray-700">🏛️ Espaços Culturais</span>
                  </div>
                  {tabValue === 1 && (
                    <>
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981', border: '2px solid white' }}></div>
                        <span className="text-xs font-semibold text-gray-700">Contemplados</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#94a3b8', border: '2px solid white' }}></div>
                        <span className="text-xs font-semibold text-gray-700">Inscritos (nao contemplados)</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-3 space-y-1 border-t border-gray-200 pt-3">
                  <div className="text-[0.65rem] font-bold leading-snug text-gray-800">
                    Pinos renderizados: <span className="tabular-nums text-gray-900">{pinsComCoord}</span>
                  </div>
                  <div className="text-[0.62rem] font-semibold text-gray-500">
                    Agentes: {pinsPorTipo.agente} · Grupos: {pinsPorTipo.grupo} · Espaços: {pinsPorTipo.espaco}
                    {tabValue === 1 ? ` · Editais: ${pinsPorTipo.edital}` : ''}
                  </div>
                  <div className="text-[0.62rem] font-semibold text-gray-500">
                    de {filteredItems.length} registo{filteredItems.length === 1 ? '' : 's'} com este filtro
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Estatísticas por Bairro - com glassmorphism */}
        <section className="container mx-auto px-6 mb-10 max-w-6xl">
          <div 
            className="p-8 rounded-[2rem] border border-white/30 shadow-lg"
            style={{
              background: 'rgba(255, 255, 255, 0.35)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div className="mb-6 flex items-center gap-3 justify-center">
              <MapPin style={{ color: currentColor }} size={28} />
              <h2 className="text-2xl font-black text-[#1b1b1f]">Distribuição Territorial por Bairro</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {estatisticasPorBairro.slice(0, 12).map((stat) => (
                <div 
                  key={stat.bairro} 
                  className="p-4 rounded-xl border border-white/30 hover:border-white/50 transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  }}
                >
                  <div className="text-sm font-bold text-[#1b1b1f] mb-1">{stat.bairro}</div>
                  <div className="flex gap-2 items-center">
                    <span className="text-2xl font-black" style={{ color: currentColor }}>{stat.total}</span>
                    <span className="text-xs text-[#5f5f6a]">
                      {tabValue === 0 ? 'agentes' : 'projetos'}
                      {stat.contemplados > 0 && ` (${stat.contemplados} contemplados)`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 📊 Indicadores de Diversidade e Comunidades Tradicionais */}
        <section className="container mx-auto px-6 mb-10 max-w-6xl">
          <div 
            className="p-8 rounded-[2rem] border border-white/30 shadow-lg"
            style={{
              background: 'rgba(255, 255, 255, 0.35)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div className="mb-6 flex items-center gap-3 justify-center">
              <Users style={{ color: currentColor }} size={28} />
              <h2 className="text-2xl font-black text-[#1b1b1f]">Indicadores de Diversidade</h2>
            </div>
            <p className="text-center text-sm text-[#5f5f6a] mb-6">
              Perfil dos {diversidadeStats.total} registros filtrados. Mesma leitura de colunas que a página Início (nomes de planilha variados). Campos: gênero, cor/raça, orientação sexual, identidade de gênero, idade, PcD e comunidade tradicional.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
              {[
                { label: 'Comunidades Oficiais', value: COMUNIDADES_TRADICIONAIS.length, sub: `${diversidadeStats.comunidadeTrad} agentes`, color: '#00A38C', perc: null as number | null },
                { label: 'Mulheres', value: diversidadeStats.mulheres, sub: `${diversidadeStats.percMulheres}%`, color: '#e91e8a', perc: diversidadeStats.percMulheres },
                { label: 'Negros/Pardos', value: diversidadeStats.negros, sub: `${diversidadeStats.percNegros}%`, color: '#8B4513', perc: diversidadeStats.percNegros },
                { label: 'LGBTQIA+', value: diversidadeStats.lgbtqia, sub: `${diversidadeStats.percLgbtqia}%`, color: '#9333ea', perc: diversidadeStats.percLgbtqia },
                { label: 'Jovens (até 29)', value: diversidadeStats.jovens, sub: `${diversidadeStats.percJovens}%`, color: '#f59e0b', perc: diversidadeStats.percJovens },
                { label: 'PcD', value: diversidadeStats.pcd, sub: `${diversidadeStats.percPcd}%`, color: '#00A38C', perc: diversidadeStats.percPcd },
                { label: 'Com. Trad. (agentes)', value: diversidadeStats.comunidadeTrad, sub: `${diversidadeStats.percComunidade}%`, color: '#00A38C', perc: diversidadeStats.percComunidade },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: stat.color }} aria-hidden />
                  <div className="pl-1.5">
                    <div className="text-2xl md:text-3xl font-black tabular-nums mb-1" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="text-[0.65rem] font-bold text-slate-800 mb-2 leading-tight">{stat.label}</div>
                    {stat.perc != null && (
                      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, stat.perc)}%`, backgroundColor: stat.color }} />
                      </div>
                    )}
                    <Chip label={stat.sub} size="small" sx={{ bgcolor: `${stat.color}18`, color: stat.color, fontWeight: 700, fontSize: '0.6rem', border: 'none' }} />
                  </div>
                </div>
              ))}
            </div>
            
            {diversidadeStats.mulheres === 0 && diversidadeStats.negros === 0 && diversidadeStats.lgbtqia === 0 && (
              <Alert 
                severity="info" 
                className="rounded-xl"
                sx={{
                  background: 'rgba(66, 133, 244, 0.1)',
                  border: '1px solid rgba(66, 133, 244, 0.2)',
                  fontSize: '0.85rem'
                }}
              >
                <strong>Os dados de diversidade dependem das planilhas importadas.</strong> Campos como genero, raca/etnia, orientacao sexual, idade e deficiencia precisam estar presentes nas colunas do Excel. O campo <strong>Comunidade Tradicional</strong> pode ser editado no painel Admin.
              </Alert>
            )}
            
            {/* 🏘️ Lista das 18 Comunidades Tradicionais */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-black text-[#1b1b1f] mb-3 text-center">
                As 18 Comunidades Tradicionais de Ilhabela
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                {COMUNIDADES_TRADICIONAIS.map(c => (
                  <Chip 
                    key={c} 
                    label={c} 
                    size="small" 
                    sx={{ 
                      bgcolor: 'rgba(0, 163, 140, 0.1)', 
                      color: '#00A38C', 
                      fontWeight: 700, 
                      fontSize: '0.75rem',
                      border: '1px solid rgba(0, 163, 140, 0.3)'
                    }} 
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Project List Table - com glassmorphism */}
        <section className="container mx-auto px-6 mb-10 max-w-6xl">
          <div 
            className="p-8 rounded-[2rem] border border-white/30 shadow-lg"
            style={{
              background: 'rgba(255, 255, 255, 0.35)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div className="mb-6 flex items-center gap-3 justify-center">
              <List style={{ color: currentColor }} size={28} />
              <h2 className="text-2xl font-black text-[#1b1b1f]">
                {tabValue === 0 ? 'Lista de Agentes Culturais Cadastrados' : 'Lista de Inscritos e Contemplados'}
              </h2>
            </div>
            
            {filteredItems.length === 0 ? (
              <Alert 
                severity="info" 
                className="rounded-2xl mb-6 font-medium text-center"
                sx={{
                  background: 'rgba(66, 133, 244, 0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(66, 133, 244, 0.3)',
                  fontSize: '1rem'
                }}
              >
                {tabValue === 0 ? (
                  <div>
                    <strong>Nenhum agente cultural importado ainda.</strong>
                    <br />
                    Faça upload da planilha do Mapeamento Cultural 2020 na página Admin para visualizar os dados reais.
                  </div>
                ) : (
                  <div>
                    <strong>Nenhum projeto contemplado no filtro atual.</strong>
                  </div>
                )}
              </Alert>
            ) : (
              <TableContainer 
                component={Paper} 
                elevation={0} 
                sx={{ 
                  border: '1px solid rgba(255, 255, 255, 0.3)', 
                  borderRadius: '1.5rem', 
                  overflow: 'hidden',
                  background: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(15px)'
                }}
              >
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'rgba(248, 249, 250, 0.8)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: '#5f5f6a', fontSize: '0.7rem', textTransform: 'uppercase' }}>Ano</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#5f5f6a', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                        {tabValue === 0 ? 'Nome' : 'Projeto'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#5f5f6a', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                        {tabValue === 0 ? 'Categoria' : 'Proponente'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#5f5f6a', fontSize: '0.7rem', textTransform: 'uppercase' }}>Bairro</TableCell>
                      {tabValue === 0 && (
                        <TableCell sx={{ fontWeight: 800, color: '#5f5f6a', fontSize: '0.7rem', textTransform: 'uppercase' }}>Principais Áreas de Atuação</TableCell>
                      )}
                      {tabValue === 1 && (
                        <TableCell sx={{ fontWeight: 800, color: '#5f5f6a', fontSize: '0.7rem', textTransform: 'uppercase' }}>Categoria</TableCell>
                      )}
                      {tabValue === 1 && (
                        <TableCell sx={{ fontWeight: 800, color: '#5f5f6a', fontSize: '0.7rem', textTransform: 'uppercase' }}>Edital</TableCell>
                      )}
                      {tabValue === 1 && (
                        <TableCell sx={{ fontWeight: 800, color: '#5f5f6a', fontSize: '0.7rem', textTransform: 'uppercase' }}>Status</TableCell>
                      )}
                      {tabValue === 1 && (
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#5f5f6a', fontSize: '0.7rem', textTransform: 'uppercase' }}>Valor</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={`${item.tipo}-${item.id}`} hover sx={{ '&:hover': { bgcolor: 'rgba(248, 250, 255, 0.6)' } }}>
                        <TableCell sx={{ fontWeight: 600, color: '#5f5f6a' }}>{excelSerialToYear(item.ano)}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: currentColor }}>{item.nome}</TableCell>
                        <TableCell sx={{ fontWeight: 500, color: '#1b1b1f' }}>
                          {tabValue === 0 ? item.categoria : item.proponente}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#5f5f6a' }}>{item.bairro}</TableCell>
                        {tabValue === 0 && (
                          <TableCell sx={{ fontSize: '0.75rem', color: '#5f5f6a' }}>
                            {item.edital || '-'}
                          </TableCell>
                        )}
                        {tabValue === 1 && (
                          <TableCell sx={{ fontSize: '0.75rem', color: '#5f5f6a' }}>
                            {item.categoria}
                          </TableCell>
                        )}
                        {tabValue === 1 && (
                          <TableCell sx={{ fontSize: '0.8rem', color: '#5f5f6a' }}>
                            {item.edital || '-'}
                          </TableCell>
                        )}
                        {tabValue === 1 && (
                          <TableCell>
                            {item.eh_contemplado ? (
                              <Chip label="Contemplado" size="small" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '0.65rem' }} />
                            ) : (
                              <Chip label="Inscrito" size="small" sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 700, fontSize: '0.65rem' }} />
                            )}
                          </TableCell>
                        )}
                        {tabValue === 1 && (
                          <TableCell align="right" sx={{ fontWeight: 700, color: item.eh_contemplado ? currentColor : '#9ca3af' }}>
                            {item.valor ? formatBRL(item.valor) : '-'}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}