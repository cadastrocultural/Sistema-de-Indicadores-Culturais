/**
 * Converte export WordPress (WXR) — post_type `candidate` — em CSV para
 * import no Admin → Mapeamento 2020 (mesmas colunas do template).
 * Para gerar a base JSON embutida no site (candidates + employers), use:
 *   node scripts/wxr-build-mapeamento-json.mjs
 *
 * Uso:
 *   node scripts/wordpress-wxr-to-mapeamento.mjs [caminho.xml] [saida.csv]
 *
 * Padrão entrada: ../Downloads/cadastrocultural.WordPress.*.xml (ajuste)
 * Padrão saída: tmp/mapeamento-2020-wordpress.csv
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const defaultIn = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'cadastrocultural.WordPress.2026-04-27.xml');
const argIn = process.argv[2] || defaultIn;
const argOut = process.argv[3] || path.join(root, 'tmp', 'mapeamento-2020-wordpress.csv');

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
  while ((m = re.exec(block)) !== null) out.push(m[1].trim());
  return out;
}

/** Primeira URL http em valor serializado PHP ou string */
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

function csvEscape(s) {
  const t = String(s ?? '');
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function statusToContemplado(st) {
  const s = String(st || '').toLowerCase();
  return s === 'publish' || s === 'approved';
}

if (!fs.existsSync(argIn)) {
  console.error('Arquivo não encontrado:', argIn);
  process.exit(1);
}

const xml = fs.readFileSync(argIn, 'utf8');
const items = xml.split(/<item>/i).slice(1).map((chunk) => '<item>' + chunk.split(/<\/item>/i)[0] + '</item>');

const rows = [];
for (const block of items) {
  if (!block.includes('<wp:post_type><![CDATA[candidate]]></wp:post_type>')) continue;

  const meta = collectMeta(block);
  const cats = candidateCategories(block);
  const categoria = cats[0] || '';

  const nome =
    meta._candidate_display_name ||
    cdata(block, 'title') ||
    cdata(block, 'dc:creator') ||
    '';

  const lat = parseFloat(meta._candidate_map_location_latitude || '') || '';
  const lng = parseFloat(meta._candidate_map_location_longitude || '') || '';

  const wpStatus = cdata(block, 'wp:status');
  const postDate = cdata(block, 'wp:post_date');
  const link = cdata(block, 'link');
  const wpId = cdata(block, 'wp:post_id');

  rows.push({
    wordpress_id: wpId,
    nome,
    categoria,
    categorias: cats.join(' | '),
    bairro: meta._candidate_custom_bairro || '',
    cidade: meta._candidate_custom_cidade || 'Ilhabela',
    comunidadeTradicional: cats.some((c) => /comunidades tradicionais/i.test(c)) ? 'Sim' : '',
    cpf: meta._candidate_custom_cpf || meta.cpf || '',
    email: meta._candidate_email || '',
    telefone: formatBrPhone(meta._candidate_phone || ''),
    lat,
    lng,
    endereco: meta._candidate_map_location_address || '',
    idade: meta._candidate_custom_age || '',
    genero: meta._candidate_custom_gender || '',
    escolaridade: meta._candidate_custom_qualification || '',
    experiencia_resumo: (meta._candidate_custom_experience || '').slice(0, 500),
    idiomas: meta._candidate_custom_languages || '',
    cursos_extras: meta['_candidate_custom_cursos-extras-ou-profissionalizantes'] || '',
    portfolio_url: firstHttpUrl(meta._candidate_portfolio_photos_img || meta._candidate_portfolio_photos || ''),
    cv_url: firstHttpUrl(meta._candidate_cv_attachment_img || meta._candidate_cv_attachment || ''),
    wordpress_status: wpStatus,
    eh_contemplado: statusToContemplado(wpStatus) ? 'sim' : 'nao',
    ano: 2020,
    post_date: postDate,
    perfil_url: link,
    biografia_trecho: cdata(block, 'content:encoded').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400),
  });
}

const headers = [
  'wordpress_id',
  'nome',
  'categoria',
  'categorias',
  'bairro',
  'cidade',
  'comunidadeTradicional',
  'cpf',
  'email',
  'telefone',
  'lat',
  'lng',
  'endereco',
  'idade',
  'genero',
  'escolaridade',
  'experiencia_resumo',
  'idiomas',
  'cursos_extras',
  'portfolio_url',
  'cv_url',
  'wordpress_status',
  'eh_contemplado',
  'ano',
  'post_date',
  'perfil_url',
  'biografia_trecho',
];

const dirOut = path.dirname(argOut);
if (!fs.existsSync(dirOut)) fs.mkdirSync(dirOut, { recursive: true });

const lines = [headers.join(',')];
for (const r of rows) {
  lines.push(headers.map((h) => csvEscape(r[h])).join(','));
}
fs.writeFileSync(argOut, '\ufeff' + lines.join('\n'), 'utf8');

// Planilha “enxuta” só com colunas do template Admin (import direto)
/** Inclui wordpress_id e perfil_url para deduplicação correta após import (evita dobro mapeamento+abas). */
const slimHeaders = [
  'wordpress_id',
  'perfil_url',
  'nome',
  'categoria',
  'bairro',
  'comunidadeTradicional',
  'cpf',
  'email',
  'telefone',
  'lat',
  'lng',
  'eh_contemplado',
  'ano',
];
const slimPath = argOut.replace(/\.csv$/i, '-import-admin.csv');
const slimLines = [slimHeaders.join(',')];
for (const r of rows) {
  const sr = {
    wordpress_id: r.wordpress_id,
    perfil_url: r.perfil_url,
    nome: r.nome,
    categoria: r.categoria,
    bairro: r.bairro,
    comunidadeTradicional: r.comunidadeTradicional,
    cpf: r.cpf,
    email: r.email,
    telefone: r.telefone,
    lat: r.lat,
    lng: r.lng,
    eh_contemplado: r.eh_contemplado,
    ano: r.ano,
  };
  slimLines.push(slimHeaders.map((h) => csvEscape(sr[h])).join(','));
}
fs.writeFileSync(slimPath, '\ufeff' + slimLines.join('\n'), 'utf8');

console.log('Candidatos (candidate):', rows.length);
console.log('CSV completo:', argOut);
console.log('CSV import Admin:', slimPath);
