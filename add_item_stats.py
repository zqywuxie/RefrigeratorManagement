path = 'E:/Desktop/IndividualProject/RefrigeratorManagement/src/app/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add fridgeItems state after boxViewTubes
content = content.replace(
    'const [boxViewTubes, setBoxViewTubes] = useState<Tube[]>([]);',
    'const [boxViewTubes, setBoxViewTubes] = useState<Tube[]>([]);\n  const [fridgeItems, setFridgeItems] = useState<UpperItem[]>([]);'
)

# 2. Add itemTypeStats after displayedTypeStats
old = '  const displayedTypeStats = typeStats.slice(0, 8);'
new = '''  const displayedTypeStats = typeStats.slice(0, 8);

  const itemTypeStats = React.useMemo(() => {
    const counts = new Map<string, number>();
    fridgeItems.forEach((item) => {
      const t = item.item_type?.trim();
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    });
    return Array.from(counts, ([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }, [fridgeItems]);'''
content = content.replace(old, new)

# 3. Add onFridgeDataChange to DrawerFridgeView
content = content.replace(
    'onBoxViewChange={setBoxViewTubes}',
    'onBoxViewChange={setBoxViewTubes}\n                    onFridgeDataChange={setFridgeItems}'
)

# 4. Add UpperItem import
content = content.replace(
    'SampleRecord,\n  PendingImportSample,',
    'SampleRecord,\n  UpperItem,\n  PendingImportSample,'
)

# 5. Add item type section before sample type stats
marker = '{/* Sample type stats'
item_section = '''{/* Item type distribution - only when not in box view */}
            {boxViewTubes.length === 0 && (
              <div
                className="rounded-xl p-4"
                style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)", boxShadow: "0 14px 40px rgba(15,23,42,0.06)" }}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-[14px]" style={{ color: "var(--app-text)" }}>物品类型</span>
                  <span className="text-[12px] font-mono" style={{ color: "var(--app-muted)" }}>{itemTypeStats.length} 类</span>
                </div>
                {itemTypeStats.length > 0 ? (
                  <div className="space-y-2">
                    {itemTypeStats.slice(0, 6).map(({ type, count }) => {
                      const cfg = getItemTypeConfig(type);
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                          <span className="min-w-0 flex-1 truncate rounded-md px-2 py-1 text-[13px]" title={type} style={{ background: cfg.bgColor, border: '1px solid ' + cfg.color + '30', color: cfg.color }}>{cfg.label}</span>
                          <span className="min-w-8 text-right text-[14px] font-mono" style={{ color: "#2563eb" }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg px-3 py-4 text-center text-[13px]" style={{ background: "var(--app-subtle-bg)", border: "1px dashed var(--app-subtle-border)", color: "var(--app-muted)" }}>暂无物品</div>
                )}
              </div>
            )}

            '''
content = content.replace(marker, item_section + marker)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK')
