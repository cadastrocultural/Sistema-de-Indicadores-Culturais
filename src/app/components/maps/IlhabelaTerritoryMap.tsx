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
    <div
      className={className}
      style={{
        height,
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(13, 148, 136, 0.18)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), 0 12px 40px -28px rgba(15,23,42,0.25)',
      }}
    >
      {pontos.length === 0 ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-teal-50/30 px-6 text-center">
          <p className="text-sm font-bold text-slate-700">Sem pontos no mapa</p>
          <p className="max-w-sm text-xs font-medium leading-relaxed text-slate-500">
            Importe cadastro com bairros reconhecidos na base municipal para ver a distribuição no território.
          </p>
        </div>
      ) : (
        <MapContainer
          center={[ILHABELA_CENTER.lat, ILHABELA_CENTER.lng]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
          />
          {pontos.map((p, idx) => {
            const t = p.qtd / maxQ;
            const r = 7 + t * 18;
            const fill = `rgba(13, 148, 136, ${0.35 + t * 0.45})`;
            return (
              <CircleMarker
                key={`${p.nome}-${idx}`}
                center={[p.lat, p.lng]}
                radius={r}
                pathOptions={{
                  color: '#0f766e',
                  weight: 2,
                  fillColor: fill,
                  fillOpacity: 0.92,
                }}
              >
                <Popup>
                  <div className="min-w-[150px] p-0.5">
                    <strong className="text-[0.8125rem] text-slate-900">{p.nome}</strong>
                    <div className="mt-1.5 text-xs font-semibold text-slate-600">
                      {p.qtd} registro{p.qtd === 1 ? '' : 's'} no bairro
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
