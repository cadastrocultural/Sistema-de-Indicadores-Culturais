import { GENERO_OPTIONS, RACA_OPTIONS, PCD_OPTIONS, ORIENTACAO_OPTIONS } from './constants';

// 🔍 Helpers para scan reverso (banca/financeiro)
export const isBankingColumnGlobal = (colName: string): boolean => {
  const lower = colName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return lower.includes('banco') || lower.includes('agencia') || lower.includes('conta') ||
         lower.includes('pix') || lower.includes('chave') || lower.includes('favorecido') ||
         lower.includes('orcamento') || lower.includes('valor') || lower.includes('parcela');
};

// 🔍 Detecta se um valor é "Faixa de Valor" monetário (contaminação de campo)
export const isFaixaValorValue = (val: any): boolean => {
  if (!val) return false;
  const s = String(val).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return (s.includes('faixa') && (s.includes('r$') || s.includes('ate r') || /\d{2,}[.,]\d{3}/.test(s))) ||
         /^faixa\s*\d/.test(s) ||
         (s.startsWith('faixa') && s.includes('000'));
};

// 💰 Extrai valor monetário baseado em faixa mencionada no campo
export const extractValorFromFaixa = (val: any): number => {
  if (!val) return 0;
  const s = String(val).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Prioriza valor monetário explícito (ex.: "Faixa 3 - até R$16.000,00")
  const explicitoMoeda = s.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+)(?:,\d{2})?/);
  if (explicitoMoeda) {
    return parseInt(explicitoMoeda[1].replace(/\./g, ''), 10) || 0;
  }
  
  const explicitoInteiro = s.match(/(?:ate|até)\s*r?\$?\s*(\d{4,6})(?:,\d{2})?/);
  if (explicitoInteiro) {
    return parseInt(explicitoInteiro[1], 10) || 0;
  }

  const milMatch = s.match(/(\d+)\s*mil/);
  if (milMatch) {
    return parseInt(milMatch[1]) * 1000;
  }

  // Fallback por número da faixa quando o texto não trouxer valor explícito
  const faixaMatch = s.match(/faixa\s*(\d+)/);
  if (faixaMatch) {
    const faixaNum = parseInt(faixaMatch[1]);
    switch(faixaNum) {
      case 1: return 120000;
      case 2: return 40000;
      case 3: return 30000;
      case 4: return 30000;
      case 5: return 19000;
      default: return 0;
    }
  }
  
  return 0;
};

// 🔍 SCAN REVERSO: Busca valores de diversidade em TODAS as colunas da row
export const scanValueInRow = (row: any, optionsList: readonly string[], excludeHeaderKeywords: string[] = []): string => {
  const rowKeys = Object.keys(row);
  const optsNorm = optionsList.map(o => o.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());
  
  for (const k of rowKeys) {
    const kLower = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (kLower.includes('nome') || kLower.includes('proponente') || kLower.includes('projeto') ||
        kLower.includes('bairro') || kLower.includes('endereco') || kLower.includes('endereço') ||
        kLower.includes('cpf') || kLower.includes('cnpj') || 
        kLower.includes('email') || kLower.includes('e-mail') || kLower.includes('eletronico') ||
        kLower.includes('telefone') || kLower.includes('celular') || kLower.includes('whatsapp') ||
        kLower.includes('carimbo') || kLower.includes('timestamp') ||
        kLower.includes('hora') || kLower.includes('status') || kLower.includes('resultado') ||
        kLower.includes('http') || kLower.includes('comprovante') || kLower.includes('anexo') ||
        kLower.includes('upload') || kLower.includes('arquivo') || kLower.includes('download') ||
        kLower.includes('inscricao') || kLower.includes('protocolo') ||
        (kLower.includes('faixa') && (kLower.includes('valor') || kLower.includes('escolhida'))) ||
        isBankingColumnGlobal(k) ||
        excludeHeaderKeywords.some(ek => kLower.includes(ek))) continue;
    
    const val = row[k];
    if (!val) continue;
    const valStr = String(val).trim();
    if (!valStr || valStr.length > 80 || valStr.length < 2) continue;
    if (/^[\d.,]+$/.test(valStr)) continue;
    if (valStr.includes('@') || valStr.startsWith('http')) continue;
    if (isFaixaValorValue(valStr)) continue;
    
    const valNorm = valStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const AMBIGUOUS = ['outro', 'outra', 'outros', 'outras', 'sim', 'nao', 'não', 'nenhum', 'nenhuma'];
    if (AMBIGUOUS.includes(valNorm)) continue;
    
    if (optsNorm.includes(valNorm)) return valStr;
    
    const match = optionsList.find((_opt, idx) => {
      const optN = optsNorm[idx];
      return valNorm === optN || (optN.length >= 5 && valNorm.includes(optN)) || (valNorm.length >= 5 && optN.includes(valNorm));
    });
    if (match) return match;
  }
  return '';
};

