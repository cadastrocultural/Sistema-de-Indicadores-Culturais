import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { MAPEAMENTO_2020_GALLERY_URLS } from '../data/mapeamento-2020-gallery';

interface Mapeamento2020GalleryPageProps {
  onNavigate: (page: string) => void;
}

export function Mapeamento2020GalleryPage({ onNavigate }: Mapeamento2020GalleryPageProps) {
  const urls = MAPEAMENTO_2020_GALLERY_URLS;
  const [index, setIndex] = useState(0);
  const safeLen = urls.length;
  const current = safeLen > 0 ? urls[Math.min(index, safeLen - 1)] : '';

  const goPrev = useCallback(() => {
    if (safeLen === 0) return;
    setIndex((i) => (i - 1 + safeLen) % safeLen);
  }, [safeLen]);

  const goNext = useCallback(() => {
    if (safeLen === 0) return;
    setIndex((i) => (i + 1) % safeLen);
  }, [safeLen]);

  useEffect(() => {
    if (safeLen === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [safeLen, goPrev, goNext]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20 font-sans text-[#1b1b1f]">
      <section className="container mx-auto max-w-5xl px-6 pt-10">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-[#0b57d0]">
          <Images size={14} strokeWidth={2.25} />
          Mapeamento cultural 2020
        </div>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Galeria de fotos</h1>
        <p className="mb-8 max-w-2xl text-sm font-medium text-slate-600">
          Registo fotográfico do mapeamento. Use as setas ou o teclado (← →) para navegar.
        </p>

        {safeLen === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-10 text-center">
            <p className="mb-2 text-sm font-semibold text-slate-800">Ainda não há imagens na galeria.</p>
            <p className="text-xs leading-relaxed text-slate-600">
              Adicione ficheiros <strong>.jpg</strong>, <strong>.png</strong> ou <strong>.webp</strong> na pasta do projeto:{' '}
              <code className="rounded bg-white px-1.5 py-0.5 text-[0.7rem] text-slate-800">src/app/data/mapeamento-2020-gallery/</code>
              — elas aparecem automaticamente aqui após guardar o projeto.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="mt-6 rounded-full bg-[#0b57d0] px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#0842a8]"
            >
              Voltar ao início
            </button>
          </div>
        ) : (
          <div className="relative mx-auto max-w-4xl">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-900 shadow-xl ring-1 ring-slate-900/5">
              <div className="aspect-[4/3] w-full md:aspect-[16/10]">
                <AnimatePresence initial={false} mode="wait">
                  <motion.img
                    key={current}
                    src={current}
                    alt={`Mapeamento 2020 — foto ${index + 1} de ${safeLen}`}
                    className="h-full w-full object-contain"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  />
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={goPrev}
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/90 text-slate-800 shadow-md backdrop-blur-sm transition hover:bg-white md:left-4 md:h-12 md:w-12"
                aria-label="Foto anterior"
              >
                <ChevronLeft size={26} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/90 text-slate-800 shadow-md backdrop-blur-sm transition hover:bg-white md:right-4 md:h-12 md:w-12"
                aria-label="Foto seguinte"
              >
                <ChevronRight size={26} strokeWidth={2.25} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {urls.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? 'w-8 bg-[#0b57d0]' : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Ir para a foto ${i + 1}`}
                  aria-current={i === index ? 'true' : undefined}
                />
              ))}
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-slate-500">
              {index + 1} / {safeLen}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
