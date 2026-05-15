import React from 'react';
import { motion } from 'motion/react';
import { Plus, ArrowLeft, MapPinned } from 'lucide-react';
import { useDrop } from 'react-dnd';
import { Box, Drawer, boxPositionToLabel } from '../types';
import { BoxCard } from './BoxCard';

interface BoxPositionSlotProps {
  position: number;
  box?: Box;
  onAddBox: (position: number) => void;
  onBoxClick: (boxId: string) => void;
  onDeleteBox: (boxId: string) => void;
  onDropBox: (boxId: string, targetPosition: number) => void;
  canDelete?: boolean;
}

function BoxPositionSlot({
  position,
  box,
  onAddBox,
  onBoxClick,
  onDeleteBox,
  onDropBox,
  canDelete = true,
}: BoxPositionSlotProps) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'BOX',
    drop: (item: { id: string }) => {
      onDropBox(item.id, position);
    },
    canDrop: (item: { id: string }) => item.id !== box?.id,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const isActive = isOver && canDrop;

  return (
    <div
      ref={drop}
      className="rounded-xl"
      style={{
        outline: isActive ? '2px dashed #22d3ee' : 'none',
        outlineOffset: 3,
        background: isActive ? 'rgba(34,211,238,0.08)' : 'transparent',
      }}
    >
      {box ? (
        <BoxCard
          box={box}
          onClick={() => onBoxClick(box.id)}
          onDelete={onDeleteBox}
          canDelete={canDelete}
        />
      ) : (
        <motion.button
          key={`empty-${position}`}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onAddBox(position)}
          className="w-full rounded-xl px-4 py-4 text-left flex items-center justify-between"
          style={{
            background: isActive ? 'rgba(34,211,238,0.12)' : 'var(--slot-empty-bg)',
            border: `1.5px dashed ${isActive ? '#22d3ee' : 'var(--slot-empty-border)'}`,
            color: 'var(--app-muted)',
          }}
        >
          <span className="text-[14px]">{boxPositionToLabel(position)}</span>
          <span className="flex items-center gap-1 text-[13px]" style={{ color: '#2563eb' }}>
            <Plus size={15} />添加盒子
          </span>
        </motion.button>
      )}
    </div>
  );
}

interface BoxViewProps {
  drawer: Drawer;
  drawerZoneLabel: string;
  boxes: Box[];
  currentUser: string;
  onBack: () => void;
  onBoxClick: (boxId: string) => void;
  onAddBox: (position: number) => void;
  onAddPosition: (insertAt: number) => void;
  onMoveBox: (boxId: string, targetPosition: number) => void;
  onDeleteBox: (boxId: string) => void;
}

export function BoxView({
  drawer,
  drawerZoneLabel,
  boxes,
  currentUser,
  onBack,
  onBoxClick,
  onAddBox,
  onAddPosition,
  onMoveBox,
  onDeleteBox,
}: BoxViewProps) {
  const capacity = Math.max(5, drawer.max_boxes || 5);
  const getBoxAt = (position: number) => boxes.find((box) => box.position === position);
  const [showInsertMenu, setShowInsertMenu] = React.useState(false);

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
          抽屉 {drawer.label} · {boxes.length}/{capacity} 盒位
        </span>
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowInsertMenu((value) => !value)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[14px]"
            style={{
              background: 'var(--app-panel-bg)',
              border: '1px solid var(--app-border)',
              color: '#2563eb',
            }}
          >
            <Plus size={18} />
            新增内部位置
          </motion.button>
          {showInsertMenu && (
            <div
              className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl p-2"
              style={{
                background: 'var(--app-header-bg)',
                border: '1px solid var(--app-border)',
                boxShadow: '0 18px 52px rgba(15,23,42,0.18)',
              }}
            >
              {Array.from({ length: capacity + 1 }, (_, position) => (
                <button
                  key={position}
                  type="button"
                  onClick={() => {
                    onAddPosition(position);
                    setShowInsertMenu(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-slate-100"
                  style={{ color: 'var(--app-text)' }}
                >
                  插入到第 {position + 1} 位
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <section
        className="rounded-xl p-4 space-y-3"
        style={{
          background: 'var(--app-card-bg)',
          border: '1px solid var(--app-border)',
          boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-medium" style={{ color: 'var(--app-text)' }}>
              抽屉内部
            </h3>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--app-muted)' }}>
              一列盒位，点击空位添加盒子
            </p>
          </div>
          <span className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
            {boxes.length}/{capacity}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {Array.from({ length: capacity }, (_, position) => {
            const box = getBoxAt(position);
            return (
              <BoxPositionSlot
                key={box?.id || `empty-${position}`}
                position={position}
                box={box}
                onAddBox={onAddBox}
                onBoxClick={onBoxClick}
                onDeleteBox={onDeleteBox}
                onDropBox={onMoveBox}
                canDelete={!box || !box.owner || box.owner === currentUser}
              />
            );
          })}
        </div>
      </section>

      <section
        className="rounded-xl px-4 py-3 flex items-center justify-between"
        style={{
          background: 'var(--app-input-bg)',
          border: '1px solid var(--app-input-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <MapPinned size={18} color="#2563eb" />
          <div>
            <div className="text-[13px]" style={{ color: 'var(--app-muted)' }}>
              抽屉外部位置
            </div>
            <div className="text-[16px] font-medium" style={{ color: 'var(--app-text)' }}>
              {drawerZoneLabel} · {drawer.label}
            </div>
          </div>
        </div>
        <span className="text-[12px]" style={{ color: 'var(--app-muted)' }}>
          固定位置
        </span>
      </section>
    </div>
  );
}
