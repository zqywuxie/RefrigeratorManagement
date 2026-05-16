import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbNode {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbNavProps {
  nodes: BreadcrumbNode[];
}

export function BreadcrumbNav({ nodes }: BreadcrumbNavProps) {
  return (
    <nav
      className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-[14px] overflow-x-auto"
      style={{
        background: 'var(--app-card-bg)',
        border: '1px solid var(--app-border)',
        boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
      }}
    >
      <Home size={16} color="var(--app-muted)" className="flex-shrink-0" />
      {nodes.map((node, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={14} color="var(--app-muted)" className="flex-shrink-0" />
          {node.onClick ? (
            <button
              onClick={node.onClick}
              className="hover:underline cursor-pointer truncate max-w-[200px]"
              style={{ color: '#60a5fa' }}
            >
              {node.label}
            </button>
          ) : (
            <span className="truncate max-w-[200px]" style={{ color: 'var(--app-text)' }}>
              {node.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
