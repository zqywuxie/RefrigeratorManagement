# Plan A 测试发现 — 问题报告

> 测试日期: 2026-05-17  
> 测试结果: **65 个测试全部失败** — 根因是 App.tsx 存在阻断性 bug

---

## 阻断性问题 (Critical)

### BUG-001: `ReferenceError: samples is not defined` — App.tsx 重构不完整

**严重级别**: 🔴 Critical (阻断所有功能)

**现象**: 
- 登录后页面崩溃，React 报错 `ReferenceError: samples is not defined at AppContent (App.tsx:430:24)`
- 页面快照停留在 "正在恢复登录状态..."
- 控制台输出 5 个相同错误

**根因**:
项目从旧的 Sample/SubSample 架构迁移到 SampleRecord/Tube 架构时，`App.tsx` 中的重构不完整：

1. **`samples` 状态声明缺失** (`src/app/App.tsx`):
   - `const [samples, setSamples] = useState<Sample[]>([])` 被删除
   - 但 40+ 处引用未清理

2. **API 导入缺失** (`src/app/App.tsx:44-54`):
   - `fetchSamples` 未从 `./api` 导入（第 243 行调用）
   - `createSample` 未从 `./api` 导入（第 518 行调用）
   - 其他旧 API 函数也未导入

3. **后端路由已删除** (`server/routes/samples.js`):
   - 文件已被删除（git status 显示 `D server/routes/samples.js`）
   - 即使前端代码被修复，API 调用 `/api/samples` 也会返回 404

**影响范围**:
| 行号范围 | 受影响代码 | 
|----------|-----------|
| 238-249 | `fetchSamples` + `setSamples` 调用 |
| 458-511 | 旧样本更新/删除逻辑 (handleUpdateSample, handleDeleteSample) |
| 518-539 | 旧样本创建逻辑 (handleCreateSample) |
| 559-570 | viewingContainer 搜索 |
| 577-620 | SubSample 溢出检查 |
| 663-686 | SubSample 创建 |
| 705-763 | SubSample 移动和删除 |
| 857-866 | criticalCount, warningCount, totalSubSamples 计算 |
| 1358 | `<DrawerFridgeView samples={samples}>` prop |
| 1849 | `<PendingSamplesPanel samples={samples}>` prop |

**建议修复方向**:
- 删除所有旧的 `samples`/`subSamples` 引用代码块（约 300+ 行）
- 或：恢复 `const [samples, setSamples]` 状态并保留兼容
- 推荐：彻底清理旧代码，因为后端路由也已删除

**关联现有测试影响**:
- TC-LOGIN-01 (root 登录) → 失败
- TC-LOGIN-05 (注销) → 超时
- TC-LOGIN-06 (注销后刷新) → 超时
- 所有依赖登录后页面的测试均失败

---

## 测试文件自身问题 (Non-blocking)

### TEST-ISSUE-001: 测试定位器过于依赖文本匹配

**严重级别**: 🟡 Medium

**描述**: 
新测试使用中文文本定位器（如 `button:has-text("下层第一层")`、`button:has-text("添加盒子")`），依赖组件内部具体文案。文案变更会导致测试失败。

**建议**: 后续可考虑添加 `data-testid` 属性到关键元素，提高测试稳定性。

### TEST-ISSUE-002: 测试过于依赖导航链

**严重级别**: 🟡 Medium

**描述**: 
测试用例依赖 3 级导航链（fridge → drawer layer → drawer slot → BoxView → BoxCard → BoxGrid），中间任何一步失败都会导致后续断言无法执行。大量使用 `.catch(() => false)` 和 `return` 静默跳过。

**建议**: 考虑使用更直接的 API 调用创建测试数据（如通过 API 预先创建 box），减少 UI 导航依赖。

### TEST-ISSUE-003: 缺少测试数据 fixture

**严重级别**: 🟢 Low

**描述**: 
Excel 导入测试（TC-IMP-01 到 TC-IMP-09）需要一个真实的 .xlsx 文件才能完成完整流程测试。目前大部分 Excel 测试只验证了模态框打开/关闭。

**建议**: 在 `e2e/fixtures/` 下添加一个测试用的 Excel 文件。

---

## 环境状态

| 检查项 | 状态 |
|--------|------|
| 后端 (port 3001) | ✅ 运行中，`/api/health` 返回 ok |
| 前端 (port 5173) | ✅ Vite dev server 运行中 |
| 数据库 | ✅ 连接正常 |
| Playwright | ✅ v1.60.0，Chrome 可用 |
| 旧测试 (auth) | ⚠️ 登录相关测试部分失败（受 BUG-001 影响） |

---

## 下一步

1. **优先修复 BUG-001** — 清理 App.tsx 中的旧 samples/subSamples 引用
2. 修复后重新运行 Plan A 测试
3. 根据实际测试结果进一步调整测试定位器
