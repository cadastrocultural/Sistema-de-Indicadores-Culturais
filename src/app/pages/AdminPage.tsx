import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Button, Card, CardContent, Alert, Tabs, Tab, Box,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, Select, MenuItem, FormControl, InputLabel,
  Chip, Grid, Typography, Divider, Checkbox, TablePagination, IconButton, Stack, Tooltip, FormControlLabel, Link
} from '@mui/material';
import {
  Upload, Download, Database, CheckCircle, FileSpreadsheet,
  Eye, Save, MapPin, Edit, Trash2, Plus, AlertCircle, RefreshCw, Users, Info, Award, Search, ListChecks, LogOut
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  BAIRROS_ILHABELA,
  NOMES_BAIRROS,
  ILHABELA_BOUNDS,
  canonicalBairroIlhabela,
  looksLikeEnderecoCompleto,
  resolveCoordsForIlhabela,
} from '../data/bairros-coords';

// Imports dos módulos extraídos para reduzir tamanho do arquivo
import { 
  COMUNIDADES_TRADICIONAIS, 
  GENERO_OPTIONS, 
  RACA_OPTIONS, 
  PCD_OPTIONS, 
  ORIENTACAO_OPTIONS 
} from './admin/constants';
import { findEditalLinks } from './admin/editalUtils';
import { 
  isBankingColumnGlobal, 
  isFaixaValorValue, 
  extractValorFromFaixa,
  scanValueInRow,
  scanGeneroInRow,
  scanRacaInRow,
  scanPcdInRow,
  scanIdadeInRow,
  scanOrientacaoInRow,
  isPlausibleRacaCorValue,
} from './admin/scanUtils';
import {
  normalizeProjetosOnParsed,
  normalizeFullPersonNameForRanking,
  pickRicherCadastroPayload,
  isProjetoContemplado,
  getProjetoValorNormalizado,
  parseBRLField,
} from './admin/projetosDemandaOferta';
import { inferGenderFromName } from './admin/genderInference';
import { universalFieldScanner } from './admin/universalScanner';
import { resolveComunidadeTradicional } from './admin/comunidadeTradicionalUtils';
import { AdminImportCharts } from '../components/admin/AdminImportCharts';
import { 
  isUrl, 
  isAttachmentColumn, 
  getFieldFromRow, 
  anonCPF, 
  anonEmail, 
  anonTelefone, 
  anonEndereco,
  extractEnderecoCompletoFromCadastroRow,
} from './admin/fieldUtils';

interface AdminPageProps {
  onNavigate: (page: string) => void;
  adminAuthed: boolean;
  setAdminAuthed: (value: boolean) => void;
}

interface ParsedData {
  editais?: any[];
  categorias?: any[];
  evolucao?: any[];
  agentes?: any[];
  projetos?: any[];
  grupos?: any[];
  espacos?: any[];
  mapeamento?: any[];
  /** Ajustes manuais do resumo por edital+ano (chave: `${edital}||${ano}`) */
  editalResumoOverrides?: Record<string, EditalResumoOverride>;
  /** Chaves `edital||ano` ocultas na tabela "Demanda vs Oferta" da Home (dados permanecem no Admin). */
  demandaOfertaExcluidosHome?: string[];
}

/** Campos opcionais: ausente = usar valor calculado da planilha */
type EditalResumoOverride = {
  nomeBase?: string;
  ano?: number;
  total?: number;
  contemplados?: number;
  suplentes?: number;
  naoContemplados?: number;
  valor?: number;
  valorContemplados?: number;
  /** Percentual 0–100 exibido na coluna Aproveitamento */
  aproveitamentoPct?: number;
};

const parseIntOptional = (raw: string): number | undefined => {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number.parseInt(t.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : undefined;
};

const parseBRLNumberOptional = (raw: string): number | undefined => {
  const s0 = raw.trim();
  if (!s0) return undefined;
  let s = s0.replace(/\s/g, '').replace(/R\$\s?/gi, '');
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes('.') && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = Number(s.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

const parsePercentOptional = (raw: string): number | undefined => {
  const t = raw.trim().replace('%', '');
  if (!t) return undefined;
  const n = Number(t.replace(',', '.'));
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(100, n));
};

const makeEditalAnoChave = (nomeBase: string, ano: number) => `${nomeBase}||${ano}`;

const hasValidIlhabelaCoords = (latRaw: unknown, lngRaw: unknown): boolean => {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) < 1e-6 && Math.abs(lng) < 1e-6) return false;
  return (
    lat >= ILHABELA_BOUNDS.south &&
    lat <= ILHABELA_BOUNDS.north &&
    lng >= ILHABELA_BOUNDS.west &&
    lng <= ILHABELA_BOUNDS.east
  );
};

const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
  const kmPerDegLat = 111.32;
  const kmPerDegLng = 111.32 * Math.cos(((aLat + bLat) / 2) * Math.PI / 180);
  const dLat = Math.abs(aLat - bLat) * kmPerDegLat;
  const dLng = Math.abs(aLng - bLng) * kmPerDegLng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
};

const resolveRecordCoords = (bairro: string, endereco: string, latRaw: unknown, lngRaw: unknown): { lat: number; lng: number } => {
  const resolved = resolveCoordsForIlhabela(bairro, latRaw, lngRaw, endereco);
  const fromResolve =
    resolved.lat != null && resolved.lng != null ? { lat: resolved.lat, lng: resolved.lng } : null;

  const currentValid = hasValidIlhabelaCoords(latRaw, lngRaw);
  const current = currentValid ? { lat: Number(latRaw), lng: Number(lngRaw) } : null;

  if (current && fromResolve) {
    if (distanceKm(current.lat, current.lng, fromResolve.lat, fromResolve.lng) > 2.5) {
      return fromResolve;
    }
    return current;
  }

  if (current) {
    return current;
  }

  if (fromResolve) {
    return fromResolve;
  }

  return { lat: 0, lng: 0 };
};

interface Projeto {
  edital?: string;
  ano?: number;
  proponente?: string;
  categoria?: string;
  valor?: number;
  cpf_cnpj?: string;
  bairro?: string;
  status?: string;
  lat?: number;
  lng?: number;
}