export const scanGeneroInRow = (row: any): string => {
  return scanValueInRow(row, GENERO_OPTIONS, ['raca', 'cor', 'etnia', 'deficiencia', 'pcd', 'orientacao', 'idade', 'nascimento', 'categoria', 'segmento', 'area', 'linguagem', 'modalidade', 'atuacao', 'comunidade', 'faixa', 'valor']);
};

/** Valida se o texto é plausivelmente raça/cor (IBGE/lista), excluindo religião, público, tipo de espaço etc. */
export function isPlausibleRacaCorValue(val: string): boolean {
  if (!val || String(val).trim().length < 2) return false;
  const low = String(val).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (low === 'sim' || low === 'nao' || low === 'não' || low === 's' || low === 'n') return false;
  if (low.startsWith('sim,') || low.startsWith('sim ') || low.startsWith('nao,') || low.startsWith('não,')) return false;
  if (low.includes('religiao') || low.includes('igreja') || low.includes('candomble') || low.includes('umbanda')) return false;
  if (low.includes('matriz africana') || low.includes('casa de ') || low.includes('terreiro')) return false;
  if (low.includes('livraria') || low.includes('ceramica') || low.includes('cerâmica')) return false;
  if (low.includes('jovens') && low.includes('adolescent')) return false;
  if (low.includes('apresentacao') || low.includes('apresentação')) return false;
  const matchesOption = RACA_OPTIONS.some(opt => {
    const on = opt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return low === on || (on.length >= 4 && low.includes(on)) || (low.length >= 4 && on.includes(low));
  });
  if (matchesOption) return true;
  const racaHints = ['pret', 'pard', 'branc', 'indig', 'amarel', 'negr', 'afro', 'color', 'multirracial', 'ibge', 'quilom', 'caiçara', 'caicara', 'caboclo', 'mesti'];
  return racaHints.some(h => low.includes(h));
}

export const scanRacaInRow = (row: any): string => {
  const result = scanValueInRow(row, RACA_OPTIONS, [
    'genero', 'sexo', 'deficiencia', 'pcd', 'orientacao', 'idade', 'nascimento',
    'categoria', 'segmento', 'area', 'linguagem', 'modalidade', 'atuacao', 'comunidade',
    'faixa', 'valor', 'religiao', 'religião', 'igreja', 'espiritual', 'candomble', 'umbanda',
    'crenca', 'crença', 'matriz', 'terreiro', 'publico', 'atende',
  ]);

  if (!result) return '';
  const resultLower = result.toLowerCase().trim();

  const VALORES_INVALIDOS = ['sim', 'não', 'nao', 'yes', 'no', 'true', 'false', '1', '0', 's', 'n'];
  if (VALORES_INVALIDOS.includes(resultLower)) return '';

  if (result.length < 3 && !RACA_OPTIONS.some(opt => opt.toLowerCase() === resultLower)) return '';

  if (result === 'Sim' || result === 'Não' || result === 'SIM' || result === 'NÃO') return '';

  if (!isPlausibleRacaCorValue(result)) return '';

  return result;
};

