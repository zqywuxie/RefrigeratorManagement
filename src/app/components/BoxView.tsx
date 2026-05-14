import React from 'react';
import { motion } from 'motion/react';
import { Plus, ArrowLeft } from 'lucide-react';
import { Box } from '../types';
import { BoxCard } from './BoxCard';

interface BoxViewProps {
  drawerLabel: string;
  boxes: Box[];
  onBack: () => void;
  onBoxClick: (boxId: string) => void;
  onAddBox: () => void;
  onDeleteBox: (boxId: string) => void;
}

export function BoxView({ drawerLabel, boxes, onBack, onBoxClick, onAddBox, onDeleteBox }: BoxViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[14px] hover:opacity-80"
          style={{ color: '#60a5fa' }}
        >
          <ArrowLeft size={18} />
          返回抽屉列表
        </button>
        <span className="text-[16px] font-medium" style={{ color: 'var(--app-text)' }}>
          抽屉 {drawerLabel} · {boxes.length} 盒
        </span>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddBox}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[14px]"
          style={{
            background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            border: '1px solid #3b82f6',
            color: '#fff',
            boxShadow: '0 14px 32px rgba(37,99,235,0.2)',
          }}
        >
          <Plus size={18} />
          添加盒子
        </motion.button>
      </div>

      {boxes.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl py-16"
          style={{
            background: 'var(--app-card-bg)',
            border: '2px dashed var(--slot-empty-border)',
          }}
        >
          <span style={{ color: 'var(--app-muted)' }}>此抽屉为空</span>
          <button
            onClick={onAddBox}
            className="text-[14px] px-4 py-2 rounded-lg"
            style={{ color: '#2563eb' }}
          >
            + 添加第一个盒子
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {boxes.map((box) => (
            <BoxCard
              key={box.id}
              box={box}
              onClick={() => onBoxClick(box.id)}
              onDelete={onDeleteBox}
            />
          ))}
        </div>
      )}
    </div>
  );
}
