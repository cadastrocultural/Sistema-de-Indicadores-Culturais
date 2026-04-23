import React from 'react';
import { motion } from 'motion/react';
import { Calendar, CheckCircle2 } from 'lucide-react';

interface TimelineItem {
  year: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'future';
}

/** Marcos públicos e legislação — sem totais ou projeções que não vêm da base importada. */
const timelineData: TimelineItem[] = [
  {
    year: '2020',
    title: 'Lei Aldir Blanc (Lei nº 14.017/2020)',
    description:
      'Marco legal nacional de emergência cultural. No município de Ilhabela (SP), orientou editais de reconhecimento e mapeamento de agentes, grupos e espaços culturais.',
    status: 'completed',
  },
  {
    year: '2021',
    title: 'Fomento a projetos (Lei Aldir Blanc)',
    description:
      'Chamadas públicas de fomento com recursos da Lei Aldir Blanc — seleção e premiação conforme publicações oficiais do município.',
    status: 'completed',
  },
  {
    year: '2024',
    title: 'PNAB — Política Nacional Aldir Blanc',
    description:
      'Ciclo de editais e acompanhamento no âmbito da PNAB; valores e contemplados exibidos neste site vêm das planilhas importadas no painel administrativo.',
    status: 'completed',
  },
  {
    year: '2025',
    title: 'Transparência e cadastro cultural',
    description:
      'Monitoramento contínuo via cadastro municipal e painéis públicos; indicadores quantitativos refletem apenas os dados carregados na base.',
    status: 'current',
  },
];

export function Timeline() {
  return (
    <div className="py-8">
      <div className="relative border-l-2 border-dashed border-gray-200 ml-4 md:ml-6 pl-8 space-y-12">
        {timelineData.map((item, index) => (
          <motion.div 
            key={item.year}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Dot */}
            <div className={`absolute -left-[41px] w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
              item.status === 'completed' ? 'bg-[#0b57d0]' : 
              item.status === 'current' ? 'bg-[#FFC857] animate-pulse' : 'bg-gray-300'
            }`}>
              {item.status === 'completed' && <CheckCircle2 size={10} className="text-white" />}
            </div>

            <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-6">
              <span className={`text-sm font-black uppercase tracking-widest ${
                item.status === 'completed' ? 'text-[#0b57d0]' : 
                item.status === 'current' ? 'text-[#FFC857]' : 'text-gray-400'
              }`}>
                {item.year}
              </span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[#1b1b1f] mb-1">{item.title}</h3>
                <p className="text-sm text-[#5f5f6a] leading-relaxed max-w-2xl">
                  {item.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
