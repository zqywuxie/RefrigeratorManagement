import React from 'react';
import { Drawer } from '../types';
import { DrawerSlot } from './DrawerSlot';

interface DrawerLayerProps {
  layer: number;
  label: string;
  rows: number;
  cols: number;
  drawers: Drawer[];
  onDrawerClick: (drawerId: string) => void;
}

export function DrawerLayer({ label, rows, cols, drawers, onDrawerClick }: DrawerLayerProps) {
  const grid: (Drawer | undefined)[][] = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = drawers.find((d) => d.row_pos === r && d.col_pos === c);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[16px] font-medium" style={{ color: 'var(--app-text)' }}>
        {label}
      </h3>
      <div
        className="grid gap-2.5"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, auto)`,
        }}
      >
        {grid.flat().map((drawer, i) =>
          drawer ? (
            <DrawerSlot
              key={drawer.id}
              drawer={drawer}
              onClick={() => onDrawerClick(drawer.id)}
            />
          ) : (
            <div key={`empty-${i}`} style={{ aspectRatio: '1/1' }} />
          ),
        )}
      </div>
    </div>
  );
}
