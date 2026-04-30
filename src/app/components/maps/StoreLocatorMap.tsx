import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationOn, Search, Filter, Close, MyLocation, OpenWith } from '@mui/icons-material';

// Ícones padrão do Leaflet em bundlers (evita marcadores quebrados se algum plugin usar Default)
// @ts-expect-error legacy API
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface CultureItem {
  id: string;
  tipo: 'agente' | 'grupo' | 'espaco' | 'projeto';
  nome: string;
  bairro: string;
  categoria: string;
  lat?: number;
  lng?: number;
  genero?: string;
  raca?: string;
  valor?: number;
  eh_contemplado?: boolean;
  editais?: string[];
  ano?: string;
  proponente?: string;
  [key: string]: any;
}

interface StoreLocatorMapProps {
  items: CultureItem[];
  editais?: Array<{
    nome: string;
    ano: string;
    inscritos: number;
    contemplados: number;
  }>;
  center?: [number, number];
  zoom?: number;
  sidebarWidth?: number;
  onItemSelect?: (item: CultureItem | null) => void;
}

const TIPO_COLORS: Record<string, string> = {
  agente: '#0d9488',
  grupo: '#059669',
  espaco: '#d97706',
  projeto: '#1e293b',
};

const TIPO_EMOJI: Record<string, string> = {
  agente: '🎭',
  grupo: '👥',
  espaco: '🏛️',
  projeto: '📋',
};

const TIPO_LABEL_PT: Record<string, string> = {
  agente: 'Agente cultural',
  grupo: 'Grupo / coletivo',
  espaco: 'Espaço cultural',
  projeto: 'Projeto / edital',
};

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const getEditaisFromItems = (items: CultureItem[]): string[] => {
  const editaisSet = new Set<string>();
  items.forEach((item) => {
    if (item.editais && Array.isArray(item.editais)) {
      item.editais.forEach((e) => editaisSet.add(e));
    }
    if (item.edital) editaisSet.add(item.edital);
  });
  return Array.from(editaisSet).sort();
};

const participatedInEdital = (item: CultureItem, editalName: string): boolean => {
  if (item.editais && Array.isArray(item.editais)) {
    return item.editais.some(
      (e) =>
        e.toLowerCase().includes(editalName.toLowerCase()) ||
        editalName.toLowerCase().includes(e.toLowerCase()),
    );
  }
  if (item.edital) {
    return (
      item.edital.toLowerCase().includes(editalName.toLowerCase()) ||
      editalName.toLowerCase().includes(item.edital.toLowerCase())
    );
  }
  return false;
};

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 120);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', onResize);
    };
  }, [map]);
  return null;
}

function FlyToSelected({ item }: { item: CultureItem | null }) {
  const map = useMap();
  useEffect(() => {
    if (item?.lat != null && item?.lng != null && !Number.isNaN(item.lat) && !Number.isNaN(item.lng)) {
      const z = Math.max(map.getZoom(), 14);
      map.flyTo([item.lat, item.lng], z, { duration: 0.5, easeLinearity: 0.35 });
    }
  }, [item?.id, item?.lat, item?.lng, map]);
  return null;
}

/** Encaixa o mapa para mostrar todos os pontos na primeira vez que os dados chegam. */
function FitBoundsOnLoad({ points }: { points: CultureItem[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current) return;
    const valid = points.filter(
      (p) => p.lat != null && p.lng != null && !Number.isNaN(p.lat) && !Number.isNaN(p.lng),
    );
    if (valid.length === 0) return;
    const bounds = L.latLngBounds(valid.map((p) => [p.lat!, p.lng!] as [number, number]));
    if (!bounds.isValid()) return;
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 14, animate: false });
    fitted.current = true;
  }, [points, map]);
  return null;
}

type ToolbarProps = {
  defaultCenter: [number, number];
  defaultZoom: number;
  points: CultureItem[];
};

