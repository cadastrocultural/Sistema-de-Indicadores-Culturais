import React, { useState, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { LocationOn, Search, Filter, Close } from '@mui/icons-material'

interface CultureItem {
  id: string
  tipo: 'agente' | 'grupo' | 'espaco' | 'edital'
  nome: string
  bairro: string
  categoria: string
  lat?: number
  lng?: number
  genero?: string
  raca?: string
  valor?: number
  eh_contemplado?: boolean
  edital?: string
  ano?: string
  proponente?: string
  [key: string]: any
}

interface StoreLocatorMapProps {
  items: CultureItem[]
  center?: [number, number]
  zoom?: number
  sidebarWidth?: number
  onItemSelect?: (item: CultureItem | null) => void
}

const TIPO_COLORS: Record<string, string> = {
  agente: '#00A38C',
  grupo: '#0b57d0',
  espaco: '#FF6B35',
  edital: '#8b5cf6',
}

const TIPO_EMOJI: Record<string, string> = {
  agente: '🎭',
  grupo: '👥',
  espaco: '🏛️',
  edital: '📋',
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function StoreLocatorMap({
  items,
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
  const [selectedItem, setSelectedItem] = useState<CultureItem | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // DEDUPLICATION: Keep latest record per agent/group/space (by edital or name)
  const deduplicatedItems = useMemo(() => {
    const seen = new Map<string, CultureItem>()
    
    items.forEach(item => {
      const key = `${item.tipo}-${item.nome}-${item.edital || ''}`
      const existing = seen.get(key)
      
      // Keep the one with most data (prioritize items with lat/lng)
      if (!existing) {
        seen.set(key, item)
      } else if (item.lat && item.lng && (!existing.lat || !existing.lng)) {
        seen.set(key, item)
      } else if (item.edital && item.edital !== existing.edital) {
        // If different edital, keep the most recent (check by ano or order)
        const itemYear = parseInt(item.ano || '0')
        const existingYear = parseInt(existing.ano || '0')
        if (itemYear >= existingYear) {
          seen.set(key, item)
        }
      }
    })
    
    return Array.from(seen.values())
  }, [items])

  // Unique values for filters
  const bairros = useMemo(() => {
    const set = new Set(deduplicatedItems.map(i => i.bairro).filter(b => b && b !== 'Não informado' && b !== 'não informado'))
    return Array.from(set).sort()
  }, [deduplicatedItems])

  const categorias = useMemo(() => {
    const set = new Set(deduplicatedItems.map(i => i.categoria).filter(c => c))
    return Array.from(set).sort()
  }, [deduplicatedItems])

  const editais = useMemo(() => {
    const set = new Set(deduplicatedItems.map(i => i.edital).filter(e => e))
    return Array.from(set).sort()
  }, [deduplicatedItems])

  const tipos = ['agente', 'grupo', 'espaco', 'edital']

  // Statistics by neighborhood
  const estatisticasPorBairro = useMemo(() => {
    const stats: Record<string, { bairro: string; agente: number; grupo: number; espaco: number; total: number }> = {}
    
    deduplicatedItems.forEach(item => {
      const b = item.bairro || 'Não informado'
      if (!stats[b]) stats[b] = { bairro: b, agente: 0, grupo: 0, espaco: 0, total: 0 }
      if (item.tipo === 'agente') stats[b].agente++
      if (item.tipo === 'grupo') stats[b].grupo++
      if (item.tipo === 'espaco') stats[b].espaco++
      stats[b].total++
    })
    
    return Object.values(stats)
      .filter(s => s.bairro !== 'Não informado')
      .sort((a, b) => b.total - a.total)
  }, [deduplicatedItems])

  // Filtered items
  const filteredItems = useMemo(() => {
    return deduplicatedItems.filter(item => {
      const matchSearch = !searchTerm ||
        item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.edital?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.proponente?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchBairro = !filterBairro || item.bairro === filterBairro
      const matchCategoria = !filterCategoria || item.categoria === filterCategoria
      const matchTipo = !filterTipo || item.tipo === filterTipo
      const matchEdital = !filterEdital || item.edital === filterEdital
      
      return matchSearch && matchBairro && matchCategoria && matchTipo && matchEdital
    })
  }, [deduplicatedItems, searchTerm, filterBairro, filterCategoria, filterTipo, filterEdital])

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
  }

  const hasActiveFilters = searchTerm || filterBairro || filterCategoria || filterTipo || filterEdital

  return (
    <div className="flex w-full h-full" style={{ minHeight: 500 }}>
      {/* SIDEBAR */}
      <div
        className="flex flex-col bg-white border-r border-slate-200/90 overflow-hidden"
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
        }}
      >
        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" sx={{ fontSize: 18 }} />
            <input
              type="text"
              placeholder="Buscar nome, edital, categoria…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
              showFilters || hasActiveFilters
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Filter sx={{ fontSize: 16 }} />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                {[filterBairro, filterCategoria, filterTipo, filterEdital].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 border-b border-slate-100 bg-slate-50 max-h-[300px] overflow-y-auto">
            <div className="space-y-3">
              {/* Tipo */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tipo</label>
                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Todos</option>
                  {tipos.map(t => (
                    <option key={t} value={t}>
                      {TIPO_EMOJI[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Edital */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Edital</label>
                <select
                  value={filterEdital}
                  onChange={(e) => setFilterEdital(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Todos ({editais.length})</option>
                  {editais.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
              
              {/* Bairro */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Bairro</label>
                <select
                  value={filterBairro}
                  onChange={(e) => setFilterBairro(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Todos ({bairros.length})</option>
                  {bairros.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              
              {/* Categoria */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Categoria</label>
                <select
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Todas ({categorias.length})</option>
                  {categorias.map(c => (
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
        <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">
              {filteredItems.length} de {deduplicatedItems.length} registros
            </span>
            <span className="text-slate-400">{bairros.length} bairros</span>
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
                className={`p-3 border-b border-slate-100 cursor-pointer transition-all hover:bg-blue-50 ${
                  selectedItem?.id === item.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
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
                      <div className="text-[10px] text-purple-600 font-medium truncate">{item.edital}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{item.bairro}</span>
                      {item.tipo === 'edital' && item.valor && (
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
        <div className="p-3 border-t border-slate-200 bg-slate-50">
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
                    <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                      {stat.grupo}
                    </span>
                  )}
                  {stat.espaco > 0 && (
                    <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-700">
                      {stat.espaco}
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
                    {item.edital && (
                      <div className="text-[10px] text-purple-600 font-medium mb-1">{item.edital}</div>
                    )}
                    {item.proponente && (
                      <div className="text-xs text-slate-600 mb-1">Proponente: {item.proponente}</div>
                    )}
                    {item.tipo === 'edital' && item.valor && (
                      <div className="text-sm font-black text-emerald-600">{formatBRL(item.valor)}</div>
                    )}
                    <button
                      onClick={() => handleItemClick(item)}
                      className="mt-2 text-xs text-blue-600 hover:underline"
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
        <div className="absolute bottom-4 left-4 p-3 rounded-xl bg-white/95 backdrop-blur-sm shadow-lg z-[1000]">
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
              <div className="text-xs text-purple-600 font-medium mb-1">{selectedItem.edital}</div>
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
            {selectedItem.tipo === 'edital' && selectedItem.valor && (
              <div className="text-sm font-black text-emerald-600 mt-1">{formatBRL(selectedItem.valor)}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}