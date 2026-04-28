import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, ChevronLeft, ChevronRight, Grid3X3, Images, Maximize2, X } from 'lucide-react';
import { type GalleryImage, STATIC_GALLERY_IMAGES, galleryImageCredit } from '../data/mapeamento-2020-gallery';

interface Mapeamento2020GalleryPageProps {
  onNavigate: (page: string) => void;
}

export function Mapeamento2020GalleryPage({ onNavigate }: Mapeamento2020GalleryPageProps) {
  const UPLOADED_GALLERY_KEY = 'gallery_uploaded_images_by_year';
  const [uploadedImages, setUploadedImages] = useState<GalleryImage[]>([]);
  const [selectedYear, setSelectedYear] = useState('todos');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(UPLOADED_GALLERY_KEY);
      if (saved) setUploadedImages(JSON.parse(saved));
    } catch {
      setUploadedImages([]);
    }
  }, []);

  const allImages = useMemo(
    () => [...STATIC_GALLERY_IMAGES, ...uploadedImages].sort((a, b) => b.year.localeCompare(a.year) || a.title.localeCompare(b.title, 'pt-BR')),
    [uploadedImages]
  );

  const years = useMemo(() => Array.from(new Set(allImages.map((image) => image.year))).sort((a, b) => Number(b) - Number(a)), [allImages]);
  const images = useMemo(
    () => (selectedYear === 'todos' ? allImages : allImages.filter((image) => image.year === selectedYear)),
    [allImages, selectedYear]
  );
  const urls = images.map((image) => image.url);
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const safeLen = urls.length;
  const current = safeLen > 0 ? urls[Math.min(index, safeLen - 1)] : '';
  const currentImage = safeLen > 0 ? images[Math.min(index, safeLen - 1)] : null;
  const featured = useMemo(() => images.slice(0, 6), [images]);

  useEffect(() => {
    setIndex(0);
  }, [selectedYear, uploadedImages.length]);

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
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [safeLen, goPrev, goNext]);

  return (
    <div className="min-h-screen bg-transparent pb-20 font-sans text-slate-900">
      <section className="container mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_60px_-44px_rgba(15,23,42,0.22)]">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-teal-900 to-slate-950 px-5 py-8 text-white sm:px-8 md:px-10">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-teal-400/15 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-96 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 font-mono text-[0.6rem] font-medium uppercase tracking-[0.14em] text-teal-100 backdrop-blur-sm">
                  <Images size={14} strokeWidth={2.25} />
                  Galeria pública
                </div>
                <h1 className="m-0 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  Galeria de fotos por ano
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-normal leading-relaxed text-slate-200 sm:text-base">
                  Registro fotográfico por ano, com crédito ao artista quando informado (upload no painel ou mapa no código para fotos do acervo estático).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="m-0 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-teal-100/90">Acervo</p>
                  <p className="m-0 mt-2 font-mono text-4xl font-semibold tabular-nums">{images.length}</p>
                  <p className="m-0 mt-1 text-xs font-medium text-teal-100/80">fotografias</p>
                </div>
                <div className="rounded-xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="m-0 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-teal-100/90">Filtro</p>
                  <p className="m-0 mt-2 font-mono text-4xl font-semibold tabular-nums">{selectedYear === 'todos' ? years.length : selectedYear}</p>
                  <p className="m-0 mt-1 text-xs font-medium text-teal-100/80">{selectedYear === 'todos' ? 'anos disponíveis' : 'ano selecionado'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6 md:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="ds-dash-kicker m-0 text-teal-800">Separar por ano</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedYear('todos')}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                      selectedYear === 'todos' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Todos ({allImages.length})
                  </button>
                  {years.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setSelectedYear(year)}
                      className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                        selectedYear === year ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {year} ({allImages.filter((image) => image.year === year).length})
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {safeLen === 0 ? (
            <div className="p-8 sm:p-10">
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 p-10 text-center">
                <p className="mb-2 text-sm font-semibold text-slate-800">Ainda não há imagens na galeria.</p>
                <p className="text-xs leading-relaxed text-slate-600">
                  Adicione ficheiros <strong>.jpg</strong>, <strong>.png</strong> ou <strong>.webp</strong> em{' '}
                  <code className="rounded bg-white px-1.5 py-0.5 text-[0.7rem] text-slate-800">src/app/data/mapeamento-2020-gallery/</code>.
                </p>
                  <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="mt-6 rounded-full bg-[#00A38C] px-5 py-2 text-sm font-bold text-white shadow-sm shadow-emerald-900/20 hover:bg-[#006B5A]"
                >
                  Voltar ao início
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 md:p-8">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <div className="relative overflow-hidden rounded-[30px] border border-emerald-100 bg-slate-950 shadow-[0_26px_70px_-42px_rgba(0,107,90,0.9)] ring-1 ring-white/60">
                  <div className="relative aspect-[4/3] w-full sm:aspect-[16/10] lg:aspect-[16/11]">
                    <AnimatePresence initial={false} mode="wait">
                      <motion.div
                        key={current}
                        className="absolute inset-0 flex items-center justify-center bg-slate-950"
                        initial={{ opacity: 0, scale: 1.015 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.99 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <img src={current} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 blur-2xl scale-110" aria-hidden />
                        <img
                          src={current}
                          alt={`${galleryImageCredit(currentImage)} — ${currentImage?.year || selectedYear}`}
                          className="relative z-10 max-h-full max-w-full object-contain"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent p-4 text-white sm:p-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="m-0 text-[0.62rem] font-black uppercase tracking-[0.16em] text-emerald-100">Foto em destaque · {currentImage?.year}</p>
                        <p className="m-0 mt-1 text-lg font-black leading-tight">{galleryImageCredit(currentImage)}</p>
                        {currentImage?.artist?.trim() && currentImage.title && currentImage.title !== galleryImageCredit(currentImage) ? (
                          <p className="m-0 mt-0.5 text-xs font-semibold text-white/80">{currentImage.title}</p>
                        ) : null}
                        <p className="m-0 mt-1 text-xs font-bold text-white/75">Registro {index + 1} de {safeLen}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLightboxOpen(true)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-2 text-xs font-black text-white backdrop-blur transition hover:bg-white/25"
                      >
                        <Maximize2 size={15} />
                        Ampliar
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={goPrev}
                    className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/90 text-slate-800 shadow-md backdrop-blur-sm transition hover:bg-white"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft size={26} strokeWidth={2.25} />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/90 text-slate-800 shadow-md backdrop-blur-sm transition hover:bg-white"
                    aria-label="Foto seguinte"
                  >
                    <ChevronRight size={26} strokeWidth={2.25} />
                  </button>
                </div>

                <div className="rounded-[28px] border border-emerald-100 bg-[#f6fbf7] p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="m-0 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#00A38C]">Mosaico</p>
                      <h2 className="m-0 text-xl font-black text-slate-900">Destaques do acervo</h2>
                    </div>
                    <Camera className="text-[#00A38C]" size={24} strokeWidth={2.4} />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {featured.map((image, i) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setIndex(i)}
                        className={`group relative overflow-hidden rounded-2xl border bg-white transition ${
                          index === i ? 'border-[#00A38C] ring-2 ring-emerald-200' : 'border-white hover:border-emerald-200'
                        }`}
                      >
                        <img src={image.url} alt={`Miniatura ${image.title}`} className="aspect-square h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-slate-950/65 px-1.5 py-0.5 text-[0.55rem] font-black text-white">{image.year}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#00A38C]">
                        <Grid3X3 size={20} strokeWidth={2.4} />
                      </div>
                      <div>
                        <p className="m-0 text-sm font-black text-slate-900">Navegação rápida</p>
                        <p className="m-0 text-xs font-semibold text-slate-500">Use as setas ou escolha uma miniatura abaixo.</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {urls.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setIndex(i)}
                          className={`h-2.5 rounded-full transition-all ${
                            i === index ? 'w-8 bg-[#00A38C]' : 'w-2.5 bg-slate-300 hover:bg-emerald-300'
                          }`}
                          aria-label={`Ir para a foto ${i + 1}`}
                          aria-current={i === index ? 'true' : undefined}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="m-0 text-xl font-black text-slate-900">Todas as fotos</h2>
                  <p className="m-0 text-xs font-bold text-slate-500">{safeLen} imagens</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {images.map((image, i) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => {
                        setIndex(i);
                        setLightboxOpen(true);
                      }}
                      className="group relative overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-30px_rgba(15,23,42,0.7)]"
                    >
                      <img src={image.url} alt={`${galleryImageCredit(image)} — ${image.year}`} className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105" />
                      <span className="absolute bottom-2 left-2 rounded-full bg-slate-950/70 px-2 py-1 text-[0.62rem] font-black text-white backdrop-blur">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="absolute right-2 top-2 rounded-full bg-[#00A38C]/90 px-2 py-1 text-[0.6rem] font-black text-white backdrop-blur">
                        {image.year}
                      </span>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/82 via-black/40 to-transparent px-2 pb-2 pt-10">
                        <p className="m-0 line-clamp-2 text-center text-[0.68rem] font-black leading-snug text-white [overflow-wrap:anywhere]">
                          {galleryImageCredit(image)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {lightboxOpen && current && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              aria-label="Fechar galeria ampliada"
            >
              <X size={24} />
            </button>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              aria-label="Foto anterior"
            >
              <ChevronLeft size={30} />
            </button>
            <motion.div
              key={`lightbox-${current}`}
              className="flex max-h-[90vh] max-w-[92vw] flex-col items-center gap-3"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
            >
              <img
                src={current}
                alt={`${galleryImageCredit(currentImage)} — ${currentImage?.year || selectedYear}`}
                className="max-h-[78vh] max-w-full rounded-3xl object-contain shadow-2xl"
              />
              <div className="max-w-[92vw] rounded-2xl bg-white/12 px-4 py-2.5 text-center backdrop-blur">
                <p className="m-0 text-sm font-black text-white">{galleryImageCredit(currentImage)}</p>
                {currentImage?.artist?.trim() && currentImage.title && currentImage.title !== galleryImageCredit(currentImage) ? (
                  <p className="m-0 mt-1 text-xs font-semibold text-white/85">{currentImage.title}</p>
                ) : null}
                <p className="m-0 mt-1 text-[0.7rem] font-bold text-white/70">{currentImage?.year}</p>
              </div>
            </motion.div>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              aria-label="Foto seguinte"
            >
              <ChevronRight size={30} />
            </button>
            <p className="absolute bottom-3 left-1/2 m-0 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1.5 text-[0.65rem] font-black text-white/90 backdrop-blur">
              {index + 1} / {safeLen}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
