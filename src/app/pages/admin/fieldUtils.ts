// Helpers para verificação de tipos de coluna
export const isUrl = (val: any): boolean => {
  if (!val) return false;
  return String(val).includes('http') || String(val).includes('://') || String(val).includes('forms.gle');
};

export const isAttachmentColumn = (colName: string): boolean => {
  const lower = colName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return lower.includes('comprovante') || lower.includes('anexo') || lower.includes('upload') ||
         lower.includes('curriculo') || lower.includes('arquivo') || lower.includes('drive.google') ||
         lower.includes('.pdf') || lower.includes('portfolio');
};

// FILTRA URLs e colunas de anexo para evitar capturar links de upload do Google Forms
export const getFieldFromRow = (row: any, ...keys: string[]) => {
  // 1) Tentativa EXATA (chave existe literalmente no objeto, pula URLs)
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      if (!isUrl(row[key])) return row[key];
    }
  }
  
  const rowKeys = Object.keys(row);
  
  // 2) Busca case-insensitive EXATA (sem partial matching, pula anexos)
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
  
  // 3) Busca por INÍCIO do nome da coluna
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

  // 4) Busca partial matching com blacklist de falsos positivos
  const STEP4_FALSE_MATCHES = [
    ['idade', 'comunidade'],
    ['idade', 'identidade'],
    ['idade', 'qualidade'],
    ['idade', 'quantidade'],
  ];
  for (const key of keys) {
    const keyNorm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    if (keyNorm.length < 3) continue;
    for (const k of rowKeys) {
      if (isAttachmentColumn(k)) continue;
      const kNorm = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      if (kNorm.length < 3) continue;
      if (!(kNorm.includes(keyNorm) || keyNorm.includes(kNorm))) continue;
      const isFalse = STEP4_FALSE_MATCHES.some(([badKey, badCol]) => keyNorm === badKey && kNorm.includes(badCol));
      if (isFalse) continue;
      if (row[k] !== undefined && row[k] !== null && row[k] !== '' && !isUrl(row[k])) {
        return row[k];
      }
    }
  }
  
  return null;
};

const looksLikeEmailLoose = (v: any): boolean => {
  if (!v || typeof v !== 'string') return false;
  const s = v.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
};

/**
 * Monta endereço completo a partir da planilha (mesma lógica usada em agentes) — reutilizado em grupos/espaços.
 */
export function extractEnderecoCompletoFromCadastroRow(row: any, bairroParaMontagem: string): string {
  const endField = getFieldFromRow(
    row,
    'endereco',
    'Endereço',
    'ENDEREÇO',
    'endereço',
    'endereco_completo',
    'Endereço Completo',
    'endereço completo',
    'Endereço completo',
    'Qual o seu endereço',
    'qual o seu endereco',
    'Qual seu endereço',
    'qual seu endereco',
    'Endereço do Proponente',
    'endereco do proponente',
    'Endereço residencial',
    'endereco residencial',
    'Onde você mora',
    'onde voce mora',
    'logradouro',
    'Logradouro',
    'LOGRADOURO',
    'Endereço completo do proponente'
  );
  if (endField && !looksLikeEmailLoose(endField) && !isUrl(endField) && String(endField).trim().length > 3) {
    return String(endField).trim();
  }
  const rk2 = Object.keys(row);
  const endCol = rk2.find(k => {
    const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return (
      (cl.includes('endereco') || cl.includes('logradouro') || (cl.includes('onde') && cl.includes('mora'))) &&
      !cl.includes('eletronico') &&
      !cl.includes('email') &&
      !isAttachmentColumn(k)
    );
  });
  if (endCol && row[endCol] && !looksLikeEmailLoose(row[endCol]) && !isUrl(row[endCol])) return String(row[endCol]).trim();
  const ruaCol = rk2.find(k => {
    const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return (cl.includes('rua') || cl.includes('avenida') || cl.includes('logradouro')) && !cl.includes('email') && !isAttachmentColumn(k);
  });
  const numCol = rk2.find(k => {
    const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return (
      (cl === 'numero' || cl === 'nro' || cl.includes('numero da residencia') || cl.includes('numero do imovel')) &&
      !cl.includes('telefone') &&
      !cl.includes('cpf') &&
      !isAttachmentColumn(k)
    );
  });
  const cidCol = rk2.find(k => {
    const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return (cl.includes('cidade') || cl.includes('municipio')) && !isAttachmentColumn(k);
  });
  const cepCol = rk2.find(k => {
    const cl = k.replace(/[;:]/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return cl.includes('cep') && !isAttachmentColumn(k);
  });
  const parts = [
    ruaCol && row[ruaCol] ? String(row[ruaCol]).trim() : '',
    numCol && row[numCol] ? String(row[numCol]).trim() : '',
    (bairroParaMontagem || '').trim(),
    cidCol && row[cidCol] ? String(row[cidCol]).trim() : '',
    cepCol && row[cepCol] ? String(row[cepCol]).trim() : '',
  ].filter(Boolean);
  if (parts.length >= 2) return parts.join(', ');
  return '';
}

// 🔒 ANONIMIZAÇÃO de dados sensíveis
export const anonCPF = (cpf: any): string => {
  if (!cpf) return '';
  const s = String(cpf);
  const digits = s.replace(/[^\d]/g, '');
  if (digits.length === 11) return `***.***.${digits[6]}${digits[7]}${digits[8]}-${digits[9]}${digits[10]}`;
  if (digits.length === 14) return `**.${digits[2]}${digits[3]}${digits[4]}.${digits[5]}${digits[6]}${digits[7]}/${digits[8]}${digits[9]}${digits[10]}${digits[11]}-${digits[12]}${digits[13]}`;
  if (s.length > 4) return s.substring(0, 3) + '***' + s.substring(s.length - 2);
  return '***';
};

export const anonEmail = (email: any): string => {
  if (!email) return '';
  const s = String(email);
  if (!s.includes('@')) return '';
  const [local, domain] = s.split('@');
  const domParts = domain.split('.');
  const ext = domParts[domParts.length - 1];
  return `${local[0]}***@***.${ext}`;
};

export const anonTelefone = (tel: any): string => {
  if (!tel) return '';
  const s = String(tel);
  const digits = s.replace(/[^\d]/g, '');
  if (digits.length >= 10) return `(**) *****-${digits.substring(digits.length - 4)}`;
  if (digits.length >= 4) return `***-${digits.substring(digits.length - 4)}`;
  return '***';
};

export const anonEndereco = (endereco: any, bairro?: string, extractFn?: (s: string) => string): string => {
  if (!endereco) return bairro || '';
  const s = String(endereco);
  if (bairro) return `${bairro} - Ilhabela/SP`;
  if (extractFn) {
    const extracted = extractFn(s);
    if (extracted) return `${extracted} - Ilhabela/SP`;
  }
  return 'Ilhabela/SP';
};