function TerritoryMapToolbar({ defaultCenter, defaultZoom, points }: ToolbarProps) {
  const map = useMap();

  const fitTerritory = useCallback(() => {
    const valid = points.filter((p) => p.lat != null && p.lng != null) as Array<CultureItem & { lat: number; lng: number }>;
    if (valid.length === 0) {
      map.setView(defaultCenter, defaultZoom, { animate: true });
      return;
    }
    const b = L.latLngBounds(valid.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(b, { padding: [64, 64], maxZoom: 15, animate: true });
  }, [map, points, defaultCenter, defaultZoom]);

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-[1000] flex flex-col gap-2">
      <div className="pointer-events-auto flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-lg shadow-slate-900/10 backdrop-blur-md">
        <button
          type="button"
          onClick={fitTerritory}
          className="flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-800 transition hover:bg-teal-50"
          title="Enquadrar todos os pontos visíveis"
        >
          <OpenWith sx={{ fontSize: 18, color: '#0f766e' }} />
          Ver território
        </button>
        <button
          type="button"
          onClick={() => map.setView(defaultCenter, defaultZoom, { animate: true })}
          className="flex items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-xs font-bold text-slate-800 transition hover:bg-teal-50"
          title="Voltar à vista padrão de Ilhabela"
        >
          <MyLocation sx={{ fontSize: 18, color: '#0d9488' }} />
          Ilhabela (centro)
        </button>
      </div>
    </div>
  );
}

