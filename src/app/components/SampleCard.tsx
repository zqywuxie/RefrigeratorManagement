import React, { useRef } from 'react';
import { useDrag } from 'react-dnd';
import { motion } from 'motion/react';
import { X, AlertTriangle, Info } from 'lucide-react';
import { Sample, STATUS_CONFIG } from '../types';

interface SampleCardProps {
  sample: Sample;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onEnter: (id: string) => void;
}

export function SampleCard({
  sample,
  isSelected,
  isHighlighted,
  onSelect,
  onDelete,
  onEnter,
}: SampleCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const config = STATUS_CONFIG[sample.status];
  const isCritical = sample.status === 'critical';
  const isWarning = sample.status === 'warning';
  const subCapacity = sample.gridRows * sample.gridCols;
  const subCount = sample.subSamples.length;

  const [{ isDragging }, drag] = useDrag({
    type: 'SAMPLE',
    item: {
      id: sample.id,
      fromCompartment: sample.compartment,
      fromPosition: sample.position,
    },
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
      onClick={() => onEnter(sample.id)}
      className="relative cursor-pointer group w-full h-full select-none"
      style={{
        borderRadius: '10px',
        background: config.bgColor,
        border: `2px solid ${
          isSelected ? '#fff' : isHighlighted ? '#22d3ee' : config.borderColor
        }`,
        boxShadow: isSelected
          ? `0 0 0 2px rgba(255,255,255,0.2), 0 0 6px ${config.glowColor}40`
          : isHighlighted
            ? '0 0 0 2px #22d3ee, 0 0 6px rgba(34,211,238,0.3)'
            : `0 0 3px ${config.glowColor}30`,
      }}
    >
      {/* Info icon — opens detail panel */}
      <button
        className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(sample.id);
        }}
        title="查看详情"
      >
        <Info size={14} color={config.color} />
      </button>

      {/* Delete button */}
      <button
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all duration-150 z-20 flex items-center justify-center shadow-lg"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(sample.id);
        }}
      >
        <X size={12} />
      </button>

      {/* Warning icon */}
      {(isCritical || isWarning) && (
        <div className="absolute top-1 right-1 z-10">
          <AlertTriangle size={12} color={isCritical ? '#f87171' : '#fbbf24'} />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col items-center justify-center h-full px-1 py-2 gap-1">
        <span
          className="text-[13px] font-mono tracking-tight leading-none"
          style={{ color: config.color }}
        >
          {sample.id}
        </span>
        <span className="text-[12px] leading-none opacity-75" style={{ color: config.color }}>
          {sample.type}
        </span>
        <div
          className="mt-0.5 w-2 h-2 rounded-full"
          style={{
            background: config.borderColor,
            boxShadow: `0 0 1px ${config.borderColor}`,
          }}
        />

        {/* Sub-sample capacity indicator */}
        <div className="mt-0.5 text-[10px] font-mono" style={{ color: config.color + 'aa' }}>
          {subCount}/{subCapacity}
        </div>

        {/* Mini-fridge handle */}
        <div
          className="mt-0.5"
          style={{
            width: '24px',
            height: '4px',
            background: 'linear-gradient(90deg, #7a8c9a, #b8c8d4, #7a8c9a)',
            borderRadius: '2px',
          }}
        />

        {/* Open hint on hover */}
        <span
          className="text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"
          style={{ color: config.color }}
        >
          打开
        </span>
      </div>
    </motion.div>
  );
}
