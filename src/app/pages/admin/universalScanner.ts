import { GENERO_OPTIONS, RACA_OPTIONS } from './constants';
import { isBankingColumnGlobal, isFaixaValorValue } from './scanUtils';
import { inferGenderFromName } from './genderInference';
import { looksLikeEnderecoCompleto } from '../../data/bairros-coords';

// 🎯 CATEGORIAS CULTURAIS conhecidas para scan por valor
const CATEGORIAS_CULTURAIS = [
  'Artesanato', 'Música', 'Dança', 'Teatro', 'Artes Visuais', 'Cinema', 'Audiovisual',
  'Literatura', 'Fotografia', 'Circo', 'Capoeira', 'Cultura Popular', 'Patrimônio Cultural',
  'Cultura Digital', 'Moda', 'Design', 'Gastronomia', 'Hip Hop', 'Grafite',
  'Escultura', 'Pintura', 'Cerâmica', 'Bordado', 'Tecelagem', 'Cestaria',
  'Canto', 'Coral', 'Produção Musical', 'DJ', 'Rap', 'Samba', 'MPB', 'Forró',
  'Contação de Histórias', 'Cordel', 'Poesia', 'Dramaturgia',
  'Produção Cultural', 'Gestão Cultural', 'Educação Artística',
  'Artes Cênicas', 'Artes Integradas', 'Cultura Caiçara',
  'Pesca Artesanal', 'Culinária', 'Artesão', 'Artesã', 'Músico',
  'Ator', 'Atriz', 'Bailarino', 'Bailarina', 'Produtor', 'Produtora',
  'Cantor', 'Cantora', 'Instrumentista', 'Compositor', 'Compositora',
] as const;