/** Pequeno deslocamento para pontos com as mesmas coordenadas, para não esconder marcadores uns dos outros */
function buildMapMarkerPositions(points: CultureItem[]): { item: CultureItem; lat: number; lng: number }[] {
  const valid = points.filter(
    (p) => p.lat != null && p.lng != null && !Number.isNaN(p.lat) && !Number.isNaN(p.lng),
  ) as Array<CultureItem & { lat: number; lng: number }>;
  const groups = new Map<string, CultureItem[]>();
  for (const item of valid) {
    const key = `${item.lat.toFixed(5)},${item.lng.toFixed(5)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  const out: { item: CultureItem; lat: number; lng: number }[] = [];
  for (const group of groups.values()) {
    group.forEach((item, i) => {
      if (i === 0) {
        out.push({ item, lat: item.lat, lng: item.lng });
        return;
      }
      const golden = ((i * 137.508) * Math.PI) / 180;
      const meters = 16 * Math.sqrt(i);
      const lat0 = item.lat;
      const lng0 = item.lng;
      const dLat = (meters * Math.cos(golden)) / 111_320;
      const dLng = (meters * Math.sin(golden)) / (111_320 * Math.cos((lat0 * Math.PI) / 180));
      out.push({ item, lat: lat0 + dLat, lng: lng0 + dLng });
    });
  }
  return out;
}

export default function StoreLocatorMap({
  items,
  editais = [],
  center = [-23.793, -45.362],
  zoom = 12,
  sidebarWidth = 300,
  onItemSelect,
}: StoreLocatorMapProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBairro, setFilterBairro] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEdital, setFilterEdital] = useState('');
  const [filterComunidade, setFilterComunidade] = useState('');
  const [selectedItem, setSelectedItem] = useState<CultureItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const allEditais = useMemo(() => {
    if (editais.length > 0) {
      return editais.map((e) => e.nome);
    }
    return getEditaisFromItems(items);
  }, [items, editais]);

  const allBairros = useMemo(() => {
    const set = new Set(items.map((i) => i.bairro).filter((b) => b && b !== 'Não informado' && b !== 'não informado'));
    return Array.from(set).sort();
  }, [items]);

  const allCategorias = useMemo(() => {
    const set = new Set(items.map((i) => i.categoria).filter((c) => c));
    return Array.from(set).sort();
  }, [items]);

  const allComunidades = useMemo(() => {
    const set = new Set(
      items
        .map((i) => i.comunidadeTradicional || i.comunidade || i.povoTradicional)
        .filter((c) => c && c !== 'Não informado' && c !== 'não informado'),
    );
    return Array.from(set).sort();
  }, [items]);

  const allTipos = ['agente', 'grupo', 'espaco', 'projeto'] as const;

  const estatisticasPorBairro = useMemo(() => {
    const stats: Record<
      string,
      { bairro: string; agente: number; grupo: number; espaco: number; projeto: number; total: number }
    > = {};

    items.forEach((item) => {
      if (filterTipo && item.tipo !== filterTipo) return;
      if (filterEdital && !participatedInEdital(item, filterEdital)) return;
      const comunidade = item.comunidadeTradicional || item.comunidade || item.povoTradicional || '';
      if (filterComunidade && comunidade !== filterComunidade) return;

      const b = item.bairro || 'Não informado';
      if (!stats[b]) stats[b] = { bairro: b, agente: 0, grupo: 0, espaco: 0, projeto: 0, total: 0 };
      if (item.tipo === 'agente') stats[b].agente++;
      if (item.tipo === 'grupo') stats[b].grupo++;
      if (item.tipo === 'espaco') stats[b].espaco++;
      if (item.tipo === 'projeto') stats[b].projeto++;
      stats[b].total++;
    });

    return Object.values(stats)
      .filter((s) => s.bairro !== 'Não informado')
      .sort((a, b) => b.total - a.total);
  }, [items, filterTipo, filterEdital, filterComunidade]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.proponente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.comunidadeTradicional?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchBairro = !filterBairro || item.bairro === filterBairro;
      const matchCategoria = !filterCategoria || item.categoria === filterCategoria;
      const matchTipo = !filterTipo || item.tipo === filterTipo;
      const matchEdital = !filterEdital || participatedInEdital(item, filterEdital);
      const comunidade = item.comunidadeTradicional || item.comunidade || item.povoTradicional || '';
      const matchComunidade = !filterComunidade || comunidade === filterComunidade;

      return matchSearch && matchBairro && matchCategoria && matchTipo && matchEdital && matchComunidade;
    });
  }, [items, searchTerm, filterBairro, filterCategoria, filterTipo, filterEdital, filterComunidade]);

  const mapPoints = useMemo(() => {
    return filteredItems.filter((item) => item.lat != null && item.lng != null && item.lat !== 0 && item.lng !== 0);
  }, [filteredItems]);

  const mapMarkerLayout = useMemo(() => buildMapMarkerPositions(mapPoints), [mapPoints]);

  // Markers ordenados: selecionado e hovered renderizam por último → ficam no topo do SVG
  const sortedMarkers = useMemo(
    () =>
      [...mapMarkerLayout].sort((a, b) => {
        const score = (id: string) =>
          id === selectedItem?.id ? 2 : id === hoveredId ? 1 : 0;
        return score(a.item.id) - score(b.item.id);
      }),
    [mapMarkerLayout, selectedItem?.id, hoveredId],
  );

  const semCoordenadas = filteredItems.length - mapPoints.length;

  const handleItemClick = useCallback(
    (item: CultureItem) => {
      setSelectedItem(item);
      onItemSelect?.(item);
    },
    [onItemSelect],
  );

  const clearFilters = () => {
    setSearchTerm('');
    setFilterBairro('');
    setFilterCategoria('');
    setFilterTipo('');
    setFilterEdital('');
    setFilterComunidade('');
  };

  const hasActiveFilters =
    searchTerm || filterBairro || filterCategoria || filterTipo || filterEdital || filterComunidade;

  const editalOptions = editais.length > 0 ? editais : allEditais.map((nome) => ({ nome, ano: '', inscritos: 0, contemplados: 0 }));

  return (
    <div
      className="flex h-full w-full min-h-[min(70vh,560px)] flex-col-reverse bg-gradient-to-b from-slate-50 to-slate-100/90 lg:min-h-[500px] lg:flex-row"
      style={{ minHeight: 500 }}
    >
      {/* Lista + filtros */}
      <div
        className="flex min-h-0 w-full shrink-0 flex-col overflow-y-auto border-t border-slate-200/90 bg-white max-h-[80vh] lg:max-h-none lg:overflow-hidden lg:border-t-0 lg:border-r lg:[width:var(--map-sidebar-w,20rem)]"
        style={{ ['--map-sidebar-w' as string]: `${sidebarWidth}px` }}
      >
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur-sm">
          <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-teal-800/90">Explorar cadastro</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" sx={{ fontSize: 18 }} />
            <input
              type="search"
              placeholder="Nome, bairro, categoria, comunidade…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/90 py-2.5 pl-9 pr-3 text-sm font-medium text-slate-900 shadow-inner shadow-slate-900/5 transition focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              autoComplete="off"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
              showFilters || hasActiveFilters
                ? 'border border-teal-200/80 bg-teal-50 text-teal-900 shadow-sm'
                : 'border border-slate-200/80 bg-slate-100/80 text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <Filter sx={{ fontSize: 18 }} />
            Filtros avançados
            {hasActiveFilters && (
              <span className="ml-1 rounded-lg bg-slate-800 px-2 py-0.5 font-mono text-[0.65rem] font-bold text-white tabular-nums">
                {[filterBairro, filterCategoria, filterTipo, filterEdital, filterComunidade].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="border-b border-slate-200 bg-white px-4 pb-4 pt-3 max-h-[55vh] overflow-y-auto overscroll-contain">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de cadastro</label>
                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">Todos os tipos</option>
                  {allTipos.map((t) => (
                    <option key={t} value={t}>
                      {TIPO_EMOJI[t]} {TIPO_LABEL_PT[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Edital</label>
                <select
                  value={filterEdital}
                  onChange={(e) => setFilterEdital(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">Todos os editais</option>
                  {editalOptions.map((e, i) => (
                    <option key={`${e.nome}-${i}`} value={e.nome}>
                      {e.nome}
                      {e.ano ? ` (${e.ano})` : ''}
                      {editais.length > 0 ? ` · ${e.inscritos} insc. / ${e.contemplados} cont.` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bairro</label>
                <select
                  value={filterBairro}
                  onChange={(e) => setFilterBairro(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">Todos os bairros ({allBairros.length})</option>
                  {allBairros.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoria artística</label>
                <select
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">Todas as categorias ({allCategorias.length})</option>
                  {allCategorias.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Comunidade tradicional</label>
                <select
                  value={filterComunidade}
                  onChange={(e) => setFilterComunidade(e.target.value)}
                  className="w-full rounded-xl border border-teal-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">Todas ({allComunidades.length})</option>
                  {allComunidades.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex w-full items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50"
                >
                  <Close sx={{ fontSize: 18 }} />
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        )}

        <div className="border-b border-slate-100 bg-gradient-to-r from-teal-50/50 via-white to-slate-50 px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[0.7rem]">
            <span className="font-semibold text-slate-700">
              <span className="font-mono text-sm font-bold tabular-nums text-slate-900">{filteredItems.length}</span>
              <span className="text-slate-500"> / </span>
              <span className="font-mono tabular-nums text-slate-600">{items.length}</span>
              <span className="ml-1 text-slate-500">registros</span>
            </span>
            <span className="rounded-lg bg-white px-2 py-0.5 font-mono text-[0.65rem] font-bold text-teal-800 shadow-sm ring-1 ring-teal-100">
              {mapPoints.length} com GPS
              {semCoordenadas > 0 ? ` · ${semCoordenadas} só lista` : ''}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-visible lg:overflow-y-auto overscroll-contain">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center text-slate-500">
              <LocationOn sx={{ fontSize: 44, opacity: 0.25, mb: 2 }} />
              <p className="text-sm font-bold text-slate-700">Nenhum resultado</p>
              <p className="mt-1 max-w-xs text-xs font-medium">Ajuste a busca ou os filtros para ver cadastros no mapa.</p>
            </div>
          ) : (
            filteredItems.slice(0, 100).map((item, i) => (
              <div
                key={`${item.tipo}-${item.id}-${i}`}
                role="button"
                tabIndex={0}
                onClick={() => handleItemClick(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleItemClick(item);
                  }
                }}
                className={`cursor-pointer border-b border-slate-100/90 px-4 py-3 transition-all hover:bg-teal-50/40 focus-visible:bg-teal-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-600 ${
                  selectedItem?.id === item.id
                    ? 'border-l-[4px] border-l-teal-600 bg-teal-50/70 shadow-[inset_0_0_0_1px_rgba(13,148,136,0.12)]'
                    : 'border-l-[4px] border-l-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm shadow-sm ring-1 ring-white/80"
                    style={{ backgroundColor: `${TIPO_COLORS[item.tipo]}22` }}
                  >
                    <span style={{ fontSize: 15 }}>{TIPO_EMOJI[item.tipo]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-slate-900">{item.nome}</span>
                      <span
                        className="shrink-0 rounded-md px-1.5 py-0 text-[0.6rem] font-black uppercase tracking-wide"
                        style={{ background: `${TIPO_COLORS[item.tipo]}18`, color: TIPO_COLORS[item.tipo] }}
                      >
                        {TIPO_LABEL_PT[item.tipo] || item.tipo}
                      </span>
                      {item.eh_contemplado && (
                        <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0 text-[0.6rem] font-black uppercase tracking-wide text-emerald-800">
                          Contemplado
                        </span>
                      )}
                      {(!item.lat || !item.lng) && (
                        <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0 text-[0.6rem] font-bold text-amber-800 ring-1 ring-amber-200/80">
                          Sem GPS
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs font-medium text-slate-600">{item.categoria}</div>
                    {item.edital && <div className="mt-0.5 truncate text-[0.65rem] font-semibold text-teal-800">{item.edital}</div>}
                    {item.comunidadeTradicional && (
                      <div className="mt-0.5 truncate text-[0.65rem] font-bold text-amber-800/90">
                        {item.comunidadeTradicional}
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400">{item.bairro}</span>
                      {item.tipo === 'projeto' && item.valor ? (
                        <span className="text-[0.65rem] font-black text-emerald-700">{formatBRL(item.valor)}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {filteredItems.length > 100 && (
            <div className="bg-slate-50 px-4 py-3 text-center text-xs font-semibold text-slate-500">
              + {filteredItems.length - 100} resultados — refine a busca para listar todos.
            </div>
          )}
        </div>

        <div className="border-t border-teal-100/80 bg-gradient-to-r from-[#f0fdfa] to-white px-4 py-3">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-slate-500">Bairros com mais registros</div>
            <p className="text-[0.6rem] font-semibold leading-snug text-slate-400">Top 8 · respeita filtros atuais</p>
          </div>
          <div className="max-h-[min(320px,42vh)] space-y-2 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable]">
            {estatisticasPorBairro.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-3 py-2 text-center text-[0.7rem] font-medium text-slate-500">
                Nenhum bairro no filtro atual.
              </p>
            ) : (
              estatisticasPorBairro.slice(0, 8).map((stat) => (
                <div
                  key={stat.bairro}
                  className="rounded-xl border border-slate-200/90 bg-white/95 px-2.5 py-2 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                >
                  <div className="mb-1.5 flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
                    <span className="min-w-0 flex-1 break-words text-[0.78rem] font-bold leading-snug text-slate-800">{stat.bairro}</span>
                    <span
                      className="shrink-0 rounded-lg bg-teal-50 px-2 py-0.5 text-[0.65rem] font-black tabular-nums text-teal-900 ring-1 ring-teal-100"
                      title="Total de registros neste bairro (soma dos tipos, com filtros aplicados)"
                    >
                      {stat.total}
                    </span>
                  </div>
                  <div className="flex w-full flex-wrap content-start gap-1">
                    {stat.agente > 0 && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full border border-teal-200/80 bg-teal-50 px-1.5 py-0.5 text-[0.6rem] font-black tabular-nums leading-none text-teal-900"
                        title={`${TIPO_LABEL_PT.agente}: ${stat.agente}`}
                      >
                        <span aria-hidden className="text-[0.65rem] opacity-90">
                          {TIPO_EMOJI.agente}
                        </span>
                        {stat.agente}
                      </span>
                    )}
                    {stat.grupo > 0 && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-1.5 py-0.5 text-[0.6rem] font-black tabular-nums leading-none text-emerald-900"
                        title={`${TIPO_LABEL_PT.grupo}: ${stat.grupo}`}
                      >
                        <span aria-hidden className="text-[0.65rem] opacity-90">
                          {TIPO_EMOJI.grupo}
                        </span>
                        {stat.grupo}
                      </span>
                    )}
                    {stat.espaco > 0 && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full border border-amber-200/80 bg-amber-50 px-1.5 py-0.5 text-[0.6rem] font-black tabular-nums leading-none text-amber-900"
                        title={`${TIPO_LABEL_PT.espaco}: ${stat.espaco}`}
                      >
                        <span aria-hidden className="text-[0.65rem] opacity-90">
                          {TIPO_EMOJI.espaco}
                        </span>
                        {stat.espaco}
                      </span>
                    )}
                    {stat.projeto > 0 && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full border border-slate-600/25 bg-slate-800 px-1.5 py-0.5 text-[0.6rem] font-black tabular-nums leading-none text-white"
                        title={`${TIPO_LABEL_PT.projeto}: ${stat.projeto}`}
                      >
                        <span aria-hidden className="text-[0.65rem] opacity-90">
                          {TIPO_EMOJI.projeto}
                        </span>
                        {stat.projeto}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="relative min-h-[240px] min-w-0 flex-1 lg:min-h-0">
        <div className="pointer-events-none absolute inset-0 z-[400] rounded-none shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] lg:rounded-none" aria-hidden />

        {mapPoints.length === 0 && filteredItems.length > 0 && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center gap-2 bg-white/85 px-4 text-center backdrop-blur-[2px]">
            <p className="text-sm font-bold text-slate-800">Nenhum ponto com coordenadas no filtro atual</p>
            <p className="max-w-sm text-xs font-medium text-slate-600">
              Os cadastros aparecem na lista à esquerda. Para o mapa, é necessário geolocalização na importação (ou bairro com coordenadas na base).
            </p>
          </div>
        )}

        <MapContainer
          center={center}
          zoom={zoom}
          className="h-full min-h-[240px] w-full z-0"
          style={{ height: '100%', width: '100%', minHeight: 240, cursor: 'default' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <MapResizeFix />
          <FlyToSelected item={selectedItem} />
          <FitBoundsOnLoad points={mapPoints} />
          <TerritoryMapToolbar defaultCenter={center} defaultZoom={zoom} points={mapPoints} />

          {sortedMarkers.map(({ item, lat, lng }, idx) => {
            const isSelected = selectedItem?.id === item.id;
            const isHovered = hoveredId === item.id;
            const color = TIPO_COLORS[item.tipo];
            return (
              <React.Fragment key={`${item.tipo}-${item.id}-${idx}`}>
                {/* Halo externo */}
                <CircleMarker
                  center={[lat, lng]}
                  radius={isSelected ? 22 : isHovered ? 17 : 13}
                  pathOptions={{
                    fillColor: color,
                    color: 'transparent',
                    weight: 0,
                    fillOpacity: isSelected ? 0.22 : isHovered ? 0.18 : 0.13,
                  }}
                  eventHandlers={{
                    click: () => handleItemClick(item),
                    mouseover: () => setHoveredId(item.id),
                    mouseout: () => setHoveredId(null),
                  }}
                />
                {/* Marcador central com tooltip */}
                <CircleMarker
                  center={[lat, lng]}
                  radius={isSelected ? 11 : isHovered ? 9 : 7}
                  pathOptions={{
                    fillColor: color,
                    color: isSelected ? '#ffffff' : isHovered ? 'rgba(255,255,255,0.9)' : '#ffffff',
                    weight: isSelected ? 3 : isHovered ? 2.5 : 2,
                    fillOpacity: 1,
                  }}
                  eventHandlers={{
                    click: () => handleItemClick(item),
                    mouseover: () => setHoveredId(item.id),
                    mouseout: () => setHoveredId(null),
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -10]}
                    opacity={1}
                    className="slm-tooltip"
                    sticky={false}
                  >
                    <div className="slm-tt-name">{item.nome}</div>
                    <div className="slm-tt-meta">
                      {TIPO_EMOJI[item.tipo]} {TIPO_LABEL_PT[item.tipo]}
                      {item.bairro ? ` · ${item.bairro}` : ''}
                    </div>
                  </Tooltip>
                </CircleMarker>
              </React.Fragment>
            );
          })}
        </MapContainer>

        <div className="pointer-events-none absolute bottom-3 right-3 z-[1000] max-w-[200px]">
          <div className="pointer-events-auto rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-lg shadow-slate-900/10 backdrop-blur-md">
            <div className="mb-2 text-[0.65rem] font-black uppercase tracking-[0.12em] text-slate-500">Legenda</div>
            <div className="space-y-2">
              {Object.entries(TIPO_EMOJI).map(([tipo, emoji]) => (
                <div key={tipo} className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-sm"
                    style={{ backgroundColor: TIPO_COLORS[tipo] }}
                  />
                  <span className="text-[0.72rem] font-bold leading-tight text-slate-700">
                    {emoji} {TIPO_LABEL_PT[tipo] || tipo}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {selectedItem && (
          <div className="absolute right-3 top-3 z-[1000] w-[min(100%,292px)] max-w-[calc(100%-1.5rem)] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/[0.97] shadow-2xl shadow-slate-900/15 backdrop-blur-md">
            {/* Header colorido com o tipo */}
            <div
              className="flex items-center gap-2 px-4 py-2.5"
              style={{ backgroundColor: `${TIPO_COLORS[selectedItem.tipo]}18` }}
            >
              <span className="text-base leading-none">{TIPO_EMOJI[selectedItem.tipo]}</span>
              <span
                className="flex-1 text-[0.65rem] font-black uppercase tracking-[0.12em]"
                style={{ color: TIPO_COLORS[selectedItem.tipo] }}
              >
                {TIPO_LABEL_PT[selectedItem.tipo]}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedItem(null);
                  onItemSelect?.(null);
                }}
                className="rounded-full p-1 text-slate-400 transition hover:bg-white/80 hover:text-slate-700"
                aria-label="Fechar painel"
              >
                <Close sx={{ fontSize: 16 }} />
              </button>
            </div>

            {/* Corpo */}
            <div className="px-4 pb-4 pt-3">
              <div className="text-sm font-black leading-snug text-slate-900">{selectedItem.nome}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                {[selectedItem.categoria, selectedItem.bairro].filter(Boolean).join(' · ')}
              </div>

              {/* Badges */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {selectedItem.eh_contemplado && (
                  <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wide text-emerald-800">
                    Contemplado
                  </span>
                )}
                {selectedItem.comunidadeTradicional && (
                  <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[0.6rem] font-black text-amber-800 ring-1 ring-amber-200">
                    {selectedItem.comunidadeTradicional}
                  </span>
                )}
              </div>

              {/* Edital */}
              {selectedItem.edital && (
                <div className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-teal-50 px-3 py-2 text-xs font-bold text-teal-900 ring-1 ring-teal-100">
                  <span className="mt-px shrink-0 text-[0.7rem]">📋</span>
                  <span className="leading-snug">{selectedItem.edital}</span>
                </div>
              )}

              {/* Proponente */}
              {selectedItem.proponente && (
                <div className="mt-2 text-xs text-slate-600">
                  <span className="font-bold text-slate-400">Proponente </span>
                  {selectedItem.proponente}
                </div>
              )}

              {/* Diversidade */}
              {(selectedItem.tipo !== 'projeto') && (selectedItem.genero || selectedItem.raca) && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.68rem] text-slate-500">
                  {selectedItem.genero && <span><b className="font-semibold">Gênero:</b> {selectedItem.genero}</span>}
                  {selectedItem.raca && <span><b className="font-semibold">Raça/cor:</b> {selectedItem.raca}</span>}
                </div>
              )}

              {/* Valor (projetos) */}
              {selectedItem.tipo === 'projeto' && selectedItem.valor ? (
                <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-lg font-black text-emerald-700 ring-1 ring-emerald-100">
                  {formatBRL(selectedItem.valor)}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
