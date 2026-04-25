import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getBairroCoords, ILHABELA_CENTER } from '../../data/bairros-coords';

// Mesmo ajuste do Dashboard para ícones padrão do Leaflet em bundlers
// @ts-ignore default icon legacy API
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export type BairroPonto = { nome: string; qtd: number };

type Props = {
  /** Linhas da distribuição por bairro (nome canônico + quantidade) */
  bairros: BairroPonto[];
  className?: string;
  height?: number | string;
};

/**
 * Mapa real de Ilhabela (OpenStreetMap) com marcadores proporcionais à quantidade por bairro.
 */
export function IlhabelaTerritoryMap({ bairros, className, height = 400 }: Props) {
  const pontos = useMemo(() => {
    const out: { nome: string; qtd: number; lat: number; lng: number }[] = [];
    for (const b of bairros) {
      const g = getBairroCoords(b.nome);
      if (!g) continue;
      const q = Number(b.qtd) || 0;
      if (q <= 0) continue;
      out.push({ nome: b.nome, qtd: q, lat: g.lat, lng: g.lng });
    }
    return out;
  }, [bairros]);

  const maxQ = useMemo(() => Math.max(1, ...pontos.map((p) => p.qtd)), [pontos]);

  return (
    <div className={className} style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.25)' }}>
      {pontos.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-sm font-medium text-slate-500">
          Sem bairros com coordenadas para exibir no mapa. Importe cadastro com bairro identificável.
        </div>
      ) : (
        <MapContainer
          center={[ILHABELA_CENTER.lat, ILHABELA_CENTER.lng]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />
          {pontos.map((p, idx) => {
            const t = p.qtd / maxQ;
            const r = 6 + t * 16;
            const fill = `rgba(37, 99, 235, ${0.3 + t * 0.5})`;
            return (
              <CircleMarker
                key={`${p.nome}-${idx}`}
                center={[p.lat, p.lng]}
                radius={r}
                pathOptions={{ color: '#1d4ed8', weight: 2, fillColor: fill, fillOpacity: 0.9 }}
              >
                <Popup>
                  <div style={{ minWidth: 140 }}>
                    <strong style={{ fontSize: 13 }}>{p.nome}</strong>
                    <div style={{ marginTop: 6, fontSize: 12, color: '#334155' }}>
                      {p.qtd} registro{p.qtd === 1 ? '' : 's'}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      )}
    </div>
  );
}
