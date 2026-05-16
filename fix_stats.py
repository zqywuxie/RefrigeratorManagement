path = 'E:/Desktop/IndividualProject/RefrigeratorManagement/src/app/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the type stats section
marker = '{/* Sample type stats */}'
start = content.find(marker)
# Find end: look for the closing </div> that follows after "暂无样本类型" or similar
end_marker = '暂无样本类型'
end = content.find(end_marker, start)
end = content.find('</div>', end) + 6

old_section = content[start:end]

new_section = '''{/* Sample type stats - box-specific or global */}
            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--app-card-bg)',
                border: boxViewTubes.length > 0 ? '1px solid #22d3ee40' : '1px solid var(--app-border)',
                boxShadow: '0 14px 40px rgba(15,23,42,0.06)',
              }}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Tags size={15} color={boxViewTubes.length > 0 ? '#06b6d4' : '#38bdf8'} />
                  <span className="text-[14px]" style={{ color: 'var(--app-text)' }}>
                    {boxViewTubes.length > 0 ? '当前盒子样本类型' : '样本类型'}
                  </span>
                </div>
                <span className="text-[12px] font-mono" style={{ color: 'var(--app-muted)' }}>
                  {boxViewTubes.length > 0 ? boxTypeStats.length : typeStats.length} 类
                </span>
              </div>
              {(() => {
                const stats = boxViewTubes.length > 0 ? boxTypeStats : displayedTypeStats;
                const remaining = boxViewTubes.length > 0 ? 0 : remainingTypeCount;
                if (stats.length > 0) {
                  return (
                    <div className="space-y-2">
                      {stats.map(({ type, count }) => {
                        const typeColor = getSampleTypeColor(type);
                        return (
                        <div key={type} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: typeColor }} />
                          <span className="min-w-0 flex-1 truncate rounded-md px-2 py-1 text-[13px]"
                            title={type}
                            style={{ background: typeColor + '18', border: `1px solid ${typeColor}30`, color: 'var(--app-text)' }}>
                            {type}
                          </span>
                          <span className="min-w-8 text-right text-[14px] font-mono" style={{ color: '#2563eb' }}>{count}</span>
                        </div>
                      )})}
                      {remaining > 0 && <div className="pt-1 text-right text-[12px]" style={{ color: 'var(--app-muted)' }}>另有 {remaining} 类</div>}
                    </div>
                  );
                }
                return <div className="rounded-lg px-3 py-4 text-center text-[13px]" style={{ background: 'var(--app-subtle-bg)', border: '1px dashed var(--app-subtle-border)', color: 'var(--app-muted)' }}>暂无样本类型</div>;
              })()}
            </div>'''

content = content.replace(old_section, new_section)

# Add boxTypeStats useMemo
box_stats = '''  const boxTypeStats = React.useMemo(() => {
    const counts = new Map<string, number>();
    boxViewTubes.forEach((t) => {
      const st = t.sample_type?.trim();
      if (st) counts.set(st, (counts.get(st) ?? 0) + 1);
    });
    return Array.from(counts, ([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }, [boxViewTubes]);'''
content = content.replace('  const displayedTypeStats', box_stats + '\n\n  const displayedTypeStats')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK')
