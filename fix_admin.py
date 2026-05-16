import re

path = 'E:/Desktop/IndividualProject/RefrigeratorManagement/src/app/components/RootAdminPanel.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state
content = content.replace(
    'const [busySRId, setBusySRId] = useState<string | null>(null);\n  const [loading, setLoading] = useState(true);',
    'const [busySRId, setBusySRId] = useState<string | null>(null);\n  const [srSearchQuery, setSrSearchQuery] = useState(\'\');\n  const [selectedSRIde, setSelectedSRIde] = useState<Set<string>>(new Set());\n  const [loading, setLoading] = useState(true);'
)

# 2. Add filteredAdminSR and batch delete handler
old_total = '  const totalSamplesText = summary'
new_block = '''  const filteredAdminSR = React.useMemo(() => {
    if (!srSearchQuery.trim()) return adminSampleRecords;
    const q = srSearchQuery.toLowerCase();
    return adminSampleRecords.filter((sr) =>
      sr.patient_name.toLowerCase().includes(q) ||
      sr.sample_code.toLowerCase().includes(q) ||
      (sr.sample_type || '').toLowerCase().includes(q) ||
      (sr.uploader || '').toLowerCase().includes(q)
    );
  }, [adminSampleRecords, srSearchQuery]);

  const handleBatchDeleteSR = useCallback(async () => {
    if (selectedSRIde.size === 0) return;
    if (!window.confirm(\'delete \' + selectedSRIde.size + \' records?\')) return;
    let deleted = 0;
    for (const id of selectedSRIde) {
      try { await deleteSampleRecord(id); deleted += 1; } catch { pass }
    }
    setAdminSampleRecords((prev) => prev.filter((r) => !selectedSRIde.has(r.id)));
    setSelectedSRIde(new Set());
    setSelectedAdminSR(None);
    onNotify('deleted ' + deleted, 'warn');
  }, [selectedSRIde, onNotify]);

  const totalSamplesText = summary'''
content = content.replace(old_total, new_block)

# 3. Update header with search
old_header = '{adminSampleRecords.length} 条'
new_header = '{filteredAdminSR.length}/{adminSampleRecords.length} 条'
content = content.replace(old_header, new_header)

# Just add the search input to the header div
old_hdr_div = '<div className="mb-4"><h3'
new_hdr_div = '<div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3'
content = content.replace(old_hdr_div, new_hdr_div)

old_hdr_close = '条</div></div>'
new_hdr_close = '条</div></div><div className="flex items-center gap-2"><input value={srSearchQuery} onChange={e => setSrSearchQuery(e.target.value)} placeholder="search" className="rounded-lg px-3 py-1.5 text-[12px] outline-none w-48" style={inputStyle} />{selectedSRIde.size > 0 && <button onClick={handleBatchDeleteSR} className="rounded-lg px-3 py-1.5 text-[12px]" style={{ background: "#ef4444", color: "#fff" }}>del({selectedSRIde.size})</button>}</div></div>'
content = content.replace(old_hdr_close, new_hdr_close)

# 4. Add checkbox column header
content = content.replace(
    '<th className="px-2 py-1">姓名</th>',
    '<th className="px-1 py-1 w-8"></th><th className="px-2 py-1">姓名</th>'
)

# 5. Change to filteredAdminSR
content = content.replace('{adminSampleRecords.length === 0', '{filteredAdminSR.length === 0')
content = content.replace('{adminSampleRecords.map', '{filteredAdminSR.map')

# 6. Add checkbox to each row
old_cell = '<td className="rounded-l-lg px-2 py-2 text-[13px] font-medium" style={{ color: "var(--app-text)" }}>'
new_cell = '<td className="rounded-l-lg px-1 py-2" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedSRIde.has(sr.id)} onChange={() => { const n = new Set(selectedSRIde); if (n.has(sr.id)) n.delete(sr.id); else n.add(sr.id); setSelectedSRIde(n) }} /></td><td className="px-2 py-2 text-[13px] font-medium" style={{ color: "var(--app-text)" }}>'
content = content.replace(old_cell, new_cell)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK')
