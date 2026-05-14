import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Trash2, Box, Pencil } from 'lucide-react';
import { Refrigerator } from '../types';

interface FridgeSelectorProps {
  refrigerators: Refrigerator[];
  selectedId: string | null;
  canManage: boolean;
  onSelect: (id: string) => void;
  onAdd: (
    name: string,
    description?: string,
    upperTemperature?: number,
    lowerTemperature?: number,
  ) => void;
  onDelete: (id: string) => void;
  onEdit: (
    id: string,
    name: string,
    description?: string,
    upperTemperature?: number,
    lowerTemperature?: number,
  ) => void;
}

export function FridgeSelector({
  refrigerators,
  selectedId,
  canManage,
  onSelect,
  onAdd,
  onDelete,
  onEdit,
}: FridgeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [addUpperTemp, setAddUpperTemp] = useState('-20');
  const [addLowerTemp, setAddLowerTemp] = useState('4');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editUpperTemp, setEditUpperTemp] = useState('-20');
  const [editLowerTemp, setEditLowerTemp] = useState('4');
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
  const parseTemperature = (value: string, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const fieldStyle: React.CSSProperties = {
    background: 'var(--app-card-bg)',
    border: '1px solid var(--app-border)',
    color: 'var(--app-text)',
  };
  const secondaryButtonStyle: React.CSSProperties = {
    background: 'var(--app-panel-bg)',
    border: '1px solid var(--app-border)',
    color: 'var(--app-muted)',
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) return;
    onAdd(
      addName.trim(),
      addDesc.trim() || undefined,
      parseTemperature(addUpperTemp, -20),
      parseTemperature(addLowerTemp, 4),
    );
    setAddName('');
    setAddDesc('');
    setAddUpperTemp('-20');
    setAddLowerTemp('4');
    setAdding(false);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editingId) return;
    onEdit(
      editingId,
      editName.trim(),
      editDesc.trim() || undefined,
      parseTemperature(editUpperTemp, -20),
      parseTemperature(editLowerTemp, 4),
    );
    setEditingId(null);
    setEditName('');
    setEditDesc('');
  };

  const startEditing = (r: Refrigerator, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(r.id);
    setEditName(r.name);
    setEditDesc(r.description || '');
    setEditUpperTemp(String(r.upperTemperature));
    setEditLowerTemp(String(r.lowerTemperature));
    setAdding(false);
  };

  return (
    <div className={`relative ${open ? 'z-50' : 'z-10'}`} ref={menuRef}>
      <button
        onClick={() => { setOpen(!open); setAdding(false); setEditingId(null); }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] transition-all"
        style={{
          background: 'var(--app-logo-bg)',
          border: '1px solid var(--app-logo-border)',
          color: 'var(--app-logo-icon)',
          boxShadow: '0 8px 18px rgba(37,99,235,0.1)',
        }}
      >
        <Box size={16} />
        {selectedName}
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 z-50 mt-1 w-72 overflow-hidden rounded-xl"
          style={{
            background: 'var(--app-header-bg)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 18px 52px rgba(15,23,42,0.18)',
            backdropFilter: 'blur(12px)',
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
                    style={fieldStyle}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="上层 °C"
                      value={editUpperTemp}
                      onChange={(e) => setEditUpperTemp(e.target.value)}
                      className="w-full px-2 py-1.5 rounded text-[14px] outline-none"
                      style={fieldStyle}
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="下层 °C"
                      value={editLowerTemp}
                      onChange={(e) => setEditLowerTemp(e.target.value)}
                      className="w-full px-2 py-1.5 rounded text-[14px] outline-none"
                      style={fieldStyle}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="描述（选填）"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-[14px] outline-none"
                    style={fieldStyle}
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="flex-1 py-1.5 rounded text-[13px]"
                      style={secondaryButtonStyle}
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-1.5 rounded text-[13px]"
                      style={{
                        background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                        color: '#ffffff',
                      }}
                    >
                      保存
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  onClick={() => { onSelect(r.id); setOpen(false); }}
                  className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  style={{
                    background: r.id === selectedId ? 'rgba(37,99,235,0.12)' : undefined,
                    color: r.id === selectedId ? '#1d4ed8' : 'var(--app-text)',
                  }}
                >
                  <span className="text-[14px] truncate flex-1">{r.name}</span>
                  <span className="text-[11px] font-mono mr-1" style={{ color: 'var(--app-muted)' }}>
                    {r.upperTemperature}°/{r.lowerTemperature}°
                  </span>
                  {canManage && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={(e) => startEditing(r, e)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                        title="编辑冰箱"
                      >
                        <Pencil size={13} color="var(--app-muted)" />
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
                  )}
                </div>
              )}
            </div>
          ))}

          {canManage && (
          <div style={{ borderTop: '1px solid var(--app-border)' }}>
            {adding ? (
              <form onSubmit={handleAdd} className="p-3 space-y-2">
                <input
                  type="text"
                  placeholder="冰箱名称"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  autoFocus
                  className="w-full px-2 py-1.5 rounded text-[14px] outline-none"
                  style={fieldStyle}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="上层 °C"
                    value={addUpperTemp}
                    onChange={(e) => setAddUpperTemp(e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-[14px] outline-none"
                    style={fieldStyle}
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="下层 °C"
                    value={addLowerTemp}
                    onChange={(e) => setAddLowerTemp(e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-[14px] outline-none"
                    style={fieldStyle}
                  />
                </div>
                <input
                  type="text"
                  placeholder="描述（选填）"
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  className="w-full px-2 py-1.5 rounded text-[14px] outline-none"
                  style={fieldStyle}
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAdding(false)}
                    className="flex-1 py-1.5 rounded text-[13px]"
                    style={secondaryButtonStyle}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 rounded text-[13px]"
                    style={{
                      background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                      color: '#ffffff',
                    }}
                  >
                    确认
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[14px] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                style={{ color: '#2563eb' }}
              >
                <Plus size={16} />
                添加新冰箱
              </button>
            )}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
