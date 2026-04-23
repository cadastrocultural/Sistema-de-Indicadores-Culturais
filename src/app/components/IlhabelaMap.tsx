import React from 'react';

export function IlhabelaMap() {
  // Simplified SVG representation of Ilhabela
  return (
    <div className="relative w-full aspect-square md:aspect-video bg-[#f0f9f6] rounded-2xl overflow-hidden border border-border shadow-inner">
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 500 600" className="w-full h-full p-8">
          {/* Mock shape of Ilhabela */}
          <path 
            d="M200,50 L350,100 L400,250 L380,450 L250,550 L100,500 L80,300 L120,150 Z" 
            fill="#006C5B" 
            fillOpacity="0.1" 
            stroke="#006C5B" 
            strokeWidth="2"
          />
          
          {/* Pins for projects */}
          {[
            { x: 180, y: 150, n: 12, name: 'Centro Histórico' },
            { x: 300, y: 220, n: 8, name: 'Saco do Sombrio' },
            { x: 150, y: 350, n: 25, name: 'Praia do Perequê' },
            { x: 220, y: 480, n: 5, name: 'Bonete' },
            { x: 350, y: 400, n: 14, name: 'Castelhanos' },
            { x: 120, y: 250, n: 18, name: 'Vila' },
            { x: 280, y: 320, n: 6, name: 'Guanxuma' }
          ].map((pin, i) => (
            <g key={i} className="cursor-pointer group">
              <circle 
                cx={pin.x} cy={pin.y} r={12 + pin.n/2} 
                fill="#00A38C" 
                fillOpacity="0.6" 
                className="hover:fill-[#FFC857] transition-colors"
              />
              <circle cx={pin.x} cy={pin.y} r="4" fill="#00403A" />
              <foreignObject x={pin.x + 10} y={pin.y - 10} width="120" height="40">
                <div className="hidden group-hover:block bg-white p-2 rounded shadow-lg border border-border text-[10px] font-bold">
                  {pin.name}: {pin.n} projetos
                </div>
              </foreignObject>
            </g>
          ))}
        </svg>
      </div>

      {/* Map Legend/Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur p-3 rounded-lg shadow-sm border border-border">
          <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Densidade de Projetos</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-secondary/20 border border-secondary" />
            <span className="text-[10px] text-primary">Baixa</span>
            <div className="w-4 h-4 rounded-full bg-secondary/40 border border-secondary" />
            <div className="w-5 h-5 rounded-full bg-secondary/60 border border-secondary" />
            <span className="text-[10px] text-primary">Alta</span>
          </div>
        </div>
      </div>
      
      <div className="absolute top-6 left-6">
        <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-border flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-bold text-primary">MAPA INTERATIVO</span>
        </div>
      </div>
    </div>
  );
}
