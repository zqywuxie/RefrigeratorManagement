import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { SubSample } from '../types';
import { SubSampleCard } from './SubSampleCard';

interface SubSampleSlotProps {
  containerId: string;
  position: number;
  subSample?: SubSample;
  isHighlighted: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDrop: (subSampleId: string, containerId: string, toPosition: number) => void;
  onAddClick: (position: number) => void;
}

export function SubSampleSlot({
  containerId,
  position,
  subSample,
  isHighlighted,
  isSelected,
  onSelect,
  onDelete,
  onDrop,
  onAddClick,
}: SubSampleSlotProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'SUBSAMPLE',
    drop: (item: { id: string; containerId: string }) => {
      onDrop(item.id, containerId, position);
    },
    canDrop: (item: { id: string; containerId: string }) => {
      if (!subSample) return true;
      return item.id !== subSample.id;
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
      className="relative flex-shrink-0 w-full"
      style={{
        aspectRatio: '1 / 1.15',
        minHeight: '75px',
        borderRadius: '9px',
        border: isActive
          ? '1.5px dashed #f59e0b'
          : subSample
            ? '1.5px solid transparent'
            : '1.5px dashed rgba(160,140,80,0.25)',
        background: isActive
          ? 'rgba(245,158,11,0.12)'
          : subSample
            ? 'transparent'
            : 'rgba(20,15,5,0.25)',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        boxShadow: isActive
          ? '0 0 14px rgba(245,158,11,0.35), inset 0 0 8px rgba(245,158,11,0.08)'
          : 'none',
      }}
    >
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded pointer-events-none"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ background: 'rgba(245,158,11,0.06)', borderRadius: '7px' }}
        />
      )}

      <AnimatePresence mode="wait">
        {subSample ? (
          <SubSampleCard
            key={subSample.id}
            subSample={subSample}
            containerId={containerId}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ) : (
          <motion.button
            key="empty-sub-slot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex items-center justify-center group/add"
            onClick={() => onAddClick(position)}
            title="点击添加副样本"
          >
            <Plus
              size={18}
              className="opacity-15 group-hover/add:opacity-50 transition-opacity duration-200"
              color="#a78bfa"
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
