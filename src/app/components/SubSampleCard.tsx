import React, { useRef } from 'react';
import { useDrag } from 'react-dnd';
import { motion } from 'motion/react';
import { X, AlertTriangle } from 'lucide-react';
import { SubSample, STATUS_CONFIG } from '../types';

interface SubSampleCardProps {
  subSample: SubSample;
  containerId: string;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SubSampleCard({
  subSample,
  containerId,
  isSelected,
  isHighlighted,
  onSelect,
  onDelete,
}: SubSampleCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const config = STATUS_CONFIG[subSample.status];
  const isCritical = subSample.status === 'critical';
  const isWarning = subSample.status === 'warning';

  const [{ isDragging }, drag] = useDrag({
    type: 'SUBSAMPLE',
    item: { id: subSample.id, containerId, fromPosition: subSample.position },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(ref);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ scale: 0, opacity: 0, y: -10 }}
      animate={{ scale: 1, opacity: isDragging ? 0.35 : 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: 10 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={() => onSelect(subSample.id)}
      className="relative cursor-grab active:cursor-grabbing group w-full h-full select-none"
      style={{
        borderRadius: '8px',
        background: config.bgColor,
        border: `1.5px solid ${
          isSelected ? '#fff' : isHighlighted ? '#22d3ee' : config.borderColor
        }`,
        boxShadow: isSelected
          ? `0 0 0 2px rgba(255,255,255,0.2), 0 0 4px ${config.glowColor}30`
          : isHighlighted
            ? '0 0 0 1.5px #22d3ee, 0 0 4px rgba(34,211,238,0.3)'
            : `0 0 2px ${config.glowColor}20`,
      }}
    >
      {/* Delete button */}
      <button
        className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-red-600 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all duration-150 z-20 flex items-center justify-center shadow-lg"
        style={{ width: '18px', height: '18px' }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(subSample.id);
        }}
      >
        <X size={11} />
      </button>

      {(isCritical || isWarning) && (
        <div className="absolute top-1 left-1 z-10">
          <AlertTriangle size={10} color={isCritical ? '#f87171' : '#fbbf24'} />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col items-center justify-center h-full px-1 py-1 gap-0.5">
        <span
          className="text-[12px] font-mono tracking-tight leading-none"
          style={{ color: config.color }}
        >
          {subSample.id}
        </span>
        <span className="text-[10px] leading-none opacity-75" style={{ color: config.color }}>
          {subSample.type}
        </span>
        <div
          className="mt-0.5 w-1.5 h-1.5 rounded-full"
          style={{
            background: config.borderColor,
            boxShadow: `0 0 4px ${config.borderColor}`,
          }}
        />
      </div>
    </motion.div>
  );
}
