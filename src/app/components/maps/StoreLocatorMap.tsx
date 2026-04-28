import React, { useState, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { LocationOn, Search, Filter, Close } from '@mui/icons-material'

interface CultureItem {
  id: string
  tipo: 'agente' | 'grupo' | 'espaco' | 'projeto'
  nome: string
  bairro: string
  categoria: string
  lat?: number
  lng?: number
  genero?: string
  raca?: string
  valor?: number
  eh_contemplado?: boolean
  editais?: string[]
  ano?: string
  proponente?: string
  [key: string]: any
}

interface StoreLocatorMapProps {
  items: CultureItem[]
  editais?: Array<{
    nome: string
    ano: string
    inscritos: number
    contemplados: number
  }>
  center?: [number, number]
  zoom?: number
  sidebarWidth?: number
  onItemSelect?: (item: CultureItem | null) => void
}

const TIPO_COLORS: Record<string, string> = {
  agente: '#2ED6A3',
  grupo: '#00A38C',
  espaco: '#F2B84B',
  projeto: '#101828',
}

const TIPO_EMOJI: Record<string, string> = {
  agente: '🎭',
  grupo: '👥',
  espaco: '🏛️',
  projeto: '📋',
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Get all unique editais from all items
const getEditaisFromItems = (items: CultureItem[]): string[] => {
  const editaisSet = new Set<string>()
  items.forEach(item => {
    if (item.editais && Array.isArray(item.editais)) {
      item.editais.forEach(e => editaisSet.add(e))
    }
    if (item.edital) editaisSet.add(item.edital)
  })
  return Array.from(editaisSet).sort()
}

// Check if item participated in an edital
const participatedInEdital = (item: CultureItem, editalName: string): boolean => {
  if (item.editais && Array.isArray(item.editais)) {
    return item.editais.some(e => e.toLowerCase().includes(editalName.toLowerCase()) || editalName.toLowerCase().includes(e.toLowerCase()))
  }
  if (item.edital) {
    return item.edital.toLowerCase().includes(editalName.toLowerCase()) || editalName.toLowerCase().includes(item.edital.toLowerCase())
  }
  return false
}

export default function StoreLocatorMap({
  items,
  editais = [],
  center = [-23.82, -45.36],
  zoom = 12,
  sidebarWidth = 320,
  onItemSelect,
}: StoreLocatorMapProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBairro, setFilterBairro] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterEdital, setFilterEdital] = useState('')
  const [filterComunidade, setFilterComunidade] = useState('')
  const [selectedItem, setSelectedItem] = useState<CultureItem | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Get all unique editais for filter dropdown
  const allEditais = useMemo(() => {
    if (editais.length > 0) {
      return editais.map(e => e.nome)
    }
    const editaisSet = new Set<string>()
    items.forEach(item => {
      if (item.editais && Array.isArray(item.editais)) {
        item.editais.forEach(e => editaisSet.add(e))
      }
      if (item.edital) editaisSet.add(item.edital)
    })
    return Array.from(editaisSet).sort()
  }, [items, editais])

  // Get all unique bairros
  const allBairros = useMemo(() => {
    const set = new Set(items.map(i => i.bairro).filter(b => b && b !== 'Não informado' && b !== 'não informado'))
    return Array.from(set).sort()
  }, [items])

  // Get all unique categorias
  const allCategorias = useMemo(() => {
    const set = new Set(items.map(i => i.categoria).filter(c => c))
    return Array.from(set).sort()
  }, [items])

  const allComunidades = useMemo(() => {
    const set = new Set(
      items
        .map(i => i.comunidadeTradicional || i.comunidade || i.povoTradicional)
        .filter(c => c && c !== 'Não informado' && c !== 'não informado')
    )
    return Array.from(set).sort()
  }, [items])

  // Get all unique tipos
  const allTipos = ['agente', 'grupo', 'espaco', 'projeto'] as const

  // Statistics by neighborhood
  const estatisticasPorBairro = useMemo(() => {
    const stats: Record<string, { bairro: string; agente: number; grupo: number; espaco: number; projeto: number; total: number }> = {}
    
    items.forEach(item => {
      if (filterTipo && item.tipo !== filterTipo) return
      if (filterEdital && !participatedInEdital(item, filterEdital)) return
      const comunidade = item.comunidadeTradicional || item.comunidade || item.povoTradicional || ''
      if (filterComunidade && comunidade !== filterComunidade) return
      
      const b = item.bairro || 'Não informado'
      if (!stats[b]) stats[b] = { bairro: b, agente: 0, grupo: 0, espaco: 0, projeto: 0, total: 0 }
      if (item.tipo === 'agente') stats[b].agente++
      if (item.tipo === 'grupo') stats[b].grupo++
      if (item.tipo === 'espaco') stats[b].espaco++
      if (item.tipo === 'projeto') stats[b].projeto++
      stats[b].total++
    })
    
    return Object.values(stats)
      .filter(s => s.bairro !== 'Não informado')
      .sort((a, b) => b.total - a.total)
  }, [items, filterTipo, filterEdital, filterComunidade])

  // Filtered items: todos os cadastros e projetos entram no mapa.
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = !searchTerm ||
        item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.proponente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.comunidadeTradicional?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchBairro = !filterBairro || item.bairro === filterBairro
      const matchCategoria = !filterCategoria || item.categoria === filterCategoria
      const matchTipo = !filterTipo || item.tipo === filterTipo
      const matchEdital = !filterEdital || participatedInEdital(item, filterEdital)
      const comunidade = item.comunidadeTradicional || item.comunidade || item.povoTradicional || ''
      const matchComunidade = !filterComunidade || comunidade === filterComunidade
      
      return matchSearch && matchBairro && matchCategoria && matchTipo && matchEdital && matchComunidade
    })
  }, [items, searchTerm, filterBairro, filterCategoria, filterTipo, filterEdital, filterComunidade])

  // Map points (only with coordinates)
  const mapPoints = useMemo(() => {
    return filteredItems.filter(item => item.lat && item.lng)
  }, [filteredItems])

  const handleItemClick = useCallback((item: CultureItem) => {
    setSelectedItem(item)
    onItemSelect?.(item)
  }, [onItemSelect])

  const clearFilters = () => {
    setSearchTerm('')
    setFilterBairro('')
    setFilterCategoria('')
    setFilterTipo('')
    setFilterEdital('')
    setFilterComunidade('')
  }

  const hasActiveFilters = searchTerm || filterBairro || filterCategoria || filterTipo || filterEdital || filterComunidade

  return (
    <div className="flex h-full w-full bg-slate-100/90" style={{ minHeight: 500 }}>
      {/* SIDEBAR */}
      <div
        className="flex flex-col overflow-hidden border-r border-slate-200/90 bg-white"
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
        }}
      >
        {/* Search */}
        <div className="border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" sx={{ fontSize: 18 }} />
            <input
              type="text"
              placeholder="Buscar nome, edital, categoria…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2.5 pl-9 pr-4 text-sm transition-colors focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500/20"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              showFilters || hasActiveFilters
                ? 'border border-teal-200 bg-teal-50 text-teal-900'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            <Filter sx={{ fontSize: 16 }} />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 rounded-md bg-slate-800 px-1.5 py-0.5 font-mono text-xs font-medium text-white tabular-nums">
                {[filterBairro, filterCategoria, filterTipo, filterEdital, filterComunidade].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="max-h-[340px] overflow-y-auto border-b border-slate-100 bg-slate-50/90 p-4">
            <div className="space-y-3">
              {/* Tipo */}
              <div>
                <label className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Tipo</label>
                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/15"
                >
                  <option value="">Todos</option>
                  {allTipos.map(t => (
                    <option key={t} value={t}>
                      {TIPO_EMOJI[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Edital */}
              <div>
                <label className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Edital</label>
                <select
                  value={filterEdital}
                  onChange={(e) => setFilterEdital(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/15"
                >
                  <option value="">Lista de Agentes Culturais Cadastrados</option>
                  {editais.map((e, i) => (
                    <option key={i} value={e.nome}>
                      {e.nome} {e.ano} • {e.inscritos} inscritos • {e.contemplados} contemplados
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Bairro */}
              <div>
                <label className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Bairro</label>
                <select
                  value={filterBairro}
                  onChange={(e) => setFilterBairro(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/15"
                >
                  <option value="">Todos ({allBairros.length})</option>
                  {allBairros.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              
              {/* Categoria */}
              <div>
                <label className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Categoria</label>
                <select
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/15"
                >
                  <option value="">Todas ({allCategorias.length})</option>
                  {allCategorias.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Comunidade tradicional</label>
                <select
                  value={filterComunidade}
                  onChange={(e) => setFilterComunidade(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-emerald-100 bg-white focus:border-[#2ED6A3] focus:outline-none"
                >
                  <option value="">Todas ({allComunidades.length})</option>
                  {allComunidades.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full flex items-center justify-center gap-1 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Close sx={{ fontSize: 16 }} />
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50/40 px-3 py-2.5">
          <div className="flex items-center justify-between text-[0.7rem]">
            <span className="font-medium text-slate-700">
              <span className="font-mono font-semibold tabular-nums text-slate-900">{filteredItems.length}</span>
              <span className="text-slate-500"> / </span>
              <span className="font-mono tabular-nums text-slate-600">{items.length}</span>
              <span className="ml-1 text-slate-500">registros</span>
            </span>
            <span className="font-mono text-slate-500 tabular-nums">
              {allBairros.length} <span className="font-sans font-medium">bairros</span>
            </span>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              <LocationOn sx={{ fontSize: 40, opacity: 0.3, mb: 2 }} />
              <p className="text-sm">Nenhum resultado encontrado</p>
            </div>
          ) : (
            filteredItems.slice(0, 100).map((item, i) => (
              <div
                key={`${item.tipo}-${item.id}-${i}`}
                onClick={() => handleItemClick(item)}
                className={`cursor-pointer border-b border-slate-100 p-3 transition-all hover:bg-slate-50 ${
                  selectedItem?.id === item.id ? 'border-l-[3px] border-l-teal-600 bg-teal-50/60' : 'border-l-[3px] border-l-transparent'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: `${TIPO_COLORS[item.tipo]}15` }}
                  >
                    <span style={{ fontSize: 14 }}>{TIPO_EMOJI[item.tipo]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-800 truncate">{item.nome}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{item.categoria}</div>
                    {item.edital && (
                      <div className="text-[10px] text-emerald-700 font-medium truncate">{item.edital}</div>
                    )}
                    {item.comunidadeTradicional && (
                      <div className="text-[10px] text-[#B9801F] font-bold truncate">Comunidade: {item.comunidadeTradicional}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{item.bairro}</span>
                      {item.tipo === 'projeto' && item.valor && (
                        <span className="text-[10px] font-bold text-emerald-600">{formatBRL(item.valor)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {filteredItems.length > 100 && (
            <div className="p-3 text-center text-xs text-slate-400 bg-slate-50">
              + {filteredItems.length - 100} outros resultados
            </div>
          )}
        </div>

        {/* Bairro Stats */}
        <div className="p-3 border-t border-emerald-100 bg-[#F6FBF7]">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">
            Top Bairros ({estatisticasPorBairro.length})
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {estatisticasPorBairro.slice(0, 5).map((stat) => (
              <div key={stat.bairro} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate mr-2">{stat.bairro}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {stat.agente > 0 && (
                    <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-teal-100 text-teal-700">
                      {stat.agente}
                    </span>
                  )}
                  {stat.grupo > 0 && (
                    <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-[#006B5A]">
                      {stat.grupo}
                    </span>
                  )}
                  {stat.espaco > 0 && (
                    <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">
                      {stat.espaco}
                    </span>
                  )}
                  {stat.projeto > 0 && (
                    <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-white">
                      {stat.projeto}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAP */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />
          {mapPoints.map((item, idx) => (
            <React.Fragment key={`${item.tipo}-${item.id}-${idx}`}>
              <CircleMarker
                center={[item.lat!, item.lng!]}
                radius={selectedItem?.id === item.id ? 14 : 10}
                pathOptions={{
                  fillColor: TIPO_COLORS[item.tipo],
                  color: 'transparent',
                  weight: 0,
                  fillOpacity: 0.15,
                }}
              />
              <CircleMarker
                center={[item.lat!, item.lng!]}
                radius={selectedItem?.id === item.id ? 8 : 5}
                pathOptions={{
                  fillColor: TIPO_COLORS[item.tipo],
                  color: '#ffffff',
                  weight: 2,
                  fillOpacity: 0.9,
                }}
                eventHandlers={{
                  click: () => handleItemClick(item),
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: TIPO_COLORS[item.tipo] }}>
                      {TIPO_EMOJI[item.tipo]} {item.tipo} • {item.categoria}
                    </div>
                    <div className="font-bold text-sm leading-tight mb-1">{item.nome}</div>
                    <div className="text-xs text-slate-500 mb-1">{item.bairro}</div>
                    {item.editais && item.editais.length > 0 && (
                      <div className="text-[10px] text-purple-600 font-medium mb-1">Edital: {item.editais[0]}</div>
                    )}
                    {item.proponente && (
                      <div className="text-xs text-slate-600 mb-1">Proponente: {item.proponente}</div>
                    )}
                    {item.comunidadeTradicional && (
                      <div className="text-[10px] font-bold text-amber-700 mb-1">Comunidade tradicional: {item.comunidadeTradicional}</div>
                    )}
                    {item.tipo === 'projeto' && item.valor && (
                      <div className="text-sm font-black text-emerald-600">{formatBRL(item.valor)}</div>
                    )}
                    <button
                      onClick={() => handleItemClick(item)}
                      className="mt-2 text-xs text-[#006B5A] hover:underline"
                    >
                      Ver detalhes →
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          ))}
        </MapContainer>

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 p-3 rounded-xl bg-white/95 backdrop-blur-sm shadow-lg z-[1000] border border-emerald-100">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-2">Legenda</div>
          <div className="space-y-1.5">
            {Object.entries(TIPO_EMOJI).map(([tipo, emoji]) => (
              <div key={tipo} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: TIPO_COLORS[tipo] }}
                />
                <span className="text-xs text-slate-700 capitalize">{emoji} {tipo}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Item Info */}
        {selectedItem && (
          <div className="absolute top-4 right-4 p-4 rounded-xl bg-white/95 backdrop-blur-sm shadow-lg z-[1000] max-w-xs">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-100"
            >
              <Close sx={{ fontSize: 16 }} />
            </button>
            <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: TIPO_COLORS[selectedItem.tipo] }}>
              {TIPO_EMOJI[selectedItem.tipo]} {selectedItem.tipo}
            </div>
            <div className="font-bold text-sm mb-1">{selectedItem.nome}</div>
            <div className="text-xs text-slate-500 mb-2">{selectedItem.categoria} • {selectedItem.bairro}</div>
            {selectedItem.edital && (
              <div className="text-xs text-emerald-700 font-medium mb-1">{selectedItem.edital}</div>
            )}
            {selectedItem.proponente && (
              <div className="text-xs text-slate-600 mb-1">Proponente: {selectedItem.proponente}</div>
            )}
            {selectedItem.genero && (
              <div className="text-xs text-slate-600">Gênero: {selectedItem.genero}</div>
            )}
            {selectedItem.raca && (
              <div className="text-xs text-slate-600">Raça: {selectedItem.raca}</div>
            )}
            {selectedItem.comunidadeTradicional && (
              <div className="text-xs font-bold text-amber-700">Comunidade: {selectedItem.comunidadeTradicional}</div>
            )}
            {selectedItem.tipo === 'edital' && selectedItem.valor && (
              <div className="text-sm font-black text-emerald-600 mt-1">{formatBRL(selectedItem.valor)}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}