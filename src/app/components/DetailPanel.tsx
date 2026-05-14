import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Thermometer,
  Calendar,
  User,
  Tag,
  FlaskConical,
  FileText,
  Droplets,
  Package,
  Pencil,
  Upload,
} from 'lucide-react';
import { Sample, SubSample, STATUS_CONFIG, SampleStatus, formatChineseShortDate } from '../types';

export type DetailItem =
  | { kind: 'sample'; data: Sample }
  | { kind: 'subsample'; data: SubSample; containerId: string };

interface DetailPanelProps {
  item: DetailItem | null;
  onClose: () => void;
  onStatusChange: (id: string, status: SampleStatus, containerId?: string) => void;
  onDelete: (id: string, containerId?: string) => void;
  onEdit: (item: DetailItem) => void;
  currentUser: string;
  isRoot: boolean;
}

export function DetailPanel({
  item,
  onClose,
  onStatusChange,
  onDelete,
  onEdit,
  currentUser,
  isRoot,
}: DetailPanelProps) {
  if (!item) return null;

  const isSub = item.kind === 'subsample';
  const data = item.data;
  const containerId = isSub ? item.containerId : undefined;
  const config = STATUS_CONFIG[data.status];
  const canEdit = isRoot || data.createdBy === currentUser;

  return (
    <AnimatePresence>
      <motion.div
        key={data.id}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 30 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--app-card-bg)',
          border: `1.5px solid ${config.borderColor}40`,
          boxShadow: `0 18px 50px rgba(15,23,42,0.08), 0 0 0 1px ${config.glowColor}`,
          width: '100%',
          maxWidth: '400px',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{
            background: `linear-gradient(135deg, ${config.bgColor}, var(--app-card-bg))`,
            borderBottom: `1px solid ${config.borderColor}30`,
          }}
        >
          <div className="flex items-center gap-2">
            <FlaskConical size={22} color={config.color} />
            <div>
              <div className="text-[20px]" style={{ color: config.color }}>
                {data.id}
              </div>
              <div className="text-[14px]" style={{ color: config.color + 'aa' }}>
                {data.name}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                onClick={() => onEdit(item)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                title="编辑"
              >
                <Pencil size={16} color="#94a3b8" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X size={18} color="var(--app-muted)" />
            </button>
          </div>
        </div>

        {/* Badge row */}
        <div className="px-5 pt-4 pb-1 flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: config.bgColor,
              border: `1px solid ${config.borderColor}`,
              boxShadow: `0 0 4px ${config.glowColor}`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: config.borderColor }}
            />
            <span className="text-[16px]" style={{ color: config.color }}>
              {config.label}
            </span>
          </div>
          <span
            className="text-[14px] px-2.5 py-1 rounded"
            style={{ background: 'var(--app-subtle-bg)', color: 'var(--app-subtle-text)' }}
          >
            {data.type}
          </span>
          {isSub && (
            <span
              className="text-[13px] px-2 py-1 rounded"
              style={{
                background: 'rgba(167,139,250,0.15)',
                color: '#a78bfa',
                border: '1px solid #a78bfa20',
              }}
            >
              副样本
            </span>
          )}
          {!canEdit && (
            <span
              className="text-[13px] px-2 py-1 rounded"
              style={{
                background: 'rgba(148,163,184,0.14)',
                color: 'var(--app-muted)',
                border: '1px solid rgba(148,163,184,0.2)',
              }}
            >
              仅查看 / Read Only
            </span>
          )}
        </div>

        {/* Detail rows */}
        <div className="px-5 py-3 space-y-3">
          <DetailRow
            icon={<Thermometer size={16} color="#60a5fa" />}
            label="存储温度"
            value={`${data.temperature}°C`}
            highlight={data.temperature > -18}
          />
          <DetailRow
            icon={<Calendar size={16} color="#a78bfa" />}
            label="采集日期"
            value={formatChineseShortDate(data.collectedAt)}
          />
          <DetailRow
            icon={<User size={16} color="#34d399" />}
            label="患者编号"
            value={data.patientId}
          />
          <DetailRow
            icon={<Upload size={16} color="#38bdf8" />}
            label="上传者"
            value={data.uploader || '未记录'}
          />
          <DetailRow
            icon={<Droplets size={16} color="#fb923c" />}
            label="样本量"
            value={data.volume || '未记录'}
          />
          {isSub ? (
            <DetailRow
              icon={<Package size={16} color="#a78bfa" />}
              label="所在容器"
              value={containerId!}
            />
          ) : (
            <DetailRow
              icon={<Package size={16} color="#94a3b8" />}
              label="存储位置"
              value={`${data.compartment === 'upper' ? '上层' : '下层'} · 格位 ${(data as Sample).position + 1}`}
            />
          )}
          {!isSub && (
            <DetailRow
              icon={<FlaskConical size={16} color="#60a5fa" />}
              label="副样本数"
              value={`${(data as Sample).subSamples.length}/${(data as Sample).gridRows * (data as Sample).gridCols}`}
            />
          )}
          {data.tags.length > 0 && (
            <div className="flex items-start gap-2">
              <Tag size={16} color="#f472b6" className="mt-0.5 flex-shrink-0" />
              <div className="flex flex-wrap gap-1">
                {data.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[13px] px-2 py-1 rounded"
                    style={{
                      background: 'rgba(244,114,182,0.15)',
                      color: '#f9a8d4',
                      border: '1px solid #f472b620',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.note && (
            <div className="flex items-start gap-2">
              <FileText size={16} color="#94a3b8" className="mt-0.5 flex-shrink-0" />
              <span className="text-[14px]" style={{ color: 'var(--app-muted)' }}>
                {data.note}
              </span>
            </div>
          )}
        </div>

        {/* Status change */}
        {canEdit && (
          <div className="px-5 pt-2 pb-1">
            <div className="text-[13px] mb-2" style={{ color: 'var(--app-subtle-text)' }}>
              更改状态
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(STATUS_CONFIG) as SampleStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(data.id, s, containerId)}
                  className="text-[13px] px-2.5 py-1.5 rounded transition-all duration-150"
                  style={{
                    background:
                      data.status === s
                        ? STATUS_CONFIG[s].bgColor
                        : 'var(--app-subtle-bg)',
                    border: `1px solid ${data.status === s ? STATUS_CONFIG[s].borderColor : 'var(--app-subtle-border)'}`,
                    color: data.status === s ? STATUS_CONFIG[s].color : 'var(--app-muted)',
                    boxShadow:
                      data.status === s
                        ? `0 0 3px ${STATUS_CONFIG[s].glowColor}`
                        : 'none',
                  }}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Delete button */}
        {canEdit && (
          <div className="px-5 py-4">
            <button
              onClick={() => {
                onDelete(data.id, containerId);
                onClose();
              }}
              className="w-full py-2 rounded text-[16px] transition-all duration-150 hover:bg-red-900/40"
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171',
              }}
            >
              {isSub ? '删除副样本' : '删除样本'}
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function DetailRow({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-shrink-0">{icon}</div>
      <span
        className="text-[14px] flex-shrink-0"
        style={{ color: 'var(--app-subtle-text)', minWidth: '70px' }}
      >
        {label}
      </span>
      <span
        className="text-[14px] font-mono"
        style={{ color: highlight ? '#dc2626' : 'var(--app-text)' }}
      >
        {value}
      </span>
    </div>
  );
}
