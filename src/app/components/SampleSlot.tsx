import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { Sample, Compartment } from '../types';
import { SampleCard } from './SampleCard';

interface SampleSlotProps {
  compartment: Compartment;
  position: number;
  sample?: Sample;
  isHighlighted: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDrop: (sampleId: string, toCompartment: Compartment, toPosition: number) => void;
  onAddClick: (compartment: Compartment, position: number, containerId?: string) => void;
  onEnterContainer: (id: string) => void;
}

export function SampleSlot({
  compartment,
  position,
  sample,
  isHighlighted,
  isSelected,
  onSelect,
  onDelete,
  onDrop,
  onAddClick,
  onEnterContainer,
}: SampleSlotProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'SAMPLE',
    drop: (item: { id: string }) => {
      onDrop(item.id, compartment, position);
    },
    canDrop: (item: { id: string }) => {
      if (!sample) return true;
      return item.id !== sample.id;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  drop(ref);

  const isActive = isOver && canDrop;

  return (
    <div
      ref={ref}
      className="relative w-full"
      style={{
        aspectRatio: '1 / 1.15',
        minHeight: '80px',
        borderRadius: '11px',
        border: isActive
          ? '2px dashed #22d3ee'
          : sample
            ? '2px solid transparent'
            : '2px dashed rgba(100,160,200,0.25)',
        background: isActive
          ? 'rgba(34,211,238,0.12)'
          : sample
            ? 'transparent'
            : 'rgba(10,30,60,0.25)',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        boxShadow: isActive
          ? '0 0 16px rgba(34,211,238,0.35), inset 0 0 10px rgba(34,211,238,0.08)'
          : 'none',
      }}
    >
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded pointer-events-none"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ background: 'rgba(34,211,238,0.06)', borderRadius: '9px' }}
        />
      )}

      <AnimatePresence mode="wait">
        {sample ? (
          <SampleCard
            key={sample.id}
            sample={sample}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            onSelect={onSelect}
            onDelete={onDelete}
            onEnter={onEnterContainer}
          />
        ) : (
          <motion.button
            key="empty-slot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex items-center justify-center group/add"
            onClick={() => onAddClick(compartment, position)}
            title="点击添加样本"
          >
            <Plus
              size={20}
              className="opacity-15 group-hover/add:opacity-50 transition-opacity duration-200"
              color="#94a3b8"
            />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="absolute bottom-1 right-1.5 text-[10px] text-slate-600 pointer-events-none select-none">
        {position + 1}
      </div>
    </div>
  );
}