export function AdminPage({ onNavigate, adminAuthed, setAdminAuthed }: AdminPageProps) {
  const UNDO_SNAPSHOT_KEY = 'editais_imported_data_last_snapshot';
  const ADMIN_ACTIVE_TAB_KEY = 'admin_active_tab';
  const [tabValue, setTabValue] = useState(() => {
    try {
      const saved = localStorage.getItem(ADMIN_ACTIVE_TAB_KEY);
      const parsed = saved !== null ? Number(saved) : 0;
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    } catch {
      return 0;
    }
  });
  const [parsedData, setParsedData] = useState<ParsedData>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'info' | 'warning' | 'error'; text: string } | null>(null);
  
  // Campos de formulário para projetos
  const [editalNome, setEditalNome] = useState('');
  const [editalAno, setEditalAno] = useState('');
  const [filtroEdital, setFiltroEdital] = useState<string>(''); // Filtro para tabela de projetos
  const [dedupeEditalKey, setDedupeEditalKey] = useState<string>(''); // Deduplicação por planilha (edital/ano)
  const [buscaProponente, setBuscaProponente] = useState<string>(''); // 🔍 Pesquisa por proponente
  const [adminLoginPin, setAdminLoginPin] = useState('');
  const [lastImportDuplicatesRemoved, setLastImportDuplicatesRemoved] = useState(0);
  
  // 🎯 Estado para edição inline
  const [editingRow, setEditingRow] = useState<{ tab: string; index: number } | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  
  // 🎯 Estado para seleção em lote
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [batchComunidade, setBatchComunidade] = useState<string>('');
  const [batchStatus, setBatchStatus] = useState<string>('');
  
  // 📄 Paginação por tabela
  const ROWS_PER_PAGE = 50;
  const [tablePage, setTablePage] = useState<Record<string, number>>({ agentes: 0, grupos: 0, espacos: 0, mapeamento: 0, projetos: 0 });
  const [rowsPerPage, setRowsPerPage] = useState<Record<string, number>>({ agentes: ROWS_PER_PAGE, grupos: ROWS_PER_PAGE, espacos: ROWS_PER_PAGE, mapeamento: ROWS_PER_PAGE, projetos: ROWS_PER_PAGE });
  
  // 🎯 Estado para renomear edital
  const [renameEditalFrom, setRenameEditalFrom] = useState<string>('');
  const [renameEditalTo, setRenameEditalTo] = useState<string>('');
  const [showRenameEdital, setShowRenameEdital] = useState(false);
  
  // 🔗 Links customizados de editais (dinâmicos, salvos junto com dados)
  const [customEditalLinks, setCustomEditalLinks] = useState<Record<string, { resultado?: string; resumo?: string; diarioOficial?: string }>>({}); 
  const [hasUndoSnapshot, setHasUndoSnapshot] = useState(false);
  const [recoveringData, setRecoveringData] = useState(false);

  const showFeedback = (type: 'success' | 'info' | 'warning' | 'error', text: string) => {
    setActionFeedback({ type, text });
    setTimeout(() => setActionFeedback(null), 4500);
  };
  
  // Refs para inputs de arquivo
  const fileInputMapeamento = useRef<HTMLInputElement>(null);
  const fileInputAgentes = useRef<HTMLInputElement>(null);
  const fileInputGrupos = useRef<HTMLInputElement>(null);
  const fileInputEspacos = useRef<HTMLInputElement>(null);
  const fileInputProjetos = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(ADMIN_ACTIVE_TAB_KEY, String(tabValue));
    } catch {
      // Ignora falhas de persistência em ambientes restritos.
    }
  }, [tabValue]);

  const loadDataFromServer = async () => {
    try {
      setRecoveringData(true);
      console.log('📥 [CLIENT] Carregando dados do servidor...');
      
      const { projectId, publicAnonKey } = await import('/utils/supabase/info');
      const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-2320c79f/load-data`;
      
      const response = await fetch(serverUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('📦 Dados carregados do servidor:', {
          agentes: result.data.agentes?.length || 0,
          grupos: result.data.grupos?.length || 0,
          espacos: result.data.espacos?.length || 0,
          editais: result.data.editais?.length || 0,
          projetos: result.data.projetos?.length || 0,
          mapeamento: result.data.mapeamento?.length || 0
        });
        let merged: Record<string, unknown> = { ...result.data };
        try {
          const savedData = localStorage.getItem('editais_imported_data');
          if (savedData) {
            const localParsed = JSON.parse(savedData) as Record<string, unknown>;
            merged = pickRicherCadastroPayload(result.data, localParsed) as Record<string, unknown>;
          }
        } catch {
          /* mantém servidor */
        }
        const mergedForDisk = JSON.parse(JSON.stringify(merged)) as Record<string, unknown>;
        if (merged.customEditalLinks && typeof merged.customEditalLinks === 'object') {
          setCustomEditalLinks(merged.customEditalLinks as Record<string, { resultado?: string; resumo?: string; diarioOficial?: string }>);
          delete merged.customEditalLinks;
        }
        setParsedData(normalizeProjetosOnParsed(merged) as ParsedData);
        try {
          localStorage.setItem('editais_imported_data', JSON.stringify(mergedForDisk));
        } catch {
          /* quota */
        }
      } else {
        console.log('⚠️ Nenhum dado salvo encontrado no servidor');
        
        // 🔄 FALLBACK: Tenta carregar do localStorage como backup
        const savedData = localStorage.getItem('editais_imported_data');
        if (savedData) {
          console.log('📦 [FALLBACK] Carregando dados do localStorage...');
          const parsed = JSON.parse(savedData);
          if (parsed.customEditalLinks) {
            setCustomEditalLinks(parsed.customEditalLinks);
            delete parsed.customEditalLinks;
          }
          setParsedData(normalizeProjetosOnParsed(parsed) as ParsedData);
        }
      }
    } catch (err) {
      console.error('❌ Erro ao carregar dados do servidor:', err);
      
      // FALLBACK: Tenta carregar do localStorage
      try {
        const savedData = localStorage.getItem('editais_imported_data');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          console.log('📦 [FALLBACK] Dados carregados do localStorage');
          if (parsed.customEditalLinks) {
            setCustomEditalLinks(parsed.customEditalLinks);
            delete parsed.customEditalLinks;
          }
          setParsedData(normalizeProjetosOnParsed(parsed) as ParsedData);
        }
      } catch (localErr) {
        console.error('❌ Erro no fallback localStorage:', localErr);
      }
    } finally {
      setRecoveringData(false);
    }
  };

  // 🎯 CARREGA DADOS DO SERVIDOR AO MONTAR O COMPONENTE
  useEffect(() => {
    loadDataFromServer();
  }, []);

  useEffect(() => {
    try {
      setHasUndoSnapshot(!!localStorage.getItem(UNDO_SNAPSHOT_KEY));
    } catch {
      setHasUndoSnapshot(false);
    }
  }, []);

  // 🎯 Calcula idade a partir de data de nascimento (DD/MM/YYYY, YYYY-MM-DD, etc.)
  const calcularIdade = (dataNascimento: string): number | null => {
    if (!dataNascimento) return null;
    const s = String(dataNascimento).trim();
    const numDireto = parseInt(s);
    if (/^\d{1,3}$/.test(s) && numDireto > 0 && numDireto < 130) return numDireto;
    let d: Date | null = null;
    const brMatch = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (brMatch) d = new Date(parseInt(brMatch[3]), parseInt(brMatch[2]) - 1, parseInt(brMatch[1]));
    if (!d || isNaN(d.getTime())) {
      const isoMatch = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
      if (isoMatch) d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    }
    if (!d || isNaN(d.getTime())) {
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2020) d = parsed;
    }
    if (!d && /^\d{4,5}$/.test(s)) {
      const serial = parseInt(s);
      // Excel serial: 4-5 dígitos (ex: 30000 = 1982, 40000 = 2009, 45000 = 2023)
      if (serial > 10000 && serial < 50000) d = new Date((serial - 25569) * 86400 * 1000);
    }
    if (d && !isNaN(d.getTime()) && d.getFullYear() > 1900) {
      const hoje = new Date();
      let age = hoje.getFullYear() - d.getFullYear();
      const mDiff = hoje.getMonth() - d.getMonth();
      if (mDiff < 0 || (mDiff === 0 && hoje.getDate() < d.getDate())) age--;
      if (age >= 0 && age < 130) return age;
    }
    return null;
  };
  
  // Helper: descarta valores puramente numéricos para campos de texto (gênero, raça, etc.)
  const textOnly = (val: any): string => {
    if (!val) return '';
    const s = String(val).trim();
    if (/^\d+$/.test(s)) return ''; // puramente numérico → descarta
    return s;
  };

  // Helper: valida se um valor é plausível para campos de diversidade
  // Rejeita valores de colunas financeiras/bancárias capturados por engano
  const isValidDiversityValue = (val: string): boolean => {
    if (!val || val.trim() === '') return false;
    const lower = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (lower.includes('r$') || lower.includes('banco') || lower.includes('caixa econ') || 
        lower.includes('itau') || lower.includes('bradesco') || lower.includes('santander') ||
        lower.includes('conta corrente') || lower.includes('poupanca') || lower.includes('agencia') ||
        (lower.includes('faixa') && (lower.includes('valor') || /\d{2,}[.,]\d{3}/.test(lower))) ||
        lower.includes('http') || lower.includes('www.') || lower.includes('.com') ||
        lower.includes('drive.google') || lower.includes('.pdf')) return false;
    if (/^\d{3,}[-/]\d/.test(val.trim())) return false;
    return true;
  };

  const calcularFaixaEtaria = (idade: number | null): string => {
    if (idade === null) return '';
    if (idade < 18) return '0-17 (Menor)';
    if (idade <= 29) return '18-29 (Jovem)';
    if (idade <= 39) return '30-39';
    if (idade <= 49) return '40-49';
    if (idade <= 59) return '50-59';
    return '60+ (Idoso)';
  };

  // Idade só pode vir em formatos plausíveis (evita puxar descrição/título por engano)
  const isIdadePlausivelRaw = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    const s = String(val).trim();
    if (!s) return false;
    const low = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (isFaixaValorValue(s)) return false;
    if (low === 'sim' || low === 'nao' || low === 'não' || low === 's' || low === 'n') return false;
    // Rejeita textos longos/título/descrição
    if (s.length > 24) return false;
    // Número direto de idade
    if (/^\d{1,3}$/.test(s)) {
      const n = parseInt(s, 10);
      return n > 0 && n < 130;
    }
    // Data de nascimento
    if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(s)) return true;
    if (/^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(s)) return true;
    // Faixa etária textual curta
    if (/^\d{1,2}\s*[-a]\s*\d{1,2}$/.test(low)) return true;
    if (/^\d{1,3}\s*anos?$/.test(low)) return true;
    if (low.includes('jovem') || low.includes('adulto') || low.includes('idoso')) return true;
    return false;
  };

  // Função para normalizar nome de colunas
  const normalizeColumnName = (name: string): string => {
    return name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Função para detectar automaticamente mapeamento de colunas
  const autoMapColumns = (headers: string[], expectedFields: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};
    const normalizedHeaders = headers.map(h => normalizeColumnName(h));
    
    expectedFields.forEach(field => {
      const normalized = normalizeColumnName(field);
      const index = normalizedHeaders.findIndex(h => 
        h.includes(normalized) || normalized.includes(h)
      );
      if (index !== -1) {
        mapping[field] = headers[index];
      }
    });
    
    return mapping;
  };

  // 🎯 Helper: verifica se um valor é uma URL (para ignorar campos de upload/anexo)
  const isUrl = (val: any): boolean => {
    if (!val) return false;
    const s = String(val).trim().toLowerCase();
    return s.startsWith('http://') || s.startsWith('https://') || s.startsWith('www.') || s.startsWith('ftp://');
  };

  // 🎯 Helper: verifica se um valor é um e-mail
  const isEmail = (val: any): boolean => {
    if (!val) return false;
    const s = String(val).trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  };
  
  // 🎯 Helper: extrai o primeiro e-mail encontrado dentro de um texto
  const extractEmailFromText = (val: any): string => {
    if (!val) return '';
    const s = String(val).trim();
    const match = s.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    return match ? match[0] : '';
  };

  // 🎯 Helper: extrai bairro/comunidade de "Endereço Completo do Proponente"
  const extractBairroFromEndereco = (endereco: string): string => {
    if (!endereco || endereco.length < 3) return '';
    const endLower = endereco.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // 1) Busca nas comunidades tradicionais
    for (const com of COMUNIDADES_TRADICIONAIS) {
      const comNorm = com.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (endLower.includes(comNorm)) return com;
    }
    // 2) Busca nos bairros conhecidos de Ilhabela
    for (const bairro of NOMES_BAIRROS) {
      const bairroNorm = bairro.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (endLower.includes(bairroNorm)) return bairro;
    }
    // 3) Tenta extrair após palavras-chave comuns de endereço
    const patterns = [
      /bairro[:\s]+([^,\-\n]+)/i,
      /comunidade[:\s]+([^,\-\n]+)/i,
      /,\s*([^,\-\n]+?)\s*[-–]\s*ilhabela/i,
      /,\s*([^,\-\n]+?)\s*[-–]\s*sp/i,
    ];
    for (const p of patterns) {
      const m = endereco.match(p);
      if (m && m[1] && m[1].trim().length > 2) return m[1].trim();
    }
    return '';
  };

  // 🎯 Helper: detecta tipo pessoa (PF/PJ) a partir de CPF/CNPJ ou campo explícito
  const detectTipoPessoa = (row: any): string => {
    const rowKeys = Object.keys(row);
    // 1) Campo explícito "Tipo de Proponente" / "Tipo de Pessoa"
    const tpCol = rowKeys.find(k => {
      const cleaned = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return cleaned.includes('tipo') && (cleaned.includes('proponente') || cleaned.includes('pessoa') || cleaned.includes('inscricao'));
    });
    if (tpCol) {
      const val = String(row[tpCol]).toLowerCase();
      if (val.includes('jurídica') || val.includes('juridica') || val.includes('pj')) return 'Pessoa Jurídica';
      if (val.includes('física') || val.includes('fisica') || val.includes('pf')) return 'Pessoa Física';
    }
    // 2) Detecta pelo CPF/CNPJ - CORREÇÃO: garantir que seja string
    const cpfCnpjRaw = row.cpf_cnpj || row.cpfCnpj || row.CPF || row.CNPJ || row.cpf || row.cnpj || 
      row['CPF/CNPJ'] || row['cpf/cnpj'] || row.documento || row.Documento || '';
    const cpfCnpj = String(cpfCnpjRaw).replace(/[^\d]/g, '');
    if (cpfCnpj.length === 14) return 'Pessoa Jurídica';
    if (cpfCnpj.length === 11) return 'Pessoa Física';
    // 3) Detecta pelo nome
    const nome = String(row.proponente || row.nome || row.Nome || '').toLowerCase();
    if (nome.includes('associa') || nome.includes('instituto') || nome.includes('funda') || 
        nome.includes('ltda') || nome.includes('eireli') || nome.includes('s/a') || 
        nome.includes('cooperativa') || nome.includes('empresa')) return 'Pessoa Jurídica';
    if (nome.length > 5 && nome.split(' ').length >= 2) return 'Pessoa Física';
    return '';
  };

  // 🎯 Helper: verifica se um nome de coluna é de anexo/upload (Google Forms)
  const isAttachmentColumn = (colName: string): boolean => {
    const lower = colName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Exceções: colunas que contêm dados reais NÃO são anexos
    if (lower.includes('bairro') || lower.includes('area de atuacao') || lower.includes('comunidade') || 
        lower.includes('genero') || lower.includes('raca') || lower.includes('idade') ||
        lower.includes('deficiencia') || lower.includes('orientacao') || lower.includes('segmento') ||
        lower.includes('linguagem') || lower.includes('tradicional') || lower.includes('pertence') ||
        lower.includes('email') || lower.includes('e-mail') || lower.includes('eletronico') || lower.includes('correio') ||
        lower.includes('telefone') || lower.includes('celular') || lower.includes('whatsapp') ||
        lower.includes('endereco completo') || lower.includes('endereço completo') ||
        lower.includes('tipo de proponente') || lower.includes('tipo pessoa')) {
      return false;
    }
    return lower.includes('comprovante') || lower.includes('curriculo') ||
           lower.includes('anexo') || lower.includes('upload') || lower.includes('arquivo') ||
           lower.includes('download') || lower.includes('pdf') ||
           lower.includes('declaracao') || lower.includes('declaro') ||
           lower.includes('certidao') ||
           lower.includes('orcamento') || lower.includes('crc') ||
           lower.includes('impediti') ||
           lower.includes('dados bancarios') || lower.includes('nome do banco') ||
           lower.includes('agencia') || lower.includes('conta corrente') ||
           lower.includes('poupanca') || lower.includes('conta e se');
  };

  // 🎯 Helper universal: busca valor em múltiplas variações de nome de coluna
  // FILTRA URLs e colunas de anexo para evitar capturar links de upload do Google Forms
  const getFieldFromRow = (row: any, ...keys: string[]) => {
    // 1) Tentativa EXATA (chave existe literalmente no objeto, pula URLs)
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        if (!isUrl(row[key])) return row[key];
      }
    }
    
    const rowKeys = Object.keys(row);
    
    // 2) Busca case-insensitive EXATA (sem partial matching, pula anexos)
    // CORREÇÃO: itera por TODOS os matches para encontrar valor não-vazio
    for (const key of keys) {
      const keyNorm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      for (const k of rowKeys) {
        if (isAttachmentColumn(k)) continue;
        const kNorm = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
        if (kNorm !== keyNorm) continue;
        if (row[k] !== undefined && row[k] !== null && row[k] !== '' && !isUrl(row[k])) {
          return row[k];
        }
      }
    }
    
    // 3) Busca por INÍCIO do nome da coluna (ex: "Nome do Proponente;" começa com "nome")
    // CORREÇÃO: itera por TODOS os matches para encontrar valor não-vazio
    for (const key of keys) {
      const keyNorm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
      for (const k of rowKeys) {
        if (isAttachmentColumn(k)) continue;
        const kNorm = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[;:.,]/g, '').trim();
        if (!(kNorm.startsWith(keyNorm + ' ') || kNorm.startsWith(keyNorm + '_'))) continue;
        if (row[k] !== undefined && row[k] !== null && row[k] !== '' && !isUrl(row[k])) {
          return row[k];
        }
      }
    }

    // 4) Busca partial matching (mais flexível, mas pula URLs e colunas de anexo)
    // CORREÇÃO v3: Blacklist de falsos positivos em vez de threshold percentual
    // O threshold de 40% bloqueava matches legítimos como "raca" em "Qual sua raça?"
    const STEP4_FALSE_MATCHES = [
      ['idade', 'comunidade'],
      ['idade', 'identidade'],
      ['idade', 'qualidade'],
      ['idade', 'quantidade'],
      ['idade', 'unidade'],
      ['idade', 'cidade'],
      ['idade', 'validade'],
      ['idade', 'solidade'],
      ['idade', 'faculdade'],
      ['idade', 'prioridade'],
      ['idade', 'oportunidade'],
      ['orientacao', 'projeto'],
      ['orientacao', 'resumo'],
      ['orientacao', 'descricao'],
      ['orientacao', 'pedagog'],
      ['orientacao', 'curricular'],
      ['orientacaosexual', 'projeto'],
      ['orientacaosexual', 'resumo'],
    ];
    for (const key of keys) {
      const keyNorm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      if (keyNorm.length < 3) continue;
      for (const k of rowKeys) {
        if (isAttachmentColumn(k)) continue;
        const kNorm = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
        if (kNorm.length < 3) continue;
        if (!(kNorm.includes(keyNorm) || keyNorm.includes(kNorm))) continue;
        // Verifica se é um falso positivo conhecido
        const isFalse = STEP4_FALSE_MATCHES.some(([badKey, badCol]) => keyNorm === badKey && kNorm.includes(badCol));
        if (isFalse) continue;
        if (row[k] !== undefined && row[k] !== null && row[k] !== '' && !isUrl(row[k])) {
          return row[k];
        }
      }
    }
    
    return null;
  };

  // 🔒 ANONIMIZAÇÃO de dados sensíveis para exibição pública
  const anonCPF = (cpf: any): string => {
    if (!cpf) return '';
    const s = String(cpf);
    const digits = s.replace(/[^\d]/g, '');
    if (digits.length === 11) return `***.***.${digits[6]}${digits[7]}${digits[8]}-${digits[9]}${digits[10]}`;
    if (digits.length === 14) return `**.${digits[2]}${digits[3]}${digits[4]}.${digits[5]}${digits[6]}${digits[7]}/${digits[8]}${digits[9]}${digits[10]}${digits[11]}-${digits[12]}${digits[13]}`;
    if (s.length > 4) return s.substring(0, 3) + '***' + s.substring(s.length - 2);
    return '***';
  };
  const anonEmail = (email: any): string => {
    if (!email) return '';
    const s = String(email);
    if (!s.includes('@')) return '';
    const [local, domain] = s.split('@');
    const domParts = domain.split('.');
    const ext = domParts[domParts.length - 1];
    return `${local[0]}***@***.${ext}`;
  };
  const anonTelefone = (tel: any): string => {
    if (!tel) return '';
    const s = String(tel);
    const digits = s.replace(/[^\d]/g, '');
    if (digits.length >= 10) return `(**) *****-${digits.substring(digits.length - 4)}`;
    if (digits.length >= 4) return `***-${digits.substring(digits.length - 4)}`;
    return '***';
  };
  const anonEndereco = (endereco: any, bairro?: string): string => {
    if (!endereco) return bairro || '';
    const s = String(endereco);
    if (bairro) return `${bairro} - Ilhabela/SP`;
    const extracted = extractBairroFromEndereco(s);
    if (extracted) return `${extracted} - Ilhabela/SP`;
    if (s.toLowerCase().includes('ilhabela')) return 'Ilhabela/SP';
    return '***';
  };

  // 🎯 Helper: verifica se um valor é um nome genérico (Pessoa Física/Jurídica) e não um nome real
  const isGenericName = (val: any): boolean => {
    if (!val) return true;
    const s = String(val).toLowerCase().trim();
    return s === 'pessoa física' || s === 'pessoa fisica' || 
           s === 'pessoa jurídica' || s === 'pessoa juridica' ||
           s === 'pf' || s === 'pj' || s === '-' || s === '';
  };

  // 🎯 Helper: busca nome do proponente com lógica específica para Google Forms
  const getBestName = (row: any): string => {
    const rowKeys = Object.keys(row);
    
    // 1) Busca ESPECÍFICA para colunas de Google Forms (ex: "Nome do Proponente;")
    const googleFormsPatterns = [
      /^nome\s*(do|da)\s*proponente/i,
      /^nome\s*completo/i,
      /^nome\s*(do|da)\s*(inscrito|candidato|agente|responsavel)/i,
    ];
    for (const pattern of googleFormsPatterns) {
      const found = rowKeys.find(k => {
        const cleaned = k.replace(/[;:]/g, '').trim();
        return pattern.test(cleaned) && !isAttachmentColumn(k);
      });
      if (found && row[found] && !isUrl(row[found]) && !isGenericName(row[found])) {
        return String(row[found]);
      }
    }
    
    // 2) Busca padrão com getFieldFromRow (já filtra URLs e anexos)
    const candidates = [
      'proponente', 'Proponente', 'PROPONENTE',
      'nome', 'Nome', 'NOME',
      'nomeProponente', 'nome_proponente', 'Nome do Proponente',
      'nomeCompleto', 'nome_completo', 'Nome Completo',
      'inscrito', 'Inscrito', 'INSCRITO',
      'responsavel', 'Responsavel', 'RESPONSÁVEL', 'Responsável',
      'razaoSocial', 'razao_social', 'Razão Social',
      'candidato', 'Candidato', 'nomeCandidato',
      'agente', 'Agente',
    ];
    
    for (const key of candidates) {
      const val = getFieldFromRow(row, key);
      if (val && !isGenericName(val) && !isUrl(val)) return String(val);
    }
    
    // 3) Fallback: tenta nomeProjeto
    const nomeProjeto = getFieldFromRow(row, 'nomeProjeto', 'nome_projeto', 'Nome do Projeto', 'projeto', 'Projeto');
    if (nomeProjeto && !isGenericName(nomeProjeto) && !isUrl(nomeProjeto)) return String(nomeProjeto);
    
    return 'Não informado';
  };

  // 🎯 Helper: busca o nome do projeto separadamente (com filtro de anexos)
  const getProjectName = (row: any): string => {
    const rowKeys = Object.keys(row);
    
    // Busca específica para Google Forms: "Nome do Projeto;"
    const found = rowKeys.find(k => {
      const cleaned = k.replace(/[;:]/g, '').trim().toLowerCase();
      return (cleaned.startsWith('nome do projeto') || cleaned === 'nome do projeto') && !isAttachmentColumn(k);
    });
    if (found && row[found] && !isUrl(row[found])) return String(row[found]);
    
    const val = getFieldFromRow(row, 
      'nomeProjeto', 'nome_projeto', 'Nome do Projeto', 'NOME DO PROJETO',
      'projeto', 'Projeto', 'PROJETO', 'titulo', 'Título', 'TÍTULO', 'titulo_projeto'
    );
    return (val && !isUrl(val)) ? String(val) : '';
  };

  // Função para importar arquivo Excel com georreferenciamento
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, dataType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess(false);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

        if (jsonData.length === 0) {
          throw new Error('Planilha vazia! Adicione pelo menos 1 linha de dados.');
        }

        console.log(`📊 ${dataType} importado:`, jsonData.length, 'registros');
        console.log('📋 Colunas detectadas:', Object.keys(jsonData[0]));
        
        // Processar e georreferenciar dados se necessário
        let processedData = jsonData;
        
        if (dataType === 'mapeamento' || dataType === 'agentes') {
          processedData = jsonData.map(row => {
            const bairroRaw = getFieldFromRow(row, 'bairro', 'Bairro', 'BAIRRO', 'localidade', 'Localidade', 'local',
              'regiao', 'Região', 'Bairro onde reside', 'bairro onde reside'
            ) || (() => {
              const rk = Object.keys(row);
              const bCol = rk.find(k => { const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return cl.includes('bairro') && !cl.includes('faixa') && !cl.includes('valor'); });
              return bCol && !isFaixaValorValue(row[bCol]) ? String(row[bCol]) : '';
            })();
            const bairro = isFaixaValorValue(bairroRaw) ? '' : bairroRaw;
            const nome = getFieldFromRow(row, 
              'nome', 'Nome', 'NOME', 'nome_completo', 'Nome Completo', 'NOME COMPLETO',
              'nome completo', 'proponente', 'Proponente'
            ) || '';
            
            // 🎨 NORMALIZAÇÃO DE CAMPOS DE DIVERSIDADE
            const genero = textOnly(getFieldFromRow(row,
              'genero', 'Genero', 'GENERO', 'Gênero', 'gênero', 'sexo', 'Sexo', 'SEXO',
              'identidade_genero', 'identidade de gênero', 'Identidade de Gênero',
              'genero_identidade', 'qual seu gênero', 'qual seu genero',
              'Gênero:', 'Sexo:', 'genero;', 'Genero;', 'sexo;', 'Sexo;'
            )) || (() => {
              // Fallback: busca direta em TODAS as colunas por header contendo gênero/sexo
              const rk = Object.keys(row);
              const gCol = rk.find(k => {
                if (isAttachmentColumn(k)) return false;
                const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return (cl.includes('genero') || cl.includes('sexo') || cl.includes('identidade de genero')) && !cl.includes('orientacao');
              });
              if (gCol && row[gCol]) {
                const val = textOnly(row[gCol]);
                if (val && isValidDiversityValue(val)) return val;
              }
              // 🔍 SCAN REVERSO: busca valores de GENERO_OPTIONS em qualquer coluna
              const scanG = scanGeneroInRow(row);
              if (scanG) return scanG;
              // 👤 INFERÊNCIA POR NOME: infere gênero pelo primeiro nome (~95% acerto)
              const nomePessoa = nome || row.nome || row.Nome || row.proponente || '';
              const inferred = inferGenderFromName(nomePessoa);
              if (inferred) return inferred;
              return '';
            })();
            
            const raca = textOnly(getFieldFromRow(row,
              'raca', 'Raca', 'RACA', 'Raça', 'raça',
              'raca_cor', 'raça/cor', 'Raça/Cor', 'RAÇA/COR', 'cor/raça', 'Cor/Raça', 'COR/RAÇA',
              'etnia', 'Etnia', 'ETNIA', 'cor', 'Cor', 'COR',
              'autodeclaracao', 'Autodeclaração', 'autodeclaração', 'raca_etnia',
              'qual sua raça', 'qual sua raca', 'qual a sua raça', 'qual a sua raca',
              'como voce se autodeclara', 'como você se autodeclara',
              'Como você se declara', 'como voce se declara',
              'Qual a sua cor ou raça', 'qual a sua cor ou raca',
              'Cor ou raça', 'cor ou raca',
              'autodeclaração racial', 'autodeclaracao racial',
              'Como você se autodeclara quanto à cor', 'como voce se autodeclara quanto a cor',
              'étnico-racial', 'etnico-racial', 'étnico racial', 'etnico racial'
            )) || (() => {
              // Fallback: busca por header de raça/cor/etnia/autodeclaração
              const rk = Object.keys(row);
              const hasCor = (cl: string) => cl.includes('cor') && !cl.includes('corrente') && !cl.includes('correio') && !cl.includes('correspond') && !cl.includes('acordo') && !cl.includes('recorte') && !cl.includes('decora') && !cl.includes('record') && !cl.includes('corpo');
              const rCol = rk.find(k => { if (isAttachmentColumn(k)) return false; const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return (cl.includes('raca') || hasCor(cl) || cl.includes('etnia') || cl.includes('autodeclaracao') || cl.includes('autodeclara')) && !cl.includes('orientacao') && !cl.includes('genero') && !cl.includes('eletronico') && !cl.includes('email'); });
              if (rCol && row[rCol]) { 
                const val = textOnly(row[rCol]); 
                // 🛡️ VALIDAÇÃO EXTRA: Rejeita valores booleanos "Sim"/"Não"
                const valLower = String(val).toLowerCase().trim();
                if (valLower === 'sim' || valLower === 'não' || valLower === 'nao' || valLower === 's' || valLower === 'n') return '';
                if (val && isValidDiversityValue(val) && !isFaixaValorValue(val)) return val;
              }
              // 🔍 SCAN REVERSO: busca valores de RACA_OPTIONS
              return scanRacaInRow(row);
            })();
            let racaFinal = raca;
            if (racaFinal && !isPlausibleRacaCorValue(racaFinal)) {
              const sr = scanRacaInRow(row);
              racaFinal = sr && isPlausibleRacaCorValue(sr) ? sr : '';
            }
            
            const orientacao_sexual = textOnly(getFieldFromRow(row,
              'orientacao_sexual', 'orientação_sexual', 'Orientação Sexual', 'orientação sexual',
              'ORIENTAÇÃO SEXUAL', 'sexualidade', 'Sexualidade',
              'qual sua orientação sexual', 'qual sua orientacao sexual'
            )) || scanOrientacaoInRow(row);
            
            // 📅 DATA DE NASCIMENTO → IDADE (calcula automaticamente)
            const dataNascimentoRaw = getFieldFromRow(row,
              'data_nascimento', 'Data de Nascimento', 'DATA DE NASCIMENTO', 'nascimento',
              'Nascimento', 'data nascimento', 'dt_nascimento', 'dtNascimento',
              'Data de nascimento do proponente', 'Data Nascimento',
              'Qual a sua data de nascimento', 'qual a sua data de nascimento',
              'Qual sua data de nascimento', 'qual sua data de nascimento',
              'data_nasc', 'dt_nasc', 'dataNascimento', 'DataNascimento'
            ) || '';
            const idadeRawExtracted = getFieldFromRow(row,
              'idade', 'Idade', 'IDADE', 'faixa_etaria', 'faixa etária', 'Faixa Etária',
              'FAIXA ETÁRIA', 'qual sua idade', 'qual sua faixa etária', 'qual sua faixa etaria',
              'Qual a sua idade', 'qual a sua idade', 'Qual a sua faixa etária',
              'qual a sua faixa etaria'
            ) || '';
            // Rejeita se capturou faixa de valor monetário (R$) ou texto não-numérico/não-data
            const idadeRaw = (() => {
              if (!idadeRawExtracted) return '';
              if (isFaixaValorValue(idadeRawExtracted)) return '';
              const s = String(idadeRawExtracted).trim();
              // Rejeita qualquer formato não plausível para idade
              if (!isIdadePlausivelRaw(s)) return '';
              return idadeRawExtracted;
            })();
            // Tenta calcular idade a partir da data de nascimento
            const idadeCalculada = calcularIdade(dataNascimentoRaw) ?? calcularIdade(idadeRaw);
            // Valida: se o fallback for número >= 130, descarta (provavelmente coluna errada)
            const idadeRawValidada = (() => {
              if (!idadeRaw) return '';
              const s = String(idadeRaw).trim();
              if (!isIdadePlausivelRaw(s)) return '';
              return s;
            })();
            let idade = idadeCalculada !== null ? String(idadeCalculada) : idadeRawValidada;
            let faixaEtaria = calcularFaixaEtaria(idadeCalculada);
            let dataNascFinal = dataNascimentoRaw || '';
            // 🔍 SCAN REVERSO para idade: se nenhuma coluna nomeada encontrada
            if (!idade) {
              const scanI = scanIdadeInRow(row, calcularIdade);
              if (scanI.idade) { idade = scanI.idade; const num = parseInt(scanI.idade); if (num > 0 && num < 130) faixaEtaria = calcularFaixaEtaria(num); }
              if (scanI.dataNascimento) { dataNascFinal = scanI.dataNascimento; const calc = calcularIdade(scanI.dataNascimento); if (calc !== null) { idade = String(calc); faixaEtaria = calcularFaixaEtaria(calc); } }
            }
            // ⚠️ Se ainda não tem idade após todos os scans, marca como "Não informado"
            if (!idade) idade = 'Não informado';
            
            const deficiencia = (() => {
              const d = textOnly(getFieldFromRow(row,
                'deficiencia', 'Deficiência', 'deficiência', 'DEFICIÊNCIA', 'pcd', 'PCD', 'PcD',
                'pessoa_com_deficiencia', 'pessoa com deficiência', 'Pessoa com Deficiência',
                'possui deficiência', 'possui deficiencia', 'é pessoa com deficiência',
                'e pessoa com deficiencia', 'necessidades especiais'
              )) || scanPcdInRow(row);
              if (!d) return '';
              const dLow = d.toLowerCase();
              // Rejeita público-alvo contaminando PcD e faixa de valor
              if (dLow.includes('adulto') || dLow.includes('infantil') || dLow.includes('infanto') || dLow.includes('religioso') || dLow.includes('mulheres') || dLow.includes('povos') || /^\d+$/.test(d.trim()) || isFaixaValorValue(d)) return '';
              return d;
            })();
            
            const categoriaExtracted = getFieldFromRow(row,
              'categoria', 'Categoria', 'CATEGORIA', 'area', 'Area', 'Área',
              'area_atuacao', 'área de atuação', 'Área de Atuação', 'ÁREA DE ATUAÇÃO',
              'linguagem', 'Linguagem', 'LINGUAGEM', 'segmento', 'Segmento', 'SEGMENTO',
              'Linguagem Artística', 'linguagem artistica', 'modalidade', 'Modalidade',
              'Segmento cultural', 'Área de atuação cultural'
            ) || (() => {
              const rk = Object.keys(row);
              const catCol = rk.find(k => {
                const cleaned = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return (cleaned.includes('area de atuacao') || cleaned.includes('segmento') || 
                        cleaned.includes('linguagem') || cleaned.includes('modalidade') ||
                        (cleaned.includes('area') && cleaned.includes('atuacao'))) && !cleaned.includes('faixa') && !cleaned.includes('valor') && !isAttachmentColumn(k);
              });
              return catCol && !isFaixaValorValue(row[catCol]) ? String(row[catCol]) : '';
            })();
            const categoria = isFaixaValorValue(categoriaExtracted) ? '' : categoriaExtracted;
            
            // Comunidade Tradicional — só extrai texto bruto; resolução oficial após endereço + scanner
            const comunidadeTradicionalRaw = (() => {
              let comField = getFieldFromRow(row,
                'comunidade_tradicional', 'comunidade tradicional', 'Comunidade Tradicional',
                'COMUNIDADE TRADICIONAL', 'comunidadeTradicional', 'povo_tradicional',
                'quilombola', 'caiçara', 'caicara', 'indigena', 'indígena',
                'povos tradicionais', 'povo tradicional',
                'pertence a comunidade tradicional', 'Pertence a Comunidade Tradicional',
                'Pertence à Comunidade Tradicional', 'pertence_comunidade', 'pertence comunidade',
                'Comunidade Tradicional de Ilhabela', 'comunidade tradicional ilhabela',
                'Pertence a alguma comunidade tradicional', 'pertence a alguma das comunidades'
              ) || '';
              // Rejeita valores puramente numéricos (IDs, timestamps, seriais do Excel) E faixa de valor
              if (comField && (/^\d+$/.test(String(comField).trim()) || isFaixaValorValue(comField))) comField = '';
              if (!comField) {
                const rk = Object.keys(row);
                const comCol = rk.find(k => {
                  const cleaned = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                  return (cleaned.includes('comunidade') && (cleaned.includes('tradicional') || cleaned.includes('pertence'))) && !isAttachmentColumn(k);
                });
                const val = comCol ? String(row[comCol]).trim() : '';
                comField = (val && !/^\d+$/.test(val) && !isFaixaValorValue(val)) ? val : '';
              }
              return comField;
            })();
            
            // 📧 E-MAIL (agentes/mapeamento)
            const email = (() => {
              const ef = getFieldFromRow(row, 'email', 'Email', 'EMAIL', 'E-mail', 'e-mail', 'e_mail', 'Endereço eletrônico', 'endereco eletronico', 'Correio Eletrônico');
              if (ef) { if (isEmail(ef)) return String(ef).trim(); const ex = extractEmailFromText(ef); if (ex) return ex; }
              const rk2 = Object.keys(row);
              const eCol = rk2.find(k => { const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return (cl.includes('email') || cl.includes('e-mail') || cl.includes('eletronico') || cl.includes('correio')) && !isAttachmentColumn(k); });
              if (eCol && row[eCol]) { if (isEmail(row[eCol])) return String(row[eCol]).trim(); const ex = extractEmailFromText(row[eCol]); if (ex) return ex; }
              return '';
            })();
            // 📞 TELEFONE (agentes/mapeamento)
            const telefone = (() => {
              const tf = getFieldFromRow(row, 'telefone', 'Telefone', 'TELEFONE', 'tel', 'celular', 'Celular', 'whatsapp', 'WhatsApp', 'fone', 'Fone', 'contato', 'Contato');
              if (tf) return String(tf).trim();
              const rk2 = Object.keys(row);
              const tCol = rk2.find(k => { const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return (cl.includes('telefone') || cl.includes('celular') || cl.includes('whatsapp') || cl.includes('fone')) && !isAttachmentColumn(k); });
              return tCol ? String(row[tCol]).trim() : '';
            })();
            const enderecoCompleto = extractEnderecoCompletoFromCadastroRow(row, bairro);
            // CPF/CNPJ (agentes/mapeamento)
            const cpf_cnpj = getFieldFromRow(row, 'cpf_cnpj', 'CPF/CNPJ', 'cpf', 'cnpj', 'CPF', 'CNPJ', 'cpfCnpj', 'documento', 'Documento') || '';
            
            // 🔍 DEBUG: Log da 1ª linha para diagnóstico de colunas
            if (jsonData.indexOf(row) === 0) {
              const allCols = Object.keys(row);
              const genCols = allCols.filter(k => { const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return cl.includes('genero') || cl.includes('sexo') || cl.includes('identifica'); });
              const racaCols = allCols.filter(k => { const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return cl.includes('raca') || cl.includes('cor') || cl.includes('etnia') || cl.includes('autodeclar'); });
              const idadeCols = allCols.filter(k => { const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return cl.includes('idade') || cl.includes('nascimento') || cl.includes('etaria'); });
              const pcdCols = allCols.filter(k => { const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return cl.includes('deficiencia') || cl.includes('pcd') || cl.includes('acessibilidade'); });
              const endCols = allCols.filter(k => { const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return (cl.includes('endereco') || cl.includes('logradouro') || cl.includes('rua') || cl.includes('cep') || cl.includes('mora')) && !cl.includes('eletronico'); });
              console.log('🔍 [DEBUG IMPORTAÇÃO AGENTES] Todas as colunas (' + allCols.length + '):', JSON.stringify(allCols));
              console.log('🔍 [DEBUG] Amostra de TODOS os valores:', JSON.stringify(Object.entries(row).map(([k,v]) => [k, String(v).substring(0, 50)])));
              console.log('🎭 [DEBUG] Colunas GÊNERO:', JSON.stringify(genCols), '→', genCols.map(c => String(row[c]).substring(0, 50)));
              console.log('🎨 [DEBUG] Colunas RAÇA/COR:', JSON.stringify(racaCols), '→', racaCols.map(c => String(row[c]).substring(0, 50)));
              console.log('📅 [DEBUG] Colunas IDADE/NASCIMENTO:', JSON.stringify(idadeCols), '→', idadeCols.map(c => String(row[c]).substring(0, 50)));
              console.log('♿ [DEBUG] Colunas PcD:', JSON.stringify(pcdCols), '→', pcdCols.map(c => String(row[c]).substring(0, 50)));
              console.log('🏠 [DEBUG] Colunas ENDEREÇO:', JSON.stringify(endCols), '→', endCols.map(c => String(row[c]).substring(0, 50)));
              console.log('✅ [DEBUG] Valores EXTRAÍDOS → Gênero:', JSON.stringify(genero), '| Raça:', JSON.stringify(racaFinal), '| Idade:', JSON.stringify(idade), '| PcD:', JSON.stringify(deficiencia), '| Endereço:', JSON.stringify(enderecoCompleto));
              // 🔍 Scan reverso debug
              console.log('🔍 [DEBUG SCAN REVERSO] Gênero:', JSON.stringify(scanGeneroInRow(row)), '| Raça:', JSON.stringify(scanRacaInRow(row)), '| PcD:', JSON.stringify(scanPcdInRow(row)));
            }
            
            let result: any = { 
              ...row, 
              nome: nome || row.nome || row.Nome || '', 
              bairro,
              email, telefone, enderecoCompleto, cpf_cnpj,
              genero, raca: racaFinal, orientacao_sexual, idade, deficiencia, categoria,
              faixaEtaria,
              dataNascimento: dataNascFinal || '',
              comunidadeTradicional: '',
              eh_comunidade_tradicional: false
            };
            
            // 🔍 SCANNER UNIVERSAL: preenche campos que ficaram vazios
            const scanned = universalFieldScanner(row, NOMES_BAIRROS);
            if (!result.categoria && scanned.categoria) result.categoria = scanned.categoria;
            if (!result.email && scanned.email) result.email = scanned.email;
            if (!result.telefone && scanned.telefone) result.telefone = scanned.telefone;
            if (!result.genero && scanned.genero) result.genero = scanned.genero;
            if (result.genero && /apresenta/i.test(result.genero)) result.genero = '';
            if (!result.raca && scanned.raca && isPlausibleRacaCorValue(scanned.raca)) result.raca = scanned.raca;
            if (!result.idade && scanned.idade) result.idade = scanned.idade;
            if (!result.deficiencia && scanned.deficiencia) result.deficiencia = scanned.deficiencia;
            if (!result.enderecoCompleto && scanned.enderecoCompleto) result.enderecoCompleto = scanned.enderecoCompleto;
            if (!result.dataNascimento && scanned._dataNascimento) result.dataNascimento = scanned._dataNascimento;
            if (!result.bairro && scanned.bairro && !looksLikeEnderecoCompleto(scanned.bairro)) result.bairro = scanned.bairro;
            
            const comAgRes = resolveComunidadeTradicional({
              rawField: comunidadeTradicionalRaw,
              bairro: result.bairro || '',
              enderecoCompleto: result.enderecoCompleto || '',
              extras: [result.nome],
            });
            result = { ...result, comunidadeTradicional: comAgRes.nome, eh_comunidade_tradicional: comAgRes.eh };
            
            // 📎 LINKS DE DOCUMENTOS: captura URLs de anexos (Google Forms, comprovantes, PDFs)
            const linksDocumentos: string[] = [];
            const rk = Object.keys(row);
            for (const k of rk) {
              const val = row[k];
              if (!val) continue;
              const valStr = String(val).trim();
              // Detecta URLs (https://, http://, www., ou contém .pdf/.doc/.jpg/.png)
              if (isUrl(val) || valStr.includes('.pdf') || valStr.includes('.doc') || valStr.includes('.jpg') || valStr.includes('.png') || valStr.includes('formfacade.com') || valStr.includes('drive.google.com')) {
                linksDocumentos.push(valStr);
              }
            }
            if (linksDocumentos.length > 0) result.linksDocumentos = linksDocumentos;
            
            const bcAg = canonicalBairroIlhabela(String(result.bairro || '').trim(), String(result.enderecoCompleto || '').trim());
            if (bcAg) result.bairro = bcAg;
            else if (looksLikeEnderecoCompleto(String(result.bairro || ''))) result.bairro = '';
            
            const coordsAgente = resolveRecordCoords(result.bairro, result.enderecoCompleto || '', row.lat, row.lng);
            result = { ...result, lat: coordsAgente.lat, lng: coordsAgente.lng };
            return result;
          });
        }
        
        // 🎯 GRUPOS E ESPAÇOS: normaliza campos (diversidade + contato)
        if (dataType === 'grupos' || dataType === 'espacos') {
          processedData = jsonData.map(row => {
            const nome = getFieldFromRow(row, 'nome', 'Nome', 'NOME', 'nome_completo', 'Nome Completo', 'razao_social', 'Razão Social', 'grupo', 'Grupo', 'espaco', 'Espaço') || '';
            const bairroRawGE = getFieldFromRow(row, 'bairro', 'Bairro', 'BAIRRO', 'localidade', 'Localidade', 'local', 'regiao', 'Região') || (() => { const rk = Object.keys(row); const bCol = rk.find(k => { const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return cl.includes('bairro') && !cl.includes('faixa') && !cl.includes('valor'); }); return bCol && !isFaixaValorValue(row[bCol]) ? String(row[bCol]) : ''; })();
            const bairro = isFaixaValorValue(bairroRawGE) ? '' : bairroRawGE;
            const categoriaRawGE = getFieldFromRow(row, 'categoria', 'Categoria', 'CATEGORIA', 'area', 'Area', 'Área', 'tipo', 'Tipo', 'area_atuacao', 'Área de Atuação', 'segmento', 'Segmento', 'linguagem', 'Linguagem') || '';
            const categoria = isFaixaValorValue(categoriaRawGE) ? '' : categoriaRawGE;
            const genero = textOnly(getFieldFromRow(row, 'genero', 'Genero', 'GENERO', 'Gênero', 'gênero', 'sexo', 'Sexo', 'Gênero:', 'Sexo:', 'genero;', 'sexo;')) || (() => {
              const rk = Object.keys(row);
              const gCol = rk.find(k => { if (isAttachmentColumn(k)) return false; const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return (cl.includes('genero') || cl.includes('sexo')) && !cl.includes('orientacao'); });
              if (gCol && row[gCol]) { const val = textOnly(row[gCol]); if (val && isValidDiversityValue(val)) return val; }
              // 🔍 SCAN REVERSO para gênero
              const scanG = scanGeneroInRow(row);
              if (scanG) return scanG;
              // 👤 INFERÊNCIA POR NOME (responsável do grupo/espaço)
              const nomePessoa = row.responsavel || row.Responsável || row.responsavel_legal || nome || '';
              const inferred = inferGenderFromName(nomePessoa);
              if (inferred) return inferred;
              return '';
            })();
            const raca = textOnly(getFieldFromRow(row, 'raca', 'Raca', 'RACA', 'Raça', 'raça', 'raca_cor', 'Raça/Cor', 'RAÇA/COR', 'cor/raça', 'Cor/Raça', 'COR/RAÇA', 'etnia', 'Etnia', 'ETNIA', 'cor', 'Cor', 'COR', 'autodeclaracao', 'Autodeclaração', 'qual sua raça', 'qual a sua raça', 'Qual a sua cor ou raça', 'Como você se autodeclara quanto à cor', 'étnico-racial', 'etnico-racial')) || (() => {
              const rk = Object.keys(row);
              const rCol = rk.find(k => { if (isAttachmentColumn(k)) return false; const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return (cl.includes('raca') || (cl.includes('cor') && !cl.includes('corrente') && !cl.includes('correio') && !cl.includes('correspond')) || cl.includes('etnia') || cl.includes('autodeclaracao') || cl.includes('autodeclara')) && !cl.includes('orientacao') && !cl.includes('genero') && !cl.includes('eletronico') && !cl.includes('email'); });
              if (rCol && row[rCol]) { const val = textOnly(row[rCol]); if (val && isValidDiversityValue(val)) return val; }
              return scanRacaInRow(row);
            })();
            let racaFinalGE = raca;
            if (racaFinalGE && !isPlausibleRacaCorValue(racaFinalGE)) {
              const sr = scanRacaInRow(row);
              racaFinalGE = sr && isPlausibleRacaCorValue(sr) ? sr : '';
            }
            const orientacao_sexual = textOnly(getFieldFromRow(row, 'orientacao_sexual', 'Orientação Sexual', 'orientação sexual')) || scanOrientacaoInRow(row);
            // 📅 Idade: calcula a partir de data de nascimento
            const dataNascimentoRaw2 = getFieldFromRow(row, 'data_nascimento', 'Data de Nascimento', 'DATA DE NASCIMENTO', 'nascimento', 'Nascimento', 'data nascimento', 'dt_nascimento', 'dtNascimento', 'dataNascimento', 'data_nasc', 'dt_nasc', 'Qual a sua data de nascimento', 'Qual sua data de nascimento', 'Data de nascimento do proponente') || '';
            const idadeRaw2Extracted = getFieldFromRow(row, 'idade', 'Idade', 'IDADE', 'faixa_etaria', 'Faixa Etária', 'faixa etária', 'FAIXA ETÁRIA', 'qual sua idade', 'qual a sua idade', 'Qual a sua idade', 'Qual a sua faixa etária') || '';
            const idadeRaw2 = (() => {
              if (!idadeRaw2Extracted || isFaixaValorValue(idadeRaw2Extracted)) return '';
              const s = String(idadeRaw2Extracted).trim();
              if (!isIdadePlausivelRaw(s)) return '';
              return idadeRaw2Extracted;
            })();
            const idadeCalc2 = calcularIdade(dataNascimentoRaw2 ? String(dataNascimentoRaw2) : '') ?? calcularIdade(idadeRaw2 ? String(idadeRaw2) : '');
            let idade = idadeCalc2 !== null ? String(idadeCalc2) : (() => {
              if (!idadeRaw2) return '';
              const s = String(idadeRaw2).trim();
              if (!isIdadePlausivelRaw(s)) return '';
              return textOnly(idadeRaw2);
            })();
            let faixaEtaria = calcularFaixaEtaria(idadeCalc2);
            let dataNascFinal2 = dataNascimentoRaw2 ? String(dataNascimentoRaw2) : '';
            // 🔍 SCAN REVERSO para idade
            if (!idade) {
              const scanI = scanIdadeInRow(row, calcularIdade);
              if (scanI.idade) { idade = scanI.idade; const num = parseInt(scanI.idade); if (num > 0 && num < 130) faixaEtaria = calcularFaixaEtaria(num); }
              if (scanI.dataNascimento) { dataNascFinal2 = scanI.dataNascimento; const calc = calcularIdade(scanI.dataNascimento); if (calc !== null) { idade = String(calc); faixaEtaria = calcularFaixaEtaria(calc); } }
            }
            // ⚠️ Se ainda não tem idade após todos os scans, marca como "Não informado"
            if (!idade) idade = 'Não informado';
            const deficiencia = (() => {
              const d = textOnly(getFieldFromRow(row, 'deficiencia', 'Deficiência', 'deficiência', 'pcd', 'PcD', 'PCD')) || scanPcdInRow(row);
              if (!d) return '';
              const dLow = d.toLowerCase();
              if (dLow.includes('adulto') || dLow.includes('infantil') || dLow.includes('infanto') || dLow.includes('religioso') || dLow.includes('mulheres') || dLow.includes('povos') || /^\d+$/.test(d.trim()) || isFaixaValorValue(d)) return '';
              return d;
            })();
            const email = (() => { const ef = getFieldFromRow(row, 'email', 'Email', 'EMAIL', 'E-mail', 'e-mail', 'Endereço eletrônico', 'Correio Eletrônico'); if (ef) { if (isEmail(ef)) return String(ef).trim(); const ex = extractEmailFromText(ef); if (ex) return ex; } const rk = Object.keys(row); const eCol = rk.find(k => { const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return (cl.includes('email') || cl.includes('e-mail') || cl.includes('eletronico')) && !isAttachmentColumn(k); }); if (eCol && row[eCol]) { if (isEmail(row[eCol])) return String(row[eCol]).trim(); const ex = extractEmailFromText(row[eCol]); if (ex) return ex; } return ''; })();
            const telefone = (() => { const tf = getFieldFromRow(row, 'telefone', 'Telefone', 'TELEFONE', 'celular', 'Celular', 'whatsapp', 'WhatsApp', 'fone', 'contato'); if (tf) return String(tf).trim(); const rk = Object.keys(row); const tCol = rk.find(k => { const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return (cl.includes('telefone') || cl.includes('celular') || cl.includes('whatsapp')) && !isAttachmentColumn(k); }); return tCol ? String(row[tCol]).trim() : ''; })();
            const enderecoCompleto = extractEnderecoCompletoFromCadastroRow(row, bairro);
            const cpf_cnpj = getFieldFromRow(row, 'cpf_cnpj', 'CPF/CNPJ', 'cpf', 'cnpj', 'CPF', 'CNPJ', 'documento') || '';
            const responsavel = getFieldFromRow(row, 'responsavel', 'Responsável', 'RESPONSÁVEL', 'responsavel_legal', 'Responsável Legal') || '';
            const comunidadeTradicionalRaw = (() => {
              let v = getFieldFromRow(row,
                'comunidade_tradicional', 'comunidade tradicional', 'Comunidade Tradicional', 'comunidadeTradicional',
                'quilombola', 'caiçara', 'caicara', 'indigena', 'indígena',
                'pertence a comunidade tradicional', 'Pertence a Comunidade Tradicional',
                'Pertence à Comunidade Tradicional', 'pertence_comunidade', 'pertence comunidade',
                'Comunidade Tradicional de Ilhabela', 'comunidade tradicional ilhabela',
                'Pertence a alguma comunidade tradicional', 'pertence a alguma das comunidades'
              ) || '';
              if (v && (/^\d+$/.test(String(v).trim()) || isFaixaValorValue(v))) v = '';
              if (!v) { const rk = Object.keys(row); const comCol = rk.find(k => { const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return (cl.includes('comunidade') && (cl.includes('tradicional') || cl.includes('pertence'))) && !isAttachmentColumn(k); }); const cv = comCol ? String(row[comCol]).trim() : ''; v = (cv && !/^\d+$/.test(cv) && !isFaixaValorValue(cv)) ? cv : ''; }
              return v;
            })();
            
            let result: any = { ...row, nome, bairro, categoria, genero, raca: racaFinalGE, orientacao_sexual, idade, faixaEtaria, deficiencia, email, telefone, enderecoCompleto, cpf_cnpj, responsavel, comunidadeTradicional: '', eh_comunidade_tradicional: false, dataNascimento: dataNascFinal2 || '' };
            // 🔍 SCANNER UNIVERSAL: preenche campos que ficaram vazios
            const scanned = universalFieldScanner(row, NOMES_BAIRROS);
            if (!result.categoria && scanned.categoria) result.categoria = scanned.categoria;
            if (!result.email && scanned.email) result.email = scanned.email;
            if (!result.telefone && scanned.telefone) result.telefone = scanned.telefone;
            if (!result.genero && scanned.genero) result.genero = scanned.genero;
            if (result.genero && /apresenta/i.test(result.genero)) result.genero = '';
            if (!result.raca && scanned.raca && isPlausibleRacaCorValue(scanned.raca)) result.raca = scanned.raca;
            if (!result.idade && scanned.idade) result.idade = scanned.idade;
            if (!result.deficiencia && scanned.deficiencia) result.deficiencia = scanned.deficiencia;
            if (!result.enderecoCompleto && scanned.enderecoCompleto) result.enderecoCompleto = scanned.enderecoCompleto;
            if (!result.dataNascimento && scanned._dataNascimento) result.dataNascimento = scanned._dataNascimento;
            if (!result.bairro && scanned.bairro && !looksLikeEnderecoCompleto(scanned.bairro)) result.bairro = scanned.bairro;
            
            const comGERes = resolveComunidadeTradicional({
              rawField: comunidadeTradicionalRaw,
              bairro: result.bairro || '',
              enderecoCompleto: result.enderecoCompleto || '',
              extras: [result.nome],
            });
            result = { ...result, comunidadeTradicional: comGERes.nome, eh_comunidade_tradicional: comGERes.eh };
            
            // 📎 LINKS DE DOCUMENTOS: captura URLs de anexos (Google Forms, comprovantes, PDFs)
            const linksDocumentos: string[] = [];
            const rkGE = Object.keys(row);
            for (const k of rkGE) {
              const val = row[k];
              if (!val) continue;
              const valStr = String(val).trim();
              // Detecta URLs (https://, http://, www., ou contém .pdf/.doc/.jpg/.png)
              if (isUrl(val) || valStr.includes('.pdf') || valStr.includes('.doc') || valStr.includes('.jpg') || valStr.includes('.png') || valStr.includes('formfacade.com') || valStr.includes('drive.google.com')) {
                linksDocumentos.push(valStr);
              }
            }
            if (linksDocumentos.length > 0) result.linksDocumentos = linksDocumentos;
            
            const bcGE = canonicalBairroIlhabela(String(result.bairro || '').trim(), String(result.enderecoCompleto || '').trim());
            if (bcGE) result.bairro = bcGE;
            else if (looksLikeEnderecoCompleto(String(result.bairro || ''))) result.bairro = '';
            
            const coordsGrupoEspaco = resolveRecordCoords(result.bairro, result.enderecoCompleto || '', row.lat, row.lng);
            result = { ...result, lat: coordsGrupoEspaco.lat, lng: coordsGrupoEspaco.lng };
            return result;
          });
        }
        
        // 🎯 PROJETOS: Normaliza campos e separa por edital/ano
        if (dataType === 'projetos') {
          const editalLabel = (editalNome || '').trim();
          const anoLabel = parseInt(editalAno) || 0;

          if (!editalLabel) {
            setError('Informe o nome do edital antes de importar projetos. Cada edital é processado separadamente.');
            setLoading(false);
            if (event.target) event.target.value = '';
            return;
          }
          if (!anoLabel) {
            setError('Informe o ano do edital antes de importar projetos para manter a separação correta.');
            setLoading(false);
            if (event.target) event.target.value = '';
            return;
          }
          
          // Log amostra para debug - mostra TODAS as colunas para diagnóstico
          if (jsonData.length > 0) {
            const allCols = Object.keys(jsonData[0]);
            console.log('📋 [DEBUG] TODAS AS COLUNAS DA PLANILHA (' + allCols.length + ' colunas):', allCols);
            console.log('🔍 [DEBUG] Amostra da primeira linha (raw):', JSON.stringify(Object.entries(jsonData[0]).map(([k,v]) => [k, String(v).substring(0, 80)])));
            // Detectar colunas relevantes
            const bairroCol = allCols.find(k => k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('bairro'));
            const areaCol = allCols.find(k => { const c = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return c.includes('area') || c.includes('segmento') || c.includes('linguagem'); });
            const comCol = allCols.find(k => { const c = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return c.includes('comunidade') || c.includes('tradicional') || c.includes('pertence'); });
            const emailCol = allCols.find(k => { const c = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return c.includes('email') || c.includes('e-mail') || c.includes('eletronico'); });
            const telCol = allCols.find(k => { const c = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return c.includes('telefone') || c.includes('celular') || c.includes('whatsapp'); });
            const endCol = allCols.find(k => { const c = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return c.includes('endereco') && !c.includes('eletronico'); });
            const tipoCol = allCols.find(k => { const c = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return c.includes('tipo') && (c.includes('proponente') || c.includes('pessoa')); });
            console.log('🏘️ [DEBUG] Coluna BAIRRO detectada:', bairroCol || '❌ NÃO ENCONTRADA');
            console.log('📧 [DEBUG] Coluna EMAIL detectada:', emailCol || '❌ NÃO ENCONTRADA');
            console.log('📞 [DEBUG] Coluna TELEFONE detectada:', telCol || '❌ NÃO ENCONTRADA');
            console.log('🏠 [DEBUG] Coluna ENDEREÇO detectada:', endCol || '❌ NÃO ENCONTRADA');
            console.log('👤 [DEBUG] Coluna TIPO PESSOA detectada:', tipoCol || '❌ NÃO ENCONTRADA');
            console.log('🎨 [DEBUG] Coluna ÁREA ATUAÇÃO detectada:', areaCol || '❌ NÃO ENCONTRADA');
            console.log('🏛️ [DEBUG] Coluna COMUNIDADE TRAD. detectada:', comCol || '❌ NÃO ENCONTRADA');
            console.log('📋 [DEBUG] TODAS AS COLUNAS DA PLANILHA:', allCols);
            if (jsonData[0]) {
              console.log('📋 [DEBUG] VALORES DO 1º REGISTRO:', JSON.stringify(jsonData[0], null, 2));
            }
          }
          
          processedData = jsonData.map((row, rowIdx) => {
            const nome = getBestName(row);
            const nomeProjeto = getProjectName(row);
            if (rowIdx === 0) {
              console.log('🔍 [DEBUG] Primeiro registro - nome detectado:', nome, '| projeto:', nomeProjeto);
            }
            
            // 📧 E-MAIL: extrair separadamente (ANTES do bairro para não confundir)
            const email = (() => {
              // 1) Campo explícito de email
              const emailField = getFieldFromRow(row,
                'email', 'Email', 'EMAIL', 'E-mail', 'e-mail', 'e_mail',
                'emailProponente', 'email_proponente', 'Email do Proponente',
                'Endereço eletrônico', 'endereco eletronico',
                'Endereço eletrônico do proponente', 'endereco_eletronico',
                'Endereço Eletrônico do Proponente', 'correio eletronico',
                'Correio Eletrônico', 'E-mail do proponente', 'e-mail do proponente'
              );
              if (emailField) {
                if (isEmail(emailField)) return String(emailField).trim();
                const extracted = extractEmailFromText(emailField);
                if (extracted) return extracted;
              }
              
              // 2) Busca fuzzy por coluna com "email", "e-mail", "eletronico", "correio"
              const rk = Object.keys(row);
              const emailCol = rk.find(k => {
                const cleaned = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return (cleaned.includes('email') || cleaned.includes('e-mail') || cleaned.includes('e_mail') || 
                        cleaned.includes('eletronico') || cleaned.includes('eletronic') || 
                        cleaned.includes('correio')) && !isAttachmentColumn(k);
              });
              if (emailCol && row[emailCol]) {
                if (isEmail(row[emailCol])) return String(row[emailCol]).trim();
                const extracted = extractEmailFromText(row[emailCol]);
                if (extracted) return extracted;
              }
              
              // 3) Busca em qualquer campo que contenha formato de email
              for (const k of rk) {
                if (isAttachmentColumn(k)) continue;
                const val = row[k];
                if (!val) continue;
                if (isEmail(val)) return String(val).trim();
                // Também tenta extrair email de campos mistos (ex: "bairro - email@x.com")
                const extracted = extractEmailFromText(val);
                if (extracted) {
                  // Só usa se a coluna NÃO é claramente outro campo (nome, endereço, etc.)
                  const kLower = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                  if (!kLower.includes('nome') && !kLower.includes('proponente') && !kLower.includes('projeto')) {
                    return extracted;
                  }
                }
              }
              return '';
            })();
            if (rowIdx === 0) console.log('📧 [DEBUG] Email extraído do 1º registro:', email || '(vazio)');
            
            // 📞 TELEFONE
            const telefone = (() => {
              const telField = getFieldFromRow(row,
                'telefone', 'Telefone', 'TELEFONE', 'tel', 'celular', 'Celular',
                'whatsapp', 'WhatsApp', 'fone', 'Fone', 'contato', 'Contato'
              );
              if (telField) return String(telField).trim();
              const rk = Object.keys(row);
              const telCol = rk.find(k => {
                const cleaned = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return (cleaned.includes('telefone') || cleaned.includes('celular') || cleaned.includes('whatsapp') || cleaned.includes('fone')) && !isAttachmentColumn(k);
              });
              return telCol ? String(row[telCol]).trim() : '';
            })();
            
            // 🏠 ENDEREÇO COMPLETO DO PROPONENTE
            const enderecoCompleto = (() => {
              const rk = Object.keys(row);
              // Busca específica: "Endereço Completo do Proponente" ou variações
              const endCol = rk.find(k => {
                const cleaned = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return (cleaned.includes('endereco completo') || cleaned.includes('endereço completo') ||
                        (cleaned.includes('endereco') && cleaned.includes('proponente'))) && !isAttachmentColumn(k);
              });
              if (endCol && row[endCol] && !isEmail(row[endCol]) && !isUrl(row[endCol])) return String(row[endCol]).trim();
              
              // Busca genérica: coluna "endereço" que NÃO é email
              const endCol2 = rk.find(k => {
                const cleaned = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return (cleaned.includes('endereco') || cleaned.includes('endereço')) && !cleaned.includes('eletronico') && !isAttachmentColumn(k);
              });
              if (endCol2 && row[endCol2] && !isEmail(row[endCol2]) && !isUrl(row[endCol2])) return String(row[endCol2]).trim();
              return '';
            })();
            
            // 🏘️ BAIRRO: extrair do campo bairro OU do endereço completo — NUNCA aceitar emails
            const bairro = (() => {
              // 1) Campo direto "bairro"
              const bairroField = getFieldFromRow(row, 
                'bairro', 'Bairro', 'BAIRRO', 'localidade', 'Localidade',
                'Bairro onde reside', 'bairro onde reside', 'Bairro/Localidade'
              );
              if (bairroField && !isEmail(bairroField) && !isUrl(bairroField) && !isFaixaValorValue(bairroField)) return String(bairroField).trim();
              
              // 2) Busca fuzzy por coluna "bairro" (excluindo emails e faixa de valor)
              const rk = Object.keys(row);
              const bairroCol = rk.find(k => {
                const cleaned = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return cleaned.includes('bairro') && !cleaned.includes('faixa') && !cleaned.includes('valor') && !isAttachmentColumn(k);
              });
              if (bairroCol && row[bairroCol] && !isEmail(row[bairroCol]) && !isUrl(row[bairroCol]) && !isFaixaValorValue(row[bairroCol])) {
                return String(row[bairroCol]).trim();
              }
              
              // 3) Extrai bairro do endereço completo
              if (enderecoCompleto) {
                const fromEnd = extractBairroFromEndereco(enderecoCompleto);
                if (fromEnd) return fromEnd;
              }
              
              // 4) Campos de local/região (NÃO endereço genérico pois pode ser email)
              const localField = getFieldFromRow(row, 'local', 'Local de realização', 'local de realizacao', 'regiao', 'Região');
              if (localField && !isEmail(localField) && !isUrl(localField)) return String(localField).trim();
              
              return '';
            })();
            
            // 👤 TIPO PESSOA (PF/PJ)
            const tipoPessoa = detectTipoPessoa(row);
            
            const categoriaRaw = getFieldFromRow(row,
              'categoria', 'Categoria', 'CATEGORIA',
              'linguagem', 'Linguagem', 'LINGUAGEM',
              'area', 'Area', 'ÁREA', 'Área'
            ) || '';
            const categoria = isFaixaValorValue(categoriaRaw) ? '' : categoriaRaw;
            
            // 🎨 NORMALIZAÇÃO DE CAMPOS DE DIVERSIDADE (projetos)
            // Usa textOnly + isValidDiversityValue para evitar capturar dados bancários/financeiros
            const generoRaw = textOnly(getFieldFromRow(row,
              'genero', 'Genero', 'GENERO', 'Gênero', 'gênero', 'sexo', 'Sexo', 'SEXO',
              'identidade_genero', 'identidade de gênero', 'Identidade de Gênero',
              'genero_identidade', 'qual seu gênero', 'qual seu genero',
              'Gênero:', 'Sexo:', 'genero;', 'Genero;', 'sexo;', 'Sexo;'
            )) || (() => {
              const rk = Object.keys(row);
              const gCol = rk.find(k => { if (isAttachmentColumn(k)) return false; const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return (cl.includes('genero') || cl.includes('sexo') || cl.includes('identidade de genero')) && !cl.includes('orientacao'); });
              if (gCol && row[gCol]) { const val = textOnly(row[gCol]); if (val && isValidDiversityValue(val)) return val; }
              // 🔍 SCAN REVERSO para gênero
              const scanG = scanGeneroInRow(row);
              if (scanG) return scanG;
              // 👤 INFERÊNCIA POR NOME do proponente (~95% acerto para nomes brasileiros)
              const nomePessoa = nome || row.proponente || row.Proponente || row['Nome do Proponente;'] || '';
              return inferGenderFromName(nomePessoa);
            })();
            const genero = isValidDiversityValue(generoRaw) ? generoRaw : (generoRaw || '');
            
            const racaRaw = textOnly(getFieldFromRow(row,
              'raca', 'Raca', 'RACA', 'Raça', 'raça', 'raca_cor', 'raça/cor', 'Raça/Cor', 'RAÇA/COR',
              'cor/raça', 'Cor/Raça', 'COR/RAÇA', 'cor', 'Cor', 'COR',
              'etnia', 'Etnia', 'ETNIA', 'autodeclaracao', 'Autodeclaração', 'autodeclaração', 'raca_etnia',
              'qual sua raça', 'qual sua raca', 'qual a sua raça', 'qual a sua raca',
              'como voce se autodeclara', 'como você se autodeclara',
              'Qual a sua cor ou raça', 'qual a sua cor ou raca',
              'Como você se autodeclara quanto à cor', 'como voce se autodeclara quanto a cor',
              'étnico-racial', 'etnico-racial'
            )) || (() => {
              const rk = Object.keys(row);
              const rCol = rk.find(k => { if (isAttachmentColumn(k)) return false; const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return (cl.includes('raca') || (cl.includes('cor') && !cl.includes('corrente') && !cl.includes('correio') && !cl.includes('correspond')) || cl.includes('etnia') || cl.includes('autodeclaracao') || cl.includes('autodeclara')) && !cl.includes('orientacao') && !cl.includes('genero') && !cl.includes('eletronico') && !cl.includes('email'); });
              if (rCol && row[rCol]) { const val = textOnly(row[rCol]); if (val && isValidDiversityValue(val)) return val; }
              return scanRacaInRow(row);
            })();
            const raca = isValidDiversityValue(racaRaw) ? racaRaw : '';
            
            const oriRaw = textOnly(getFieldFromRow(row,
              'orientacao_sexual', 'orientação_sexual', 'Orientação Sexual', 'orientação sexual',
              'ORIENTAÇÃO SEXUAL', 'sexualidade', 'Sexualidade',
              'qual sua orientação sexual', 'qual sua orientacao sexual'
            )) || scanOrientacaoInRow(row);
            const orientacao_sexual = isValidDiversityValue(oriRaw) ? oriRaw : '';
            
            const idadeRawP = (() => {
              const raw = textOnly(getFieldFromRow(row,
                'idade', 'Idade', 'IDADE',
                'data_nascimento', 'Data de Nascimento', 'nascimento', 'Nascimento',
                'qual sua idade'
              ));
              if (!raw) return '';
              // Rejeita se capturou faixa de valor monetário
              if (isFaixaValorValue(raw)) return '';
              // Rejeita texto que claramente não é idade/data (não começa com dígito e não tem keywords)
              const rawStr = String(raw).trim();
              if (!/^\d/.test(rawStr) && !rawStr.toLowerCase().includes('anos') && !rawStr.toLowerCase().includes('jovem')) return '';
              return raw;
            })();
            const idadeCalcP = calcularIdade(idadeRawP);
            let idade = idadeCalcP !== null && idadeCalcP > 0 && idadeCalcP < 130 ? String(idadeCalcP) : (isValidDiversityValue(idadeRawP) && !isFaixaValorValue(idadeRawP) && !(/^\d+$/.test(String(idadeRawP).trim()) && parseInt(String(idadeRawP)) >= 130) ? idadeRawP : '');
            // 🔍 SCAN REVERSO para idade (projetos)
            if (!idade) {
              const scanI = scanIdadeInRow(row, calcularIdade);
              if (scanI.idade) { idade = scanI.idade; }
              if (scanI.dataNascimento) { const calc = calcularIdade(scanI.dataNascimento); if (calc !== null && calc > 0 && calc < 130) idade = String(calc); }
            }
            // ⚠️ Se ainda não tem idade após todos os scans, marca como "Não informado"
            if (!idade) idade = 'Não informado';
            
            const defRaw = textOnly(getFieldFromRow(row,
              'deficiencia', 'Deficiência', 'deficiência', 'DEFICIÊNCIA', 'pcd', 'PCD', 'PcD',
              'pessoa_com_deficiencia', 'pessoa com deficiência', 'Pessoa com Deficiência',
              'possui deficiência', 'possui deficiencia', 'é pessoa com deficiência',
              'e pessoa com deficiencia', 'necessidades especiais'
            )) || scanPcdInRow(row);
            const deficiencia = (() => {
              if (!defRaw || !isValidDiversityValue(defRaw)) return '';
              const dLow = defRaw.toLowerCase();
              if (dLow.includes('adulto') || dLow.includes('infantil') || dLow.includes('infanto') || dLow.includes('religioso') || dLow.includes('mulheres') || dLow.includes('povos') || /^\d+$/.test(defRaw.trim()) || isFaixaValorValue(defRaw)) return '';
              return defRaw;
            })();
            
            const cpfCnpj = getFieldFromRow(row,
              'cpf_cnpj', 'CPF/CNPJ', 'cpf', 'cnpj', 'CPF', 'CNPJ',
              'cpfCnpj', 'Cpf_cnpj', 'documento', 'Documento'
            ) || '';
            
            const status = getFieldFromRow(row,
              'status', 'Status', 'STATUS', 'situacao', 'Situação', 'SITUAÇÃO',
              'resultado', 'Resultado', 'RESULTADO'
            ) || '';
            
            // 🎨 Área de atuação/linguagem artística (ANTES de valor pois pode conter info de faixa)
            // Inclui "Qual a linguagem artística escolhida?" que pode ter "Faixa X"
            const areaAtuacaoRaw = getFieldFromRow(row,
              'area_atuacao', 'Área de Atuação', 'ÁREA DE ATUAÇÃO', 'area de atuacao',
              'Area de Atuacao', 'areaAtuacao', 'Área de atuação',
              'segmento', 'Segmento', 'SEGMENTO', 'linguagem_artistica',
              'Linguagem Artística', 'linguagem artistica', 'linguagem',
              'Linguagem', 'LINGUAGEM', 'modalidade', 'Modalidade',
              'Segmento cultural', 'segmento cultural', 'Área cultural',
              'Qual sua área de atuação', 'Qual a sua área de atuação',
              'Qual a linguagem artística escolhida', 'qual a linguagem artística escolhida',
              'Qual a linguagem artistica escolhida', 'qual a linguagem artistica escolhida',
              'Área de atuação cultural', 'categoria artistica', 'Categoria Artística'
            ) || (() => {
              const rk = Object.keys(row);
              const areaCol = rk.find(k => {
                const cleaned = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return (cleaned.includes('area de atuacao') || cleaned.includes('area cultural') ||
                        cleaned.includes('segmento') || cleaned.includes('linguagem artistica') ||
                        cleaned.includes('linguagem') || cleaned.includes('modalidade') ||
                        (cleaned.includes('area') && cleaned.includes('atuacao'))) && !isAttachmentColumn(k);
              });
              return areaCol ? row[areaCol] : '';
            })();
            
            const valorRaw = getFieldFromRow(row,
              'valor', 'Valor', 'VALOR', 'value', 'Valor (R$)', 'valor_aprovado', 'premio',
              'Prêmio', 'PRÊMIO', 'Valor do Prêmio', 'valor_premio'
            );
            let valor = parseBRLField(valorRaw);
            
            const faixa = getFieldFromRow(row,
              'faixa', 'Faixa', 'FAIXA', 'faixa_valor', 'Faixa de Valor', 'faixaValor',
              'Faixa de valores', 'faixa de valores',
              'Qual a faixa de valor escolhida', 'qual a faixa de valor escolhida'
            ) || (() => {
              const rk = Object.keys(row);
              const faixaCol = rk.find(k => {
                const cleaned = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return cleaned.includes('faixa') && !isAttachmentColumn(k);
              });
              return faixaCol ? row[faixaCol] : '';
            })();
            
            // 💰 EXTRAÇÃO DE VALOR POR FAIXA: se valor não encontrado mas há faixa, extrai valor da faixa
            // Também verifica campo de linguagem artística que pode conter informação de faixa
            if (!valor || valor === 0) {
              // 1) Tenta extrair de campo de faixa explícito
              if (faixa) {
                const valorFaixa = extractValorFromFaixa(faixa);
                if (valorFaixa > 0) valor = valorFaixa;
              }
              
              // 2) Tenta extrair de campo de linguagem artística (pode conter "Faixa X")
              if ((!valor || valor === 0) && areaAtuacaoRaw) {
                const valorLinguagem = extractValorFromFaixa(areaAtuacaoRaw);
                if (valorLinguagem > 0) valor = valorLinguagem;
              }
              
              // 3) Busca em TODAS as colunas por menção de "Faixa X"
              if (!valor || valor === 0) {
                const rk = Object.keys(row);
                for (const k of rk) {
                  if (isAttachmentColumn(k)) continue;
                  const val = row[k];
                  if (!val) continue;
                  const valorCol = extractValorFromFaixa(val);
                  if (valorCol > 0) {
                    valor = valorCol;
                    break;
                  }
                }
              }
            }
            
            // 🎨 Área de atuação final (limpa de faixa de valor se contaminou)
            const areaAtuacao = isFaixaValorValue(areaAtuacaoRaw) ? '' : areaAtuacaoRaw;
            
            // Comunidade Tradicional (rejeita valores numéricos E faixa de valor monetário)
            const comunidadeTradicional = (() => {
              let v = getFieldFromRow(row,
                'comunidadeTradicional', 'comunidade_tradicional', 'Comunidade Tradicional',
                'comunidade tradicional', 'COMUNIDADE TRADICIONAL', 'povo_tradicional',
                'Povo Tradicional',
                'pertence a comunidade tradicional', 'Pertence a Comunidade Tradicional',
                'Pertence à Comunidade Tradicional', 'pertence_comunidade', 'pertence comunidade',
                'Comunidade Tradicional de Ilhabela', 'comunidade tradicional ilhabela',
                'Pertence a alguma comunidade tradicional', 'pertence a alguma das comunidades'
              ) || '';
              if (v && (/^\d+$/.test(String(v).trim()) || isFaixaValorValue(v))) v = '';
              if (!v) {
                const rk = Object.keys(row);
                const comCol = rk.find(k => {
                  const cleaned = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                  return (cleaned.includes('comunidade') && (cleaned.includes('tradicional') || cleaned.includes('pertence'))) && !isAttachmentColumn(k);
                });
                const cv = comCol ? String(row[comCol]).trim() : '';
                v = (cv && !/^\d+$/.test(cv) && !isFaixaValorValue(cv)) ? cv : '';
              }
              return v;
            })();
            
            const editalFromRow = getFieldFromRow(row,
              'edital', 'Edital', 'EDITAL', 'editalNome', 'nome_edital', 'Nome do Edital'
            ) || '';
            
            const anoFromRow = getFieldFromRow(row, 'ano', 'Ano', 'ANO') || '';
            
            let lat = Number(row.lat) || 0;
            let lng = Number(row.lng) || 0;
            
            // 🔍 SCANNER UNIVERSAL: preenche campos que ficaram vazios
            const scanned = universalFieldScanner(row, NOMES_BAIRROS);
            const finalBairro = bairro || scanned.bairro || '';
            const finalCategoria = categoria || scanned.categoria || '';
            const finalEmail = email || scanned.email || '';
            const finalTelefone = telefone || scanned.telefone || '';
            const finalGenero = genero || scanned.genero || '';
            const finalRaca = raca || scanned.raca || '';
            const finalIdade = idade || scanned.idade || '';
            const finalDeficiencia = deficiencia || scanned.deficiencia || '';
            const finalEndereco = enderecoCompleto || scanned.enderecoCompleto || '';
            
            const comResolvido = resolveComunidadeTradicional({
              rawField: comunidadeTradicional,
              bairro: finalBairro,
              enderecoCompleto: finalEndereco,
              extras: [nomeProjeto, nome],
            });
            
            if (rowIdx === 0) {
              console.log('🏘️ [DEBUG] 1ª linha - BAIRRO extraído:', JSON.stringify(bairro), '| final:', JSON.stringify(finalBairro));
              console.log('📧 [DEBUG] 1ª linha - EMAIL extraído:', JSON.stringify(email));
              console.log('📞 [DEBUG] 1ª linha - TELEFONE extraído:', JSON.stringify(telefone));
              console.log('🏠 [DEBUG] 1ª linha - ENDEREÇO COMPLETO:', JSON.stringify(enderecoCompleto), '| final:', JSON.stringify(finalEndereco));
              console.log('👤 [DEBUG] 1ª linha - TIPO PESSOA:', JSON.stringify(tipoPessoa));
              console.log('🎨 [DEBUG] 1ª linha - ÁREA ATUAÇÃO RAW:', JSON.stringify(areaAtuacaoRaw));
              console.log('🎨 [DEBUG] 1ª linha - ÁREA ATUAÇÃO (limpa):', JSON.stringify(areaAtuacao));
              console.log('🏛️ [DEBUG] 1ª linha - COMUNIDADE (planilha):', JSON.stringify(comunidadeTradicional), '→ resolvida:', JSON.stringify(comResolvido));
              console.log('🎭 [DEBUG] 1ª linha - DIVERSIDADE:', { genero, raca, orientacao_sexual, idade, deficiencia });
              console.log('💰 [DEBUG] 1ª linha - FAIXA:', JSON.stringify(faixa));
              console.log('💰 [DEBUG] 1ª linha - VALOR RAW:', JSON.stringify(valorRaw), '| VALOR FINAL:', valor);
              console.log('💰 [DEBUG] 1ª linha - Valor extraído de faixa?', extractValorFromFaixa(faixa), '| de area?', extractValorFromFaixa(areaAtuacaoRaw));
            }
            
            // Recalcula GPS com validação de coordenadas reais de Ilhabela
            const resolvedProjetoCoords = resolveRecordCoords(finalBairro, finalEndereco, lat, lng);
            lat = resolvedProjetoCoords.lat;
            lng = resolvedProjetoCoords.lng;
            
            // 📎 LINKS DE DOCUMENTOS: captura URLs de anexos (Google Forms, comprovantes, PDFs)
            const linksDocumentos: string[] = [];
            const rk = Object.keys(row);
            for (const k of rk) {
              const val = row[k];
              if (!val) continue;
              const valStr = String(val).trim();
              // Detecta URLs (https://, http://, www., ou contém .pdf/.doc/.jpg/.png)
              if (isUrl(val) || valStr.includes('.pdf') || valStr.includes('.doc') || valStr.includes('.jpg') || valStr.includes('.png') || valStr.includes('formfacade.com') || valStr.includes('drive.google.com')) {
                linksDocumentos.push(valStr);
              }
            }
            
            return {
              ...row,
              proponente: nome,
              nome: nome,
              nomeProjeto: nomeProjeto,
              tipoPessoa: tipoPessoa,
              email: finalEmail,
              telefone: finalTelefone,
              enderecoCompleto: finalEndereco,
              bairro: finalBairro,
              categoria: finalCategoria,
              cpf_cnpj: cpfCnpj,
              status: status,
              valor: valor,
              _valorRaw: valorRaw ? String(valorRaw) : '',
              faixa: faixa,
              faixaValor: isFaixaValorValue(faixa) ? String(faixa) : '',
              areaAtuacao: areaAtuacao || finalCategoria,
              genero: finalGenero, raca: finalRaca, orientacao_sexual, idade: finalIdade, deficiencia: finalDeficiencia,
              comunidadeTradicional: comResolvido.nome,
              eh_comunidade_tradicional: comResolvido.eh,
              edital: editalFromRow || editalLabel,
              ano: parseInt(anoFromRow) || anoLabel,
              lat, lng,
              linksDocumentos: linksDocumentos.length > 0 ? linksDocumentos : undefined,
              _editalOrigem: editalLabel,
              _anoOrigem: anoLabel,
              _importadoEm: new Date().toISOString()
            };
          });
          
          // 🎯 SEPARAÇÃO POR EDITAL/ANO: substitui somente o lote do edital atual
          const existentes = parsedData.projetos?.length ? parsedData.projetos : (parsedData as any).editais || [];
          const normalizeText = (v: any) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const isMesmoEditalAno = (p: any) => {
            const nome = normalizeText(p._editalOrigem || p.edital || p.Edital || '');
            const ano = Number(p._anoOrigem || p.ano || p.Ano || 0);
            return nome === normalizeText(editalLabel) && ano === Number(anoLabel);
          };

          const outrosEditais = existentes.filter(p => !isMesmoEditalAno(p));
          const substituidos = existentes.length - outrosEditais.length;
          console.log(`📥 Importando ${processedData.length} projetos para "${editalLabel}" (${anoLabel}). Substituindo ${substituidos} registro(s) deste mesmo edital/ano.`);
          
          const combinados = [...outrosEditais, ...processedData];
          
          // Auto-deduplicação na importação
          const seen = new Set<string>();
          const dedupados: any[] = [];
          for (const p of combinados) {
            const chave = gerarChaveDedupe(p);
            if (!seen.has(chave)) {
              seen.add(chave);
              dedupados.push(p);
            }
          }
          const dupRemovidas = combinados.length - dedupados.length;
          if (dupRemovidas > 0) {
            console.log(`🔄 ${dupRemovidas} duplicatas removidas automaticamente na importação`);
          }
          setLastImportDuplicatesRemoved(dupRemovidas);
          
          const newParsedAfterProjetos: ParsedData = { ...parsedData, projetos: dedupados };
          setParsedData(newParsedAfterProjetos);
          void persistData(newParsedAfterProjetos);
          
          setSuccess(true);
          setError('');
          setTimeout(() => setSuccess(false), 3000);
          setLoading(false);
          if (event.target) event.target.value = '';
          return; // Sai aqui pois já tratamos o setParsedData
        }
        
        const newParsedAfterImport: ParsedData = { ...parsedData, [dataType]: processedData } as ParsedData;
        setParsedData(newParsedAfterImport);
        void persistData(newParsedAfterImport);
        
        setSuccess(true);
        setError('');
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        console.error('❌ Erro:', err);
        setError(`Erro ao processar arquivo: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      } finally {
        setLoading(false);
        if (event.target) event.target.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Função para recalcular GPS de todos os registros
  const recalcularGPS = () => {
    const colecoes = ['agentes', 'grupos', 'espacos', 'mapeamento', 'projetos'] as const;
    const totalRegistros = colecoes.reduce((acc, key) => acc + (parsedData[key]?.length || 0), 0);
    if (totalRegistros === 0) {
      alert('❌ Nenhum cadastro importado para verificar coordenadas!');
      return;
    }

    let atualizados = 0;
    const newPD = { ...parsedData };

    for (const key of colecoes) {
      const rows = parsedData[key];
      if (!rows || rows.length === 0) continue;
      newPD[key] = rows.map((item: any) => {
        const bairro = String(item.bairro || item.Bairro || '').trim();
        const endereco = String(item.enderecoCompleto || item.endereco || item.Endereco || '').trim();
        const coords = resolveRecordCoords(bairro, endereco, item.lat, item.lng);
        const oldLat = Number(item.lat) || 0;
        const oldLng = Number(item.lng) || 0;
        if (oldLat !== coords.lat || oldLng !== coords.lng) atualizados++;
        return { ...item, lat: coords.lat, lng: coords.lng };
      });
    }

    setParsedData(newPD);
    persistData(newPD);

    alert(`✅ Coordenadas verificadas em ${totalRegistros} cadastros. ${atualizados} registro(s) foram corrigidos.`);
  };

  // 🔄 REPROCESSAR DADOS: Normaliza campos de diversidade/contato em dados já importados
  const reprocessarDados = () => {
    let totalReprocessed = 0;
    const newPD = { ...parsedData };
    
    // 🔍 DIAGNÓSTICO: Mostra colunas raw disponíveis para cada tabela
    const logDiag = (tabName: string, items: any[] | undefined) => {
      if (!items || items.length === 0) return;
      const sample = items[0];
      const allKeys = Object.keys(sample);
      const rawCols = allKeys.filter(k => k !== k.toLowerCase() || k.includes(' ') || k.includes(';') || k.includes(':') || k.includes('?'));
      const normCols = allKeys.filter(k => !rawCols.includes(k));
      console.log(`📊 [DIAG ${tabName}] ${items.length} registros`);
      console.log(`   Colunas normalizadas: ${normCols.join(', ')}`);
      console.log(`   Colunas raw: ${rawCols.join(', ')}`);
      // Mostra valores do 1º registro para campos de diversidade
      const diversityKeys = allKeys.filter(k => {
        const cl = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return cl.includes('genero') || cl.includes('sexo') || cl.includes('raca') || cl.includes('cor') || 
               cl.includes('etnia') || cl.includes('idade') || cl.includes('nascimento') || 
               cl.includes('deficiencia') || cl.includes('pcd') || cl.includes('orientacao') ||
               cl.includes('autodeclar') || cl.includes('identifica');
      });
      if (diversityKeys.length > 0) {
        console.log(`   🎨 Colunas de diversidade encontradas:`);
        diversityKeys.forEach(k => console.log(`      "${k}" = "${sample[k]}"`));
      } else {
        console.log(`   ⚠️ NENHUMA coluna de diversidade encontrada nas colunas raw!`);
        // Mostra TODOS os valores não-vazios para ajudar diagnóstico
        console.log(`   📝 Valores não-vazios do 1º registro:`);
        allKeys.forEach(k => {
          const v = sample[k];
          if (v && String(v).trim() !== '' && String(v).length < 100) console.log(`      "${k}" = "${v}"`);
        });
      }
    };
    logDiag('Agentes', newPD.agentes);
    logDiag('Grupos', newPD.grupos);
    logDiag('Espaços', newPD.espacos);
    logDiag('Mapeamento', newPD.mapeamento);
    logDiag('Projetos', newPD.projetos);
    
    const reprocessItem = (item: any): any => {
      const updated = { ...item };
      
      // 🧹 LIMPEZA PRÉVIA: Detecta e limpa campos contaminados com "Faixa de Valor" monetário
      if (isFaixaValorValue(updated.bairro)) {
        console.log('🧹 [LIMPEZA] Bairro contaminado com faixa de valor:', updated.bairro, '��� limpando');
        updated.bairro = '';
      }
      if (isFaixaValorValue(updated.areaAtuacao)) {
        console.log('🧹 [LIMPEZA] ÁreaAtuação contaminada com faixa de valor:', updated.areaAtuacao, '→ limpando');
        updated.areaAtuacao = '';
      }
      if (isFaixaValorValue(updated.categoria)) {
        updated.categoria = '';
      }
      if (isFaixaValorValue(updated.genero)) updated.genero = '';
      if (isFaixaValorValue(updated.raca)) updated.raca = '';
      if (isFaixaValorValue(updated.idade)) updated.idade = '';
      if (isFaixaValorValue(updated.deficiencia)) updated.deficiencia = '';
      if (isFaixaValorValue(updated.orientacao_sexual)) updated.orientacao_sexual = '';
      
      // 🏘️ Re-extrair BAIRRO se vazio (após limpeza ou nunca preenchido)
      if (!updated.bairro) {
        // Busca na coluna original raw "Bairro onde reside" ou similar
        const rk = Object.keys(item);
        const bairroCol = rk.find(k => {
          const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return cl.includes('bairro') && !cl.includes('faixa') && !cl.includes('valor') && !isAttachmentColumn(k);
        });
        if (bairroCol && item[bairroCol] && !isEmail(item[bairroCol]) && !isUrl(item[bairroCol]) && !isFaixaValorValue(item[bairroCol])) {
          updated.bairro = String(item[bairroCol]).trim();
        }
        // Tenta extrair do endereço completo
        if (!updated.bairro && updated.enderecoCompleto) {
          const fromEnd = extractBairroFromEndereco(updated.enderecoCompleto);
          if (fromEnd) updated.bairro = fromEnd;
        }
        // Tenta da coluna de endereço raw
        if (!updated.bairro) {
          const endCol = rk.find(k => {
            const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return (cl.includes('endereco completo') || cl.includes('endereço completo')) && !isAttachmentColumn(k);
          });
          if (endCol && item[endCol] && !isEmail(item[endCol]) && !isUrl(item[endCol])) {
            const fromEnd = extractBairroFromEndereco(String(item[endCol]));
            if (fromEnd) updated.bairro = fromEnd;
          }
        }
      }
      
      // 🎯 Re-extrair ÁREA DE ATUAÇÃO se vazia (após limpeza)
      if (!updated.areaAtuacao && !updated.categoria) {
        const a = getFieldFromRow(item, 'area_atuacao', 'Área de Atuação', 'segmento', 'Segmento', 'linguagem', 'Linguagem', 'Linguagem Artística', 'modalidade', 'Modalidade', 'categoria', 'Categoria');
        if (a && !isFaixaValorValue(a)) {
          updated.areaAtuacao = String(a);
          updated.categoria = String(a);
        }
        // Busca direta por header de área/segmento/linguagem
        if (!updated.areaAtuacao) {
          const rk = Object.keys(item);
          const aCol = rk.find(k => {
            const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return (cl.includes('area de atuacao') || cl.includes('segmento') || cl.includes('linguagem') || cl.includes('modalidade')) && !cl.includes('faixa') && !cl.includes('valor') && !isAttachmentColumn(k);
          });
          if (aCol && item[aCol] && !isFaixaValorValue(item[aCol])) {
            updated.areaAtuacao = String(item[aCol]).trim();
            updated.categoria = String(item[aCol]).trim();
          }
        }
      }
      
      // 🎯 Salvar faixa de valor no campo correto
      if (!updated.faixaValor) {
        const rk = Object.keys(item);
        const fxCol = rk.find(k => {
          const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return (cl.includes('faixa') && (cl.includes('valor') || cl.includes('escolhida'))) || cl === 'faixa';
        });
        if (fxCol && item[fxCol]) updated.faixaValor = String(item[fxCol]).trim();
        // Buscar em campo "faixa" que contenha R$
        if (!updated.faixaValor && item.faixa && isFaixaValorValue(item.faixa)) {
          updated.faixaValor = String(item.faixa);
        }
      }
      
      if (!updated.email) {
        const ef = getFieldFromRow(item, 'email', 'Email', 'EMAIL', 'E-mail', 'e-mail', 'e_mail', 'Endereço eletrônico', 'endereco eletronico', 'Correio Eletrônico');
        if (ef) { if (isEmail(ef)) updated.email = String(ef).trim(); else { const ex = extractEmailFromText(ef); if (ex) updated.email = ex; } }
        if (!updated.email) { const rk = Object.keys(item); const eCol = rk.find(k => { const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return (cl.includes('email') || cl.includes('e-mail') || cl.includes('eletronico') || cl.includes('correio')) && !isAttachmentColumn(k); }); if (eCol && item[eCol]) { if (isEmail(item[eCol])) updated.email = String(item[eCol]).trim(); else { const ex = extractEmailFromText(item[eCol]); if (ex) updated.email = ex; } } }
      }
      if (!updated.telefone) {
        const tf = getFieldFromRow(item, 'telefone', 'Telefone', 'TELEFONE', 'tel', 'celular', 'Celular', 'whatsapp', 'WhatsApp', 'fone', 'Fone', 'contato', 'Contato');
        if (tf) updated.telefone = String(tf).trim();
        if (!updated.telefone) { const rk = Object.keys(item); const tCol = rk.find(k => { const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return (cl.includes('telefone') || cl.includes('celular') || cl.includes('whatsapp') || cl.includes('fone')) && !isAttachmentColumn(k); }); if (tCol && item[tCol]) updated.telefone = String(item[tCol]).trim(); }
      }
      if (!updated.enderecoCompleto) {
        // 1) getFieldFromRow com variações explícitas
        const endField = getFieldFromRow(item,
          'endereco', 'Endereço', 'ENDEREÇO', 'endereço', 'endereco_completo',
          'Endereço Completo', 'endereço completo', 'Endereço completo',
          'Qual o seu endereço', 'qual o seu endereco',
          'Qual seu endereço', 'qual seu endereco',
          'Endereço do Proponente', 'endereco do proponente',
          'Endereço residencial', 'endereco residencial',
          'Onde você mora', 'onde voce mora',
          'logradouro', 'Logradouro', 'enderecoCompleto'
        );
        if (endField && !isEmail(endField) && !isUrl(endField) && String(endField).trim().length > 3) {
          updated.enderecoCompleto = String(endField).trim();
        }
        // 2) Fallback fuzzy
        if (!updated.enderecoCompleto) {
          const rk = Object.keys(item);
          const endCol = rk.find(k => { const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return (cl.includes('endereco') || cl.includes('logradouro') || (cl.includes('onde') && cl.includes('mora'))) && !cl.includes('eletronico') && !cl.includes('email') && !isAttachmentColumn(k); });
          if (endCol && item[endCol] && !isEmail(item[endCol]) && !isUrl(item[endCol])) updated.enderecoCompleto = String(item[endCol]).trim();
        }
      }
      if (!updated.cpf_cnpj) { const cpf = getFieldFromRow(item, 'cpf_cnpj', 'CPF/CNPJ', 'cpf', 'cnpj', 'CPF', 'CNPJ', 'cpfCnpj', 'documento', 'Documento'); if (cpf) updated.cpf_cnpj = String(cpf); }
      // 🧹 LIMPEZA AGRESSIVA: remove valores inválidos de campos de diversidade
      if (updated.genero && (!isValidDiversityValue(updated.genero) || /^\d+$/.test(String(updated.genero).trim()) || isFaixaValorValue(updated.genero))) updated.genero = '';
      if (updated.genero && /apresenta/i.test(String(updated.genero))) updated.genero = '';
      if (updated.raca && (!isValidDiversityValue(updated.raca) || /^\d+$/.test(String(updated.raca).trim()) || isFaixaValorValue(updated.raca))) updated.raca = '';
      if (updated.raca && !isPlausibleRacaCorValue(String(updated.raca))) updated.raca = '';
      if (updated.deficiencia && (!isValidDiversityValue(updated.deficiencia) || /^\d+$/.test(String(updated.deficiencia).trim()) || isFaixaValorValue(updated.deficiencia))) updated.deficiencia = '';
      if (updated.orientacao_sexual && (!isValidDiversityValue(updated.orientacao_sexual) || /^\d+$/.test(String(updated.orientacao_sexual).trim()) || isFaixaValorValue(updated.orientacao_sexual))) updated.orientacao_sexual = '';
      if (updated.idade && /^\d+$/.test(String(updated.idade).trim()) && parseInt(updated.idade) >= 130) updated.idade = '';
      if (updated.idade && !isValidDiversityValue(updated.idade) && !/^\d+$/.test(String(updated.idade).trim())) updated.idade = '';
      if (updated.idade && isFaixaValorValue(updated.idade)) updated.idade = '';
      // CORREÇÃO: rejeita idade que é texto não-numérico e não-data (ex: "Canto do Ribeirão" vindo de comunidade)
      if (updated.idade) {
        const idadeTrim = String(updated.idade).trim();
        const isNumeric = /^\d{1,3}$/.test(idadeTrim);
        const isDatePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(idadeTrim) || /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(idadeTrim);
        const isFaixaEtaria = /\d+\s*(a|anos|à)\s*\d*/.test(idadeTrim) || idadeTrim.toLowerCase().includes('anos') || idadeTrim.toLowerCase().includes('jovem');
        const isSerialDate = /^\d{5}$/.test(idadeTrim);
        if (!isNumeric && !isDatePattern && !isFaixaEtaria && !isSerialDate) updated.idade = '';
      }
      // CORREÇÃO: rejeita comunidade e PcD com valores contaminados
      if (updated.comunidadeTradicional && isFaixaValorValue(updated.comunidadeTradicional)) updated.comunidadeTradicional = '';
      if (updated.deficiencia) {
        const dLow = updated.deficiencia.toLowerCase();
        if (isFaixaValorValue(updated.deficiencia) || dLow.includes('adulto') || dLow.includes('infantil') || dLow.includes('infanto')) updated.deficiencia = '';
      }
      // 🔄 FORÇA re-extração: sempre tenta re-extrair de colunas RAW (pula chaves normalizadas vazias)
      if (!updated.genero) {
        const g = textOnly(getFieldFromRow(item, 'genero', 'Genero', 'GENERO', 'Gênero', 'gênero', 'sexo', 'Sexo', 'SEXO', 
          'identidade_genero', 'identidade de gênero', 'Identidade de Gênero', 'qual seu gênero', 'qual seu genero', 
          'Gênero:', 'Sexo:', 'genero;', 'sexo;',
          'como você se identifica', 'como voce se identifica', 'identidade de genero',
          'gênero/identidade', 'Qual o seu gênero', 'Qual seu sexo'));
        if (g && isValidDiversityValue(g) && !isFaixaValorValue(g)) { updated.genero = g; }
        // Fallback: busca direta em TODAS as colunas por header contendo gênero/sexo/identifica
        if (!updated.genero) {
          const rk = Object.keys(item);
          for (const k of rk) {
            if (isAttachmentColumn(k)) continue;
            const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if ((cl.includes('genero') || cl.includes('sexo') || cl.includes('identidade de genero') || 
                 (cl.includes('identifica') && !cl.includes('projeto') && !cl.includes('nome'))) && 
                !cl.includes('orientacao')) {
              const val = textOnly(item[k]);
              if (val && isValidDiversityValue(val) && !isFaixaValorValue(val)) { updated.genero = val; break; }
            }
          }
        }
        // 🔍 SCAN REVERSO: busca valores de GENERO_OPTIONS em QUALQUER coluna
        if (!updated.genero) {
          const scanG = scanGeneroInRow(item);
          if (scanG) updated.genero = scanG;
        }
        // 👤 INFERÊNCIA POR NOME: infere gênero pelo primeiro nome brasileiro (~95% acerto)
        if (!updated.genero) {
          const nomePessoa = updated.nome || updated.proponente || updated.responsavel || '';
          const inferred = inferGenderFromName(nomePessoa);
          if (inferred) {
            updated.genero = inferred;
          }
        }
      }
      if (!updated.raca) {
        const r = textOnly(getFieldFromRow(item, 'raca', 'Raca', 'RACA', 'Raça', 'raça', 'raca_cor', 'raça/cor', 'Raça/Cor', 'RAÇA/COR', 
          'etnia', 'Etnia', 'autodeclaracao', 'Autodeclaração', 'como voce se autodeclara', 'como você se autodeclara',
          'cor/raça', 'Cor/Raça', 'qual sua raça', 'qual a sua cor', 'qual sua cor',
          'raça_etnia', 'etnico', 'étnico-racial', 'etnico-racial',
          'cor', 'Cor', 'COR', 'COR/RAÇA', 'cor/raca',
          'qual a sua raça', 'qual a sua raca', 'Qual a sua cor ou raça', 'qual a sua cor ou raca',
          'Como você se declara', 'como voce se declara',
          'autodeclaração racial', 'autodeclaracao racial',
          'Como você se autodeclara quanto à cor', 'como voce se autodeclara quanto a cor'));
        if (r && isValidDiversityValue(r) && !isFaixaValorValue(r)) updated.raca = r;
        // 🔍 Fallback: busca direta por header de raça/cor/etnia
        if (!updated.raca) {
          const rk = Object.keys(item);
          for (const k of rk) {
            if (isAttachmentColumn(k)) continue;
            const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if ((cl.includes('raca') || cl.includes('etnia') || cl.includes('autodeclaracao') || cl.includes('autodeclara') ||
                 (cl.includes('cor') && !cl.includes('corrente') && !cl.includes('correio') && !cl.includes('correspond') && !cl.includes('acordo') && !cl.includes('recorte') && !cl.includes('decora') && !cl.includes('record') && !cl.includes('corpo'))) &&
                !cl.includes('orientacao') && !cl.includes('genero') && !cl.includes('eletronico') && !cl.includes('email')) {
              const val = textOnly(item[k]);
              if (val && isValidDiversityValue(val) && !isFaixaValorValue(val)) { updated.raca = val; break; }
            }
          }
        }
        // 🔍 SCAN REVERSO: busca valores de RACA_OPTIONS em QUALQUER coluna
        if (!updated.raca) {
          const scanR = scanRacaInRow(item);
          if (scanR) updated.raca = scanR;
        }
      }
      // 📅 IDADE: calcula a partir de data de nascimento se disponível
      if (!updated.idade || updated.idade === '') {
        const dnRaw = getFieldFromRow(item, 'data_nascimento', 'Data de Nascimento', 'DATA DE NASCIMENTO', 'nascimento', 'Nascimento', 'data nascimento', 'dt_nascimento', 'dtNascimento', 'dataNascimento', 'data_nasc', 'dt_nasc', 'Qual a sua data de nascimento', 'Qual sua data de nascimento', 'Data de nascimento do proponente');
        const idadeRawExtracted = getFieldFromRow(item, 'idade', 'Idade', 'IDADE', 'faixa_etaria', 'faixa etária', 'Faixa Etária', 'FAIXA ETÁRIA', 'qual sua idade', 'qual a sua idade', 'Qual a sua idade', 'Qual a sua faixa etária');
        // Rejeita se capturou faixa de valor monetário
        const idadeRaw = (idadeRawExtracted && !isFaixaValorValue(idadeRawExtracted)) ? idadeRawExtracted : null;
        const idadeCalc = calcularIdade(dnRaw ? String(dnRaw) : '') ?? calcularIdade(idadeRaw ? String(idadeRaw) : '');
        if (idadeCalc !== null) { updated.idade = String(idadeCalc); updated.faixaEtaria = calcularFaixaEtaria(idadeCalc); }
        else if (idadeRaw) {
          const s = String(idadeRaw).trim();
          if (/^\d+$/.test(s) && parseInt(s) >= 130) { /* descarta número absurdo */ }
          else if (!isFaixaValorValue(s)) updated.idade = s;
        }
        if (dnRaw && !updated.dataNascimento) updated.dataNascimento = String(dnRaw);
        // 🔍 SCAN REVERSO: busca colunas de idade/nascimento
        if (!updated.idade) {
          const scanI = scanIdadeInRow(item, calcularIdade);
          if (scanI.idade) { updated.idade = scanI.idade; const num = parseInt(scanI.idade); if (num > 0 && num < 130) updated.faixaEtaria = calcularFaixaEtaria(num); }
          if (scanI.dataNascimento && !updated.dataNascimento) { updated.dataNascimento = scanI.dataNascimento; const calc = calcularIdade(scanI.dataNascimento); if (calc !== null) { updated.idade = String(calc); updated.faixaEtaria = calcularFaixaEtaria(calc); } }
        }
      } else {
        // Recalcula se idade parece ser uma data
        const idadeCalc = calcularIdade(updated.idade);
        if (idadeCalc !== null && String(idadeCalc) !== updated.idade) { updated.idade = String(idadeCalc); updated.faixaEtaria = calcularFaixaEtaria(idadeCalc); }
        if (!updated.faixaEtaria) { const num = parseInt(updated.idade); if (num > 0 && num < 130) updated.faixaEtaria = calcularFaixaEtaria(num); }
      }
      // 🧹 LIMPA PcD contaminado com público-alvo
      if (updated.deficiencia) {
        const dLow = updated.deficiencia.toLowerCase();
        if (dLow.includes('adulto') || dLow.includes('infantil') || dLow.includes('infanto') || dLow.includes('religioso') || dLow.includes('mulheres') || dLow.includes('povos') || /^\d+$/.test(updated.deficiencia.trim())) {
          updated.deficiencia = '';
        }
      }
      if (!updated.deficiencia) {
        const d = textOnly(getFieldFromRow(item, 'deficiencia', 'Deficiência', 'deficiência', 'DEFICIÊNCIA', 'pcd', 'PCD', 'PcD', 
          'pessoa_com_deficiencia', 'pessoa com deficiência', 'possui deficiência', 'necessidades especiais',
          'é pessoa com deficiência', 'voce possui deficiencia', 'você possui deficiência',
          'acessibilidade', 'necessidade especial'));
        const dLow2 = (d || '').toLowerCase();
        const isPubAlvo = dLow2.includes('adulto') || dLow2.includes('infantil') || dLow2.includes('infanto') || dLow2.includes('religioso') || dLow2.includes('mulheres');
        if (d && !isFaixaValorValue(d) && !isPubAlvo && !/^\d+$/.test(d.trim())) updated.deficiencia = d;
        // 🔍 Fallback: busca por header de deficiência/pcd (exclui público-alvo)
        if (!updated.deficiencia) {
          const rk = Object.keys(item);
          for (const k of rk) {
            if (isAttachmentColumn(k)) continue;
            const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (cl.includes('publico') || cl.includes('atende') || cl.includes('faixa etaria') || cl.includes('qual o publico')) continue;
            if (cl.includes('deficiencia') || cl.includes('pcd') || cl.includes('necessidade especial') || 
                cl.includes('acessibilidade') || cl.includes('pessoa com deficiencia')) {
              const val = textOnly(item[k]);
              if (!val || isFaixaValorValue(val) || /^\d+$/.test(val)) continue;
              const valLow = val.toLowerCase();
              if (valLow.includes('adulto') || valLow.includes('infantil') || valLow.includes('infanto') || valLow.includes('religioso') || valLow.includes('mulheres') || valLow.includes('povos')) continue;
              updated.deficiencia = val; break;
            }
          }
        }
        // 🔍 SCAN REVERSO: busca PcD por header e por valor
        if (!updated.deficiencia) {
          const scanP = scanPcdInRow(item);
          if (scanP) updated.deficiencia = scanP;
        }
      }
      if (!updated.orientacao_sexual) {
        const o = textOnly(getFieldFromRow(item, 'orientacao_sexual', 'orientação_sexual', 'Orientação Sexual', 'orientação sexual', 
          'sexualidade', 'Sexualidade', 'qual sua orientação sexual', 'qual sua orientacao sexual'));
        if (o && !isFaixaValorValue(o)) updated.orientacao_sexual = o;
        // 🔍 Fallback: busca por header de orientação
        if (!updated.orientacao_sexual) {
          const rk = Object.keys(item);
          for (const k of rk) {
            if (isAttachmentColumn(k)) continue;
            const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if ((cl.includes('orientacao') || cl.includes('sexualidade')) && !cl.includes('genero') && !cl.includes('sexo')) {
              const val = textOnly(item[k]);
              if (val && !isFaixaValorValue(val)) { updated.orientacao_sexual = val; break; }
            }
          }
        }
        // 🔍 SCAN REVERSO: busca orientação sexual por header e por valor
        if (!updated.orientacao_sexual) {
          const scanO = scanOrientacaoInRow(item);
          if (scanO) updated.orientacao_sexual = scanO;
        }
      }
      if (!updated.nome) { const n = getFieldFromRow(item, 'nome', 'Nome', 'NOME', 'nome_completo', 'Nome Completo', 'proponente', 'Proponente'); if (n) updated.nome = String(n); }
      if (!updated.categoria) { const c = getFieldFromRow(item, 'categoria', 'Categoria', 'CATEGORIA', 'area', 'Area', 'Área', 'segmento', 'Segmento', 'linguagem', 'Linguagem'); if (c && !isFaixaValorValue(c)) updated.categoria = String(c); }
      if (!updated.responsavel) { const resp = getFieldFromRow(item, 'responsavel', 'Responsável', 'RESPONSÁVEL', 'responsavel_legal', 'Responsável Legal'); if (resp) updated.responsavel = String(resp); }
      
      // 🔍 SCANNER UNIVERSAL: última tentativa para preencher QUALQUER campo vazio
      // Escaneia TODOS os valores da row buscando matches por conteúdo
      const hasEmptyFields = !updated.bairro || !updated.categoria || !updated.genero || !updated.raca || 
                             !updated.idade || !updated.email || !updated.telefone || !updated.deficiencia ||
                             !updated.enderecoCompleto;
      if (hasEmptyFields) {
        const scanned = universalFieldScanner(item, NOMES_BAIRROS);
        if (!updated.bairro && scanned.bairro && !looksLikeEnderecoCompleto(scanned.bairro)) { updated.bairro = scanned.bairro; }
        if (!updated.categoria && scanned.categoria) { updated.categoria = scanned.categoria; }
        if (!updated.email && scanned.email) { updated.email = scanned.email; }
        if (!updated.telefone && scanned.telefone) { updated.telefone = scanned.telefone; }
        if (!updated.genero && scanned.genero) { updated.genero = scanned.genero; }
        if (updated.genero && /apresenta/i.test(updated.genero)) updated.genero = '';
        if (!updated.raca && scanned.raca && isPlausibleRacaCorValue(scanned.raca)) { updated.raca = scanned.raca; }
        if (!updated.idade && scanned.idade) { updated.idade = scanned.idade; }
        if (!updated.deficiencia && scanned.deficiencia) { updated.deficiencia = scanned.deficiencia; }
        if (!updated.enderecoCompleto && scanned.enderecoCompleto) { updated.enderecoCompleto = scanned.enderecoCompleto; }
        if (scanned._dataNascimento && !updated.dataNascimento) { updated.dataNascimento = scanned._dataNascimento; }
        // Log se scanner universal encontrou algo
        const foundKeys = Object.keys(scanned).filter(k => !k.startsWith('_') && (scanned as any)[k]);
        if (foundKeys.length > 0) {
          console.log(`🎯 [UNIVERSAL SCAN] ${updated.nome || '?'}: preencheu ${foundKeys.join(', ')}`, scanned);
        }
      }

      if (updated.genero && /apresenta/i.test(updated.genero)) updated.genero = '';
      if (updated.raca && !isPlausibleRacaCorValue(updated.raca)) updated.raca = '';
      const bcRep = canonicalBairroIlhabela(String(updated.bairro || '').trim(), String(updated.enderecoCompleto || '').trim());
      if (bcRep) updated.bairro = bcRep;
      else if (looksLikeEnderecoCompleto(String(updated.bairro || ''))) updated.bairro = '';
      
      const rawComunidadeReproc = (() => {
        const ct = getFieldFromRow(item,
          'comunidade_tradicional', 'comunidade tradicional', 'Comunidade Tradicional', 'comunidadeTradicional',
          'pertence a comunidade tradicional', 'Pertence à Comunidade Tradicional', 'Pertence a Comunidade Tradicional',
          'pertence_comunidade', 'Comunidade Tradicional de Ilhabela'
        );
        if (ct && !/^\d+$/.test(String(ct).trim()) && !isFaixaValorValue(ct)) return String(ct).trim();
        const cur = String(updated.comunidadeTradicional || '').trim();
        if (cur && !/^\d+$/.test(cur) && !isFaixaValorValue(cur)) return cur;
        return '';
      })();
      const comReproc = resolveComunidadeTradicional({
        rawField: rawComunidadeReproc,
        bairro: updated.bairro || '',
        enderecoCompleto: updated.enderecoCompleto || '',
        extras: [updated.nomeProjeto, updated.nome, updated.proponente],
      });
      updated.comunidadeTradicional = comReproc.nome;
      updated.eh_comunidade_tradicional = comReproc.eh;

      const coordsRep = resolveRecordCoords(updated.bairro || '', updated.enderecoCompleto || '', updated.lat, updated.lng);
      updated.lat = coordsRep.lat;
      updated.lng = coordsRep.lng;
      
      const changed = Object.keys(updated).some(k => updated[k] !== item[k]);
      if (changed) totalReprocessed++;
      return updated;
    };
    
    if (newPD.agentes && newPD.agentes.length > 0) {
      newPD.agentes = newPD.agentes.map((item, idx) => {
        const result = reprocessItem(item);
        if (idx === 0) console.log('🔄 [REPROCESS] Agente #1 ANTES:', { genero: item.genero, raca: item.raca, idade: item.idade, deficiencia: item.deficiencia, bairro: item.bairro }, 'DEPOIS:', { genero: result.genero, raca: result.raca, idade: result.idade, deficiencia: result.deficiencia, bairro: result.bairro });
        return result;
      });
    }
    if (newPD.grupos && newPD.grupos.length > 0) newPD.grupos = newPD.grupos.map(reprocessItem);
    if (newPD.espacos && newPD.espacos.length > 0) newPD.espacos = newPD.espacos.map(reprocessItem);
    if (newPD.mapeamento && newPD.mapeamento.length > 0) newPD.mapeamento = newPD.mapeamento.map(reprocessItem);
    
    if (newPD.projetos && newPD.projetos.length > 0) {
      let projIdx = 0;
      newPD.projetos = newPD.projetos.map(p => {
        const updated = reprocessItem(p);
        if (projIdx < 3) {
          console.log(`🔄 [REPROCESS] Projeto #${projIdx + 1} "${p.nomeProjeto || p.nome || '?'}" ANTES:`, 
            { bairro: p.bairro, areaAtuacao: p.areaAtuacao, genero: p.genero, raca: p.raca, idade: p.idade, deficiencia: p.deficiencia, faixa: p.faixa },
            'DEPOIS:', { bairro: updated.bairro, areaAtuacao: updated.areaAtuacao, genero: updated.genero, raca: updated.raca, idade: updated.idade, deficiencia: updated.deficiencia, faixaValor: updated.faixaValor });
        }
        projIdx++;
        if (!updated.proponente || updated.proponente === 'Não informado') {
          const bestName = getBestName(p);
          if (bestName !== 'Não informado') updated.proponente = bestName;
          updated.nome = updated.proponente || updated.nome;
        }
        if (!updated.nomeProjeto) { const pn = getProjectName(p); if (pn) updated.nomeProjeto = pn; }
        if (!updated.tipoPessoa) updated.tipoPessoa = detectTipoPessoa(p);
        if (!updated.areaAtuacao) { 
          const a = getFieldFromRow(p, 'area_atuacao', 'Área de Atuação', 'segmento', 'Segmento', 'linguagem', 'Linguagem', 'Linguagem Artística', 'modalidade', 'Modalidade'); 
          if (a && !isFaixaValorValue(a)) updated.areaAtuacao = String(a); 
        }
        // Salvar faixaValor se ainda não setado
        if (!updated.faixaValor && updated.faixa && isFaixaValorValue(updated.faixa)) {
          updated.faixaValor = String(updated.faixa);
        }
        return updated;
      });
    }
    
    setParsedData(newPD);
    persistData(newPD);
    
    // 📊 Contadores detalhados por campo de diversidade
    const countField = (arr: any[] | undefined, field: string) => arr ? arr.filter(i => i[field] && String(i[field]).trim() !== '').length : 0;
    const allItems = [...(newPD.agentes || []), ...(newPD.grupos || []), ...(newPD.espacos || []), ...(newPD.mapeamento || [])];
    const totalRecords = allItems.length + (newPD.projetos?.length || 0);
    const stats = {
      genero: countField(allItems, 'genero') + countField(newPD.projetos, 'genero'),
      raca: countField(allItems, 'raca') + countField(newPD.projetos, 'raca'),
      idade: countField(allItems, 'idade') + countField(newPD.projetos, 'idade'),
      pcd: countField(allItems, 'deficiencia') + countField(newPD.projetos, 'deficiencia'),
      orientacao: countField(allItems, 'orientacao_sexual') + countField(newPD.projetos, 'orientacao_sexual'),
      email: countField(allItems, 'email') + countField(newPD.projetos, 'email'),
      telefone: countField(allItems, 'telefone') + countField(newPD.projetos, 'telefone'),
      endereco: countField(allItems, 'enderecoCompleto') + countField(newPD.projetos, 'enderecoCompleto'),
    };
    const statsPerTab = {
      agentes: { total: newPD.agentes?.length || 0, genero: countField(newPD.agentes, 'genero'), raca: countField(newPD.agentes, 'raca'), idade: countField(newPD.agentes, 'idade'), pcd: countField(newPD.agentes, 'deficiencia'), endereco: countField(newPD.agentes, 'enderecoCompleto') },
      grupos: { total: newPD.grupos?.length || 0, genero: countField(newPD.grupos, 'genero'), raca: countField(newPD.grupos, 'raca'), idade: countField(newPD.grupos, 'idade'), pcd: countField(newPD.grupos, 'deficiencia') },
      espacos: { total: newPD.espacos?.length || 0, genero: countField(newPD.espacos, 'genero'), raca: countField(newPD.espacos, 'raca'), idade: countField(newPD.espacos, 'idade'), pcd: countField(newPD.espacos, 'deficiencia') },
      projetos: { total: newPD.projetos?.length || 0, genero: countField(newPD.projetos, 'genero'), raca: countField(newPD.projetos, 'raca'), idade: countField(newPD.projetos, 'idade'), pcd: countField(newPD.projetos, 'deficiencia') },
    };
    console.log('📊 [REPROCESS] Estatísticas detalhadas por tabela:', statsPerTab);
    alert(`🔄 Reprocessamento concluído!\n\n✅ ${totalReprocessed} registros atualizados de ${totalRecords} total.\n\n📊 Campos preenchidos (total):\n• Gênero: ${stats.genero}/${totalRecords}\n• Raça/Cor: ${stats.raca}/${totalRecords}\n• Idade: ${stats.idade}/${totalRecords}\n• PcD: ${stats.pcd}/${totalRecords}\n• Endereço: ${stats.endereco}/${totalRecords}\n• Email: ${stats.email}/${totalRecords}\n• Telefone: ${stats.telefone}/${totalRecords}\n\n🔍 Agentes: G:${statsPerTab.agentes.genero} R:${statsPerTab.agentes.raca} I:${statsPerTab.agentes.idade} E:${(statsPerTab.agentes as any).endereco} P:${statsPerTab.agentes.pcd}/${statsPerTab.agentes.total}\n🔍 Grupos: G:${statsPerTab.grupos.genero} R:${statsPerTab.grupos.raca} I:${statsPerTab.grupos.idade} P:${statsPerTab.grupos.pcd}/${statsPerTab.grupos.total}\n🔍 Espaços: G:${statsPerTab.espacos.genero} R:${statsPerTab.espacos.raca} I:${statsPerTab.espacos.idade} P:${statsPerTab.espacos.pcd}/${statsPerTab.espacos.total}\n🔍 Projetos: G:${statsPerTab.projetos.genero} R:${statsPerTab.projetos.raca} I:${statsPerTab.projetos.idade} P:${statsPerTab.projetos.pcd}/${statsPerTab.projetos.total}`);
    console.log(`🔄 [REPROCESS] ${totalReprocessed}/${totalRecords} registros atualizados`);
  };

  // 🎯 Função para gerar chave única de deduplicação (usada na importação e no botão)
  const gerarChaveDedupe = (p: any): string => {
    const nome = normalizeFullPersonNameForRanking(p.proponente || p.nome || p.Nome || '');
    const projeto = (p.nomeProjeto || p.nome_projeto || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cpfRaw = p.cpf_cnpj || p.cpf || p.cnpj || '';
    const cpf = String(cpfRaw).replace(/[^0-9]/g, '');
    const edital = (p._editalOrigem || p.edital || '').toLowerCase().trim();
    // Chave composta: se tem CPF usa CPF+edital, senão usa nome+projeto+edital
    if (cpf.length >= 6) return `cpf:${cpf}|ed:${edital}`;
    if (nome && projeto) return `nome:${nome}|proj:${projeto}|ed:${edital}`;
    if (nome) return `nome:${nome}|ed:${edital}`;
    return `idx:${Math.random()}`; // fallback para não perder registros sem identificação
  };

  // Função para remover duplicados (global ou por planilha selecionada)
  const removerDuplicados = (apenasEditalKey?: string) => {
    if (!parsedData.projetos || parsedData.projetos.length === 0) {
      showFeedback('warning', 'Nenhum projeto importado para deduplicar.');
      return;
    }

    // Prioriza manter o registro com status mais avançado (Contemplado > Suplente > Inscrito)
    const statusPriority = (s: string) => {
      const sl = (s || '').toLowerCase();
      if (sl.includes('contemplado') || sl.includes('aprovado') || sl.includes('classificado') || sl.includes('selecionado')) return 3;
      if (sl.includes('suplente')) return 2;
      if (sl.includes('desclassificado') || sl.includes('indeferido')) return 0;
      return 1;
    };

    const base = parsedData.projetos || [];
    const alvoEntries = base
      .map((p, index) => ({ p, index }))
      .filter(({ p }) => !apenasEditalKey || getEditalAnoKey(p) === apenasEditalKey);

    if (alvoEntries.length === 0) {
      showFeedback('warning', 'Nenhum projeto encontrado para a planilha selecionada.');
      return;
    }

    const melhorPorChave = new Map<string, { index: number; prioridade: number }>();
    for (const entry of alvoEntries) {
      const chave = gerarChaveDedupe(entry.p);
      const prioridade = statusPriority(entry.p.status || '');
      const atual = melhorPorChave.get(chave);
      if (!atual || prioridade > atual.prioridade) {
        melhorPorChave.set(chave, { index: entry.index, prioridade });
      }
    }

    const vencedores = new Set<number>(Array.from(melhorPorChave.values()).map(v => v.index));
    const projetosAtualizados = base.filter((p, index) => {
      if (apenasEditalKey && getEditalAnoKey(p) !== apenasEditalKey) return true;
      return vencedores.has(index);
    });

    const removidos = alvoEntries.length - vencedores.size;
    if (removidos <= 0) {
      showFeedback('info', 'Nenhum duplicado encontrado no recorte selecionado.');
      return;
    }

    const alvoNome = apenasEditalKey
      ? (stats.porEdital.find((ed: any) => ed.chave === apenasEditalKey)?.nome || 'planilha selecionada')
      : 'todas as planilhas';

    saveUndoSnapshot(`Remoção de duplicados (${alvoNome})`);
    const newPD = { ...parsedData, projetos: projetosAtualizados };
    setParsedData(newPD);
    persistData(newPD);
    showFeedback('success', `${removidos} duplicado(s) removido(s) em ${alvoNome}. Total atual: ${projetosAtualizados.length} projeto(s).`);
  };

  // Função para remover duplicados do Mapeamento (por CPF/CNPJ)
  const removerDuplicadosMapeamento = () => {
    if (!parsedData.mapeamento || parsedData.mapeamento.length === 0) {
      showFeedback('warning', 'Nenhum dado do Mapeamento 2020 importado.');
      return;
    }

    const normalizeText = (v: any) =>
      String(v || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const seen = new Set<string>();
    const unique = (parsedData.mapeamento || []).filter((item) => {
      const cpf = String(item.cpf || item.cnpj || item.cpf_cnpj || '').replace(/\D/g, '');
      const nome = normalizeText(item.nome || item.Nome || item.proponente || '');
      const bairro = normalizeText(item.bairro || item.Bairro || '');
      const key = cpf ? `cpf:${cpf}` : `nome:${nome}|bairro:${bairro}`;

      // Sem chave mínima: mantém para não perder dados.
      if (!key || key === 'nome:|bairro:') return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const removidos = parsedData.mapeamento.length - unique.length;
    
    const newPD = { ...parsedData, mapeamento: unique };
    setParsedData(newPD);
    persistData(newPD);
    showFeedback(
      removidos > 0 ? 'success' : 'info',
      removidos > 0
        ? `${removidos} duplicado(s) removido(s) do Mapeamento. Total: ${unique.length} registros únicos.`
        : `Nenhum duplicado encontrado no Mapeamento. Total: ${unique.length} registros.`
    );
  };

  // Função para remover duplicados de Agentes (por CPF/CNPJ)
  const removerDuplicadosAgentes = () => {
    if (!parsedData.agentes || parsedData.agentes.length === 0) {
      showFeedback('warning', 'Nenhum agente importado para deduplicar.');
      return;
    }

    const unique = parsedData.agentes.filter((item, index, self) => 
      index === self.findIndex(a => {
        const cpfA = a.cpf || a.cnpj || a.cpf_cnpj || '';
        const cpfB = item.cpf || item.cnpj || item.cpf_cnpj || '';
        return cpfA === cpfB && cpfA !== '';
      })
    );

    const removidos = parsedData.agentes.length - unique.length;
    
    const newPD = { ...parsedData, agentes: unique };
    setParsedData(newPD);
    persistData(newPD);
    showFeedback(
      removidos > 0 ? 'success' : 'info',
      removidos > 0
        ? `${removidos} duplicado(s) removido(s) de Agentes. Total: ${unique.length} agentes únicos.`
        : `Nenhum duplicado encontrado em Agentes. Total: ${unique.length} registros.`
    );
  };

  // Função para remover duplicados de Grupos (por CNPJ ou Nome)
  const removerDuplicadosGrupos = () => {
    if (!parsedData.grupos || parsedData.grupos.length === 0) {
      alert('❌ Nenhum grupo importado!');
      return;
    }

    const unique = parsedData.grupos.filter((item, index, self) => 
      index === self.findIndex(g => {
        const cnpjA = g.cnpj || g.CNPJ || '';
        const cnpjB = item.cnpj || item.CNPJ || '';
        const nomeA = (g.nome || g.Nome || '').toLowerCase().trim();
        const nomeB = (item.nome || item.Nome || '').toLowerCase().trim();
        
        // Remove duplicados por CNPJ (se existir) ou por Nome
        if (cnpjA && cnpjB && cnpjA !== '') {
          return cnpjA === cnpjB;
        }
        return nomeA === nomeB && nomeA !== '';
      })
    );

    const removidos = parsedData.grupos.length - unique.length;
    
    const newPD = { ...parsedData, grupos: unique };
    setParsedData(newPD);
    persistData(newPD);

    alert(`✅ ${removidos} duplicados removidos de Grupos! Total: ${unique.length} grupos únicos.`);
  };

  // Função para remover duplicados de Espaços (por Nome + Bairro)
  const removerDuplicadosEspacos = () => {
    if (!parsedData.espacos || parsedData.espacos.length === 0) {
      alert('❌ Nenhum espaço importado!');
      return;
    }

    const unique = parsedData.espacos.filter((item, index, self) => 
      index === self.findIndex(e => {
        const nomeA = (e.nome || e.Nome || '').toLowerCase().trim();
        const nomeB = (item.nome || item.Nome || '').toLowerCase().trim();
        const bairroA = (e.bairro || e.Bairro || '').toLowerCase().trim();
        const bairroB = (item.bairro || item.Bairro || '').toLowerCase().trim();
        
        // Remove duplicados por Nome + Bairro
        return nomeA === nomeB && bairroA === bairroB && nomeA !== '';
      })
    );

    const removidos = parsedData.espacos.length - unique.length;
    
    const newPD = { ...parsedData, espacos: unique };
    setParsedData(newPD);
    persistData(newPD);

    alert(`✅ ${removidos} duplicados removidos de Espaços! Total: ${unique.length} espaços únicos.`);
  };

  // Função para limpar projetos
  const limparProjetos = () => {
    if (!window.confirm('⚠️ Tem certeza que deseja excluir TODAS as planilhas/projetos importados?\n\nEsta ação apaga tudo da aba Projetos/Editais.')) return;
    const typed = window.prompt('Para confirmar, digite EXCLUIR TUDO');
    if (typed !== 'EXCLUIR TUDO') {
      alert('Operação cancelada. Nada foi excluído.');
      return;
    }
    saveUndoSnapshot('Exclusão total de projetos');
    const newPD = { ...parsedData, projetos: [] as any[] };
    setParsedData(newPD);
    persistData(newPD);
    alert('🗑️ Projetos limpos com sucesso! Use "Desfazer última exclusão" se foi por engano.');
  };

  // 🎯 Edição inline de status: cicla entre Inscrito → Contemplado → Suplente → Desclassificado → Inscrito
  const toggleStatus = (projetoIndex: number) => {
    if (!parsedData.projetos) return;
    
    const updated = [...parsedData.projetos];
    const projeto = { ...updated[projetoIndex] };
    const currentStatus = (projeto.status || '').toLowerCase();
    
    let newStatus = '';
    if (!currentStatus || currentStatus === 'inscrito' || currentStatus === '') {
      newStatus = 'Contemplado';
    } else if (currentStatus.includes('contemplado') || currentStatus.includes('aprovado')) {
      newStatus = 'Suplente';
    } else if (currentStatus.includes('suplente')) {
      newStatus = 'Desclassificado';
    } else {
      newStatus = 'Inscrito';
    }
    
    projeto.status = newStatus;
    
    // 💰 TRANSFORMAR FAIXA DE VALOR EM VALOR INVESTIDO quando marcar como Contemplado
    if (newStatus === 'Contemplado' && (!projeto.valor || projeto.valor === 0)) {
      // Tenta extrair valor da faixa
      if (projeto.faixa) {
        const valorExtraido = extractValorFromFaixa(projeto.faixa);
        if (valorExtraido > 0) {
          projeto.valor = valorExtraido;
          console.log(`💰 Valor automático extraído da faixa para contemplado: R$ ${valorExtraido.toLocaleString('pt-BR')}`);
        }
      }
      // Fallback: tenta extrair de faixaValor ou outras propriedades
      if (!projeto.valor || projeto.valor === 0) {
        if (projeto.faixaValor) {
          const valorExtraido = extractValorFromFaixa(projeto.faixaValor);
          if (valorExtraido > 0) {
            projeto.valor = valorExtraido;
            console.log(`💰 Valor automático extraído de faixaValor para contemplado: R$ ${valorExtraido.toLocaleString('pt-BR')}`);
          }
        }
      }
    }
    
    updated[projetoIndex] = projeto;
    
    const newParsedData = { ...parsedData, projetos: updated };
    setParsedData(newParsedData);
    persistData(newParsedData);
  };

  // 🎯 Marcar todos como um status específico (para o filtro atual)
  const marcarTodos = (status: string) => {
    if (!parsedData.projetos) return;
    
    const filtrados = filtroEdital
      ? parsedData.projetos.map((p, i) => ({ p, i })).filter(({ p }) => matchesFiltroEdital(p))
      : parsedData.projetos.map((p, i) => ({ p, i }));
    
    if (filtrados.length === 0) return;
    
    const label = filtroEdital ? `os ${filtrados.length} projetos de "${filtroEditalLabel}"` : `todos os ${filtrados.length} projetos`;
    if (!window.confirm(`⚠️ Marcar ${label} como "${status}"?`)) return;
    
    const updated = [...parsedData.projetos];
    filtrados.forEach(({ i }) => {
      updated[i] = { ...updated[i], status };
    });
    
    const newParsedData = { ...parsedData, projetos: updated };
    setParsedData(newParsedData);
    persistData(newParsedData);
  };

  // 🎯 CRUD genérico: iniciar edição de uma linha
  const startEditing = (tab: string, index: number, item: any) => {
    setEditingRow({ tab, index });
    setEditValues({ ...item });
  };

  // 🎯 CRUD genérico: cancelar edição
  const cancelEditing = () => {
    setEditingRow(null);
    setEditValues({});
  };

  // 💾 Persistir dados silenciosamente (servidor + localStorage)
  const persistData = async (
    newData: ParsedData,
    linksOverride?: Record<string, { resultado?: string; resumo?: string; diarioOficial?: string }>
  ) => {
    try {
      // Inclui os links customizados de editais junto com os dados
      const links = linksOverride ?? customEditalLinks;
      const normalized = normalizeProjetosOnParsed({ ...newData }) as ParsedData;
      const dataWithLinks = {
        ...normalized,
        customEditalLinks: links,
        _cadastroSavedAt: new Date().toISOString(),
      };
      const dataToSave = JSON.stringify(dataWithLinks);
      localStorage.setItem('editais_imported_data', dataToSave);
      const { projectId, publicAnonKey } = await import('/utils/supabase/info');
      const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-2320c79f/save-data`;
      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: dataToSave
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.warn('⚠️ [AUTO-SAVE] Erro HTTP:', response.status, detail);
        setActionFeedback({
          type: 'warning',
          text: `Alterações salvas neste navegador, mas o servidor respondeu ${response.status}. Use «Salvar no Servidor» ou verifique a conexão para sincronizar.`,
        });
      } else {
        console.log('✅ [AUTO-SAVE] Dados + links customizados persistidos no servidor');
      }
    } catch (err) {
      console.warn('⚠️ [AUTO-SAVE] Fallback localStorage ok, erro servidor:', err);
      setActionFeedback({
        type: 'warning',
        text: 'Alterações salvas neste navegador; não foi possível confirmar gravação no servidor. Verifique a rede ou use «Salvar no Servidor».',
      });
    }
  };

  const saveUndoSnapshot = (reason: string) => {
    try {
      const snapshot = {
        reason,
        savedAt: new Date().toISOString(),
        data: parsedData,
        customEditalLinks,
      };
      localStorage.setItem(UNDO_SNAPSHOT_KEY, JSON.stringify(snapshot));
      setHasUndoSnapshot(true);
    } catch (err) {
      console.warn('⚠️ Não foi possível criar snapshot de desfazer:', err);
    }
  };

  const restoreLastDeletion = async () => {
    try {
      const raw = localStorage.getItem(UNDO_SNAPSHOT_KEY);
      if (!raw) {
        alert('❌ Nenhum snapshot de exclusão encontrado.');
        return;
      }
      const snap = JSON.parse(raw);
      const restoredData: ParsedData = snap?.data || {};
      const restoredLinks = snap?.customEditalLinks || {};
      setParsedData(restoredData);
      setCustomEditalLinks(restoredLinks);
      await persistData(restoredData, restoredLinks);
      alert(`✅ Última exclusão desfeita com sucesso.\nMotivo do snapshot: ${snap?.reason || 'não informado'}`);
    } catch (err) {
      alert(`❌ Falha ao restaurar snapshot: ${err instanceof Error ? err.message : 'erro desconhecido'}`);
    }
  };

  // 🎯 SELEÇÃO EM LOTE: toggle seleção de uma linha
  const toggleRowSelection = (realIndex: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(realIndex)) next.delete(realIndex);
      else next.add(realIndex);
      return next;
    });
  };

  // 🎯 SELEÇÃO EM LOTE: selecionar/desselecionar todos os visíveis
  const toggleSelectAllVisible = (visibleIndices: number[]) => {
    const allSelected = visibleIndices.every(i => selectedRows.has(i));
    if (allSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(visibleIndices));
    }
  };

  // 🎯 EDIÇÃO EM LOTE: aplicar comunidade tradicional a todos os selecionados
  const applyBatchComunidade = () => {
    if (selectedRows.size === 0 || !batchComunidade) return;
    if (!window.confirm(`🏘️ Aplicar comunidade "${batchComunidade}" a ${selectedRows.size} projeto(s) selecionado(s)?`)) return;
    
    const updated = [...(parsedData.projetos || [])];
    selectedRows.forEach(idx => {
      if (updated[idx]) {
        const eh =
          !!batchComunidade &&
          batchComunidade !== 'Não' &&
          batchComunidade.toLowerCase() !== 'nao';
        updated[idx] = {
          ...updated[idx],
          comunidadeTradicional: batchComunidade,
          eh_comunidade_tradicional: eh,
        };
      }
    });
    
    const newPD = { ...parsedData, projetos: updated };
    setParsedData(newPD);
    persistData(newPD);
    setSelectedRows(new Set());
    setBatchComunidade('');
    console.log(`✅ [BATCH] Comunidade "${batchComunidade}" aplicada a ${selectedRows.size} projetos`);
  };

  // 🎯 EDIÇÃO EM LOTE: aplicar status a todos os selecionados
  const applyBatchStatus = () => {
    if (selectedRows.size === 0 || !batchStatus) return;
    if (!window.confirm(`📋 Aplicar status "${batchStatus}" a ${selectedRows.size} projeto(s) selecionado(s)?`)) return;
    
    const updated = [...(parsedData.projetos || [])];
    selectedRows.forEach(idx => {
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], status: batchStatus };
      }
    });
    
    const newPD = { ...parsedData, projetos: updated };
    setParsedData(newPD);
    persistData(newPD);
    setSelectedRows(new Set());
    setBatchStatus('');
    console.log(`✅ [BATCH] Status "${batchStatus}" aplicado a ${selectedRows.size} projetos`);
  };

  // 🎯 EDIÇÃO EM LOTE: limpar comunidade de todos os selecionados
  const clearBatchComunidade = () => {
    if (selectedRows.size === 0) return;
    if (!window.confirm(`🗑️ Limpar comunidade de ${selectedRows.size} projeto(s)?`)) return;
    
    const updated = [...(parsedData.projetos || [])];
    selectedRows.forEach(idx => {
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], comunidadeTradicional: '', eh_comunidade_tradicional: false };
      }
    });
    
    const newPD = { ...parsedData, projetos: updated };
    setParsedData(newPD);
    persistData(newPD);
    setSelectedRows(new Set());
    console.log(`✅ [BATCH] Comunidade limpa de ${selectedRows.size} projetos`);
  };

  // 🎯 RENOMEAR EDITAL: renomeia todos os projetos de um edital para outro nome
  const renameEdital = () => {
    if (!renameEditalFrom || !renameEditalTo.trim()) return;
    const newName = renameEditalTo.trim();
    if (!window.confirm(`📝 Renomear edital "${renameEditalFrom}" para "${newName}"?\n\nTodos os projetos com esse edital serão atualizados.`)) return;
    
    const updated = (parsedData.projetos || []).map(p => {
      if ((p._editalOrigem || p.edital || 'Sem edital') === renameEditalFrom) {
        return { ...p, _editalOrigem: newName, edital: newName };
      }
      return p;
    });
    
    // Atualiza links customizados se existiam para o nome antigo
    const newLinks = { ...customEditalLinks };
    if (newLinks[renameEditalFrom]) {
      newLinks[newName] = newLinks[renameEditalFrom];
      delete newLinks[renameEditalFrom];
      setCustomEditalLinks(newLinks);
    }
    
    const newPD = { ...parsedData, projetos: updated };
    setParsedData(newPD);
    persistData(newPD);
    setRenameEditalFrom('');
    setRenameEditalTo('');
    setShowRenameEdital(false);
    if (filtroEdital === renameEditalFrom) setFiltroEdital(newName);
    console.log(`✅ [RENAME] Edital "${renameEditalFrom}" renomeado para "${newName}"`);
  };

  // 🔗 Salvar link de edital customizado
  const saveEditalLink = (editalName: string, linkType: 'resultado' | 'resumo' | 'diarioOficial', url: string) => {
    const newLinks = { ...customEditalLinks };
    if (!newLinks[editalName]) newLinks[editalName] = {};
    newLinks[editalName][linkType] = url;
    setCustomEditalLinks(newLinks);
    localStorage.setItem('custom_edital_links', JSON.stringify(newLinks));
    console.log(`🔗 [LINK] Link ${linkType} do edital "${editalName}" salvo: ${url}`);
  };

  // Carrega links customizados do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('custom_edital_links');
      if (saved) setCustomEditalLinks(JSON.parse(saved));
    } catch {}
  }, []);

  // 🎯 CRUD genérico: salvar edição de uma linha
  const saveEditing = () => {
    if (!editingRow) return;
    const { tab, index } = editingRow;
    const key = tab as keyof ParsedData;
    const arr = parsedData[key] as any[];
    if (!arr) return;
    
    const updated = [...arr];
    updated[index] = { ...updated[index], ...editValues };
    if (tab === 'projetos') {
      const com = String(updated[index].comunidadeTradicional || '').trim();
      updated[index].eh_comunidade_tradicional =
        !!com && com.toLowerCase() !== 'não' && com !== '-' && com !== 'N/I';
    }
    
    const newParsedData = { ...parsedData, [key]: updated };
    setParsedData(newParsedData);
    setEditingRow(null);
    setEditValues({});
    
    // 💾 Auto-persistir em background
    persistData(newParsedData);
    console.log(`✅ [EDIT] Linha ${index} da tab "${tab}" salva e persistida`);
  };

  // 🎯 CRUD genérico: excluir uma linha
  const deleteRow = (tab: string, index: number) => {
    const key = tab as keyof ParsedData;
    const arr = parsedData[key] as any[];
    if (!arr) return;
    
    const nome = arr[index]?.nome || arr[index]?.Nome || arr[index]?.proponente || `Item #${index + 1}`;
    if (!window.confirm(`🗑️ Excluir "${nome}"?`)) return;
    
    const updated = arr.filter((_, i) => i !== index);
    const newParsedData = { ...parsedData, [key]: updated };
    setParsedData(newParsedData);
    
    // Se estava editando essa linha, cancela
    if (editingRow?.tab === tab && editingRow?.index === index) {
      cancelEditing();
    }
    
    // 💾 Auto-persistir em background
    persistData(newParsedData);
    console.log(`🗑️ [DELETE] Linha ${index} da tab "${tab}" excluída e persistida`);
  };

  // 🎯 Helper: renderiza célula editável ou texto
  const EditableCell = ({ field, fallback, sx }: { field: string; fallback?: string; sx?: any }) => {
    if (editingRow) {
      // Está em modo edição
      return (
        <TextField
          size="small"
          value={editValues[field] || ''}
          onChange={(e) => setEditValues(prev => ({ ...prev, [field]: e.target.value }))}
          variant="outlined"
          sx={{ minWidth: 80, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5, px: 1 }, ...sx }}
        />
      );
    }
    return <>{fallback || '-'}</>;
  };

  // Função para baixar template
  const baixarTemplate = (tipo: string) => {
    let template: any[] = [];
    let filename = '';

    switch (tipo) {
      case 'mapeamento':
        template = [{
          nome: 'João da Silva',
          categoria: 'Música',
          bairro: 'Vila',
          comunidadeTradicional: 'Bonete',
          cpf: '***.***.***-00',
          email: 'joao@email.com',
          telefone: '(12) 98888-8888',
          lat: -23.778,
          lng: -45.358
        }];
        filename = 'template-mapeamento-2020.xlsx';
        break;
      case 'agentes':
        template = [{
          nome: 'Maria Santos',
          categoria: 'Artesanato',
          bairro: 'Perequê',
          comunidadeTradicional: 'Canto do Ribeirão',
          cpf_cnpj: '***.***.***-11',
          email: 'maria@email.com',
          telefone: '(12) 97777-7777'
        }];
        filename = 'template-agentes.xlsx';
        break;
      case 'grupos':
        template = [{
          nome: 'Associação Cultural XYZ',
          categoria: 'Cultura Caiçara',
          bairro: 'Castelhanos',
          comunidadeTradicional: 'Bonete',
          cnpj: '00.000.000/0001-00',
          responsavel: 'Pedro Oliveira',
          email: 'contato@xyz.com',
          telefone: '(12) 96666-6666'
        }];
        filename = 'template-grupos.xlsx';
        break;
      case 'espacos':
        template = [{
          nome: 'Casa de Cultura',
          tipo: 'Espaço Público',
          bairro: 'Vila',
          endereco: 'Rua Principal, 123',
          responsavel: 'Prefeitura',
          telefone: '(12) 3896-0000'
        }];
        filename = 'template-espacos.xlsx';
        break;
      case 'projetos':
        template = [{
          edital: 'Edital 010/2020',
          ano: 2020,
          proponente: 'João da Silva',
          tipoPessoa: 'Pessoa Física',
          nomeProjeto: 'Festival Cultural Caiçara',
          categoria: 'Música',
          areaAtuacao: 'Cultura Popular',
          email: 'joao@email.com',
          telefone: '(12) 97777-7777',
          enderecoCompleto: 'Rua da Praia, 123, Bairro Vila - Ilhabela/SP',
          bairro: 'Vila',
          comunidadeTradicional: 'Bonete',
          cpf_cnpj: '***.***.***-00',
          faixa: 'Faixa 1 - até R$80.000,00',
          valor: 20000,
          status: 'Contemplado'
        }];
        filename = 'template-projetos.xlsx';
        break;
    }

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    XLSX.writeFile(wb, filename);
  };

  // Função para salvar dados no servidor
  const saveToServer = async () => {
    if (Object.keys(parsedData).length === 0) {
      alert('❌ Nenhum dado para salvar!');
      return;
    }
    
    try {
      setLoading(true);
      console.log('💾 [SAVE] Salvando dados...');
      
      // Inclui os links customizados de editais junto com os dados
      const dataWithLinks = {
        ...(normalizeProjetosOnParsed({ ...parsedData }) as ParsedData),
        customEditalLinks,
        _cadastroSavedAt: new Date().toISOString(),
      };
      const dataToSave = JSON.stringify(dataWithLinks);
      
      const { projectId, publicAnonKey } = await import('/utils/supabase/info');
      const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-2320c79f/save-data`;
      
      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: dataToSave
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar no servidor');
      }
      
      console.log('✅ [CLIENT] Dados salvos no servidor com sucesso!');
      
      // 💾 BACKUP NO LOCALSTORAGE
      localStorage.setItem('editais_imported_data', dataToSave);
      
      alert('✅ Dados salvos com sucesso no servidor!');
      
    } catch (err) {
      console.error('❌ Erro ao salvar:', err);
      alert(`❌ Erro ao salvar dados: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Calcular estatísticas dos projetos
  const projetosStats = () => {
    if (!parsedData.projetos || parsedData.projetos.length === 0) {
      return { totalInscritos: 0, contemplados: 0, suplentes: 0, naoContemplados: 0, pessoas: 0, valorTotal: 0, valorContemplados: 0, porEdital: [] as any[] };
    }

    const totalInscritos = parsedData.projetos.length;
    
    const isContemplado = (p: any) => isProjetoContemplado(p);
    
    const isSuplente = (p: any) => {
      const status = (p.status || p.Status || '').toLowerCase();
      return status.includes('suplente');
    };

    const getValor = (p: any) => getProjetoValorNormalizado(p);
    
    const contemp = parsedData.projetos.filter(isContemplado);
    const supl = parsedData.projetos.filter(isSuplente);
    const contemplados = contemp.length;
    const suplentes = supl.length;
    const naoContemplados = totalInscritos - contemplados - suplentes;
    
    const pessoas = new Set(parsedData.projetos.map(p => 
      p.cpf_cnpj || p['CPF/CNPJ'] || p.cpf || p.cnpj || p.proponente || p.Proponente || p.nome || p.Nome || ''
    ).filter(v => v !== '')).size;

    const valorTotal = parsedData.projetos.reduce((acc, p) => acc + getValor(p), 0);
    
    // 🎯 Valor INVESTIDO = apenas dos contemplados
    const valorContemplados = contemp.reduce((acc, p) => acc + getValor(p), 0);

    // 🎯 Estatísticas POR EDITAL + ANO (separados)
    const editaisMap = new Map<string, any[]>();
    parsedData.projetos.forEach(p => {
      const edital = p._editalOrigem || p.edital || p.Edital || 'Sem edital';
      const ano = Number(p._anoOrigem || p.ano || p.Ano || 0);
      const chave = `${edital}||${ano}`;
      if (!editaisMap.has(chave)) editaisMap.set(chave, []);
      editaisMap.get(chave)!.push(p);
    });
    
    const porEditalRaw = Array.from(editaisMap.entries()).map(([chave, projs]) => {
      const contProjs = projs.filter(isContemplado);
      const [nomeBase, anoStr] = chave.split('||');
      const ano = Number(anoStr || 0);
      const nome = ano > 0 ? `${nomeBase} (${ano})` : nomeBase;
      return {
        chave,
        sourceChave: chave,
        nomeBase,
        nome,
        ano,
        total: projs.length,
        contemplados: contProjs.length,
        suplentes: projs.filter(isSuplente).length,
        naoContemplados: projs.length - contProjs.length - projs.filter(isSuplente).length,
        valor: projs.reduce((acc, p) => acc + getValor(p), 0),
        valorContemplados: contProjs.reduce((acc, p) => acc + getValor(p), 0),
      };
    });

    const ov = parsedData.editalResumoOverrides || {};
    const porEdital = porEditalRaw.map(row => {
      const o = ov[row.chave];
      if (!o) return row;
      const nomeBase = o.nomeBase != null && String(o.nomeBase).trim() !== '' ? String(o.nomeBase).trim() : row.nomeBase;
      const ano = o.ano != null && Number.isFinite(o.ano) ? Number(o.ano) : row.ano;
      const nome = ano > 0 ? `${nomeBase} (${ano})` : nomeBase;
      const total = o.total != null && Number.isFinite(o.total) ? Math.max(0, Math.floor(o.total)) : row.total;
      const contemplados = o.contemplados != null && Number.isFinite(o.contemplados) ? Math.max(0, Math.floor(o.contemplados)) : row.contemplados;
      const suplentes = o.suplentes != null && Number.isFinite(o.suplentes) ? Math.max(0, Math.floor(o.suplentes)) : row.suplentes;
      const naoContemplados =
        o.naoContemplados != null && Number.isFinite(o.naoContemplados)
          ? Math.max(0, Math.floor(o.naoContemplados))
          : Math.max(0, total - contemplados - suplentes);
      const valor = o.valor != null && Number.isFinite(o.valor) ? o.valor : row.valor;
      const valorContemplados =
        o.valorContemplados != null && Number.isFinite(o.valorContemplados) ? o.valorContemplados : row.valorContemplados;
      return {
        ...row,
        nomeBase,
        nome,
        ano,
        total,
        contemplados,
        suplentes,
        naoContemplados,
        valor,
        valorContemplados,
        aproveitamentoPct:
          o.aproveitamentoPct != null && Number.isFinite(o.aproveitamentoPct)
            ? Math.max(0, Math.min(100, o.aproveitamentoPct))
            : undefined,
      };
    }).sort((a, b) => (b.ano || 0) - (a.ano || 0));

    return { totalInscritos, contemplados, suplentes, naoContemplados, pessoas, valorTotal, valorContemplados, porEdital };
  };

  const stats = projetosStats();

  const projetosComTradCount = useMemo(() => {
    const projs = parsedData.projetos || [];
    return projs.filter((projeto: any) => {
      if (projeto.eh_comunidade_tradicional === true) return true;
      const comDisplay = String(
        projeto.comunidadeTradicional ||
          getFieldFromRow(projeto,
            'comunidade_tradicional', 'comunidade tradicional', 'Comunidade Tradicional',
            'COMUNIDADE TRADICIONAL', 'comunidadeTradicional', 'povo_tradicional',
            'comunidade'
          ) ||
          ''
      ).trim();
      if (!comDisplay || comDisplay.toLowerCase() === 'não' || comDisplay === '-' || comDisplay === 'N/I') return false;
      return (
        COMUNIDADES_TRADICIONAIS.some((c) => c.toLowerCase() === comDisplay.toLowerCase()) ||
        comDisplay.toLowerCase().includes('sim') ||
        comDisplay.toLowerCase().includes('yes') ||
        comDisplay.toLowerCase().includes('quilombo') ||
        comDisplay.toLowerCase().includes('caiçara') ||
        comDisplay.toLowerCase().includes('indígena') ||
        comDisplay.toLowerCase().includes('indigena')
      );
    }).length;
  }, [parsedData.projetos]);

  const isImageUrl = (url: string): boolean => {
    const u = String(url || '').toLowerCase();
    return (
      u.includes('image') ||
      u.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/) !== null
    );
  };

  const isVideoUrl = (url: string): boolean => {
    const u = String(url || '').toLowerCase();
    return (
      u.includes('youtube.com') ||
      u.includes('youtu.be') ||
      u.includes('vimeo.com') ||
      u.includes('video') ||
      u.match(/\.(mp4|webm|mov|m4v)(\?|$)/) !== null
    );
  };

  const getEditalAnoKey = (p: any): string => {
    const edital = String(p._editalOrigem || p.edital || p.Edital || 'Sem edital');
    const ano = Number(p._anoOrigem || p.ano || p.Ano || 0);
    return `${edital}||${ano}`;
  };

  const saveResumoEditalRow = (ed: any, rowEl: HTMLElement | null) => {
    if (!rowEl) return;
    const getField = (name: string) => (rowEl.querySelector(`[name="${name}"]`) as HTMLInputElement | null)?.value ?? '';

    const sk = String(ed.sourceChave || ed.chave);
    const nomeBaseNew = getField(`resumo_nomeBase_${sk}`).trim();
    const anoNew = parseIntOptional(getField(`resumo_ano_${sk}`));
    const totalNew = parseIntOptional(getField(`resumo_total_${sk}`));
    const contNew = parseIntOptional(getField(`resumo_contemplados_${sk}`));
    const suplNew = parseIntOptional(getField(`resumo_suplentes_${sk}`));
    const naoNew = parseIntOptional(getField(`resumo_nao_${sk}`));
    const valorNew = parseBRLNumberOptional(getField(`resumo_valor_${sk}`));
    const valorInvNew = parseBRLNumberOptional(getField(`resumo_valor_inv_${sk}`));
    const apctNew = parsePercentOptional(getField(`resumo_aproveitamento_${sk}`));

    const [nomeBaseOrig, anoOrigStr] = sk.split('||');
    const anoOrig = Number(anoOrigStr || 0);
    const nomeBaseEff = nomeBaseNew || nomeBaseOrig || 'Sem edital';
    const anoEff = anoNew !== undefined ? anoNew : anoOrig;
    const newChave = makeEditalAnoChave(nomeBaseEff, anoEff);

    const nextOverrides: Record<string, EditalResumoOverride> = { ...(parsedData.editalResumoOverrides || {}) };
    const oldChave = ed.chave;

    const patch: EditalResumoOverride = {};
    if (nomeBaseNew && nomeBaseNew !== nomeBaseOrig) patch.nomeBase = nomeBaseNew;
    if (anoNew !== undefined && anoNew !== anoOrig) patch.ano = anoNew;
    if (totalNew !== undefined && totalNew !== ed.total) patch.total = totalNew;
    if (contNew !== undefined && contNew !== ed.contemplados) patch.contemplados = contNew;
    if (suplNew !== undefined && suplNew !== ed.suplentes) patch.suplentes = suplNew;
    if (naoNew !== undefined && naoNew !== ed.naoContemplados) patch.naoContemplados = naoNew;
    if (valorNew !== undefined && valorNew !== ed.valor) patch.valor = valorNew;
    if (valorInvNew !== undefined && valorInvNew !== ed.valorContemplados) patch.valorContemplados = valorInvNew;
    if (apctNew !== undefined) {
      const baselinePct = ed.total > 0 ? Math.round((ed.contemplados / ed.total) * 100) : 0;
      if (apctNew !== baselinePct) patch.aproveitamentoPct = apctNew;
    }

    let projetosAtual = [...(parsedData.projetos || [])];
    const oldLabel = ed.nome;
    const newLabel = anoEff > 0 ? `${nomeBaseEff} (${anoEff})` : nomeBaseEff;
    const precisaRenomearGrupo = newChave !== oldChave;
    if (precisaRenomearGrupo) {
      delete nextOverrides[oldChave];
      projetosAtual = projetosAtual.map(p => {
        if (getEditalAnoKey(p) !== oldChave) return p;
        return {
          ...p,
          _editalOrigem: nomeBaseEff,
          edital: nomeBaseEff,
          Edital: nomeBaseEff,
          _anoOrigem: anoEff,
          ano: anoEff,
          Ano: anoEff,
        };
      });
    }

    let linksNext = customEditalLinks;
    if (precisaRenomearGrupo && oldLabel && newLabel && oldLabel !== newLabel) {
      linksNext = { ...customEditalLinks };
      const direct = linksNext[oldLabel];
      if (direct) {
        delete linksNext[oldLabel];
        linksNext[newLabel] = { ...direct, ...(linksNext[newLabel] || {}) };
      }
    }

    if (Object.keys(patch).length > 0) {
      nextOverrides[newChave] = { ...(nextOverrides[newChave] || {}), ...patch };
    } else if (!precisaRenomearGrupo) {
      delete nextOverrides[newChave];
    }

    const newParsed: ParsedData = {
      ...parsedData,
      projetos: projetosAtual,
      editalResumoOverrides: nextOverrides,
    };

    setParsedData(newParsed);
    if (linksNext !== customEditalLinks) setCustomEditalLinks(linksNext);
    if (filtroEdital === oldChave && newChave !== oldChave) setFiltroEdital(newChave);
    void persistData(newParsed, linksNext);
  };

  const clearResumoEditalRow = (ed: any) => {
    const nextOverrides: Record<string, EditalResumoOverride> = { ...(parsedData.editalResumoOverrides || {}) };
    delete nextOverrides[ed.chave];
    const newParsed: ParsedData = { ...parsedData, editalResumoOverrides: nextOverrides };
    setParsedData(newParsed);
    void persistData(newParsed);
  };

  const toggleDemandaOfertaNaHome = (chave: string) => {
    const cur = new Set(parsedData.demandaOfertaExcluidosHome || []);
    if (cur.has(chave)) cur.delete(chave);
    else cur.add(chave);
    const newParsed: ParsedData = { ...parsedData, demandaOfertaExcluidosHome: [...cur] };
    setParsedData(newParsed);
    void persistData(newParsed);
  };

  const getProjetosByGrupoEditalAno = (ed: any): any[] => {
    return (parsedData.projetos || []).filter(p => getEditalAnoKey(p) === ed.chave);
  };
  const matchesFiltroEdital = (p: any): boolean => {
    if (!filtroEdital) return true;
    // filtroEdital agora usa chave edital||ano
    return getEditalAnoKey(p) === filtroEdital;
  };
  const filtroEditalLabel = !filtroEdital
    ? ''
    : (stats.porEdital.find((ed: any) => ed.chave === filtroEdital)?.nome || filtroEdital);

  // Evita "filtro fantasma": se o edital filtrado não existe mais após upload/renomeio, limpa o filtro.
  useEffect(() => {
    if (filtroEdital && !stats.porEdital.some((ed: any) => ed.chave === filtroEdital)) {
      setFiltroEdital('');
      setTablePage(prev => ({ ...prev, projetos: 0 }));
    }
  }, [filtroEdital, stats.porEdital]);

  import { ADMIN_PIN } from '../config/admin';

  const adminPinEnv = ADMIN_PIN;
  const adminPinRequired = true;

  if (!adminAuthed) {
    return (
      <div className="min-h-screen bg-[#fdfcff] py-16 px-6">
        <div className="max-w-md mx-auto">
          <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#1b1b1f' }}>
                Acesso ao painel
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {adminPinRequired
                  ? 'Informe o PIN configurado em VITE_ADMIN_PIN no arquivo .env do projeto.'
                  : 'Nenhum PIN configurado. Clique em "Entrar" para acessar. Para proteger o painel, crie um arquivo .env com VITE_ADMIN_PIN=seu_pin e reinicie o servidor.'}
              </Typography>
              {adminPinRequired && (
                <TextField
                  fullWidth
                  type="password"
                  label="PIN de acesso"
                  value={adminLoginPin}
                  onChange={(e) => setAdminLoginPin(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && adminLoginPin.trim() === adminPinEnv) {
                      setAdminAuthed(true);
                      setAdminLoginPin('');
                    }
                  }}
                  sx={{ mb: 2 }}
                  autoComplete="current-password"
                />
              )}
              <Button
                fullWidth
                variant="contained"
                sx={{ bgcolor: '#0b57d0', fontWeight: 700, py: 1.5, mb: 1 }}
                onClick={() => {
                  if (adminPinRequired) {
                    if (adminLoginPin.trim() === adminPinEnv) {
                      setAdminAuthed(true);
                      setAdminLoginPin('');
                    } else {
                      alert('PIN incorreto.');
                    }
                  } else {
                    setAdminAuthed(true);
                  }
                }}
              >
                {adminPinRequired ? 'Entrar' : 'Acessar painel'}
              </Button>
              <Button fullWidth variant="text" onClick={() => onNavigate('home')} sx={{ fontWeight: 600 }}>
                ← Voltar ao site
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcff] py-12 pb-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Button onClick={() => onNavigate('home')} variant="text" sx={{ color: '#0b57d0', fontWeight: 700 }}>
            ← Voltar para Home
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<LogOut size={18} />}
            onClick={() => {
              setAdminAuthed(false);
              onNavigate('home');
            }}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Sair do painel
          </Button>
        </div>

        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 4 }}>
            <div className="flex items-center gap-3 mb-6">
              <Database className="text-[#0b57d0]" size={32} />
              <div>
                <h1 className="text-3xl font-black text-[#1b1b1f]">Painel Administrativo</h1>
                <p className="text-sm text-[#5f5f6a]">Importação e gerenciamento de dados culturais de Ilhabela</p>
              </div>
            </div>

            {/* Informação de exemplo de editais */}
            <Box sx={{ mb: 4, p: 3, bgcolor: '#e8f4ff', borderRadius: 2, border: '1px solid #b3d9ff' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>📝 Exemplos de editais:</strong> Edital 010/2020, Edital 011/2020, Edital 013/2020, PNAB 2024, Lei Aldir Blanc 2020
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>📅 Anos:</strong> Digite o ano de publicação (ex: 2020, 2024)
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(false)}>
                ✅ Arquivo importado com sucesso!
              </Alert>
            )}

            {actionFeedback && (
              <Alert severity={actionFeedback.type} sx={{ mb: 3 }} onClose={() => setActionFeedback(null)}>
                {actionFeedback.text}
              </Alert>
            )}

            <Alert severity="warning" sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2">
                  🛟 Recuperação de dados: restaure a exclusão ou recarregue do servidor.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    color="warning"
                    size="small"
                    onClick={restoreLastDeletion}
                    disabled={!hasUndoSnapshot || recoveringData}
                    sx={{ fontWeight: 700, textTransform: 'none' }}
                  >
                    Desfazer última exclusão
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={loadDataFromServer}
                    disabled={recoveringData}
                    sx={{ fontWeight: 700, textTransform: 'none' }}
                  >
                    {recoveringData ? 'Recarregando...' : 'Restaurar do servidor'}
                  </Button>
                </Box>
              </Box>
            </Alert>

            <Tabs value={tabValue} onChange={(e, newValue) => { setTabValue(newValue); setSelectedRows(new Set()); }} sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="🗺️ Mapeamento 2020" />
              <Tab label="📋 Projetos / Editais" />
            </Tabs>

            {/* ABA: MAPEAMENTO 2020 — contém Agentes, Grupos e Espaços */}
            {tabValue === 0 && (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <strong>🎯 Mapeamento Cultural 2020:</strong> Base de dados com agentes culturais, grupos/coletivos e espaços culturais de Ilhabela.
                  Gerencie as 3 categorias abaixo.
                </Alert>

                {/* Resumo geral do Mapeamento */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
                  <Paper sx={{ p: 2, flex: 1, minWidth: 140, bgcolor: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#2e7d32' }}>{(parsedData.agentes?.length || 0) + (parsedData.grupos?.length || 0) + (parsedData.espacos?.length || 0)}</Typography>
                    <Typography variant="body2" sx={{ color: '#388e3c', fontWeight: 600 }}>🗺️ Base Geral</Typography>
                  </Paper>
                  <Paper sx={{ p: 2, flex: 1, minWidth: 140, bgcolor: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#1565c0' }}>{parsedData.agentes?.length || 0}</Typography>
                    <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 600 }}>👤 Agentes</Typography>
                  </Paper>
                  <Paper sx={{ p: 2, flex: 1, minWidth: 140, bgcolor: '#fff3e0', border: '1px solid #ffcc80', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#e65100' }}>{parsedData.grupos?.length || 0}</Typography>
                    <Typography variant="body2" sx={{ color: '#ef6c00', fontWeight: 600 }}>👥 Grupos</Typography>
                  </Paper>
                  <Paper sx={{ p: 2, flex: 1, minWidth: 140, bgcolor: '#f3e5f5', border: '1px solid #ce93d8', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#7b1fa2' }}>{parsedData.espacos?.length || 0}</Typography>
                    <Typography variant="body2" sx={{ color: '#8e24aa', fontWeight: 600 }}>🏛️ Espaços</Typography>
                  </Paper>
                </Box>

                {/* 🔄 BOTÃO REPROCESSAR — no topo da aba Mapeamento */}
                <Alert severity="info" sx={{ mb: 3 }} icon={<RefreshCw size={18} />}>
                  <strong>Dados já importados sem gênero/raça/PcD?</strong> Use o botão <strong>"🔄 Reprocessar Dados"</strong> no final da página para normalizar campos de diversidade, email, telefone e endereço em TODOS os registros existentes sem reimportar.
                </Alert>

                <Typography variant="h5" sx={{ mb: 2, fontWeight: 800, color: '#0b57d0', display: 'flex', alignItems: 'center', gap: 1 }}>
                  🗺️ Base Geral do Mapeamento
                </Typography>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <TextField
                    fullWidth
                    label="Nome Completo do Edital"
                    value={editalNome}
                    onChange={(e) => setEditalNome(e.target.value)}
                    placeholder="Ex: Mapeamento Cultural Ilhabela 2020"
                    variant="outlined"
                  />
                  <TextField
                    fullWidth
                    label="Ano do Edital"
                    value={editalAno}
                    onChange={(e) => setEditalAno(e.target.value)}
                    placeholder="Ex: 2020"
                    variant="outlined"
                  />
                </div>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => baixarTemplate('mapeamento')}
                    sx={{ color: '#0b57d0', borderColor: '#0b57d0' }}
                  >
                    Baixar Template
                  </Button>
                  
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={<Upload />}
                    sx={{ bgcolor: '#0b57d0', '&:hover': { bgcolor: '#084ba8' } }}
                  >
                    Upload Planilha Excel
                    <input
                      ref={fileInputMapeamento}
                      type="file"
                      hidden
                      accept=".xlsx,.xls"
                      onChange={(e) => handleFileUpload(e, 'mapeamento')}
                    />
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<MapPin />}
                    onClick={recalcularGPS}
                    disabled={!parsedData.mapeamento || parsedData.mapeamento.length === 0}
                    sx={{ color: '#00A38C', borderColor: '#00A38C' }}
                  >
                    Recalcular GPS
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<RefreshCw />}
                    onClick={removerDuplicadosMapeamento}
                    disabled={!parsedData.mapeamento || parsedData.mapeamento.length === 0}
                    sx={{ color: '#ff9800', borderColor: '#ff9800' }}
                  >
                    Remover Duplicados
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<Trash2 />}
                    onClick={() => {
                      if (window.confirm('⚠️ Tem certeza que deseja limpar todos os dados do Mapeamento 2020?')) {
                        saveUndoSnapshot('Exclusão de planilha do Mapeamento 2020');
                        const newPD = { ...parsedData, mapeamento: [] as any[] };
                        setParsedData(newPD);
                        persistData(newPD);
                        alert('🗑️ Mapeamento limpo com sucesso!');
                      }
                    }}
                    disabled={!parsedData.mapeamento || parsedData.mapeamento.length === 0}
                    sx={{ color: '#ef4444', borderColor: '#ef4444' }}
                  >
                    Excluir Planilha Importada
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={saveToServer}
                    disabled={loading}
                    sx={{ 
                      bgcolor: '#00A38C', 
                      '&:hover': { bgcolor: '#008a74' },
                      fontWeight: 700
                    }}
                  >
                    💾 Salvar no Servidor
                  </Button>
                </Box>

                {parsedData.mapeamento && parsedData.mapeamento.length > 0 && (
                  <>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                      📊 Preview: {parsedData.mapeamento.length} agentes do Mapeamento 2020
                    </Typography>

                    <TableContainer component={Paper} sx={{ maxHeight: 500, mb: 3 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff', width: 90 }}>Ações</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Nome</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Categoria</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Bairro</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Comunidade Trad.</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>CPF/CNPJ</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Localização</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {parsedData.mapeamento.slice(tablePage.mapeamento * rowsPerPage.mapeamento, tablePage.mapeamento * rowsPerPage.mapeamento + rowsPerPage.mapeamento).map((item, idx) => {
                            const realIdx = tablePage.mapeamento * rowsPerPage.mapeamento + idx;
                            const isEditing = editingRow?.tab === 'mapeamento' && editingRow?.index === realIdx;
                            // 🔧 FIX: Garante que sempre pega o NOME da comunidade (string) e não o booleano eh_comunidade_tradicional
                            const comVal = typeof item.comunidadeTradicional === 'string' ? item.comunidadeTradicional : (item.eh_comunidade_tradicional === true ? 'Sim' : '');
                            const hasCom = comVal && comVal !== 'Não' && comVal !== '-' && comVal.toLowerCase() !== 'false' && comVal.toLowerCase() !== 'true';
                            return (
                            <TableRow key={idx} sx={{ bgcolor: isEditing ? '#fffde7' : 'inherit' }}>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                {isEditing ? (
                                  <>
                                    <Button size="small" color="success" onClick={saveEditing} sx={{ minWidth: 32, p: 0.5 }} title="Salvar"><CheckCircle size={16} /></Button>
                                    <Button size="small" color="inherit" onClick={cancelEditing} sx={{ minWidth: 32, p: 0.5 }} title="Cancelar"><RefreshCw size={14} /></Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="small" color="primary" onClick={() => startEditing('mapeamento', realIdx, item)} sx={{ minWidth: 32, p: 0.5 }} title="Editar"><Edit size={14} /></Button>
                                    <Button size="small" color="error" onClick={() => deleteRow('mapeamento', realIdx)} sx={{ minWidth: 32, p: 0.5 }} title="Excluir"><Trash2 size={14} /></Button>
                                  </>
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <TextField size="small" value={editValues.nome || editValues.Nome || ''} onChange={e => setEditValues(prev => ({ ...prev, nome: e.target.value, Nome: e.target.value }))} sx={{ minWidth: 120, '& input': { fontSize: '0.8rem', py: 0.5 } }} />
                                ) : (item.nome || item.Nome || '-')}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <TextField size="small" value={editValues.categoria || editValues.Categoria || ''} onChange={e => setEditValues(prev => ({ ...prev, categoria: e.target.value, Categoria: e.target.value }))} sx={{ minWidth: 100, '& input': { fontSize: '0.8rem', py: 0.5 } }} />
                                ) : (item.categoria || item.Categoria || '-')}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <TextField size="small" value={editValues.bairro || editValues.Bairro || ''} onChange={e => setEditValues(prev => ({ ...prev, bairro: e.target.value, Bairro: e.target.value }))} sx={{ minWidth: 100, '& input': { fontSize: '0.8rem', py: 0.5 } }} />
                                ) : (item.bairro || item.Bairro || '-')}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <FormControl size="small" sx={{ minWidth: 130 }}>
                                    <Select value={editValues.comunidadeTradicional || ''} onChange={e => setEditValues(prev => ({ ...prev, comunidadeTradicional: e.target.value }))} displayEmpty sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.5 } }} MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}>
                                      <MenuItem value=""><em>Nenhuma</em></MenuItem>
                                      <MenuItem value="Não" sx={{ borderBottom: '1px solid #eee' }}>Não pertence</MenuItem>
                                      {COMUNIDADES_TRADICIONAIS.map(c => <MenuItem key={c} value={c} sx={{ fontSize: '0.8rem' }}>{c}</MenuItem>)}
                                    </Select>
                                  </FormControl>
                                ) : hasCom ? (
                                  <Chip label={`🏘️ ${comVal.length > 16 ? comVal.substring(0, 16) + '…' : comVal}`} size="small" sx={{ bgcolor: '#e0f2f1', color: '#00695c', fontWeight: 700, fontSize: '0.68rem', height: 22 }} title={comVal} />
                                ) : (
                                  <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>
                                )}
                              </TableCell>
                              <TableCell>{item.cpf || item.cnpj || item.cpf_cnpj || '-'}</TableCell>
                              <TableCell>
                                {item.lat && item.lng && item.lat !== 0 && item.lng !== 0 ? (
                                  <Chip label="✓ Com mapa" size="small" color="success" />
                                ) : (
                                  <Chip label="Sem coord." size="small" color="default" />
                                )}
                              </TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      <TablePagination
                        component="div"
                        count={parsedData.mapeamento?.length || 0}
                        page={tablePage.mapeamento}
                        onPageChange={(_, p) => setTablePage(prev => ({ ...prev, mapeamento: p }))}
                        rowsPerPage={rowsPerPage.mapeamento}
                        onRowsPerPageChange={e => { setRowsPerPage(prev => ({ ...prev, mapeamento: parseInt(e.target.value) })); setTablePage(prev => ({ ...prev, mapeamento: 0 })); }}
                        rowsPerPageOptions={[25, 50, 100, 200]}
                        labelRowsPerPage="Por página:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                      />
                    </TableContainer>
                  </>
                )}

                <Divider sx={{ my: 4 }} />

                {/* SUB-SEÇÃO: AGENTES CULTURAIS */}
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 800, color: '#0b57d0', display: 'flex', alignItems: 'center', gap: 1 }}>
                  👤 Agentes Culturais
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Agentes culturais individuais (pessoas físicas) cadastrados no Mapeamento 2020.
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => baixarTemplate('agentes')}
                    sx={{ color: '#0b57d0', borderColor: '#0b57d0' }}
                  >
                    Baixar Template
                  </Button>
                  
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={<Upload />}
                    sx={{ bgcolor: '#0b57d0', '&:hover': { bgcolor: '#084ba8' } }}
                  >
                    Upload Planilha de Agentes
                    <input
                      ref={fileInputAgentes}
                      type="file"
                      hidden
                      accept=".xlsx,.xls"
                      onChange={(e) => handleFileUpload(e, 'agentes')}
                    />
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<RefreshCw />}
                    onClick={removerDuplicadosAgentes}
                    disabled={!parsedData.agentes || parsedData.agentes.length === 0}
                    sx={{ color: '#ff9800', borderColor: '#ff9800' }}
                  >
                    Remover Duplicados
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<Trash2 />}
                    onClick={() => {
                      if (window.confirm('⚠️ Tem certeza que deseja limpar todos os dados de Agentes?')) {
                        saveUndoSnapshot('Exclusão de planilha de Agentes');
                        const newPD = { ...parsedData, agentes: [] as any[] };
                        setParsedData(newPD);
                        persistData(newPD);
                        alert('🗑️ Agentes limpos com sucesso!');
                      }
                    }}
                    disabled={!parsedData.agentes || parsedData.agentes.length === 0}
                    sx={{ color: '#ef4444', borderColor: '#ef4444' }}
                  >
                    Excluir Planilha Importada
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={saveToServer}
                    disabled={loading}
                    sx={{ 
                      bgcolor: '#00A38C', 
                      '&:hover': { bgcolor: '#008a74' },
                      fontWeight: 700
                    }}
                  >
                    💾 Salvar no Servidor
                  </Button>
                </Box>

                {parsedData.agentes && parsedData.agentes.length > 0 && (
                  <>
                    <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
                      ✅ {parsedData.agentes.length} agentes importados
                    </Alert>

                    {/* 📊 RESUMO COMPACTO DE INDICADORES */}
                    {(() => {
                      const ag = parsedData.agentes || [];
                      const total = ag.length;
                      if (total === 0) return null;
                      const genPreenchido = ag.filter((a: any) => (a.genero || '').trim()).length;
                      const racPreenchido = ag.filter((a: any) => (a.raca || '').trim()).length;
                      const idadePreenchido = ag.filter((a: any) => { const n = parseInt(a.idade); return n > 0 && n < 130; }).length;
                      const pcdPreenchido = ag.filter((a: any) => (a.deficiencia || '').trim()).length;
                      const comTrad = ag.filter((a: any) => a.eh_comunidade_tradicional === true).length;
                      return (
                        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                          <Chip icon={<Users size={14} />} label={`Gênero: ${genPreenchido}/${total}`} size="small" sx={{ fontWeight: 600, bgcolor: genPreenchido > 0 ? '#e3f2fd' : '#f5f5f5' }} />
                          <Chip label={`Raça/Cor: ${racPreenchido}/${total}`} size="small" sx={{ fontWeight: 600, bgcolor: racPreenchido > 0 ? '#fff3e0' : '#f5f5f5' }} />
                          <Chip label={`Idade: ${idadePreenchido}/${total}`} size="small" sx={{ fontWeight: 600, bgcolor: idadePreenchido > 0 ? '#e8f5e9' : '#f5f5f5' }} />
                          <Chip label={`PcD: ${pcdPreenchido}/${total}`} size="small" sx={{ fontWeight: 600, bgcolor: pcdPreenchido > 0 ? '#e8eaf6' : '#f5f5f5' }} />
                          <Chip label={`🏘️ Com. Trad.: ${comTrad}/${total}`} size="small" sx={{ fontWeight: 600, bgcolor: comTrad > 0 ? '#e0f2f1' : '#f5f5f5' }} />
                        </Box>
                      );
                    })()}

                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                      📊 Preview: {parsedData.agentes.length} agentes culturais
                    </Typography>

                    <TableContainer component={Paper} sx={{ maxHeight: 500, mb: 3 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff', width: 90 }}>Ações</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Nome</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Categoria</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Bairro</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Comunidade Trad.</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>CPF/CNPJ 🔒</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Email 🔒</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Telefone 🔒</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Endereço 🔒</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>Gênero</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>Raça/Cor</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>Idade</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>PcD</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>📎 Documentos</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {parsedData.agentes.slice(tablePage.agentes * rowsPerPage.agentes, tablePage.agentes * rowsPerPage.agentes + rowsPerPage.agentes).map((item, idx) => {
                            const realIdx = tablePage.agentes * rowsPerPage.agentes + idx;
                            const isEditing = editingRow?.tab === 'agentes' && editingRow?.index === realIdx;
                            const emailRaw = item.email || item.Email || '';
                            const telRaw = item.telefone || item.Telefone || '';
                            const cpfRaw = item.cpf_cnpj || item.cpf || item.cnpj || '';
                            const endRaw = item.enderecoCompleto || item.endereco || item.Endereco || '';
                            // 🔧 FIX: Garante que sempre pega o NOME da comunidade (string) e não o booleano eh_comunidade_tradicional
                            const comVal = typeof item.comunidadeTradicional === 'string' ? item.comunidadeTradicional : (item.eh_comunidade_tradicional === true ? 'Sim' : '');
                            const hasCom = comVal && comVal !== 'Não' && comVal !== '-' && comVal.toLowerCase() !== 'false' && comVal.toLowerCase() !== 'true';
                            return (
                            <TableRow key={idx} sx={{ bgcolor: isEditing ? '#fffde7' : 'inherit' }}>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                {isEditing ? (
                                  <>
                                    <Button size="small" color="success" onClick={saveEditing} sx={{ minWidth: 32, p: 0.5 }}><CheckCircle size={16} /></Button>
                                    <Button size="small" color="inherit" onClick={cancelEditing} sx={{ minWidth: 32, p: 0.5 }}><RefreshCw size={14} /></Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="small" color="primary" onClick={() => startEditing('agentes', realIdx, item)} sx={{ minWidth: 32, p: 0.5 }}><Edit size={14} /></Button>
                                    <Button size="small" color="error" onClick={() => deleteRow('agentes', realIdx)} sx={{ minWidth: 32, p: 0.5 }}><Trash2 size={14} /></Button>
                                  </>
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <TextField size="small" value={editValues.nome || ''} onChange={e => setEditValues(prev => ({ ...prev, nome: e.target.value }))} sx={{ minWidth: 120, '& input': { fontSize: '0.8rem', py: 0.5 } }} />
                                ) : (item.nome || item.Nome || '-')}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <TextField size="small" value={editValues.categoria || ''} onChange={e => setEditValues(prev => ({ ...prev, categoria: e.target.value }))} sx={{ minWidth: 100, '& input': { fontSize: '0.8rem', py: 0.5 } }} />
                                ) : (item.categoria || item.Categoria || '-')}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <TextField size="small" value={editValues.bairro || ''} onChange={e => setEditValues(prev => ({ ...prev, bairro: e.target.value }))} sx={{ minWidth: 100, '& input': { fontSize: '0.8rem', py: 0.5 } }} />
                                ) : (item.bairro || item.Bairro || '-')}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <FormControl size="small" sx={{ minWidth: 130 }}>
                                    <Select value={editValues.comunidadeTradicional || ''} onChange={e => setEditValues(prev => ({ ...prev, comunidadeTradicional: e.target.value }))} displayEmpty sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.5 } }} MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}>
                                      <MenuItem value=""><em>Nenhuma</em></MenuItem>
                                      <MenuItem value="Não" sx={{ borderBottom: '1px solid #eee' }}>Não pertence</MenuItem>
                                      {COMUNIDADES_TRADICIONAIS.map(c => <MenuItem key={c} value={c} sx={{ fontSize: '0.8rem' }}>{c}</MenuItem>)}
                                    </Select>
                                  </FormControl>
                                ) : hasCom ? (
                                  <Chip label={`🏘️ ${comVal.length > 16 ? comVal.substring(0, 16) + '…' : comVal}`} size="small" sx={{ bgcolor: '#e0f2f1', color: '#00695c', fontWeight: 700, fontSize: '0.68rem', height: 22 }} title={comVal} />
                                ) : (
                                  <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>
                                )}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.7rem', color: '#78909c' }}>
                                {isEditing ? (
                                  <TextField size="small" value={editValues.cpf_cnpj || ''} onChange={e => setEditValues(prev => ({ ...prev, cpf_cnpj: e.target.value }))} sx={{ minWidth: 110, '& input': { fontSize: '0.7rem', py: 0.5 } }} />
                                ) : cpfRaw ? <span title="LGPD">🔒 {anonCPF(cpfRaw)}</span> : '-'}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', color: '#1565c0' }}>
                                {isEditing ? (
                                  <TextField size="small" value={editValues.email || ''} onChange={e => setEditValues(prev => ({ ...prev, email: e.target.value }))} sx={{ minWidth: 120, '& input': { fontSize: '0.75rem', py: 0.5 } }} />
                                ) : emailRaw ? <span title="LGPD">🔒 {anonEmail(emailRaw)}</span> : '-'}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', color: '#424242' }}>
                                {isEditing ? (
                                  <TextField size="small" value={editValues.telefone || ''} onChange={e => setEditValues(prev => ({ ...prev, telefone: e.target.value }))} sx={{ minWidth: 100, '& input': { fontSize: '0.75rem', py: 0.5 } }} />
                                ) : telRaw ? <span title="LGPD">🔒 {anonTelefone(telRaw)}</span> : '-'}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.7rem', color: '#78909c' }}>
                                {isEditing ? (
                                  <TextField size="small" value={editValues.enderecoCompleto || ''} onChange={e => setEditValues(prev => ({ ...prev, enderecoCompleto: e.target.value }))} sx={{ minWidth: 120, '& input': { fontSize: '0.7rem', py: 0.5 } }} />
                                ) : endRaw ? <span title="LGPD">🔒 {anonEndereco(endRaw, item.bairro)}</span> : '-'}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', bgcolor: '#f3f0ff' }}>
                                {isEditing ? (
                                  <FormControl size="small" sx={{ minWidth: 90 }}>
                                    <Select value={editValues.genero || ''} onChange={e => setEditValues(prev => ({ ...prev, genero: e.target.value }))} displayEmpty sx={{ fontSize: '0.7rem', '& .MuiSelect-select': { py: 0.5 } }}>
                                      <MenuItem value=""><em>-</em></MenuItem>
                                      {GENERO_OPTIONS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                                    </Select>
                                  </FormControl>
                                ) : (item.genero ? <Chip label={item.genero.length > 10 ? item.genero.substring(0,10)+'…' : item.genero} size="small" sx={{ bgcolor: (item.genero||'').toLowerCase().includes('feminino') ? '#fce4ec' : '#e3f2fd', fontSize: '0.65rem', height: 20, fontWeight: 600 }} /> : '-')}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', bgcolor: '#f3f0ff' }}>
                                {isEditing ? (
                                  <FormControl size="small" sx={{ minWidth: 90 }}>
                                    <Select value={editValues.raca || ''} onChange={e => setEditValues(prev => ({ ...prev, raca: e.target.value }))} displayEmpty sx={{ fontSize: '0.7rem', '& .MuiSelect-select': { py: 0.5 } }}>
                                      <MenuItem value=""><em>-</em></MenuItem>
                                      <MenuItem value="Branca">Branca</MenuItem>
                                      <MenuItem value="Preta">Preta</MenuItem>
                                      <MenuItem value="Parda">Parda</MenuItem>
                                      <MenuItem value="Amarela">Amarela</MenuItem>
                                      <MenuItem value="Indígena">Indígena</MenuItem>
                                    </Select>
                                  </FormControl>
                                ) : (item.raca ? <Chip label={item.raca.length > 10 ? item.raca.substring(0,10)+'…' : item.raca} size="small" sx={{ bgcolor: '#fff3e0', fontSize: '0.65rem', height: 20, fontWeight: 600 }} /> : '-')}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', bgcolor: '#f3f0ff' }}>
                                {isEditing ? (
                                  <TextField size="small" value={editValues.idade || ''} onChange={e => setEditValues(prev => ({ ...prev, idade: e.target.value }))} sx={{ minWidth: 60, '& input': { fontSize: '0.7rem', py: 0.5 } }} placeholder="Idade ou data nasc." />
                                ) : (() => {
                                  const idadeNum = parseInt(item.idade);
                                  if (idadeNum > 0 && idadeNum < 130) return <span title={item.dataNascimento ? `Nasc: ${item.dataNascimento}` : ''}>{idadeNum} anos</span>;
                                  if (item.idade && item.idade.trim()) return <span>{item.idade}</span>;
                                  return '-';
                                })()}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', bgcolor: '#f3f0ff' }}>
                                {isEditing ? (
                                  <FormControl size="small" sx={{ minWidth: 70 }}>
                                    <Select value={editValues.deficiencia || ''} onChange={e => setEditValues(prev => ({ ...prev, deficiencia: e.target.value }))} displayEmpty sx={{ fontSize: '0.7rem', '& .MuiSelect-select': { py: 0.5 } }}>
                                      <MenuItem value=""><em>-</em></MenuItem>
                                      <MenuItem value="Sim">Sim</MenuItem>
                                      <MenuItem value="Não">Não</MenuItem>
                                      <MenuItem value="Física">Física</MenuItem>
                                      <MenuItem value="Visual">Visual</MenuItem>
                                      <MenuItem value="Auditiva">Auditiva</MenuItem>
                                      <MenuItem value="Intelectual">Intelectual</MenuItem>
                                    </Select>
                                  </FormControl>
                                ) : (item.deficiencia ? <Chip label={item.deficiencia.length > 6 ? item.deficiencia.substring(0,6)+'…' : item.deficiencia} size="small" sx={{ bgcolor: '#e8f5e9', fontSize: '0.65rem', height: 20, fontWeight: 600 }} /> : '-')}
                              </TableCell>

                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      <TablePagination
                        component="div"
                        count={parsedData.agentes?.length || 0}
                        page={tablePage.agentes}
                        onPageChange={(_, p) => setTablePage(prev => ({ ...prev, agentes: p }))}
                        rowsPerPage={rowsPerPage.agentes}
                        onRowsPerPageChange={e => { setRowsPerPage(prev => ({ ...prev, agentes: parseInt(e.target.value) })); setTablePage(prev => ({ ...prev, agentes: 0 })); }}
                        rowsPerPageOptions={[25, 50, 100, 200]}
                        labelRowsPerPage="Por página:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                      />
                    </TableContainer>
                  </>
                )}

                <Divider sx={{ my: 4 }} />

                {/* SUB-SEÇÃO: GRUPOS E COLETIVOS */}
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 800, color: '#0b57d0', display: 'flex', alignItems: 'center', gap: 1 }}>
                  👥 Grupos e Coletivos
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Grupos e coletivos culturais (pessoas jurídicas ou informais) cadastrados no Mapeamento 2020.
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => baixarTemplate('grupos')}
                    sx={{ color: '#0b57d0', borderColor: '#0b57d0' }}
                  >
                    Baixar Template
                  </Button>
                  
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={<Upload />}
                    sx={{ bgcolor: '#0b57d0', '&:hover': { bgcolor: '#084ba8' } }}
                  >
                    Upload Planilha de Grupos
                    <input
                      ref={fileInputGrupos}
                      type="file"
                      hidden
                      accept=".xlsx,.xls"
                      onChange={(e) => handleFileUpload(e, 'grupos')}
                    />
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<RefreshCw />}
                    onClick={removerDuplicadosGrupos}
                    disabled={!parsedData.grupos || parsedData.grupos.length === 0}
                    sx={{ color: '#ff9800', borderColor: '#ff9800' }}
                  >
                    Remover Duplicados
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<Trash2 />}
                    onClick={() => {
                      if (window.confirm('⚠️ Tem certeza que deseja limpar todos os dados de Grupos?')) {
                        saveUndoSnapshot('Exclusão de planilha de Grupos');
                        const newPD = { ...parsedData, grupos: [] as any[] };
                        setParsedData(newPD);
                        persistData(newPD);
                        alert('🗑️ Grupos limpos com sucesso!');
                      }
                    }}
                    disabled={!parsedData.grupos || parsedData.grupos.length === 0}
                    sx={{ color: '#ef4444', borderColor: '#ef4444' }}
                  >
                    Excluir Planilha Importada
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={saveToServer}
                    disabled={loading}
                    sx={{ 
                      bgcolor: '#00A38C', 
                      '&:hover': { bgcolor: '#008a74' },
                      fontWeight: 700
                    }}
                  >
                    💾 Salvar no Servidor
                  </Button>
                </Box>

                {parsedData.grupos && parsedData.grupos.length > 0 && (
                  <>
                    <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
                      ✅ {parsedData.grupos.length} grupos importados
                    </Alert>

                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                      📊 Preview: {parsedData.grupos.length} grupos culturais
                    </Typography>

                    <TableContainer component={Paper} sx={{ maxHeight: 500, mb: 3 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff', width: 90 }}>Ações</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Nome</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Categoria</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Bairro</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Comunidade Trad.</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>CNPJ 🔒</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Responsável</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Email 🔒</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Telefone 🔒</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Endereço 🔒</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>Gênero</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>Raça/Cor</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>Idade</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>PcD</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {parsedData.grupos.slice(tablePage.grupos * rowsPerPage.grupos, tablePage.grupos * rowsPerPage.grupos + rowsPerPage.grupos).map((item, idx) => {
                            const realIdx = tablePage.grupos * rowsPerPage.grupos + idx;
                            const isEditing = editingRow?.tab === 'grupos' && editingRow?.index === realIdx;
                            const emailRaw = item.email || item.Email || '';
                            const telRaw = item.telefone || item.Telefone || '';
                            const cpfRaw = item.cpf_cnpj || item.cnpj || item.CNPJ || '';
                            const endRaw = item.enderecoCompleto || item.endereco || item.Endereco || '';
                            // 🔧 FIX: Garante que sempre pega o NOME da comunidade (string) e não o booleano eh_comunidade_tradicional
                            const comVal = typeof item.comunidadeTradicional === 'string' ? item.comunidadeTradicional : (item.eh_comunidade_tradicional === true ? 'Sim' : '');
                            const hasCom = comVal && comVal !== 'Não' && comVal !== '-' && comVal.toLowerCase() !== 'false' && comVal.toLowerCase() !== 'true';
                            return (
                            <TableRow key={idx} sx={{ bgcolor: isEditing ? '#fffde7' : 'inherit' }}>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                {isEditing ? (
                                  <>
                                    <Button size="small" color="success" onClick={saveEditing} sx={{ minWidth: 32, p: 0.5 }}><CheckCircle size={16} /></Button>
                                    <Button size="small" color="inherit" onClick={cancelEditing} sx={{ minWidth: 32, p: 0.5 }}><RefreshCw size={14} /></Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="small" color="primary" onClick={() => startEditing('grupos', realIdx, item)} sx={{ minWidth: 32, p: 0.5 }}><Edit size={14} /></Button>
                                    <Button size="small" color="error" onClick={() => deleteRow('grupos', realIdx)} sx={{ minWidth: 32, p: 0.5 }}><Trash2 size={14} /></Button>
                                  </>
                                )}
                              </TableCell>
                              <TableCell>{isEditing ? <TextField size="small" value={editValues.nome || ''} onChange={e => setEditValues(prev => ({ ...prev, nome: e.target.value }))} sx={{ minWidth: 120, '& input': { fontSize: '0.8rem', py: 0.5 } }} /> : (item.nome || item.Nome || '-')}</TableCell>
                              <TableCell>{isEditing ? <TextField size="small" value={editValues.categoria || ''} onChange={e => setEditValues(prev => ({ ...prev, categoria: e.target.value }))} sx={{ minWidth: 100, '& input': { fontSize: '0.8rem', py: 0.5 } }} /> : (item.categoria || item.Categoria || '-')}</TableCell>
                              <TableCell>{isEditing ? <TextField size="small" value={editValues.bairro || ''} onChange={e => setEditValues(prev => ({ ...prev, bairro: e.target.value }))} sx={{ minWidth: 100, '& input': { fontSize: '0.8rem', py: 0.5 } }} /> : (item.bairro || item.Bairro || '-')}</TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <FormControl size="small" sx={{ minWidth: 130 }}>
                                    <Select value={editValues.comunidadeTradicional || ''} onChange={e => setEditValues(prev => ({ ...prev, comunidadeTradicional: e.target.value }))} displayEmpty sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.5 } }} MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}>
                                      <MenuItem value=""><em>Nenhuma</em></MenuItem>
                                      <MenuItem value="Não" sx={{ borderBottom: '1px solid #eee' }}>Não pertence</MenuItem>
                                      {COMUNIDADES_TRADICIONAIS.map(c => <MenuItem key={c} value={c} sx={{ fontSize: '0.8rem' }}>{c}</MenuItem>)}
                                    </Select>
                                  </FormControl>
                                ) : hasCom ? (
                                  <Chip label={`🏘️ ${comVal.length > 16 ? comVal.substring(0, 16) + '…' : comVal}`} size="small" sx={{ bgcolor: '#e0f2f1', color: '#00695c', fontWeight: 700, fontSize: '0.68rem', height: 22 }} title={comVal} />
                                ) : <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.7rem', color: '#78909c' }}>{isEditing ? <TextField size="small" value={editValues.cpf_cnpj || editValues.cnpj || ''} onChange={e => setEditValues(prev => ({ ...prev, cpf_cnpj: e.target.value, cnpj: e.target.value }))} sx={{ minWidth: 110, '& input': { fontSize: '0.7rem', py: 0.5 } }} /> : cpfRaw ? <span title="LGPD">🔒 {anonCPF(cpfRaw)}</span> : '-'}</TableCell>
                              <TableCell>{isEditing ? <TextField size="small" value={editValues.responsavel || ''} onChange={e => setEditValues(prev => ({ ...prev, responsavel: e.target.value }))} sx={{ minWidth: 100, '& input': { fontSize: '0.8rem', py: 0.5 } }} /> : (item.responsavel || item.Responsavel || '-')}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', color: '#1565c0' }}>{isEditing ? <TextField size="small" value={editValues.email || ''} onChange={e => setEditValues(prev => ({ ...prev, email: e.target.value }))} sx={{ minWidth: 120, '& input': { fontSize: '0.75rem', py: 0.5 } }} /> : emailRaw ? <span title="LGPD">🔒 {anonEmail(emailRaw)}</span> : '-'}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', color: '#424242' }}>{isEditing ? <TextField size="small" value={editValues.telefone || ''} onChange={e => setEditValues(prev => ({ ...prev, telefone: e.target.value }))} sx={{ minWidth: 100, '& input': { fontSize: '0.75rem', py: 0.5 } }} /> : telRaw ? <span title="LGPD">🔒 {anonTelefone(telRaw)}</span> : '-'}</TableCell>
                              <TableCell sx={{ fontSize: '0.7rem', color: '#78909c' }}>{isEditing ? <TextField size="small" value={editValues.enderecoCompleto || ''} onChange={e => setEditValues(prev => ({ ...prev, enderecoCompleto: e.target.value }))} sx={{ minWidth: 120, '& input': { fontSize: '0.7rem', py: 0.5 } }} /> : endRaw ? <span title="LGPD">🔒 {anonEndereco(endRaw, item.bairro)}</span> : '-'}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', bgcolor: '#f3f0ff' }}>{isEditing ? <FormControl size="small" sx={{ minWidth: 90 }}><Select value={editValues.genero || ''} onChange={e => setEditValues(prev => ({ ...prev, genero: e.target.value }))} displayEmpty sx={{ fontSize: '0.7rem', '& .MuiSelect-select': { py: 0.5 } }}><MenuItem value=""><em>-</em></MenuItem>{GENERO_OPTIONS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}</Select></FormControl> : (item.genero ? <Chip label={item.genero.length > 10 ? item.genero.substring(0,10)+'…' : item.genero} size="small" sx={{ bgcolor: (item.genero||'').toLowerCase().includes('feminino') ? '#fce4ec' : '#e3f2fd', fontSize: '0.65rem', height: 20, fontWeight: 600 }} /> : '-')}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', bgcolor: '#f3f0ff' }}>{isEditing ? <FormControl size="small" sx={{ minWidth: 90 }}><Select value={editValues.raca || ''} onChange={e => setEditValues(prev => ({ ...prev, raca: e.target.value }))} displayEmpty sx={{ fontSize: '0.7rem', '& .MuiSelect-select': { py: 0.5 } }}><MenuItem value=""><em>-</em></MenuItem><MenuItem value="Branca">Branca</MenuItem><MenuItem value="Preta">Preta</MenuItem><MenuItem value="Parda">Parda</MenuItem><MenuItem value="Amarela">Amarela</MenuItem><MenuItem value="Indígena">Indígena</MenuItem></Select></FormControl> : (item.raca ? <Chip label={item.raca.length > 10 ? item.raca.substring(0,10)+'…' : item.raca} size="small" sx={{ bgcolor: '#fff3e0', fontSize: '0.65rem', height: 20, fontWeight: 600 }} /> : '-')}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', bgcolor: '#f3f0ff' }}>{isEditing ? <TextField size="small" value={editValues.idade || ''} onChange={e => setEditValues(prev => ({ ...prev, idade: e.target.value }))} sx={{ minWidth: 60, '& input': { fontSize: '0.7rem', py: 0.5 } }} /> : (() => { const n = parseInt(item.idade); if (n > 0 && n < 130) return <span>{n} anos</span>; if (item.idade && item.idade.trim()) return <span>{item.idade}</span>; return '-'; })()}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', bgcolor: '#f3f0ff' }}>{isEditing ? <FormControl size="small" sx={{ minWidth: 70 }}><Select value={editValues.deficiencia || ''} onChange={e => setEditValues(prev => ({ ...prev, deficiencia: e.target.value }))} displayEmpty sx={{ fontSize: '0.7rem', '& .MuiSelect-select': { py: 0.5 } }}><MenuItem value=""><em>-</em></MenuItem><MenuItem value="Sim">Sim</MenuItem><MenuItem value="Não">Não</MenuItem><MenuItem value="Física">Física</MenuItem><MenuItem value="Visual">Visual</MenuItem><MenuItem value="Auditiva">Auditiva</MenuItem><MenuItem value="Intelectual">Intelectual</MenuItem></Select></FormControl> : (item.deficiencia ? <Chip label={item.deficiencia.length > 6 ? item.deficiencia.substring(0,6)+'…' : item.deficiencia} size="small" sx={{ bgcolor: '#e8f5e9', fontSize: '0.65rem', height: 20, fontWeight: 600 }} /> : '-')}</TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      <TablePagination
                        component="div"
                        count={parsedData.grupos?.length || 0}
                        page={tablePage.grupos}
                        onPageChange={(_, p) => setTablePage(prev => ({ ...prev, grupos: p }))}
                        rowsPerPage={rowsPerPage.grupos}
                        onRowsPerPageChange={e => { setRowsPerPage(prev => ({ ...prev, grupos: parseInt(e.target.value) })); setTablePage(prev => ({ ...prev, grupos: 0 })); }}
                        rowsPerPageOptions={[25, 50, 100, 200]}
                        labelRowsPerPage="Por página:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                      />
                    </TableContainer>
                  </>
                )}

                <Divider sx={{ my: 4 }} />

                {/* SUB-SEÇÃO: ESPAÇOS CULTURAIS */}
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 800, color: '#0b57d0', display: 'flex', alignItems: 'center', gap: 1 }}>
                  🏛️ Espaços Culturais
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Espaços culturais (teatros, casas de cultura, centros comunitários, etc.) cadastrados no Mapeamento 2020.
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => baixarTemplate('espacos')}
                    sx={{ color: '#0b57d0', borderColor: '#0b57d0' }}
                  >
                    Baixar Template
                  </Button>
                  
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={<Upload />}
                    sx={{ bgcolor: '#0b57d0', '&:hover': { bgcolor: '#084ba8' } }}
                  >
                    Upload Planilha de Espaços
                    <input
                      ref={fileInputEspacos}
                      type="file"
                      hidden
                      accept=".xlsx,.xls"
                      onChange={(e) => handleFileUpload(e, 'espacos')}
                    />
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<RefreshCw />}
                    onClick={removerDuplicadosEspacos}
                    disabled={!parsedData.espacos || parsedData.espacos.length === 0}
                    sx={{ color: '#ff9800', borderColor: '#ff9800' }}
                  >
                    Remover Duplicados
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<Trash2 />}
                    onClick={() => {
                      if (window.confirm('⚠️ Tem certeza que deseja limpar todos os dados de Espaços?')) {
                        saveUndoSnapshot('Exclusão de planilha de Espaços');
                        const newPD = { ...parsedData, espacos: [] as any[] };
                        setParsedData(newPD);
                        persistData(newPD);
                        alert('🗑️ Espaços limpos com sucesso!');
                      }
                    }}
                    disabled={!parsedData.espacos || parsedData.espacos.length === 0}
                    sx={{ color: '#ef4444', borderColor: '#ef4444' }}
                  >
                    Excluir Planilha Importada
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={saveToServer}
                    disabled={loading}
                    sx={{ 
                      bgcolor: '#00A38C', 
                      '&:hover': { bgcolor: '#008a74' },
                      fontWeight: 700
                    }}
                  >
                    💾 Salvar no Servidor
                  </Button>
                </Box>

                {parsedData.espacos && parsedData.espacos.length > 0 && (
                  <>
                    <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
                      ✅ {parsedData.espacos.length} espaços importados
                    </Alert>

                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                      📊 Preview: {parsedData.espacos.length} espaços culturais
                    </Typography>

                    <TableContainer component={Paper} sx={{ maxHeight: 500, mb: 3 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff', width: 90 }}>Ações</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Nome</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Tipo</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Bairro</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Comunidade Trad.</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Endereço 🔒</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Responsável</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Email 🔒</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Telefone 🔒</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>Gênero</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>Raça/Cor</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>Idade</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>PcD</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {parsedData.espacos.slice(tablePage.espacos * rowsPerPage.espacos, tablePage.espacos * rowsPerPage.espacos + rowsPerPage.espacos).map((item, idx) => {
                            const realIdx = tablePage.espacos * rowsPerPage.espacos + idx;
                            const isEditing = editingRow?.tab === 'espacos' && editingRow?.index === realIdx;
                            const emailRaw = item.email || item.Email || '';
                            const telRaw = item.telefone || item.Telefone || '';
                            const endRaw = item.enderecoCompleto || item.endereco || item.Endereco || '';
                            return (
                            <TableRow key={idx} sx={{ bgcolor: isEditing ? '#fffde7' : 'inherit' }}>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                {isEditing ? (
                                  <>
                                    <Button size="small" color="success" onClick={saveEditing} sx={{ minWidth: 32, p: 0.5 }}><CheckCircle size={16} /></Button>
                                    <Button size="small" color="inherit" onClick={cancelEditing} sx={{ minWidth: 32, p: 0.5 }}><RefreshCw size={14} /></Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="small" color="primary" onClick={() => startEditing('espacos', realIdx, item)} sx={{ minWidth: 32, p: 0.5 }}><Edit size={14} /></Button>
                                    <Button size="small" color="error" onClick={() => deleteRow('espacos', realIdx)} sx={{ minWidth: 32, p: 0.5 }}><Trash2 size={14} /></Button>
                                  </>
                                )}
                              </TableCell>
                              <TableCell>{isEditing ? <TextField size="small" value={editValues.nome || ''} onChange={e => setEditValues(prev => ({ ...prev, nome: e.target.value }))} sx={{ minWidth: 120, '& input': { fontSize: '0.8rem', py: 0.5 } }} /> : (item.nome || item.Nome || '-')}</TableCell>
                              <TableCell>{isEditing ? <TextField size="small" value={editValues.tipo || editValues.categoria || ''} onChange={e => setEditValues(prev => ({ ...prev, tipo: e.target.value, categoria: e.target.value }))} sx={{ minWidth: 100, '& input': { fontSize: '0.8rem', py: 0.5 } }} /> : (item.tipo || item.Tipo || item.categoria || '-')}</TableCell>
                              <TableCell>{isEditing ? <TextField size="small" value={editValues.bairro || ''} onChange={e => setEditValues(prev => ({ ...prev, bairro: e.target.value }))} sx={{ minWidth: 100, '& input': { fontSize: '0.8rem', py: 0.5 } }} /> : (item.bairro || item.Bairro || '-')}</TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <FormControl size="small" sx={{ minWidth: 130 }}>
                                    <Select value={editValues.comunidadeTradicional || ''} onChange={e => setEditValues(prev => ({ ...prev, comunidadeTradicional: e.target.value }))} displayEmpty sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.5 } }} MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}>
                                      <MenuItem value=""><em>Nenhuma</em></MenuItem>
                                      <MenuItem value="Não" sx={{ borderBottom: '1px solid #eee' }}>Não pertence</MenuItem>
                                      {COMUNIDADES_TRADICIONAIS.map(c => <MenuItem key={c} value={c} sx={{ fontSize: '0.8rem' }}>{c}</MenuItem>)}
                                    </Select>
                                  </FormControl>
                                ) : (item.comunidadeTradicional && item.comunidadeTradicional !== 'Não') ? (
                                  <Chip label={`🏘️ ${item.comunidadeTradicional}`} size="small" sx={{ bgcolor: '#e0f2f1', color: '#00695c', fontWeight: 700, fontSize: '0.68rem', height: 22 }} />
                                ) : <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.7rem', color: '#78909c' }}>{isEditing ? <TextField size="small" value={editValues.enderecoCompleto || editValues.endereco || ''} onChange={e => setEditValues(prev => ({ ...prev, enderecoCompleto: e.target.value, endereco: e.target.value }))} sx={{ minWidth: 130, '& input': { fontSize: '0.7rem', py: 0.5 } }} /> : endRaw ? <span title="LGPD">🔒 {anonEndereco(endRaw, item.bairro)}</span> : '-'}</TableCell>
                              <TableCell>{isEditing ? <TextField size="small" value={editValues.responsavel || ''} onChange={e => setEditValues(prev => ({ ...prev, responsavel: e.target.value }))} sx={{ minWidth: 100, '& input': { fontSize: '0.8rem', py: 0.5 } }} /> : (item.responsavel || item.Responsavel || '-')}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', color: '#1565c0' }}>{isEditing ? <TextField size="small" value={editValues.email || ''} onChange={e => setEditValues(prev => ({ ...prev, email: e.target.value }))} sx={{ minWidth: 120, '& input': { fontSize: '0.75rem', py: 0.5 } }} /> : emailRaw ? <span title="LGPD">🔒 {anonEmail(emailRaw)}</span> : '-'}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', color: '#424242' }}>{isEditing ? <TextField size="small" value={editValues.telefone || ''} onChange={e => setEditValues(prev => ({ ...prev, telefone: e.target.value }))} sx={{ minWidth: 100, '& input': { fontSize: '0.75rem', py: 0.5 } }} /> : telRaw ? <span title="LGPD">🔒 {anonTelefone(telRaw)}</span> : '-'}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', bgcolor: '#f3f0ff' }}>{isEditing ? <FormControl size="small" sx={{ minWidth: 90 }}><Select value={editValues.genero || ''} onChange={e => setEditValues(prev => ({ ...prev, genero: e.target.value }))} displayEmpty sx={{ fontSize: '0.7rem', '& .MuiSelect-select': { py: 0.5 } }}><MenuItem value=""><em>-</em></MenuItem>{GENERO_OPTIONS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}</Select></FormControl> : (item.genero ? <Chip label={item.genero.length > 10 ? item.genero.substring(0,10)+'…' : item.genero} size="small" sx={{ bgcolor: (item.genero||'').toLowerCase().includes('feminino') ? '#fce4ec' : '#e3f2fd', fontSize: '0.65rem', height: 20, fontWeight: 600 }} /> : '-')}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', bgcolor: '#f3f0ff' }}>{isEditing ? <FormControl size="small" sx={{ minWidth: 90 }}><Select value={editValues.raca || ''} onChange={e => setEditValues(prev => ({ ...prev, raca: e.target.value }))} displayEmpty sx={{ fontSize: '0.7rem', '& .MuiSelect-select': { py: 0.5 } }}><MenuItem value=""><em>-</em></MenuItem><MenuItem value="Branca">Branca</MenuItem><MenuItem value="Preta">Preta</MenuItem><MenuItem value="Parda">Parda</MenuItem><MenuItem value="Amarela">Amarela</MenuItem><MenuItem value="Indígena">Indígena</MenuItem></Select></FormControl> : (item.raca ? <Chip label={item.raca.length > 10 ? item.raca.substring(0,10)+'…' : item.raca} size="small" sx={{ bgcolor: '#fff3e0', fontSize: '0.65rem', height: 20, fontWeight: 600 }} /> : '-')}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', bgcolor: '#f3f0ff' }}>{isEditing ? <TextField size="small" value={editValues.idade || ''} onChange={e => setEditValues(prev => ({ ...prev, idade: e.target.value }))} sx={{ minWidth: 60, '& input': { fontSize: '0.7rem', py: 0.5 } }} /> : (() => { const n = parseInt(item.idade); if (n > 0 && n < 130) return <span>{n} anos</span>; if (item.idade && item.idade.trim()) return <span>{item.idade}</span>; return '-'; })()}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem', bgcolor: '#f3f0ff' }}>{isEditing ? <FormControl size="small" sx={{ minWidth: 70 }}><Select value={editValues.deficiencia || ''} onChange={e => setEditValues(prev => ({ ...prev, deficiencia: e.target.value }))} displayEmpty sx={{ fontSize: '0.7rem', '& .MuiSelect-select': { py: 0.5 } }}><MenuItem value=""><em>-</em></MenuItem><MenuItem value="Sim">Sim</MenuItem><MenuItem value="Não">Não</MenuItem><MenuItem value="Física">Física</MenuItem><MenuItem value="Visual">Visual</MenuItem><MenuItem value="Auditiva">Auditiva</MenuItem><MenuItem value="Intelectual">Intelectual</MenuItem></Select></FormControl> : (item.deficiencia ? <Chip label={item.deficiencia.length > 6 ? item.deficiencia.substring(0,6)+'…' : item.deficiencia} size="small" sx={{ bgcolor: '#e8f5e9', fontSize: '0.65rem', height: 20, fontWeight: 600 }} /> : '-')}</TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      <TablePagination
                        component="div"
                        count={parsedData.espacos?.length || 0}
                        page={tablePage.espacos}
                        onPageChange={(_, p) => setTablePage(prev => ({ ...prev, espacos: p }))}
                        rowsPerPage={rowsPerPage.espacos}
                        onRowsPerPageChange={e => { setRowsPerPage(prev => ({ ...prev, espacos: parseInt(e.target.value) })); setTablePage(prev => ({ ...prev, espacos: 0 })); }}
                        rowsPerPageOptions={[25, 50, 100, 200]}
                        labelRowsPerPage="Por página:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                      />
                    </TableContainer>
                  </>
                )}
              </Box>
            )}

            {/* ABA: PROJETOS / EDITAIS */}
            {tabValue === 1 && (
              <Box>
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <strong>⚠️ CAMPOS ESPERADOS:</strong> Nome completo do proponente, bairro, área de atuação, nome do projeto, comunidade tradicional, faixa de valores, status.
                  <br /><strong>📥 SEPARAÇÃO POR EDITAL:</strong> cada upload substitui apenas os registros do <strong>mesmo edital + ano</strong>, mantendo os demais editais separados.
                  <br /><strong>📝 RENOMEAR:</strong> Se já importou sem nome, use o botão <strong>"Renomear / Gerenciar Editais"</strong> na tabela abaixo para corrigir.
                  <br /><strong>🏆 RANKING:</strong> Use o botão <strong className="text-[#2e7d32]">✓</strong> (verde) na coluna Ações ou clique no chip de Status para marcar contemplados/suplentes. Salve no servidor para gerar o ranking geral.
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <TextField
                      fullWidth
                      label="Nome Completo do Edital"
                      value={editalNome}
                      onChange={(e) => setEditalNome(e.target.value)}
                      placeholder="Ex: Edital de Fomento 2021"
                      variant="outlined"
                      required
                      error={!editalNome.trim()}
                      helperText={!editalNome.trim() 
                        ? '⚠️ OBRIGATÓRIO! Sem nome, os projetos ficam como "Edital Importado". Pode renomear depois.' 
                        : `✅ Os projetos serão importados como "${editalNome}"`
                      }
                      sx={{ 
                        '& .MuiOutlinedInput-root': !editalNome.trim() ? { 
                          borderColor: '#f57f17',
                          '& fieldset': { borderColor: '#f57f17', borderWidth: 2 }
                        } : {}
                      }}
                    />
                  </div>
                  <TextField
                    fullWidth
                    label="Ano do Edital"
                    value={editalAno}
                    onChange={(e) => setEditalAno(e.target.value)}
                    placeholder="Ex: 2024"
                    variant="outlined"
                    helperText="Ano de publicação"
                  />
                </div>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => baixarTemplate('projetos')}
                    sx={{ color: '#0b57d0', borderColor: '#0b57d0' }}
                  >
                    Baixar Template
                  </Button>
                  
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={<Upload />}
                    sx={{ bgcolor: '#0b57d0', '&:hover': { bgcolor: '#084ba8' } }}
                  >
                    Upload Planilha Excel
                    <input
                      ref={fileInputProjetos}
                      type="file"
                      hidden
                      accept=".xlsx,.xls"
                      onChange={(e) => handleFileUpload(e, 'projetos')}
                    />
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<MapPin />}
                    onClick={recalcularGPS}
                    disabled={!parsedData.projetos || parsedData.projetos.length === 0}
                    sx={{ color: '#00A38C', borderColor: '#00A38C' }}
                  >
                    Recalcular GPS
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<RefreshCw />}
                    onClick={() => removerDuplicados(dedupeEditalKey || undefined)}
                    disabled={!parsedData.projetos || parsedData.projetos.length === 0}
                    sx={{ color: '#ff9800', borderColor: '#ff9800' }}
                  >
                    Remover Duplicados
                  </Button>

                  {stats.porEdital.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 240 }}>
                      <InputLabel>Deduplicar planilha</InputLabel>
                      <Select
                        label="Deduplicar planilha"
                        value={dedupeEditalKey}
                        onChange={(e) => setDedupeEditalKey(String(e.target.value || ''))}
                        sx={{ fontSize: '0.85rem' }}
                      >
                        <MenuItem value="">Todas as planilhas</MenuItem>
                        {stats.porEdital.map(ed => (
                          <MenuItem key={ed.chave} value={ed.chave}>
                            {ed.nome} ({ed.total} projetos)
                          </MenuItem>
                        ))}
                      </Select>
                      <Typography variant="caption" sx={{ mt: 0.5, color: '#6b7280' }}>
                        Aparece porque há mais de um lote (edital/ano) carregado, então você pode deduplicar só uma planilha específica.
                      </Typography>
                    </FormControl>
                  )}

                  <Button
                    variant="outlined"
                    startIcon={<Trash2 />}
                    onClick={limparProjetos}
                    disabled={!parsedData.projetos || parsedData.projetos.length === 0}
                    sx={{ color: '#ef4444', borderColor: '#ef4444' }}
                  >
                    Excluir Todas as Planilhas
                  </Button>

                  {/* Limpar por edital específico */}
                  {stats.porEdital.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Excluir planilha (Edital/Ano)</InputLabel>
                      <Select
                        label="Excluir planilha (Edital/Ano)"
                        value=""
                        onChange={(e) => {
                          const editalToRemove = String(e.target.value || '');
                          const alvo = stats.porEdital.find(ed => ed.chave === editalToRemove);
                          if (editalToRemove && alvo && window.confirm(`⚠️ Remover todos os projetos de "${alvo.nome}"?`)) {
                            saveUndoSnapshot(`Exclusão de planilha ${alvo.nome}`);
                            const projetosRestantes = (parsedData.projetos || []).filter(p => 
                              getEditalAnoKey(p) !== editalToRemove
                            );
                            const newPD = { ...parsedData, projetos: projetosRestantes };
                            setParsedData(newPD);
                            persistData(newPD);
                            alert(`🗑️ Planilha de "${alvo.nome}" removida!`);
                          }
                        }}
                        sx={{ color: '#ef4444' }}
                      >
                        {stats.porEdital.map(ed => (
                          <MenuItem key={ed.chave} value={ed.chave}>
                            🗑️ {ed.nome} ({ed.total} projetos)
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={saveToServer}
                    disabled={loading}
                    sx={{ 
                      bgcolor: '#00A38C', 
                      '&:hover': { bgcolor: '#008a74' },
                      fontWeight: 700
                    }}
                  >
                    💾 Salvar no Servidor
                  </Button>
                </Box>

                {parsedData.projetos && parsedData.projetos.length > 0 && (
                  <>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                      📊 Preview: {parsedData.projetos.length} projetos importados
                    </Typography>
                    {(() => {
                      const fomento2022 = stats.porEdital.find((ed: any) => {
                        const nome = String(ed.nomeBase || ed.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        return nome.includes('fomento') && Number(ed.ano || 0) === 2022;
                      });
                      if (!fomento2022) return null;
                      return (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          ✅ Edital de Fomento 2022 encontrado: <strong>{fomento2022.total}</strong> inscrito(s) e{' '}
                          <strong>{fomento2022.contemplados}</strong> contemplado(s).
                          {' '}Se não aparecer na tabela abaixo, clique em <strong>Todos</strong> no filtro de edital.
                        </Alert>
                      );
                    })()}
                    {lastImportDuplicatesRemoved > 0 && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        ℹ️ {lastImportDuplicatesRemoved} registro(s) duplicado(s) foram removidos automaticamente na última importação
                        (critério: CPF/CNPJ + edital, ou nome + projeto + edital).
                      </Alert>
                    )}
                    <Alert severity="success" sx={{ mb: 2 }}>
                      🏘️ Comunidades tradicionais identificadas nos projetos: <strong>{projetosComTradCount}</strong> de{' '}
                      <strong>{parsedData.projetos.length}</strong>.
                      Você também pode ajustar manualmente na coluna <strong>Comunidade Trad.</strong> da tabela.
                    </Alert>

                    {/* Cards de estatísticas - Inscritos vs Contemplados */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <Card sx={{ bgcolor: '#e3f2fd', border: '2px solid #2196f3' }}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1565c0' }}>
                            {stats.totalInscritos}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Total Inscritos
                          </Typography>
                        </CardContent>
                      </Card>
                      <Card sx={{ bgcolor: '#e8f5e9', border: '2px solid #4caf50' }}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                            {stats.contemplados}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Contemplados
                          </Typography>
                        </CardContent>
                      </Card>
                      <Card sx={{ bgcolor: '#fff3e0', border: '2px solid #ff9800' }}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#e65100' }}>
                            {stats.suplentes}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Suplentes
                          </Typography>
                        </CardContent>
                      </Card>
                      <Card sx={{ bgcolor: '#fce4ec', border: '2px solid #ef5350' }}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#c62828' }}>
                            {stats.naoContemplados}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Não Contemplados
                          </Typography>
                        </CardContent>
                      </Card>
                      <Card sx={{ bgcolor: '#f3e5f5', border: '2px solid #ab47bc' }}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#7b1fa2' }}>
                            {stats.valorContemplados > 0 ? `R$ ${(stats.valorContemplados / 1000).toFixed(0)}k` : '-'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Valor Investido
                          </Typography>
                          {stats.valorTotal > stats.valorContemplados && stats.valorTotal > 0 && (
                            <Typography variant="caption" sx={{ color: '#9e9e9e', display: 'block', mt: 0.5 }}>
                              Solicitado: R$ {(stats.valorTotal / 1000).toFixed(0)}k
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    <AdminImportCharts
                      totalInscritos={stats.totalInscritos}
                      contemplados={stats.contemplados}
                      suplentes={stats.suplentes}
                      naoContemplados={stats.naoContemplados}
                      porEdital={stats.porEdital}
                    />

                    {/* 🏷️ BREAKDOWN POR EDITAL */}
                    {stats.porEdital.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: '#5f5f6a' }}>
                          📋 Dados separados por Edital ({stats.porEdital.length} {stats.porEdital.length === 1 ? 'edital' : 'editais'}):
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#6b7280' }}>
                          Coluna <strong>Home</strong>: desmarque para retirar o edital da tabela &quot;Demanda vs Oferta&quot; na página inicial (os projetos não são apagados).
                        </Typography>
                        <TableContainer component={Paper} sx={{ mb: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: '#f0f4ff' }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Edital</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Ano</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Inscritos</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#2e7d32' }}>Contemplados</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#e65100' }}>Suplentes</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#c62828' }}>Não Contempl.</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#9575cd' }}>Valor Solicitado</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#7b1fa2' }}>Valor Investido</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Aproveitamento</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }} title="Tabela Demanda vs Oferta na página inicial">Home</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Ações</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {stats.porEdital.map((ed) => {
                                const sk = String(ed.sourceChave || ed.chave);
                                const ocultoHome = (parsedData.demandaOfertaExcluidosHome || []).includes(ed.chave);
                                const pct = ed.aproveitamentoPct != null && Number.isFinite(ed.aproveitamentoPct)
                                  ? Math.round(ed.aproveitamentoPct)
                                  : (ed.total > 0 ? Math.round((ed.contemplados / ed.total) * 100) : 0);
                                return (
                                <TableRow key={sk} sx={{ '&:nth-of-type(odd)': { bgcolor: '#fafafa' } }}>
                                  <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem', minWidth: 200 }}>
                                    <TextField
                                      name={`resumo_nomeBase_${sk}`}
                                      size="small"
                                      fullWidth
                                      defaultValue={ed.nomeBase}
                                      placeholder="Nome do edital"
                                      sx={{ '& input': { fontSize: '0.8rem', fontWeight: 600 } }}
                                    />
                                  </TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#6b7280', minWidth: 88 }}>
                                    <TextField
                                      name={`resumo_ano_${sk}`}
                                      size="small"
                                      type="number"
                                      defaultValue={ed.ano > 0 ? ed.ano : ''}
                                      placeholder="-"
                                      sx={{ width: 88, '& input': { fontSize: '0.8rem', textAlign: 'center' } }}
                                    />
                                  </TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 700, minWidth: 96 }}>
                                    <TextField
                                      name={`resumo_total_${sk}`}
                                      size="small"
                                      type="number"
                                      defaultValue={ed.total}
                                      sx={{ width: 96, '& input': { fontSize: '0.8rem', textAlign: 'center', fontWeight: 700 } }}
                                    />
                                  </TableCell>
                                  <TableCell align="center" sx={{ minWidth: 104 }}>
                                    <TextField
                                      name={`resumo_contemplados_${sk}`}
                                      size="small"
                                      type="number"
                                      defaultValue={ed.contemplados}
                                      sx={{ width: 104, '& input': { fontSize: '0.8rem', textAlign: 'center' } }}
                                    />
                                  </TableCell>
                                  <TableCell align="center" sx={{ minWidth: 96 }}>
                                    <TextField
                                      name={`resumo_suplentes_${sk}`}
                                      size="small"
                                      type="number"
                                      defaultValue={ed.suplentes}
                                      sx={{ width: 96, '& input': { fontSize: '0.8rem', textAlign: 'center' } }}
                                    />
                                  </TableCell>
                                  <TableCell align="center" sx={{ minWidth: 104 }}>
                                    <TextField
                                      name={`resumo_nao_${sk}`}
                                      size="small"
                                      type="number"
                                      defaultValue={ed.naoContemplados}
                                      sx={{ width: 104, '& input': { fontSize: '0.8rem', textAlign: 'center' } }}
                                    />
                                  </TableCell>
                                  <TableCell align="center" sx={{ fontSize: '0.8rem', color: '#9e9e9e', minWidth: 140 }}>
                                    <TextField
                                      name={`resumo_valor_${sk}`}
                                      size="small"
                                      defaultValue={ed.valor > 0 ? String(ed.valor) : ''}
                                      placeholder="0"
                                      sx={{ width: 140, '& input': { fontSize: '0.75rem', textAlign: 'center' } }}
                                    />
                                  </TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#7b1fa2', minWidth: 140 }}>
                                    <TextField
                                      name={`resumo_valor_inv_${sk}`}
                                      size="small"
                                      defaultValue={ed.valorContemplados > 0 ? String(ed.valorContemplados) : ''}
                                      placeholder="0"
                                      sx={{ width: 140, '& input': { fontSize: '0.75rem', textAlign: 'center', fontWeight: 700 } }}
                                    />
                                  </TableCell>
                                  <TableCell align="center" sx={{ minWidth: 100 }}>
                                    <TextField
                                      name={`resumo_aproveitamento_${sk}`}
                                      size="small"
                                      type="number"
                                      defaultValue={pct}
                                      inputProps={{ min: 0, max: 100 }}
                                      sx={{ width: 100, '& input': { fontSize: '0.8rem', textAlign: 'center', fontWeight: 700 } }}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Tooltip title={ocultoHome ? 'Não aparece na Home — marque para exibir' : 'Aparece na Home — desmarque para ocultar (não apaga projetos)'}>
                                      <FormControlLabel
                                        control={
                                          <Checkbox
                                            size="small"
                                            checked={!ocultoHome}
                                            onChange={() => toggleDemandaOfertaNaHome(ed.chave)}
                                            sx={{ py: 0 }}
                                          />
                                        }
                                        label={<span className="text-[0.7rem] text-[#5f5f6a]">Ver</span>}
                                        sx={{ m: 0, mr: 0 }}
                                      />
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                                      <Tooltip title="Salvar linha">
                                        <IconButton
                                          size="small"
                                          color="primary"
                                          onClick={e => saveResumoEditalRow(ed, (e.currentTarget.closest('tr') as HTMLElement | null))}
                                        >
                                          <Save size={18} />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Limpar ajustes deste edital">
                                        <span>
                                          <IconButton
                                            size="small"
                                            color="inherit"
                                            disabled={!(parsedData.editalResumoOverrides && parsedData.editalResumoOverrides[ed.chave])}
                                            onClick={() => {
                                              if (!window.confirm('Remover ajustes manuais desta linha e voltar aos valores calculados?')) return;
                                              clearResumoEditalRow(ed);
                                            }}
                                          >
                                            <RefreshCw size={16} />
                                          </IconButton>
                                        </span>
                                      </Tooltip>
                                    </Stack>
                                  </TableCell>
                                </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        
                        {/* ⚠️ ALERTA DE QUALIDADE DE DADOS */}
                        {(() => {
                          const allProjs = parsedData.projetos || [];
                          const editaisComProblema = stats.porEdital.filter(ed => {
                            const projs = getProjetosByGrupoEditalAno(ed);
                            const total = projs.length;
                            if (total === 0) return false;
                            const comGenero = projs.filter(p => p.genero && isValidDiversityValue(p.genero) && p.genero.toLowerCase() !== 'não informado' && p.genero !== 'N/I').length;
                            const comRaca = projs.filter(p => p.raca && isValidDiversityValue(p.raca) && p.raca.toLowerCase() !== 'não informado' && p.raca !== 'N/I').length;
                            const taxaMedia = Math.round(((comGenero / total) + (comRaca / total)) * 50);
                            return taxaMedia < 40;
                          });
                          
                          const pecComProblema = editaisComProblema.find(ed => ed.nome.toLowerCase().includes('pec'));
                          
                          if (editaisComProblema.length > 0) {
                            return (
                              <Alert 
                                severity={pecComProblema ? "warning" : "info"} 
                                sx={{ mt: 2, mb: 2, fontSize: '0.85rem' }}
                                icon={pecComProblema ? <AlertCircle size={20} /> : <Info size={20} />}
                              >
                                <strong>
                                  {pecComProblema ? '⚠️ Atenção:' : 'ℹ️ Informação:'} 
                                  {editaisComProblema.length === 1 ? ' 1 edital' : ` ${editaisComProblema.length} editais`} 
                                  {editaisComProblema.length === 1 ? ' está' : ' estão'} com dados de diversidade incompletos
                                </strong>
                                <br />
                                <span className="text-[0.8rem]">
                                  {editaisComProblema.map(ed => ed.nome).join(', ')}
                                  {pecComProblema && ' — PEC requer indicadores completos de gênero, raça e idade.'}
                                </span>
                                <br />
                                <span className="text-[0.75rem] text-[#6b7280]">
                                  💡 Veja o painel "Diagnóstico de Qualidade" abaixo para detalhes e edite os campos na tabela de projetos.
                                </span>
                              </Alert>
                            );
                          }
                          return null;
                        })()}
                        
                        {/* 🎨 INDICADORES DE DIVERSIDADE POR EDITAL — AGRUPADOS POR ANO */}
                        <Box sx={{ mt: 3, p: 2, bgcolor: '#f3e8ff', borderRadius: 2, border: '1px solid #d8b4fe' }}>
                          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 1 }}>
                            🎨 Indicadores de Diversidade por Edital / Ano
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 2, color: '#7c3aed' }}>
                            Edite os campos de gênero, raça, idade e PcD diretamente na tabela de projetos. Os indicadores se atualizam automaticamente.
                          </Typography>
                          {(() => {
                            // Agrupa editais por ano (decrescente)
                            const anosMap = new Map<number, typeof stats.porEdital>();
                            stats.porEdital.forEach(ed => {
                              const ano = ed.ano || 0;
                              if (!anosMap.has(ano)) anosMap.set(ano, []);
                              anosMap.get(ano)!.push(ed);
                            });
                            const anosOrdenados = Array.from(anosMap.entries()).sort((a, b) => b[0] - a[0]);
                            
                            // Totais globais de diversidade
                            const allProjs = parsedData.projetos || [];
                            const globalFem = allProjs.filter(p => { const g = (p.genero || '').toLowerCase(); return isValidDiversityValue(g) && (g.includes('feminino') || g.includes('mulher')); }).length;
                            const globalNegros = allProjs.filter(p => { const r = (p.raca || '').toLowerCase(); return isValidDiversityValue(r) && (r.includes('pret') || r.includes('pard') || r.includes('negr')); }).length;
                            const globalPcd = allProjs.filter(p => { const d = (p.deficiencia || '').toLowerCase(); return isValidDiversityValue(d) && (d.includes('sim') || d.includes('físic') || d.includes('visual') || d.includes('auditiv')); }).length;
                            const globalCom = allProjs.filter(p => p.comunidadeTradicional && p.comunidadeTradicional.trim() !== '' && p.comunidadeTradicional.toLowerCase() !== 'não').length;
                            
                            return (
                              <>
                                {/* RESUMO GLOBAL */}
                                <Box sx={{ mb: 3, p: 2, bgcolor: '#ede9fe', borderRadius: 2, border: '1px solid #c4b5fd' }}>
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#5b21b6', display: 'block', mb: 1 }}>
                                    📊 Resumo Global — Todos os Editais ({allProjs.length} projetos)
                                  </Typography>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-pink-50 p-2.5 rounded-lg text-center border border-pink-200">
                                      <div className="font-black text-pink-700 text-2xl">{globalFem}</div>
                                      <div className="text-pink-600 text-xs font-semibold">Mulheres</div>
                                      <div className="text-pink-400 text-[0.6rem]">{allProjs.length > 0 ? Math.round((globalFem / allProjs.length) * 100) : 0}% do total</div>
                                    </div>
                                    <div className="bg-amber-50 p-2.5 rounded-lg text-center border border-amber-200">
                                      <div className="font-black text-amber-700 text-2xl">{globalNegros}</div>
                                      <div className="text-amber-600 text-xs font-semibold">Negros/Pardos</div>
                                      <div className="text-amber-400 text-[0.6rem]">{allProjs.length > 0 ? Math.round((globalNegros / allProjs.length) * 100) : 0}% do total</div>
                                    </div>
                                    <div className="bg-green-50 p-2.5 rounded-lg text-center border border-green-200">
                                      <div className="font-black text-green-700 text-2xl">{globalPcd}</div>
                                      <div className="text-green-600 text-xs font-semibold">PcD</div>
                                      <div className="text-green-400 text-[0.6rem]">{allProjs.length > 0 ? Math.round((globalPcd / allProjs.length) * 100) : 0}% do total</div>
                                    </div>
                                    <div className="bg-teal-50 p-2.5 rounded-lg text-center border border-teal-200">
                                      <div className="font-black text-teal-700 text-2xl">{globalCom}</div>
                                      <div className="text-teal-600 text-xs font-semibold">Com. Tradicionais</div>
                                      <div className="text-teal-400 text-[0.6rem]">{allProjs.length > 0 ? Math.round((globalCom / allProjs.length) * 100) : 0}% do total</div>
                                    </div>
                                  </div>
                                </Box>

                                {/* EDITAIS AGRUPADOS POR ANO */}
                                {anosOrdenados.map(([ano, editaisDoAno]) => {
                                  const projsAno = allProjs.filter(p => {
                                    const pAno = p._anoOrigem || p.ano || 0;
                                    return pAno === ano || (ano === 0 && (!pAno || pAno === 0));
                                  });
                                  const anoFem = projsAno.filter(p => (p.genero || '').toLowerCase().includes('feminino') || (p.genero || '').toLowerCase().includes('mulher')).length;
                                  const anoNegros = projsAno.filter(p => { const r = (p.raca || '').toLowerCase(); return r.includes('pret') || r.includes('pard') || r.includes('negr'); }).length;
                                  
                                  return (
                                    <Box key={ano} sx={{ mb: 3 }}>
                                      {/* CABEÇALHO DO ANO */}
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, pb: 1, borderBottom: '2px solid #c4b5fd' }}>
                                        <Chip 
                                          label={ano > 0 ? `📅 ${ano}` : '📅 Sem ano'} 
                                          sx={{ bgcolor: '#7c3aed', color: 'white', fontWeight: 800, fontSize: '0.85rem', height: 30 }} 
                                        />
                                        <Typography variant="caption" sx={{ color: '#6b21a8', fontWeight: 600 }}>
                                          {editaisDoAno.length} {editaisDoAno.length === 1 ? 'edital' : 'editais'} · {projsAno.length} projetos · {anoFem} mulheres · {anoNegros} negros/pardos
                                        </Typography>
                                      </Box>
                                      
                                      {/* CARDS DOS EDITAIS DESTE ANO */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {editaisDoAno.map((ed, idx) => {
                                          const projs = getProjetosByGrupoEditalAno(ed);
                                          const comGenero = projs.filter(p => p.genero && isValidDiversityValue(p.genero) && p.genero.toLowerCase() !== 'não informado').length;
                                          const feminino = projs.filter(p => { const g = (p.genero || '').toLowerCase(); return isValidDiversityValue(g) && (g.includes('feminino') || g.includes('mulher')); }).length;
                                          const masculino = projs.filter(p => { const g = (p.genero || '').toLowerCase(); return isValidDiversityValue(g) && (g.includes('masculino') || g.includes('homem')); }).length;
                                          const comRaca = projs.filter(p => p.raca && isValidDiversityValue(p.raca) && p.raca.toLowerCase() !== 'não informado').length;
                                          const negros = projs.filter(p => { const r = (p.raca || '').toLowerCase(); return isValidDiversityValue(r) && (r.includes('pret') || r.includes('pard') || r.includes('negr')); }).length;
                                          const brancos = projs.filter(p => { const r = (p.raca || '').toLowerCase(); return isValidDiversityValue(r) && r.includes('branc'); }).length;
                                          const indigenas = projs.filter(p => { const r = (p.raca || '').toLowerCase(); return isValidDiversityValue(r) && (r.includes('indígen') || r.includes('indigen')); }).length;
                                          const comIdade = projs.filter(p => { const i = String(p.idade || '').trim(); const n = parseInt(i); return (n > 0 && n < 130) || (i && isValidDiversityValue(i)); }).length;
                                          const pcd = projs.filter(p => { const d = (p.deficiencia || '').toLowerCase(); return isValidDiversityValue(d) && (d.includes('sim') || d.includes('físic') || d.includes('visual') || d.includes('auditiv') || d.includes('intelectual')); }).length;
                                          const comunidades = projs.filter(p => p.comunidadeTradicional && p.comunidadeTradicional.trim() !== '' && p.comunidadeTradicional.toLowerCase() !== 'não').length;
                                          const orientacao = projs.filter(p => p.orientacao_sexual && isValidDiversityValue(p.orientacao_sexual) && p.orientacao_sexual.toLowerCase() !== 'não informado').length;
                                          
                                          return (
                                            <Paper key={idx} sx={{ p: 2, borderRadius: 2, border: '1px solid #e9d5ff', bgcolor: 'white' }}>
                                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#6b21a8' }}>{ed.nome}</Typography>
                                                <Chip label={`${projs.length} proj.`} size="small" sx={{ bgcolor: '#ede9fe', color: '#6b21a8', fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                                              </Box>
                                              <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="bg-pink-50 p-2 rounded-lg text-center">
                                                  <div className="font-black text-pink-700 text-lg">{feminino}</div>
                                                  <div className="text-pink-600 font-semibold">Mulheres</div>
                                                  <div className="text-pink-400 text-[0.6rem]">{masculino} masc · {comGenero} c/ gênero</div>
                                                </div>
                                                <div className="bg-amber-50 p-2 rounded-lg text-center">
                                                  <div className="font-black text-amber-700 text-lg">{negros}</div>
                                                  <div className="text-amber-600 font-semibold">Negros/Pardos</div>
                                                  <div className="text-amber-400 text-[0.6rem]">{brancos} branc · {indigenas} indíg · {comRaca} c/ raça</div>
                                                </div>
                                                <div className="bg-green-50 p-2 rounded-lg text-center">
                                                  <div className="font-black text-green-700 text-lg">{pcd}</div>
                                                  <div className="text-green-600 font-semibold">PcD</div>
                                                  <div className="text-green-400 text-[0.6rem]">{comIdade} c/ idade</div>
                                                </div>
                                                <div className="bg-teal-50 p-2 rounded-lg text-center">
                                                  <div className="font-black text-teal-700 text-lg">{comunidades}</div>
                                                  <div className="text-teal-600 font-semibold">Com. Trad.</div>
                                                  <div className="text-teal-400 text-[0.6rem]">{orientacao} c/ orient. sex.</div>
                                                </div>
                                              </div>
                                              {comGenero === 0 && comRaca === 0 && (
                                                <div className="mt-2 p-1.5 bg-yellow-50 rounded text-[0.65rem] text-yellow-700 border border-yellow-200">
                                                  ⚠️ Sem dados de diversidade. Edite gênero, raça, PcD e idade na tabela abaixo.
                                                </div>
                                              )}
                                            </Paper>
                                          );
                                        })}
                                      </div>
                                    </Box>
                                  );
                                })}
                              </>
                            );
                          })()}
                        </Box>

                        {/* 📊 DIAGNÓSTICO DE QUALIDADE DOS DADOS DE DIVERSIDADE */}
                        <Box sx={{ mt: 3, p: 2, bgcolor: '#fef3c7', borderRadius: 2, border: '1px solid #fbbf24' }}>
                          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: 1 }}>
                            📊 Diagnóstico de Qualidade — Campos de Diversidade
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 2, color: '#78350f' }}>
                            Taxa de preenchimento dos campos de diversidade por edital. Valores baixos indicam que a planilha pode não ter colunas de gênero, raça, idade ou PcD.
                          </Typography>
                          {(() => {
                            const allProjs = parsedData.projetos || [];
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {stats.porEdital.map((ed, idx) => {
                                  const projs = getProjetosByGrupoEditalAno(ed);
                                  const total = projs.length;
                                  if (total === 0) return null;
                                  
                                  const comGenero = projs.filter(p => p.genero && isValidDiversityValue(p.genero) && p.genero.toLowerCase() !== 'não informado' && p.genero !== 'N/I').length;
                                  const comRaca = projs.filter(p => p.raca && isValidDiversityValue(p.raca) && p.raca.toLowerCase() !== 'não informado' && p.raca !== 'N/I').length;
                                  const comIdade = projs.filter(p => { const i = String(p.idade || '').trim(); return i && i !== 'N/I' && i.toLowerCase() !== 'não informado'; }).length;
                                  const comPcd = projs.filter(p => p.deficiencia && isValidDiversityValue(p.deficiencia) && p.deficiencia.toLowerCase() !== 'não informado' && p.deficiencia !== 'N/I').length;
                                  
                                  const taxaGenero = Math.round((comGenero / total) * 100);
                                  const taxaRaca = Math.round((comRaca / total) * 100);
                                  const taxaIdade = Math.round((comIdade / total) * 100);
                                  const taxaPcd = Math.round((comPcd / total) * 100);
                                  const taxaMedia = Math.round((taxaGenero + taxaRaca + taxaIdade + taxaPcd) / 4);
                                  
                                  const corQualidade = taxaMedia >= 75 ? '#10b981' : taxaMedia >= 50 ? '#f59e0b' : '#ef4444';
                                  const labelQualidade = taxaMedia >= 75 ? 'Ótima' : taxaMedia >= 50 ? 'Regular' : 'Baixa';
                                  
                                  const isPEC2022 = ed.nome.toLowerCase().includes('pec') && ed.nome.includes('2022');
                                  
                                  return (
                                    <Paper key={idx} sx={{ p: 2, borderRadius: 2, border: isPEC2022 ? '2px solid #d97706' : '1px solid #fbbf24', bgcolor: 'white' }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#78350f', fontSize: '0.8rem' }}>
                                          {isPEC2022 && '⭐ '}{ed.nome}
                                        </Typography>
                                        <Chip 
                                          label={`${taxaMedia}% — ${labelQualidade}`} 
                                          size="small" 
                                          sx={{ bgcolor: corQualidade, color: 'white', fontWeight: 700, fontSize: '0.65rem', height: 20 }} 
                                        />
                                      </Box>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center justify-between">
                                          <span className="text-gray-600">Gênero:</span>
                                          <Box component="span" className="font-bold" sx={{ color: taxaGenero >= 75 ? '#10b981' : taxaGenero >= 50 ? '#f59e0b' : '#ef4444' }}>
                                            {taxaGenero}% ({comGenero}/{total})
                                          </Box>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-gray-600">Raça:</span>
                                          <Box component="span" className="font-bold" sx={{ color: taxaRaca >= 75 ? '#10b981' : taxaRaca >= 50 ? '#f59e0b' : '#ef4444' }}>
                                            {taxaRaca}% ({comRaca}/{total})
                                          </Box>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-gray-600">Idade:</span>
                                          <Box component="span" className="font-bold" sx={{ color: taxaIdade >= 75 ? '#10b981' : taxaIdade >= 50 ? '#f59e0b' : '#ef4444' }}>
                                            {taxaIdade}% ({comIdade}/{total})
                                          </Box>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-gray-600">PcD:</span>
                                          <Box component="span" className="font-bold" sx={{ color: taxaPcd >= 75 ? '#10b981' : taxaPcd >= 50 ? '#f59e0b' : '#ef4444' }}>
                                            {taxaPcd}% ({comPcd}/{total})
                                          </Box>
                                        </div>
                                      </div>
                                      {isPEC2022 && taxaMedia < 50 && (
                                        <Alert severity="warning" sx={{ mt: 1.5, fontSize: '0.65rem', py: 0.5 }}>
                                          ⚠️ PEC 2022 com dados incompletos. Verifique se a planilha tem colunas de diversidade.
                                        </Alert>
                                      )}
                                      {taxaMedia < 30 && (
                                        <div className="mt-2 p-1.5 bg-red-50 rounded text-[0.65rem] text-red-700 border border-red-200">
                                          🔍 Dica: Edite os campos manualmente na tabela abaixo ou reimporte a planilha com colunas de diversidade.
                                        </div>
                                      )}
                                    </Paper>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </Box>

                        {/* 🔗 Links oficiais abaixo da tabela de breakdown */}
                        <Box sx={{ mt: 2, p: 2, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd' }}>
                          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 1 }}>
                            🔗 Links Oficiais — Resultados e Resumos
                          </Typography>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {stats.porEdital.map((ed, idx) => {
                              const links = findEditalLinks(ed.nome, customEditalLinks);
                              return (
                                <Paper key={idx} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e7ff', bgcolor: 'white' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e3a5f', mb: 1 }}>
                                    📋 {ed.nome}
                                  </Typography>
                                  <div className="flex flex-wrap gap-2">
                                    {links?.resultado ? (
                                      <Link
                                        href={links.resultado}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        underline="none"
                                        aria-label={`Abrir resultado oficial do edital ${ed.nome}`}
                                      >
                                        <Chip 
                                          label="📄 Resultado Oficial" 
                                          size="small" 
                                          clickable
                                          sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 600, fontSize: '0.72rem', '&:hover': { bgcolor: '#bfdbfe' } }} 
                                        />
                                      </Link>
                                    ) : (
                                      <Chip label="📄 Resultado (pendente)" size="small" sx={{ bgcolor: '#f3f4f6', color: '#9ca3af', fontSize: '0.72rem' }} />
                                    )}
                                    {links?.resumo ? (
                                      <Link
                                        href={links.resumo}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        underline="none"
                                        aria-label={`Abrir resumo do edital ${ed.nome}`}
                                      >
                                        <Chip 
                                          label="📊 Resumo" 
                                          size="small" 
                                          clickable
                                          sx={{ bgcolor: '#d1fae5', color: '#065f46', fontWeight: 600, fontSize: '0.72rem', '&:hover': { bgcolor: '#a7f3d0' } }} 
                                        />
                                      </Link>
                                    ) : (
                                      <Chip label="📊 Resumo (pendente)" size="small" sx={{ bgcolor: '#f3f4f6', color: '#9ca3af', fontSize: '0.72rem' }} />
                                    )}
                                    {links?.diarioOficial && (
                                      <Link
                                        href={links.diarioOficial}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        underline="none"
                                        aria-label={`Abrir diário oficial — ${ed.nome}`}
                                      >
                                        <Chip 
                                          label="📰 Diário Oficial" 
                                          size="small" 
                                          clickable
                                          sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, fontSize: '0.72rem', '&:hover': { bgcolor: '#fde68a' } }} 
                                        />
                                      </Link>
                                    )}
                                  </div>
                                </Paper>
                              );
                            })}
                          </div>
                          <Typography variant="caption" sx={{ mt: 1.5, display: 'block', color: '#6b7280', fontStyle: 'italic' }}>
                            * Os links direcionam para os resultados oficiais publicados pela Prefeitura de Ilhabela. Use o botão "Renomear / Gerenciar Editais" acima para adicionar ou editar URLs.
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {/* Indicador visual de demanda vs oferta */}
                    {stats.totalInscritos > 0 && stats.contemplados > 0 && (
                      <Alert severity="info" sx={{ mb: 3 }}>
                        <strong>Demanda vs Oferta (TOTAL):</strong> {stats.totalInscritos} inscritos para {stats.contemplados} vagas contempladas 
                        ({Math.round((stats.contemplados / stats.totalInscritos) * 100)}% de aproveitamento).
                        {' '}Valor investido: <strong>R$ {stats.valorContemplados.toLocaleString('pt-BR')}</strong> de R$ {stats.valorTotal.toLocaleString('pt-BR')} solicitados.
                        {stats.naoContemplados > 0 && (
                          <> <strong> {stats.naoContemplados} inscritos</strong> não foram contemplados - indica demanda reprimida para novos editais.</>
                        )}
                      </Alert>
                    )}
                    
                    {/* ⚠️ Aviso quando todos têm status genérico */}
                    {stats.totalInscritos > 0 && stats.contemplados === 0 && (
                      <Alert severity="warning" sx={{ mb: 3 }}>
                        <strong>⚠️ Nenhum contemplado detectado!</strong> Marque os contemplados usando:
                        <br />
                        <strong>1.</strong> O botão <strong className="text-[#2e7d32]">✓ verde</strong> na coluna Ações de cada linha
                        <br />
                        <strong>2.</strong> Clique no chip de Status (Inscrito → Contemplado → Suplente → Desclassificado)
                        <br />
                        <strong>3.</strong> Botões de ação em massa abaixo para marcar todos de uma vez
                        <br />
                        <em>Depois de marcar, salve no servidor para registrar o ranking.</em>
                      </Alert>
                    )}

                    {/* 🎯 Ações em massa de status */}
                    <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f9ff', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: '#5f5f6a' }}>
                        ✏️ Edição de Status {filtroEdital ? `(filtro: ${filtroEditalLabel})` : '(todos)'}:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Button size="small" variant="outlined" color="success" onClick={() => marcarTodos('Contemplado')}
                          startIcon={<CheckCircle size={14} />}>
                          Marcar todos Contemplado
                        </Button>
                        <Button size="small" variant="outlined" color="warning" onClick={() => marcarTodos('Suplente')}>
                          Marcar todos Suplente
                        </Button>
                        <Button size="small" variant="outlined" color="info" onClick={() => marcarTodos('Inscrito')}>
                          Resetar para Inscrito
                        </Button>
                        <Typography variant="caption" sx={{ alignSelf: 'center', color: '#9e9e9e', ml: 1 }}>
                          | Clique no status de cada linha para editar individualmente
                        </Typography>
                      </Box>
                    </Box>

                    {/* 🔍 Pesquisa por proponente */}
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <TextField
                        size="small"
                        placeholder="Pesquisar por nome, projeto, bairro, e-mail ou comunidade..."
                        value={buscaProponente}
                        onChange={e => setBuscaProponente(e.target.value)}
                        sx={{ flex: 1, maxWidth: 500, '& input': { fontSize: '0.85rem' } }}
                        InputProps={{
                          startAdornment: <Search size={16} style={{ marginRight: 8, color: '#9e9e9e' }} />
                        }}
                      />
                      {buscaProponente && (
                        <>
                          <Chip 
                            label={`✕ Limpar busca`}
                            onClick={() => setBuscaProponente('')}
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                          <Typography variant="caption" sx={{ color: '#5f5f6a' }}>
                            {(() => {
                              const q = buscaProponente.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                              let filtered = parsedData.projetos || [];
                              if (filtroEdital) filtered = filtered.filter(p => matchesFiltroEdital(p));
                              return filtered.filter(p => {
                                const nome = (p.proponente || p.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                const proj = (p.nomeProjeto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                const bairro = (p.bairro || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                const com = (p.comunidadeTradicional || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                const em = (p.email || '').toLowerCase();
                                return nome.includes(q) || proj.includes(q) || bairro.includes(q) || com.includes(q) || em.includes(q);
                              }).length;
                            })()} resultado(s) encontrado(s)
                          </Typography>
                        </>
                      )}
                    </Box>

                    {/* Filtro por edital na tabela */}
                    {stats.porEdital.length > 1 && (
                      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#5f5f6a' }}>Filtrar tabela:</Typography>
                        <Chip 
                          label={`Todos (${parsedData.projetos.length})`}
                          onClick={() => { setFiltroEdital(''); setTablePage(prev => ({ ...prev, projetos: 0 })); }}
                          color={filtroEdital === '' ? 'primary' : 'default'}
                          variant={filtroEdital === '' ? 'filled' : 'outlined'}
                          size="small"
                        />
                        {stats.porEdital.map((ed, idx) => (
                          <Chip 
                            key={idx}
                            label={`${ed.nome} (${ed.total})`}
                            onClick={() => { setFiltroEdital(ed.chave); setTablePage(prev => ({ ...prev, projetos: 0 })); }}
                            color={filtroEdital === ed.chave ? 'primary' : 'default'}
                            variant={filtroEdital === ed.chave ? 'filled' : 'outlined'}
                            size="small"
                          />
                        ))}
                      </Box>
                    )}

                    {/* 📝 RENOMEAR EDITAL + GERENCIAR LINKS */}
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        variant={showRenameEdital ? 'contained' : 'outlined'}
                        onClick={() => setShowRenameEdital(!showRenameEdital)}
                        startIcon={<Edit size={14} />}
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Renomear / Gerenciar Editais
                      </Button>
                    </Box>

                    {showRenameEdital && (
                      <Box sx={{ mb: 3, p: 2.5, bgcolor: '#fff8e1', borderRadius: 2, border: '2px solid #ffc107' }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 800, color: '#f57f17', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Edit size={16} /> Renomear Edital (aplica a todos os projetos do edital)
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
                          <FormControl size="small" sx={{ minWidth: 220 }}>
                            <InputLabel sx={{ fontSize: '0.8rem' }}>Edital atual</InputLabel>
                            <Select
                              label="Edital atual"
                              value={renameEditalFrom}
                              onChange={e => { setRenameEditalFrom(e.target.value); setRenameEditalTo(e.target.value === 'Edital Importado' ? '' : e.target.value); }}
                              sx={{ fontSize: '0.8rem', bgcolor: 'white' }}
                            >
                              <MenuItem value=""><em>Selecionar...</em></MenuItem>
                              {stats.porEdital.map((ed, idx) => (
                                <MenuItem key={idx} value={ed.nome} sx={{ fontSize: '0.85rem' }}>
                                  {ed.nome} ({ed.total} projetos)
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Typography sx={{ color: '#9e9e9e', fontWeight: 700 }}>→</Typography>
                          <TextField
                            size="small"
                            label="Novo nome do edital"
                            value={renameEditalTo}
                            onChange={e => setRenameEditalTo(e.target.value)}
                            placeholder="Ex: Edital de Fomento 2021"
                            sx={{ minWidth: 280, '& input': { fontSize: '0.85rem' }, bgcolor: 'white' }}
                          />
                          <Button
                            variant="contained"
                            size="small"
                            onClick={renameEdital}
                            disabled={!renameEditalFrom || !renameEditalTo.trim() || renameEditalFrom === renameEditalTo.trim()}
                            sx={{ bgcolor: '#f57f17', '&:hover': { bgcolor: '#e65100' }, fontWeight: 700, textTransform: 'none' }}
                          >
                            Renomear
                          </Button>
                        </Box>
                        
                        {/* 🔗 Gerenciar links dos editais */}
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 1 }}>
                          🔗 Gestão de Links Oficiais dos Editais
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: '#6b7280' }}>
                          Cole aqui os links oficiais de resultado, resumo e diário oficial de cada edital. Eles aparecerão na tabela "Demanda vs Oferta" da HomePage.
                        </Typography>
                        <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
                          💡 <strong>Dica:</strong> Após inserir os links, clique em "Salvar Dados no Servidor" (acima) para persistir as URLs.
                        </Alert>
                        {stats.porEdital.map((ed, idx) => {
                          const existingLinks = findEditalLinks(ed.nome, customEditalLinks);
                          const custom = customEditalLinks[ed.nome] || {};
                          const temLinks = !!(custom.resultado || custom.resumo || custom.diarioOficial || existingLinks?.resultado || existingLinks?.resumo || existingLinks?.diarioOficial);
                          return (
                            <Paper key={idx} sx={{ p: 2, mb: 1.5, borderRadius: 2, border: temLinks ? '2px solid #10b981' : '1px solid #e0e0e0', bgcolor: 'white', transition: 'all 0.2s' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                                  📋 {ed.nome} ({ed.total} projetos)
                                </Typography>
                                {temLinks && <Chip label="✅ Links configurados" size="small" sx={{ bgcolor: '#d1fae5', color: '#065f46', fontSize: '0.65rem', height: 20, fontWeight: 600 }} />}
                              </Box>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                                <TextField
                                  size="small"
                                  label="📄 Link Resultado"
                                  defaultValue={custom.resultado || existingLinks?.resultado || ''}
                                  onBlur={e => saveEditalLink(ed.nome, 'resultado', e.target.value)}
                                  placeholder="https://ilhabela.sp.gov.br/..."
                                  sx={{ flex: 1, minWidth: 200, '& input': { fontSize: '0.75rem' }, bgcolor: 'white' }}
                                />
                                <TextField
                                  size="small"
                                  label="📊 Link Resumo"
                                  defaultValue={custom.resumo || existingLinks?.resumo || ''}
                                  onBlur={e => saveEditalLink(ed.nome, 'resumo', e.target.value)}
                                  placeholder="https://ilhabela.sp.gov.br/..."
                                  sx={{ flex: 1, minWidth: 200, '& input': { fontSize: '0.75rem' }, bgcolor: 'white' }}
                                />
                                <TextField
                                  size="small"
                                  label="📰 Diário Oficial"
                                  defaultValue={custom.diarioOficial || existingLinks?.diarioOficial || ''}
                                  onBlur={e => saveEditalLink(ed.nome, 'diarioOficial', e.target.value)}
                                  placeholder="https://ilhabela.sp.gov.br/..."
                                  sx={{ flex: 1, minWidth: 200, '& input': { fontSize: '0.75rem' }, bgcolor: 'white' }}
                                />
                              </Box>
                            </Paper>
                          );
                        })}
                      </Box>
                    )}

                    {/* 🏘️ BARRA DE EDIÇÃO EM LOTE */}
                    {selectedRows.size > 0 && (
                      <Box sx={{ mb: 2, p: 2, bgcolor: '#e0f2f1', borderRadius: 2, border: '2px solid #00897b' }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 800, color: '#00695c', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ListChecks size={18} />
                          Edição em lote — {selectedRows.size} projeto(s) selecionado(s)
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                          {/* Comunidade Tradicional em lote */}
                          <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel sx={{ fontSize: '0.8rem' }}>🏘️ Comunidade Tradicional</InputLabel>
                            <Select
                              label="🏘️ Comunidade Tradicional"
                              value={batchComunidade}
                              onChange={e => setBatchComunidade(e.target.value)}
                              sx={{ fontSize: '0.8rem', bgcolor: 'white' }}
                              MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
                            >
                              <MenuItem value=""><em>Selecionar...</em></MenuItem>
                              <MenuItem value="Não" sx={{ borderBottom: '1px solid #eee' }}>Não pertence</MenuItem>
                              {COMUNIDADES_TRADICIONAIS.map(com => (
                                <MenuItem key={com} value={com} sx={{ fontSize: '0.85rem' }}>{com}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={applyBatchComunidade}
                            disabled={!batchComunidade}
                            sx={{ bgcolor: '#00897b', '&:hover': { bgcolor: '#00695c' }, fontWeight: 700, textTransform: 'none' }}
                          >
                            Aplicar Comunidade
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={clearBatchComunidade}
                            sx={{ color: '#ef5350', borderColor: '#ef5350', textTransform: 'none' }}
                          >
                            Limpar Comunidade
                          </Button>

                          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                          {/* Status em lote */}
                          <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel sx={{ fontSize: '0.8rem' }}>📋 Status</InputLabel>
                            <Select
                              label="📋 Status"
                              value={batchStatus}
                              onChange={e => setBatchStatus(e.target.value)}
                              sx={{ fontSize: '0.8rem', bgcolor: 'white' }}
                            >
                              <MenuItem value=""><em>Selecionar...</em></MenuItem>
                              <MenuItem value="Inscrito">Inscrito</MenuItem>
                              <MenuItem value="Contemplado">✅ Contemplado</MenuItem>
                              <MenuItem value="Suplente">⚠️ Suplente</MenuItem>
                              <MenuItem value="Desclassificado">❌ Desclassificado</MenuItem>
                            </Select>
                          </FormControl>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={applyBatchStatus}
                            disabled={!batchStatus}
                            sx={{ bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' }, fontWeight: 700, textTransform: 'none' }}
                          >
                            Aplicar Status
                          </Button>

                          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setSelectedRows(new Set())}
                            sx={{ color: '#757575', borderColor: '#bdbdbd', textTransform: 'none' }}
                          >
                            ✕ Limpar seleção
                          </Button>
                        </Box>
                      </Box>
                    )}

                    <Alert severity="info" sx={{ mb: 1.5 }}>
                      {(() => {
                        let projetosFiltrados = parsedData.projetos || [];
                        if (filtroEdital) projetosFiltrados = projetosFiltrados.filter(p => matchesFiltroEdital(p));
                        if (buscaProponente.trim()) {
                          const q = buscaProponente.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                          projetosFiltrados = projetosFiltrados.filter(p => {
                            const nome = (p.proponente || p.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                            const proj = (p.nomeProjeto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                            const bairro = (p.bairro || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                            const com = (p.comunidadeTradicional || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                            const em = (p.email || '').toLowerCase();
                            return nome.includes(q) || proj.includes(q) || bairro.includes(q) || com.includes(q) || em.includes(q);
                          });
                        }
                        const from = projetosFiltrados.length === 0 ? 0 : tablePage.projetos * rowsPerPage.projetos + 1;
                        const to = Math.min((tablePage.projetos + 1) * rowsPerPage.projetos, projetosFiltrados.length);
                        return (
                          <>
                            Mostrando <strong>{from}-{to}</strong> de <strong>{projetosFiltrados.length}</strong> projeto(s) no preview.
                            Se não estiver vendo tudo, confira paginação, filtro de edital e busca.
                          </>
                        );
                      })()}
                    </Alert>

                    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff', width: 44, p: 0.5, textAlign: 'center' }}>
                              <Checkbox
                                size="small"
                                sx={{ p: 0.3 }}
                                onChange={() => {
                                  // Precisamos dos índices visíveis — vamos recalcular
                                  let projetosFiltrados = parsedData.projetos || [];
                                  if (filtroEdital) projetosFiltrados = projetosFiltrados.filter(p => matchesFiltroEdital(p));
                                  if (buscaProponente.trim()) {
                                    const q = buscaProponente.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                    projetosFiltrados = projetosFiltrados.filter(p => {
                                      const nome = (p.proponente || p.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                      const proj = (p.nomeProjeto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                      const bairro = (p.bairro || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                      const com = (p.comunidadeTradicional || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                      const em = (p.email || '').toLowerCase();
                                      return nome.includes(q) || proj.includes(q) || bairro.includes(q) || com.includes(q) || em.includes(q);
                                    });
                                  }
                                  const visibleIndices = projetosFiltrados.slice(tablePage.projetos * rowsPerPage.projetos, tablePage.projetos * rowsPerPage.projetos + rowsPerPage.projetos).map(p => (parsedData.projetos || []).indexOf(p));
                                  toggleSelectAllVisible(visibleIndices);
                                }}
                                checked={selectedRows.size > 0}
                                indeterminate={selectedRows.size > 0 && selectedRows.size < (parsedData.projetos?.length || 0)}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff', width: 130, whiteSpace: 'nowrap' }}>Ações</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>#</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Edital</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Proponente (Nome Completo)</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Tipo</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>CPF/CNPJ 🔒</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>E-mail 🔒</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Telefone 🔒</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Endereço 🔒</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Bairro</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Área de Atuação</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Nome do Projeto</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Comunidade Trad.</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>Gênero</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>Raça/Cor</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>Idade</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6' }}>PcD</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff' }}>Faixa de Valor</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff', textAlign: 'right', color: '#7b1fa2' }}>Valor Investido</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff', textAlign: 'center' }}>Status / Contemplar</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff', textAlign: 'center' }} title="Fotos e vídeos detectados nas URLs importadas">🎬 Mídia</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f9ff', textAlign: 'center' }} title="Links de anexos capturados automaticamente da planilha (PDFs, Google Forms, etc.)">📎 Documentos</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(() => {
                            // Aplica filtros: edital + pesquisa por proponente
                            let projetosFiltrados = parsedData.projetos || [];
                            if (filtroEdital) {
                              projetosFiltrados = projetosFiltrados.filter(p => matchesFiltroEdital(p));
                            }
                            if (buscaProponente.trim()) {
                              const q = buscaProponente.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                              projetosFiltrados = projetosFiltrados.filter(p => {
                                const nome = (p.proponente || p.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                const proj = (p.nomeProjeto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                const bairro = (p.bairro || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                const com = (p.comunidadeTradicional || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                const em = (p.email || '').toLowerCase();
                                return nome.includes(q) || proj.includes(q) || bairro.includes(q) || com.includes(q) || em.includes(q);
                              });
                            }
                            return projetosFiltrados;
                          })().slice(tablePage.projetos * rowsPerPage.projetos, tablePage.projetos * rowsPerPage.projetos + rowsPerPage.projetos).map((projeto, idx) => {
                            const realIndex = parsedData.projetos!.findIndex(p => p === projeto);
                            
                            const nome = getBestName(projeto);
                            const nomeProjeto = getProjectName(projeto);
                            
                            const edital = projeto._editalOrigem || getFieldFromRow(projeto,
                              'edital', 'Edital', 'EDITAL', 'editalNome',
                              'nome_edital', 'Nome do Edital'
                            ) || '-';
                            
                            // E-mail, Telefone, CPF — com anonimização
                            const emailRaw = projeto.email || '';
                            const telefoneRaw = projeto.telefone || '';
                            const cpfRaw = projeto.cpf_cnpj || '';
                            const emailDisplay = anonEmail(emailRaw);
                            const telefoneDisplay = anonTelefone(telefoneRaw);
                            const cpfDisplay = anonCPF(cpfRaw);
                            const tipoPessoaDisplay = projeto.tipoPessoa || detectTipoPessoa(projeto);
                            const enderecoCompletoRaw = projeto.enderecoCompleto || '';
                            const enderecoCompletoDisplay = anonEndereco(enderecoCompletoRaw, projeto.bairro);
                            // Diversidade (filtra valores inválidos vindos de colunas bancárias/financeiras)
                            const generoDisplay = isValidDiversityValue(projeto.genero || '') ? (projeto.genero || '') : '';
                            const racaDisplay = isValidDiversityValue(projeto.raca || '') ? (projeto.raca || '') : '';
                            const idadeRawDisp = projeto.idade || '';
                            const idadeDisplay = (() => {
                              const s = String(idadeRawDisp || '').trim();
                              if (!isIdadePlausivelRaw(s)) return '';
                              const n = parseInt(s, 10);
                              if (n > 0 && n < 130) return `${n} anos`;
                              return s;
                            })();
                            const deficienciaDisplay = isValidDiversityValue(projeto.deficiencia || '') ? (projeto.deficiencia || '') : '';
                            
                            const bairro = (() => {
                              const b = projeto.bairro;
                              if (b && !isEmail(b) && !isFaixaValorValue(b)) return b;
                              // Fallback: busca no render (projetos antigos sem normalização)
                              const field = getFieldFromRow(projeto,
                                'bairro', 'Bairro', 'BAIRRO', 'localidade', 'Localidade',
                                'Bairro onde reside', 'bairro onde reside'
                              );
                              if (field && !isEmail(field) && !isUrl(field) && !isFaixaValorValue(field)) return String(field);
                              // Tenta extrair do endereço completo
                              if (enderecoCompletoDisplay) {
                                const fromEnd = extractBairroFromEndereco(enderecoCompletoDisplay);
                                if (fromEnd) return fromEnd;
                              }
                              // Busca fuzzy em colunas
                              const rk = Object.keys(projeto);
                              const bCol = rk.find(k => { const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return cl.includes('bairro') && !cl.includes('faixa') && !cl.includes('valor') && !isAttachmentColumn(k); });
                              if (bCol && projeto[bCol] && !isEmail(projeto[bCol]) && !isFaixaValorValue(projeto[bCol])) return String(projeto[bCol]);
                              return '-';
                            })();

                            // Área de atuação (normalizada na importação ou busca dinâmica)
                            const areaAtuacaoExtracted = (projeto.areaAtuacao && !isFaixaValorValue(projeto.areaAtuacao) ? projeto.areaAtuacao : '') || (() => {
                              const raw = getFieldFromRow(projeto,
                                'area_atuacao', 'Área de Atuação', 'area de atuacao',
                                'segmento', 'Segmento', 'linguagem_artistica',
                                'Linguagem Artística', 'linguagem', 'Linguagem',
                                'categoria', 'Categoria', 'modalidade', 'Modalidade',
                                'Segmento cultural', 'Área de atuação cultural'
                              );
                              return raw && !isFaixaValorValue(raw) ? raw : '';
                            })() || (() => {
                              const rk = Object.keys(projeto);
                              const aCol = rk.find(k => {
                                const c = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                return (c.includes('area') && c.includes('atuacao') || c.includes('segmento') || c.includes('linguagem') || c.includes('modalidade')) && !c.includes('faixa') && !c.includes('valor') && !isAttachmentColumn(k);
                              });
                              return aCol && !isFaixaValorValue(projeto[aCol]) ? String(projeto[aCol]) : '-';
                            })();
                            const areaAtuacao = isFaixaValorValue(areaAtuacaoExtracted) ? '-' : areaAtuacaoExtracted;
                            const areaDisplay = String(areaAtuacao).length > 35 
                              ? String(areaAtuacao).substring(0, 35) + '...' : String(areaAtuacao);
                            
                            // Comunidade Tradicional
                            const comunidade = projeto.comunidadeTradicional || getFieldFromRow(projeto,
                              'comunidade_tradicional', 'comunidade tradicional', 'Comunidade Tradicional',
                              'COMUNIDADE TRADICIONAL', 'comunidadeTradicional', 'povo_tradicional',
                              'comunidade'
                            ) || (() => {
                              const rk = Object.keys(projeto);
                              const comCol = rk.find(k => {
                                const cleaned = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                return (cleaned.includes('comunidade') || cleaned.includes('tradicional') || 
                                        cleaned.includes('quilombo') || cleaned.includes('caicar') ||
                                        cleaned.includes('indigena') || cleaned.includes('pertence') ||
                                        cleaned.includes('etnico') || cleaned.includes('povo')) && !isAttachmentColumn(k);
                              });
                              return comCol ? String(projeto[comCol]) : '';
                            })();
                            const comDisplay = String(comunidade || '').trim();
                            const isComunidade = comDisplay !== '' && comDisplay.toLowerCase() !== 'não' && comDisplay !== '-' &&
                              (COMUNIDADES_TRADICIONAIS.some(c => c.toLowerCase() === comDisplay.toLowerCase()) ||
                               comDisplay.toLowerCase().includes('sim') || comDisplay.toLowerCase().includes('yes') ||
                               comDisplay.toLowerCase().includes('quilombo') || comDisplay.toLowerCase().includes('caiçara') ||
                               comDisplay.toLowerCase().includes('indígena') || comDisplay.toLowerCase().includes('indigena'));
                            
                            // Faixa de valor
                            const faixaVal = projeto.faixaValor || projeto.faixa || getFieldFromRow(projeto,
                              'faixa', 'Faixa', 'faixa_valor', 'Faixa de Valor', 'faixa de valores',
                              'Qual a faixa de valor escolhida'
                            ) || (() => {
                              const rk = Object.keys(projeto);
                              const fxCol = rk.find(k => {
                                const cleaned = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                return cleaned.includes('faixa') && (cleaned.includes('valor') || cleaned.includes('escolhida') || cleaned === 'faixa') && !isAttachmentColumn(k);
                              });
                              return fxCol ? projeto[fxCol] : '';
                            })();
                            const faixaDisplay = String(faixaVal || '').trim();
                            
                            const statusRaw = projeto.status || getFieldFromRow(projeto,
                              'status', 'Status', 'STATUS', 'situacao',
                              'Situação', 'resultado', 'Resultado'
                            ) || '';
                            const statusLower = String(statusRaw).toLowerCase();
                            
                            const isContemplado = statusLower.includes('contemplado') || statusLower.includes('aprovado') || 
                                                  statusLower.includes('classificado') || statusLower.includes('selecionado');
                            const isSuplente = statusLower.includes('suplente');
                            const isDesclassificado = statusLower.includes('desclassificado') || statusLower.includes('indeferido') || statusLower.includes('reprovado');
                            
                            const isEditingThis = editingRow?.tab === 'projetos' && editingRow?.index === realIndex;
                            
                            return (
                              <TableRow key={idx} sx={{ bgcolor: selectedRows.has(realIndex) ? '#e0f7fa' : isEditingThis ? '#fffde7' : isContemplado ? '#f0fdf4' : isSuplente ? '#fffbeb' : isDesclassificado ? '#fef2f2' : 'inherit' }}>
                                {/* CHECKBOX SELEÇÃO */}
                                <TableCell sx={{ p: 0.5, textAlign: 'center' }}>
                                  <Checkbox
                                    size="small"
                                    checked={selectedRows.has(realIndex)}
                                    onChange={() => toggleRowSelection(realIndex)}
                                    sx={{ p: 0.3 }}
                                  />
                                </TableCell>
                                {/* AÇÕES: editar, excluir + botão dedicado Contemplar */}
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                  {isEditingThis ? (
                                    <>
                                      <Button size="small" color="success" onClick={saveEditing} sx={{ minWidth: 28, p: 0.3 }} title="Salvar"><CheckCircle size={14} /></Button>
                                      <Button size="small" color="inherit" onClick={cancelEditing} sx={{ minWidth: 28, p: 0.3 }} title="Cancelar"><RefreshCw size={12} /></Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button size="small" color="primary" onClick={() => startEditing('projetos', realIndex, projeto)} sx={{ minWidth: 28, p: 0.3 }} title="Editar"><Edit size={12} /></Button>
                                      <Button size="small" color="error" onClick={() => deleteRow('projetos', realIndex)} sx={{ minWidth: 28, p: 0.3 }} title="Excluir"><Trash2 size={12} /></Button>
                                      {!isContemplado ? (
                                        <Button 
                                          size="small" 
                                          onClick={() => {
                                            const updated = [...(parsedData.projetos || [])];
                                            const projeto = { ...updated[realIndex], status: 'Contemplado' };
                                            // 💰 TRANSFORMAR FAIXA DE VALOR EM VALOR INVESTIDO
                                            if (!projeto.valor || projeto.valor === 0) {
                                              if (projeto.faixa) {
                                                const valorExtraido = extractValorFromFaixa(projeto.faixa);
                                                if (valorExtraido > 0) {
                                                  projeto.valor = valorExtraido;
                                                  console.log(`💰 Valor automático extraído da faixa: R$ ${valorExtraido.toLocaleString('pt-BR')}`);
                                                }
                                              }
                                              if ((!projeto.valor || projeto.valor === 0) && projeto.faixaValor) {
                                                const valorExtraido = extractValorFromFaixa(projeto.faixaValor);
                                                if (valorExtraido > 0) {
                                                  projeto.valor = valorExtraido;
                                                  console.log(`💰 Valor automático extraído de faixaValor: R$ ${valorExtraido.toLocaleString('pt-BR')}`);
                                                }
                                              }
                                            }
                                            updated[realIndex] = projeto;
                                            const newPD = { ...parsedData, projetos: updated };
                                            setParsedData(newPD);
                                            persistData(newPD);
                                          }}
                                          sx={{ minWidth: 28, p: 0.3, color: '#2e7d32', '&:hover': { bgcolor: '#e8f5e9' } }} 
                                          title="🏆 Marcar como Contemplado"
                                        >
                                          <Award size={13} />
                                        </Button>
                                      ) : (
                                        <Button 
                                          size="small" 
                                          onClick={() => {
                                            const updated = [...(parsedData.projetos || [])];
                                            updated[realIndex] = { ...updated[realIndex], status: 'Inscrito' };
                                            const newPD = { ...parsedData, projetos: updated };
                                            setParsedData(newPD);
                                            persistData(newPD);
                                          }}
                                          sx={{ minWidth: 28, p: 0.3, color: '#9e9e9e', '&:hover': { bgcolor: '#fafafa' } }} 
                                          title="Remover contemplação (voltar para Inscrito)"
                                        >
                                          <Award size={13} />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </TableCell>
                                <TableCell sx={{ color: '#9ca3af', fontSize: '0.75rem' }}>{idx + 1}</TableCell>
                                {/* EDITAL (editável) */}
                                <TableCell sx={{ fontSize: '0.75rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {isEditingThis ? (
                                    <TextField 
                                      size="small" 
                                      value={editValues._editalOrigem || editValues.edital || ''} 
                                      onChange={e => setEditValues(prev => ({ ...prev, _editalOrigem: e.target.value, edital: e.target.value }))} 
                                      sx={{ minWidth: 120, '& input': { fontSize: '0.75rem', py: 0.5 } }} 
                                      placeholder="Nome do Edital"
                                    />
                                  ) : (
                                    <Chip label={String(edital).length > 18 ? String(edital).substring(0, 18) + '...' : edital} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontSize: '0.65rem', fontWeight: 600, height: 22 }} title={String(edital)} />
                                  )}
                                </TableCell>
                                {/* PROPONENTE (NOME COMPLETO) */}
                                <TableCell sx={{ fontWeight: 600, maxWidth: 200, fontSize: '0.85rem' }}>
                                  {isEditingThis ? (
                                    <TextField size="small" value={editValues.proponente || editValues.nome || ''} onChange={e => setEditValues(prev => ({ ...prev, proponente: e.target.value, nome: e.target.value }))} sx={{ minWidth: 140, '& input': { fontSize: '0.8rem', py: 0.5 } }} />
                                  ) : (
                                    <span title={nome}>{nome.length > 30 ? nome.substring(0, 30) + '...' : nome}</span>
                                  )}
                                </TableCell>
                                {/* TIPO PESSOA (PF/PJ) */}
                                <TableCell sx={{ fontSize: '0.7rem', textAlign: 'center' }}>
                                  {isEditingThis ? (
                                    <FormControl size="small" sx={{ minWidth: 100 }}>
                                      <Select
                                        value={editValues.tipoPessoa || ''}
                                        onChange={e => setEditValues(prev => ({ ...prev, tipoPessoa: e.target.value }))}
                                        displayEmpty
                                        sx={{ fontSize: '0.7rem', '& .MuiSelect-select': { py: 0.5 } }}
                                      >
                                        <MenuItem value=""><em>-</em></MenuItem>
                                        <MenuItem value="Pessoa Física">Pessoa Física</MenuItem>
                                        <MenuItem value="Pessoa Jurídica">Pessoa Jurídica</MenuItem>
                                      </Select>
                                    </FormControl>
                                  ) : tipoPessoaDisplay ? (
                                    <Chip 
                                      label={tipoPessoaDisplay === 'Pessoa Física' ? '👤 PF' : tipoPessoaDisplay === 'Pessoa Jurídica' ? '🏢 PJ' : tipoPessoaDisplay}
                                      size="small"
                                      sx={{ 
                                        bgcolor: tipoPessoaDisplay.includes('Física') ? '#e8f5e9' : tipoPessoaDisplay.includes('Jurídica') ? '#fff3e0' : '#f5f5f5',
                                        color: tipoPessoaDisplay.includes('Física') ? '#2e7d32' : tipoPessoaDisplay.includes('Jurídica') ? '#e65100' : '#757575',
                                        fontWeight: 600, fontSize: '0.65rem', height: 22
                                      }}
                                      title={tipoPessoaDisplay}
                                    />
                                  ) : (
                                    <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>
                                  )}
                                </TableCell>
                                {/* CPF/CNPJ 🔒 ANONIMIZADO */}
                                <TableCell sx={{ fontSize: '0.7rem', maxWidth: 150, whiteSpace: 'nowrap', color: '#78909c' }}>
                                  {isEditingThis ? (
                                    <TextField size="small" value={editValues.cpf_cnpj || ''} onChange={e => setEditValues(prev => ({ ...prev, cpf_cnpj: e.target.value }))} sx={{ minWidth: 120, '& input': { fontSize: '0.7rem', py: 0.5 } }} placeholder="CPF ou CNPJ" />
                                  ) : cpfDisplay ? (
                                    <span title="Dado anonimizado para proteção (LGPD)">🔒 {cpfDisplay}</span>
                                  ) : (
                                    <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>
                                  )}
                                </TableCell>
                                {/* E-MAIL 🔒 ANONIMIZADO */}
                                <TableCell sx={{ fontSize: '0.72rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1565c0' }}>
                                  {isEditingThis ? (
                                    <TextField size="small" value={editValues.email || ''} onChange={e => setEditValues(prev => ({ ...prev, email: e.target.value }))} sx={{ minWidth: 140, '& input': { fontSize: '0.75rem', py: 0.5 } }} placeholder="email@exemplo.com" />
                                  ) : emailDisplay ? (
                                    <span title="Dado anonimizado para proteção (LGPD)">🔒 {emailDisplay}</span>
                                  ) : (
                                    <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>
                                  )}
                                </TableCell>
                                {/* TELEFONE 🔒 ANONIMIZADO */}
                                <TableCell sx={{ fontSize: '0.72rem', maxWidth: 130, whiteSpace: 'nowrap', color: '#424242' }}>
                                  {isEditingThis ? (
                                    <TextField size="small" value={editValues.telefone || ''} onChange={e => setEditValues(prev => ({ ...prev, telefone: e.target.value }))} sx={{ minWidth: 110, '& input': { fontSize: '0.75rem', py: 0.5 } }} placeholder="(12) 99999-9999" />
                                  ) : telefoneDisplay ? (
                                    <span title="Dado anonimizado para proteção (LGPD)">🔒 {telefoneDisplay}</span>
                                  ) : (
                                    <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>
                                  )}
                                </TableCell>
                                {/* ENDEREÇO 🔒 ANONIMIZADO */}
                                <TableCell sx={{ fontSize: '0.7rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#78909c' }}>
                                  {isEditingThis ? (
                                    <TextField size="small" value={editValues.enderecoCompleto || ''} onChange={e => setEditValues(prev => ({ ...prev, enderecoCompleto: e.target.value }))} sx={{ minWidth: 140, '& input': { fontSize: '0.7rem', py: 0.5 } }} placeholder="Endereço completo" />
                                  ) : enderecoCompletoDisplay ? (
                                    <span title="Dado anonimizado para proteção (LGPD)">🔒 {enderecoCompletoDisplay}</span>
                                  ) : (
                                    <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>
                                  )}
                                </TableCell>
                                {/* BAIRRO */}
                                <TableCell sx={{ fontSize: '0.8rem' }}>
                                  {isEditingThis ? (
                                    <TextField size="small" value={editValues.bairro || ''} onChange={e => setEditValues(prev => ({ ...prev, bairro: e.target.value }))} sx={{ minWidth: 90, '& input': { fontSize: '0.8rem', py: 0.5 } }} />
                                  ) : (isEmail(bairro) ? '-' : bairro)}
                                </TableCell>
                                {/* ÁREA DE ATUAÇÃO */}
                                <TableCell sx={{ fontSize: '0.75rem', maxWidth: 160, color: '#616161' }}>
                                  {isEditingThis ? (
                                    <TextField size="small" value={editValues.areaAtuacao || ''} onChange={e => setEditValues(prev => ({ ...prev, areaAtuacao: e.target.value }))} sx={{ minWidth: 120, '& input': { fontSize: '0.8rem', py: 0.5 } }} />
                                  ) : (
                                    <span title={String(areaAtuacao)}>{areaDisplay}</span>
                                  )}
                                </TableCell>
                                {/* NOME DO PROJETO */}
                                <TableCell sx={{ fontSize: '0.75rem', maxWidth: 200, color: '#424242' }}>
                                  {isEditingThis ? (
                                    <TextField size="small" value={editValues.nomeProjeto || ''} onChange={e => setEditValues(prev => ({ ...prev, nomeProjeto: e.target.value }))} sx={{ minWidth: 140, '& input': { fontSize: '0.8rem', py: 0.5 } }} />
                                  ) : (
                                    <span title={String(nomeProjeto)}>{nomeProjeto ? (String(nomeProjeto).length > 40 ? String(nomeProjeto).substring(0, 40) + '...' : nomeProjeto) : '-'}</span>
                                  )}
                                </TableCell>
                                {/* COMUNIDADE TRADICIONAL */}
                                <TableCell sx={{ textAlign: 'center' }}>
                                  {isEditingThis ? (
                                    <FormControl size="small" sx={{ minWidth: 140 }}>
                                      <Select
                                        value={editValues.comunidadeTradicional || ''}
                                        onChange={e => setEditValues(prev => ({ ...prev, comunidadeTradicional: e.target.value }))}
                                        displayEmpty
                                        sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.5 } }}
                                        MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
                                      >
                                        <MenuItem value=""><em>Nenhuma</em></MenuItem>
                                        <MenuItem value="Não" sx={{ borderBottom: '1px solid #eee' }}>Não pertence</MenuItem>
                                        {COMUNIDADES_TRADICIONAIS.map(com => (
                                          <MenuItem key={com} value={com} sx={{ fontSize: '0.8rem' }}>{com}</MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  ) : comDisplay ? (
                                    <Chip 
                                      label={isComunidade ? `🏘️ ${comDisplay.length > 18 ? comDisplay.substring(0, 18) + '…' : comDisplay}` : comDisplay.length > 20 ? comDisplay.substring(0, 20) + '...' : comDisplay}
                                      size="small" 
                                      sx={{ 
                                        bgcolor: isComunidade ? '#e0f2f1' : '#f5f5f5', 
                                        color: isComunidade ? '#00695c' : '#757575',
                                        fontWeight: isComunidade ? 700 : 400,
                                        fontSize: '0.68rem', height: 22 
                                      }} 
                                      title={comDisplay}
                                    />
                                  ) : (
                                    <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>
                                  )}
                                </TableCell>
                                {/* 🎨 GÊNERO */}
                                <TableCell sx={{ fontSize: '0.72rem', maxWidth: 110, bgcolor: '#f3f0ff' }}>
                                  {isEditingThis ? (
                                    <FormControl size="small" sx={{ minWidth: 100 }}>
                                      <Select value={editValues.genero || ''} onChange={e => setEditValues(prev => ({ ...prev, genero: e.target.value }))} displayEmpty sx={{ fontSize: '0.7rem', '& .MuiSelect-select': { py: 0.5 } }}>
                                        <MenuItem value=""><em>-</em></MenuItem>
                                        {GENERO_OPTIONS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                                      </Select>
                                    </FormControl>
                                  ) : generoDisplay ? (
                                    <Chip label={generoDisplay.length > 12 ? generoDisplay.substring(0,12)+'…' : generoDisplay} size="small" sx={{ bgcolor: generoDisplay.toLowerCase().includes('feminino') ? '#fce4ec' : generoDisplay.toLowerCase().includes('masculino') ? '#e3f2fd' : '#f3e5f5', fontSize: '0.65rem', height: 20, fontWeight: 600 }} />
                                  ) : <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>}
                                </TableCell>
                                {/* 🎨 RAÇA/COR */}
                                <TableCell sx={{ fontSize: '0.72rem', maxWidth: 110, bgcolor: '#f3f0ff' }}>
                                  {isEditingThis ? (
                                    <FormControl size="small" sx={{ minWidth: 100 }}>
                                      <Select value={editValues.raca || ''} onChange={e => setEditValues(prev => ({ ...prev, raca: e.target.value }))} displayEmpty sx={{ fontSize: '0.7rem', '& .MuiSelect-select': { py: 0.5 } }}>
                                        <MenuItem value=""><em>-</em></MenuItem>
                                        <MenuItem value="Branca">Branca</MenuItem>
                                        <MenuItem value="Preta">Preta</MenuItem>
                                        <MenuItem value="Parda">Parda</MenuItem>
                                        <MenuItem value="Amarela">Amarela</MenuItem>
                                        <MenuItem value="Indígena">Indígena</MenuItem>
                                        <MenuItem value="Não informado">Não informado</MenuItem>
                                      </Select>
                                    </FormControl>
                                  ) : racaDisplay ? (
                                    <Chip label={racaDisplay.length > 12 ? racaDisplay.substring(0,12)+'…' : racaDisplay} size="small" sx={{ bgcolor: '#fff3e0', fontSize: '0.65rem', height: 20, fontWeight: 600 }} />
                                  ) : <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>}
                                </TableCell>
                                {/* 🎨 IDADE */}
                                <TableCell sx={{ fontSize: '0.72rem', maxWidth: 80, bgcolor: '#f3f0ff' }}>
                                  {isEditingThis ? (
                                    <TextField size="small" value={editValues.idade || ''} onChange={e => setEditValues(prev => ({ ...prev, idade: e.target.value }))} sx={{ minWidth: 60, '& input': { fontSize: '0.7rem', py: 0.5 } }} placeholder="Idade" />
                                  ) : idadeDisplay ? (
                                    <span>{String(idadeDisplay).length > 10 ? String(idadeDisplay).substring(0,10)+'…' : idadeDisplay}</span>
                                  ) : <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>}
                                </TableCell>
                                {/* 🎨 PcD */}
                                <TableCell sx={{ fontSize: '0.72rem', maxWidth: 80, bgcolor: '#f3f0ff' }}>
                                  {isEditingThis ? (
                                    <FormControl size="small" sx={{ minWidth: 80 }}>
                                      <Select value={editValues.deficiencia || ''} onChange={e => setEditValues(prev => ({ ...prev, deficiencia: e.target.value }))} displayEmpty sx={{ fontSize: '0.7rem', '& .MuiSelect-select': { py: 0.5 } }}>
                                        <MenuItem value=""><em>-</em></MenuItem>
                                        <MenuItem value="Sim">Sim</MenuItem>
                                        <MenuItem value="Não">Não</MenuItem>
                                        <MenuItem value="Física">Física</MenuItem>
                                        <MenuItem value="Visual">Visual</MenuItem>
                                        <MenuItem value="Auditiva">Auditiva</MenuItem>
                                        <MenuItem value="Intelectual">Intelectual</MenuItem>
                                      </Select>
                                    </FormControl>
                                  ) : deficienciaDisplay ? (
                                    <Chip label={deficienciaDisplay.toLowerCase().includes('sim') || deficienciaDisplay.toLowerCase().includes('físic') || deficienciaDisplay.toLowerCase().includes('visual') ? '♿ Sim' : deficienciaDisplay.length > 8 ? deficienciaDisplay.substring(0,8)+'…' : deficienciaDisplay} size="small" sx={{ bgcolor: deficienciaDisplay.toLowerCase() === 'não' ? '#f5f5f5' : '#e8f5e9', fontSize: '0.65rem', height: 20, fontWeight: 600 }} />
                                  ) : <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>}
                                </TableCell>
                                {/* FAIXA DE VALOR */}
                                <TableCell sx={{ fontSize: '0.75rem', maxWidth: 140, color: '#7b1fa2', fontWeight: 600 }}>
                                  {isEditingThis ? (
                                    <TextField size="small" value={editValues.faixa || ''} onChange={e => setEditValues(prev => ({ ...prev, faixa: e.target.value }))} sx={{ minWidth: 100, '& input': { fontSize: '0.8rem', py: 0.5 } }} />
                                  ) : (
                                    <span title={faixaDisplay}>{faixaDisplay ? (faixaDisplay.length > 25 ? faixaDisplay.substring(0, 25) + '...' : faixaDisplay) : '-'}</span>
                                  )}
                                </TableCell>
                                {/* VALOR INVESTIDO (editável) */}
                                <TableCell sx={{ textAlign: 'right', fontWeight: 700, fontSize: '0.8rem' }}>
                                  {isEditingThis ? (
                                    <TextField 
                                      size="small" 
                                      value={editValues._valorRaw !== undefined ? editValues._valorRaw : (editValues.valor ? String(editValues.valor) : '')} 
                                      onChange={e => {
                                        const v = e.target.value;
                                        setEditValues(prev => ({ ...prev, valor: parseBRLField(v) || 0, _valorRaw: v }));
                                      }}
                                      placeholder="Ex: 20.000,00"
                                      sx={{ minWidth: 100, '& input': { fontSize: '0.8rem', py: 0.5, textAlign: 'right' } }} 
                                    />
                                  ) : (() => {
                                    const valorNum = getProjetoValorNormalizado(projeto);
                                    if (isContemplado && valorNum > 0) {
                                      return <Box component="span" sx={{ color: '#2e7d32' }}>R$ {valorNum.toLocaleString('pt-BR')}</Box>;
                                    }
                                    if (isContemplado && valorNum === 0) {
                                      return <Box component="span" sx={{ color: '#ff9800', fontSize: '0.7rem' }}>Sem valor</Box>;
                                    }
                                    if (isSuplente && valorNum > 0) {
                                      return <Box component="span" sx={{ color: '#9e9e9e', fontSize: '0.7rem' }}>R$ {valorNum.toLocaleString('pt-BR')}</Box>;
                                    }
                                    return <Box component="span" sx={{ color: '#e0e0e0' }}>-</Box>;
                                  })()}
                                </TableCell>
                                {/* STATUS + BOTÃO CONTEMPLAR */}
                                <TableCell sx={{ textAlign: 'center' }}>
                                  {isEditingThis ? (
                                    <FormControl size="small" sx={{ minWidth: 130 }}>
                                      <Select
                                        value={editValues.status || 'Inscrito'}
                                        onChange={e => setEditValues(prev => ({ ...prev, status: e.target.value }))}
                                        sx={{ fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.5 } }}
                                      >
                                        <MenuItem value="Inscrito">Inscrito</MenuItem>
                                        <MenuItem value="Contemplado">✅ Contemplado</MenuItem>
                                        <MenuItem value="Suplente">⚠️ Suplente</MenuItem>
                                        <MenuItem value="Desclassificado">❌ Desclassificado</MenuItem>
                                      </Select>
                                    </FormControl>
                                  ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                      <Chip 
                                        label={isContemplado ? '✅ Contemplado' : isSuplente ? '⚠️ Suplente' : isDesclassificado ? '❌ Desclassificado' : '○ Inscrito'}
                                        size="small" 
                                        onClick={() => toggleStatus(realIndex)}
                                        sx={{ 
                                          cursor: 'pointer', 
                                          bgcolor: isContemplado ? '#4caf50' : isSuplente ? '#ff9800' : isDesclassificado ? '#f44336' : '#e0e0e0',
                                          color: isContemplado || isSuplente || isDesclassificado ? 'white' : '#757575',
                                          '&:hover': { opacity: 0.8, transform: 'scale(1.05)' }, 
                                          transition: 'all 0.15s', 
                                          fontWeight: 700, 
                                          fontSize: '0.7rem',
                                          border: 'none'
                                        }}
                                        title="Clique para alternar: Inscrito → Contemplado → Suplente → Desclassificado"
                                      />
                                    </Box>
                                  )}
                                </TableCell>
                                {/* LINKS DE MÍDIA (FOTO/VÍDEO) */}
                                <TableCell sx={{ fontSize: '0.7rem', textAlign: 'center' }}>
                                  {(() => {
                                    const links = (projeto.linksDocumentos || []) as string[];
                                    const midias = links.filter((l) => isImageUrl(l) || isVideoUrl(l));
                                    if (midias.length === 0) {
                                      return <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>;
                                    }
                                    return (
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {midias.slice(0, 3).map((link: string, linkIdx: number) => (
                                          <Link
                                            key={linkIdx}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            underline="none"
                                            sx={{ fontSize: '0.7rem', color: '#7c3aed' }}
                                          >
                                            {isVideoUrl(link) ? '🎬 Vídeo' : '🖼️ Foto'} {linkIdx + 1}
                                          </Link>
                                        ))}
                                        {midias.length > 3 && (
                                          <Typography variant="caption" sx={{ color: '#7c3aed' }}>
                                            +{midias.length - 3} mídias
                                          </Typography>
                                        )}
                                      </Box>
                                    );
                                  })()}
                                </TableCell>
                                {/* LINKS DE DOCUMENTOS */}
                                <TableCell sx={{ fontSize: '0.7rem', textAlign: 'center' }}>
                                  {projeto.linksDocumentos && projeto.linksDocumentos.length > 0 ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                      {projeto.linksDocumentos.map((link: string, linkIdx: number) => (
                                        <Link
                                          key={linkIdx}
                                          href={link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          underline="none"
                                          title={link}
                                          aria-label={`Documento anexo ${linkIdx + 1}`}
                                          sx={{
                                            fontSize: '0.7rem',
                                            color: '#1565c0',
                                            display: 'block',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: '120px',
                                          }}
                                        >
                                          📄 Doc {linkIdx + 1}
                                        </Link>
                                      ))}
                                    </Box>
                                  ) : (
                                    <Typography variant="caption" sx={{ color: '#bdbdbd' }}>-</Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      <TablePagination
                        component="div"
                        count={(() => {
                          let pf = parsedData.projetos || [];
                          if (filtroEdital) pf = pf.filter(p => matchesFiltroEdital(p));
                          if (buscaProponente.trim()) {
                            const q = buscaProponente.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                            pf = pf.filter(p => {
                              const n = (p.proponente || p.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                              const pr = (p.nomeProjeto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                              return n.includes(q) || pr.includes(q);
                            });
                          }
                          return pf.length;
                        })()}
                        page={tablePage.projetos}
                        onPageChange={(_, p) => setTablePage(prev => ({ ...prev, projetos: p }))}
                        rowsPerPage={rowsPerPage.projetos}
                        onRowsPerPageChange={e => { setRowsPerPage(prev => ({ ...prev, projetos: parseInt(e.target.value) })); setTablePage(prev => ({ ...prev, projetos: 0 })); }}
                        rowsPerPageOptions={[25, 50, 100, 200]}
                        labelRowsPerPage="Por página:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                      />
                    </TableContainer>
                  </>
                )}
              </Box>
            )}

            <Divider sx={{ my: 4 }} />

            {/* Botões de ação finais */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<RefreshCw />}
                onClick={reprocessarDados}
                disabled={loading || Object.keys(parsedData).length === 0}
                sx={{ 
                  bgcolor: '#7c3aed', 
                  '&:hover': { bgcolor: '#6d28d9' },
                  fontWeight: 700,
                  px: 4
                }}
              >
                🔄 Reprocessar Dados (Normalizar Campos)
              </Button>

              <Button
                variant="contained"
                size="large"
                startIcon={<Save />}
                onClick={saveToServer}
                disabled={loading || Object.keys(parsedData).length === 0}
                sx={{ 
                  bgcolor: '#00A38C', 
                  '&:hover': { bgcolor: '#008a74' },
                  fontWeight: 700,
                  px: 4
                }}
              >
                {loading ? 'Salvando...' : 'Salvar Todos os Dados'}
              </Button>

              <Button
                variant="outlined"
                size="large"
                startIcon={<RefreshCw />}
                onClick={() => window.location.reload()}
                sx={{ color: '#0b57d0', borderColor: '#0b57d0', fontWeight: 700 }}
              >
                Recarregar Página
              </Button>
            </Box>

            {/* Resumo dos dados importados */}
            <Box sx={{ mt: 4, p: 3, bgcolor: '#f5f9ff', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Info size={20} className="text-[#0b57d0]" />
                Resumo dos Dados Importados
              </Typography>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
                <div>
                  <Typography variant="body2" color="text.secondary">Base Geral</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#0b57d0' }}>
                    {(parsedData.agentes?.length || 0) + (parsedData.grupos?.length || 0) + (parsedData.espacos?.length || 0)}
                  </Typography>
                </div>
                <div>
                  <Typography variant="body2" color="text.secondary">Agentes</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#0b57d0' }}>
                    {parsedData.agentes?.length || 0}
                  </Typography>
                </div>
                <div>
                  <Typography variant="body2" color="text.secondary">Grupos</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#0b57d0' }}>
                    {parsedData.grupos?.length || 0}
                  </Typography>
                </div>
                <div>
                  <Typography variant="body2" color="text.secondary">Espaços</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#0b57d0' }}>
                    {parsedData.espacos?.length || 0}
                  </Typography>
                </div>
                <div>
                  <Typography variant="body2" color="text.secondary">Projetos</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#0b57d0' }}>
                    {parsedData.projetos?.length || 0}
                  </Typography>
                </div>
                <div>
                  <Typography variant="body2" color="text.secondary">Total Registros</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#00A38C' }}>
                    {Object.values(parsedData).reduce((sum, arr) => sum + (arr?.length || 0), 0)}
                  </Typography>
                </div>
              </div>
            </Box>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}