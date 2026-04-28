/**
 * Lê os exports WordPress (WXR) locais e gera src/app/data/mapeamento-2020-wordpress.json
 * para o payload estático (DADOS_ESTATICOS.mapeamento) — mesma lista usada no Admin.
 *
 * Uso:
 *   node scripts/wxr-build-mapeamento-json.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const PATH_CANDIDATES = path.join(
  root,
  'src/app/data/cadastro wordpress/agentecultural.xml',
);
const PATH_EMPLOYERS = path.join(
  root,
  'src/app/data/cadastro wordpress/espaços culturais e grupos e coletivos.xml',
);
const OUT_JSON = path.join(root, 'src/app/data/mapeamento-2020-wordpress.json');

function cdata(block, tag) {
  const re = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i');
  const m = block.match(re);
  return m ? m[1].trim().replace(/\r\n/g, '\n') : '';
}

function collectMeta(block) {
  const map = {};
  const re = /<wp:postmeta>\s*<wp:meta_key><!\[CDATA\[([\s\S]*?)\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[([\s\S]*?)\]\]><\/wp:meta_value>\s*<\/wp:postmeta>/gi;
  let m;
  while ((m = re.exec(block)) !== null) {
    const k = m[1].trim();
    const v = m[2].trim();
    if (!map[k]) map[k] = v;
  }
  return map;
}

function candidateCategories(block) {
  const out = [];
  const re = /<category domain="candidate_category"[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/category>/gi;
  let m;
  while ((m = re.exec(block)) !== null) out.push(m[1].trim().replace(/&amp;/g, '&'));
  return out;
}

function employerCategories(block) {
  const out = [];
  const re = /<category domain="employer_category"[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/category>/gi;
  let m;
  while ((m = re.exec(block)) !== null) out.push(m[1].trim().replace(/&amp;/g, '&'));
  return out;
}

function firstHttpUrl(val) {
  if (!val) return '';
  const m = String(val).match(/https?:\/\/[^\s"']+/i);
  return m ? m[0] : '';
}

function formatBrPhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw || '';
}

/** Extrai address / latitude / longitude de meta _employer_map_location serializada em PHP. */
function parseEmployerMapLocation(serialized) {
  const s = String(serialized || '');
  const addrM = s.match(/address";s:\d+:"([^"]*)"/);
  const latM = s.match(/latitude";s:\d+:"([^"]*)"/);
  const lngM = s.match(/longitude";s:\d+:"([^"]*)"/);
  const address = addrM ? addrM[1] : '';
  const lat = latM && latM[1] ? parseFloat(latM[1]) : NaN;
  const lng = lngM && lngM[1] ? parseFloat(lngM[1]) : NaN;
  return { address, lat, lng };
}

function statusToContemplado(st) {
  const s = String(st || '').toLowerCase();
  return s === 'publish' || s === 'approved';
}

function splitItems(xml) {
  return xml.split(/<item>/i).slice(1).map((chunk) => '<item>' + chunk.split(/<\/item>/i)[0] + '</item>');
}

function rowFromCandidate(block) {
  const meta = collectMeta(block);
  const cats = candidateCategories(block);
  const categoria = cats[0] || '';

  const nome =
    meta._candidate_display_name ||
    cdata(block, 'title') ||
    cdata(block, 'dc:creator') ||
    '';

  let lat = parseFloat(meta._candidate_map_location_latitude || '');
  let lng = parseFloat(meta._candidate_map_location_longitude || '');
  if (!Number.isFinite(lat)) lat = NaN;
  if (!Number.isFinite(lng)) lng = NaN;

  const wpStatus = cdata(block, 'wp:status');
  const link = cdata(block, 'link');
  const wpId = cdata(block, 'wp:post_id');
  const endereco = meta._candidate_map_location_address || '';

  return {
    wordpress_id: wpId,
    wordpress_type: 'candidate',
    nome,
    categoria,
    categorias: cats.join(' | '),
    bairro: meta._candidate_custom_bairro || '',
    enderecoCompleto: endereco,
    comunidadeTradicional: cats.some((c) => /comunidades tradicionais/i.test(c)) ? 'Sim' : '',
    cpf: meta._candidate_custom_cpf || meta.cpf || '',
    cpf_cnpj: meta._candidate_custom_cpf || meta.cpf || '',
    email: meta._candidate_email || '',
    telefone: formatBrPhone(meta._candidate_phone || ''),
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    idade: meta._candidate_custom_age || '',
    genero: meta._candidate_custom_gender || '',
    escolaridade: meta._candidate_custom_qualification || '',
    portfolio_url: firstHttpUrl(meta._candidate_portfolio_photos_img || meta._candidate_portfolio_photos || ''),
    cv_url: firstHttpUrl(meta._candidate_cv_attachment_img || meta._candidate_cv_attachment || ''),
    eh_contemplado: statusToContemplado(wpStatus),
    ano: 2020,
    perfil_url: link,
    wordpress_status: wpStatus,
  };
}

function rowFromEmployer(block) {
  const meta = collectMeta(block);
  const cats = employerCategories(block);
  const categoria = cats[0] || 'Grupos e coletivos';

  const nome = meta._employer_display_name || meta._employer_title || cdata(block, 'title') || '';
  const map = parseEmployerMapLocation(meta._employer_map_location || '');
  const endereco = map.address || '';
  let lat = map.lat;
  let lng = map.lng;
  if (!Number.isFinite(lat)) lat = undefined;
  if (!Number.isFinite(lng)) lng = undefined;

  const wpStatus = cdata(block, 'wp:status');
  const link = cdata(block, 'link');
  const wpId = cdata(block, 'wp:post_id');

  return {
    wordpress_id: wpId,
    wordpress_type: 'employer',
    nome,
    categoria,
    categorias: cats.join(' | '),
    bairro: '',
    enderecoCompleto: endereco,
    comunidadeTradicional: '',
    cpf: '',
    cpf_cnpj: '',
    email: meta._employer_email || '',
    telefone: formatBrPhone(meta._employer_phone || ''),
    lat,
    lng,
    portfolio_url: firstHttpUrl(meta._employer_featured_image_img || meta._employer_profile_photos_img || meta._employer_profile_photos || ''),
    eh_contemplado: statusToContemplado(wpStatus),
    ano: 2020,
    perfil_url: link,
    wordpress_status: wpStatus,
  };
}

function main() {
  const mapeamento = [];

  if (fs.existsSync(PATH_CANDIDATES)) {
    const xml = fs.readFileSync(PATH_CANDIDATES, 'utf8');
    let n = 0;
    for (const block of splitItems(xml)) {
      if (!block.includes('<wp:post_type><![CDATA[candidate]]></wp:post_type>')) continue;
      mapeamento.push(rowFromCandidate(block));
      n++;
    }
    console.log('candidate:', n, PATH_CANDIDATES);
  } else {
    console.warn('Ausente:', PATH_CANDIDATES);
  }

  if (fs.existsSync(PATH_EMPLOYERS)) {
    const xml = fs.readFileSync(PATH_EMPLOYERS, 'utf8');
    let n = 0;
    for (const block of splitItems(xml)) {
      if (!block.includes('<wp:post_type><![CDATA[employer]]></wp:post_type>')) continue;
      mapeamento.push(rowFromEmployer(block));
      n++;
    }
    console.log('employer:', n, PATH_EMPLOYERS);
  } else {
    console.warn('Ausente:', PATH_EMPLOYERS);
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify(mapeamento, null, 0), 'utf8');
  console.log('Total mapeamento:', mapeamento.length);
  console.log('Escrito:', OUT_JSON);
}

main();