// 🔍 SCANNER UNIVERSAL v2: preenche campos vazios escaneando TODOS os valores da row
export const universalFieldScanner = (item: any, nomesBairros: string[]): Record<string, string> => {
  const result: Record<string, string> = {};
  const rowKeys = Object.keys(item);
  const bairrosNorm = nomesBairros.map(b => b.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const catNorm = CATEGORIAS_CULTURAIS.map(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const genNorm = GENERO_OPTIONS.map(g => g.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const racNorm = RACA_OPTIONS.map(r => r.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const skipKeys = new Set(['id', 'lat', 'lng', 'eh_comunidade_tradicional', '_editalOrigem', 'faixaValor', 'faixaEtaria']);
  const addrParts: { rua?: string; numero?: string; comp?: string; cep?: string; logra?: string; full?: string } = {};

  for (const k of rowKeys) {
    if (skipKeys.has(k)) continue;
    const kLow = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (isBankingColumnGlobal(k)) continue;
    if (kLow.includes('comprovante') || kLow.includes('anexo') || kLow.includes('upload') ||
        kLow.includes('arquivo') || kLow.includes('curriculo') || kLow.includes('.pdf') ||
        (kLow.includes('faixa') && (kLow.includes('valor') || kLow.includes('escolhida')))) continue;
    const val = item[k];
    if (!val) continue;
    const valStr = String(val).trim();
    if (!valStr || valStr.length < 2) continue;
    if (valStr.startsWith('http') || valStr.includes('://')) continue;
    if (isFaixaValorValue(valStr)) continue;
    const valNorm = valStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // 🏠 ENDEREÇO
    if (!addrParts.full) {
      const isEnd = (kLow.includes('endereco') || kLow.includes('residencia') || kLow.includes('localidade') || (kLow.includes('onde') && (kLow.includes('mora') || kLow.includes('reside')))) && !kLow.includes('eletronico') && !kLow.includes('email');
      const isRua = kLow.includes('rua') || kLow.includes('logradouro') || (kLow.includes('avenida') && !kLow.includes('email'));
      const isNum = (kLow === 'numero' || kLow === 'nro' || kLow === 'n°' || kLow.includes('numero da residencia') || kLow.includes('numero do imovel')) && !kLow.includes('telefone') && !kLow.includes('cpf') && !kLow.includes('inscricao');
      const isComp = kLow.includes('complemento') && !kLow.includes('documento');
      const isCep = kLow.includes('cep') || kLow.includes('codigo postal');
      if (isEnd && valStr.length > 5 && !valStr.includes('@')) addrParts.full = valStr;
      else if (isRua && valStr.length > 3) addrParts.rua = valStr;
      else if (isNum && valStr.length < 10) addrParts.numero = valStr;
      else if (isComp && valStr.length < 100) addrParts.comp = valStr;
      else if (isCep || /^\d{5}-?\d{3}$/.test(valStr)) addrParts.cep = valStr;
      if (!addrParts.full && !isEnd && !isRua && valStr.length > 10 && valStr.length < 200) {
        if (/^(rua|r\.|av\.|av |avenida|travessa|trav\.|estrada|estr\.|alameda|al\.|rod\.|rodovia|largo|praca|praça|servidao)\s/i.test(valStr) && !kLow.includes('nome') && !kLow.includes('proponente')) {
          addrParts.logra = valStr;
        }
      }
    }
    if (valStr.length > 200) continue;

    // BAIRRO
    if (!result.bairro) {
      const bi = bairrosNorm.findIndex(b => valNorm === b || (b.length >= 4 && valNorm.includes(b)) || (valNorm.length >= 4 && b.includes(valNorm)));
      if (bi >= 0 && !valStr.includes('@') && !/^\d+$/.test(valStr) && !kLow.includes('nome') && !kLow.includes('proponente') && !kLow.includes('email') && !looksLikeEnderecoCompleto(valStr)) result.bairro = nomesBairros[bi];
    }
    // CATEGORIA
    if (!result.categoria && valStr.length < 100) {
      const ci = catNorm.findIndex(c => valNorm === c || (c.length >= 5 && valNorm.includes(c)));
      if (ci >= 0 && !kLow.includes('nome') && !kLow.includes('proponente') && !kLow.includes('bairro')) result.categoria = valStr;
    }
    // EMAIL
    if (!result.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valStr)) result.email = valStr;
    // TELEFONE
    if (!result.telefone && /^[\d\s()+-]{8,20}$/.test(valStr) && /\d{8,}/.test(valStr.replace(/\D/g, ''))) {
      if (!kLow.includes('cpf') && !kLow.includes('cnpj') && !kLow.includes('protocolo')) result.telefone = valStr;
    }
    // GÊNERO
    if (!result.genero && valStr.length < 50) {
      const ambig = ['outro', 'outra', 'outros', 'outras', 'sim', 'nao', 'não'];
      if (!ambig.includes(valNorm) && genNorm.some(g => valNorm === g || (g.length >= 5 && valNorm.includes(g)))) {
        if (!kLow.includes('raca') && !kLow.includes('cor') && !kLow.includes('orientacao') && !kLow.includes('deficiencia') && !kLow.includes('bairro') && !kLow.includes('nome') && !kLow.includes('categoria') && !kLow.includes('segmento') && !kLow.includes('area') && !kLow.includes('linguagem') && !kLow.includes('modalidade') && !kLow.includes('atuacao') && !kLow.includes('comunidade') && !kLow.includes('tradicional') && !kLow.includes('faixa') && !kLow.includes('valor') && !kLow.includes('apresentacao') && !kLow.includes('apresentação')) result.genero = valStr;
      }
    }
    // RAÇA/COR
    if (!result.raca && valStr.length < 50) {
      if (racNorm.some(r => valNorm === r || (r.length >= 5 && valNorm.includes(r)))) {
        if (!kLow.includes('genero') && !kLow.includes('sexo') && !kLow.includes('orientacao') && !kLow.includes('deficiencia') && !kLow.includes('bairro') && !kLow.includes('nome') && !kLow.includes('comunidade') && !kLow.includes('tradicional') && !kLow.includes('faixa') && !kLow.includes('valor') && !kLow.includes('categoria') && !kLow.includes('segmento') && !kLow.includes('area') && !kLow.includes('linguagem') &&
            !kLow.includes('relig') && !kLow.includes('igreja') && !kLow.includes('espiritual') && !kLow.includes('candomble') && !kLow.includes('umbanda') && !kLow.includes('terreiro') && !kLow.includes('matriz')) result.raca = valStr;
      }
    }
    // 📅 IDADE
    if (!result.idade && !kLow.includes('protocolo') && !kLow.includes('inscricao') && !kLow.includes('cpf') && !kLow.includes('cnpj') && !kLow.includes('comunidade') && !kLow.includes('tradicional') && !kLow.includes('pertence') && !(kLow.includes('faixa') && kLow.includes('valor'))) {
      const calcAge = (year: number, month: number, day: number): number | null => {
        if (year < 1920 || year > 2015) return null;
        const today = new Date();
        let age = today.getFullYear() - year;
        const md = today.getMonth() + 1 - month;
        if (md < 0 || (md === 0 && today.getDate() < day)) age--;
        return (age > 0 && age < 130) ? age : null;
      };
      const dm = valStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
      if (dm) { const a = calcAge(parseInt(dm[3]), parseInt(dm[2]), parseInt(dm[1])); if (a !== null) { result.idade = String(a); result._dataNascimento = valStr; } }
      if (!result.idade) { const ym = valStr.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/); if (ym) { const a = calcAge(parseInt(ym[1]), parseInt(ym[2]), parseInt(ym[3])); if (a !== null) { result.idade = String(a); result._dataNascimento = valStr; } } }
      if (!result.idade) {
        const meses: Record<string, number> = { janeiro:1, fevereiro:2, marco:3, abril:4, maio:5, junho:6, julho:7, agosto:8, setembro:9, outubro:10, novembro:11, dezembro:12 };
        const dtxt = valStr.match(/(\d{1,2})\s*(?:de\s+)?(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*(?:de\s+)?(\d{4})/i);
        if (dtxt) { const mn = dtxt[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); const a = calcAge(parseInt(dtxt[3]), meses[mn] || 0, parseInt(dtxt[1])); if (a !== null) { result.idade = String(a); result._dataNascimento = valStr; } }
      }
      if (!result.idade && /^\d{5}$/.test(valStr)) {
        const serial = parseInt(valStr);
        if (serial >= 15000 && serial <= 45000) {
          const d = new Date((serial - 25569) * 86400000);
          if (d.getFullYear() >= 1920 && d.getFullYear() <= 2015) {
            const a = calcAge(d.getFullYear(), d.getMonth() + 1, d.getDate());
            if (a !== null) { result.idade = String(a); result._dataNascimento = d.toLocaleDateString('pt-BR'); }
          }
        }
      }
      if (!result.idade && /^\d{1,3}$/.test(valStr) && parseInt(valStr) > 0 && parseInt(valStr) < 130 && !kLow.includes('numero') && !kLow.includes('quantidade') && (kLow.includes('idade') || kLow.includes('nascimento') || kLow.includes('anos'))) result.idade = valStr;
      if (!result.idade && /^\d{1,2}\s*anos?$/i.test(valStr)) result.idade = valStr.replace(/[^\d]/g, '');
    }
    // PcD
    if (!result.deficiencia && valStr.length < 80) {
      const isPubAlvo = valNorm.includes('adulto') || valNorm.includes('infantil') || valNorm.includes('infanto') || valNorm.includes('religioso') || valNorm.includes('mulheres') || valNorm.includes('povos');
      const isColPubAlvo = kLow.includes('publico') || kLow.includes('atende') || kLow.includes('faixa etaria');
      const isColIrrelevante = kLow.includes('comunidade') || kLow.includes('tradicional') || kLow.includes('categoria') || kLow.includes('segmento') || kLow.includes('area') || kLow.includes('linguagem') || (kLow.includes('faixa') && kLow.includes('valor'));
      if (!isPubAlvo && !isColPubAlvo && !isColIrrelevante) {
        if (valNorm.includes('deficiencia') || valNorm.includes('pcd') || valNorm.includes('mobilidade') || valNorm.includes('surdez') || valNorm.includes('cegueira') || valNorm.includes('autismo')) result.deficiencia = valStr;
        else if ((valNorm === 'sim' || valNorm === 'nao' || valNorm === 'não') && (kLow.includes('deficiencia') || kLow.includes('pcd') || kLow.includes('necessidade'))) result.deficiencia = valStr;
      }
    }
  }
  // 🏠 Monta endereço
  if (!result.enderecoCompleto) {
    if (addrParts.full) result.enderecoCompleto = addrParts.full;
    else if (addrParts.logra) result.enderecoCompleto = addrParts.logra;
    else { const pts = [addrParts.rua, addrParts.numero, addrParts.comp, addrParts.cep].filter(Boolean); if (pts.length >= 1) result.enderecoCompleto = pts.join(', '); }
  }
  // 👤 INFERÊNCIA POR NOME
  if (!result.genero) {
    const nomePessoa = item.nome || item.Nome || item.proponente || item.Proponente || item.responsavel || item.Responsável || '';
    const inferred = inferGenderFromName(nomePessoa);
    if (inferred) result.genero = inferred;
  }
  return result;
};