export const scanPcdInRow = (row: any): string => {
  const rowKeys = Object.keys(row);
  const pcdCol = rowKeys.find(k => {
    const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (cl.includes('publico') || cl.includes('atende') || cl.includes('faixa etaria') || cl.includes('faixa de') || cl.includes('qual o publico')) return false;
    return (cl.includes('deficiencia') || cl.includes('pcd') || cl.includes('pessoa com deficiencia') ||
            cl.includes('necessidades especiais') || cl.includes('acessibilidade'));
  });
  if (pcdCol && row[pcdCol]) {
    const val = String(row[pcdCol]).trim();
    const valLow = val.toLowerCase();
    if (valLow.includes('adulto') || valLow.includes('infantil') || valLow.includes('infanto') ||
        valLow.includes('religioso') || valLow.includes('mulheres') || valLow.includes('povos')) return '';
    if (/^\d+$/.test(val)) return '';
    if (val && val.length < 100) return val;
  }
  const scanned = scanValueInRow(row, PCD_OPTIONS, ['genero', 'sexo', 'raca', 'cor', 'orientacao', 'idade', 'nascimento', 'nome', 'bairro', 'publico', 'atende', 'comunidade', 'faixa', 'valor', 'categoria', 'segmento', 'area', 'linguagem']);
  const scannedNorm = String(scanned || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  // Evita contaminação por "Sim/Não" de colunas genéricas quando não há coluna clara de PcD.
  if (scannedNorm === 'sim' || scannedNorm === 'nao' || scannedNorm === 'não' || scannedNorm === 's' || scannedNorm === 'n') {
    return '';
  }
  return scanned;
};

// 🔍 Scan para data de nascimento / idade em colunas diversas
export const scanIdadeInRow = (row: any, calcIdadeFn: (s: string) => number | null): { idade: string; dataNascimento: string } => {
  const rowKeys = Object.keys(row);
  for (const k of rowKeys) {
    const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (cl.includes('faixa') && (cl.includes('valor') || cl.includes('escolhida'))) continue;
    if (cl.includes('comunidade') || cl.includes('tradicional') || cl.includes('pertence')) continue;
    if (cl.includes('idade') || cl.includes('nascimento') || cl.includes('data de nascimento') ||
        cl.includes('faixa etaria') || cl.includes('faixa_etaria') || cl.includes('dt_nasc')) {
      const val = row[k];
      if (!val) continue;
      const s = String(val).trim();
      if (isFaixaValorValue(s)) continue;
      if (/^\d{1,3}$/.test(s) && parseInt(s) > 0 && parseInt(s) < 130) return { idade: s, dataNascimento: '' };
      if (/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/.test(s) || /\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/.test(s)) {
        const calc = calcIdadeFn(s);
        if (calc !== null && calc > 0 && calc < 130) return { idade: String(calc), dataNascimento: s };
        return { idade: '', dataNascimento: s };
      }
      if (/^\d{4,5}$/.test(s)) {
        const calc = calcIdadeFn(s);
        if (calc !== null && calc > 0 && calc < 130) return { idade: String(calc), dataNascimento: s };
      }
      if (s.length < 30 && (s.includes('anos') || /\d+\s*a\s*\d+/.test(s))) return { idade: s, dataNascimento: '' };
    }
  }
  return { idade: '', dataNascimento: '' };
};

export const scanOrientacaoInRow = (row: any): string => {
  const rowKeys = Object.keys(row);
  const oriCol = rowKeys.find(k => {
    const cl = k.replace(/[;:.,]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return (cl.includes('orientacao') || cl.includes('sexualidade')) && !cl.includes('genero');
  });
  if (oriCol && row[oriCol]) {
    const val = String(row[oriCol]).trim();
    if (val && val.length < 80) return val;
  }
  return scanValueInRow(row, ORIENTACAO_OPTIONS, ['genero', 'sexo', 'raca', 'cor', 'deficiencia', 'pcd', 'idade', 'nascimento', 'nome', 'bairro', 'comunidade', 'faixa', 'valor', 'categoria', 'segmento', 'area', 'linguagem']);
};