import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Trash2, Box, Pencil } from 'lucide-react';
import { Refrigerator } from '../types';

interface FridgeSelectorProps {
  refrigerators: Refrigerator[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (name: string, description?: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, name: string, description?: string) => void;
}

export function FridgeSelector({
  refrigerators,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onEdit,
}: FridgeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
        setEditingId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedName =
    refrigerators.find((r) => r.id === selectedId)?.name ?? '选择冰箱';

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) return;
    onAdd(addName.trim(), addDesc.trim() || undefined);
    setAddName('');
    setAddDesc('');
    setAdding(false);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editingId) return;
    onEdit(editingId, editName.trim(), editDesc.trim() || undefined);
    setEditingId(null);
    setEditName('');
    setEditDesc('');
  };

  const startEditing = (r: Refrigerator, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(r.id);
    setEditName(r.name);
    setEditDesc(r.description || '');
    setAdding(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => { setOpen(!open); setAdding(false); setEditingId(null); }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] transition-all"
        style={{
          background: 'rgba(29,78,216,0.2)',
          border: '1px solid rgba(59,130,246,0.3)',
          color: '#93c5fd',
        }}
      >
        <Box size={16} />
        {selectedName}
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 left-0 w-56 rounded-xl overflow-hidden z-30"
          style={{
            background: 'rgba(10,20,40,0.98)',
            border: '1px solid rgba(59,130,246,0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {refrigerators.map((r) => (
            <div key={r.id}>
              {editingId === r.id ? (
                <form onSubmit={handleEdit} className="p-3 space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    className="w-full px-2 py-1.5 rounded text-[14px] outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94a3b8',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="描述（选填）"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-[14px] outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94a3b8',
                    }}
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="flex-1 py-1.5 rounded text-[13px]"
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-1.5 rounded text-[13px]"
                      style={{
                        background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                        color: '#bfdbfe',
                      }}
                    >
                      保存
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  onClick={() => { onSelect(r.id); setOpen(false); }}
                  className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                  style={{
                    background: r.id === selectedId ? 'rgba(29,78,216,0.15)' : undefined,
                    color: r.id === selectedId ? '#60a5fa' : '#94a3b8',
                  }}
                >
                  <span className="text-[14px] truncate flex-1">{r.name}</span>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={(e) => startEditing(r, e)}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      title="编辑冰箱"
                    >
                      <Pencil size={13} color="#64748b" />
                    </button>
                    {refrigerators.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(r.id);
                        }}
                        className="p-1 rounded hover:bg-red-500/20 transition-colors"
                        title="删除冰箱"
                      >
                        <Trash2 size={13} color="#f87171" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div style={{ borderTop: '1px solid rgba(30,58,100,0.3)' }}>
            {adding ? (
              <form onSubmit={handleAdd} className="p-3 space-y-2">
                <input
                  type="text"
                  placeholder="冰箱名称"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  autoFocus
                  className="w-full px-2 py-1.5 rounded text-[14px] outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  placeholder="描述（选填）"
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  className="w-full px-2 py-1.5 rounded text-[14px] outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8',
                  }}
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAdding(false)}
                    className="flex-1 py-1.5 rounded text-[13px]"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: '#64748b',
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 rounded text-[13px]"
                    style={{
                      background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                      color: '#bfdbfe',
                    }}
                  >
                    确认
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[14px] hover:bg-white/5 transition-colors"
                style={{ color: '#60a5fa' }}
              >
                <Plus size={16} />
                添加新冰箱
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
