# 前端自动化测试计划

> 基于 Playwright E2E 测试，双 Agent 并行方案

## 现有测试覆盖（85 个测试用例）

| 模块 | 文件 | 覆盖情况 |
|------|------|---------|
| Auth | login.spec.ts, register.spec.ts | 登录成功/失败、令牌持久化、注销、注册、重复用户、密码不匹配 |
| Admin 基础 | admin-access, admin-user-management, admin-sample-management, admin-summary | 访问控制、用户 CRUD、样本列表、摘要指标 |
| Fridge CRUD | fridge-crud.spec.ts, grid-resize.spec.ts | 冰箱创建/编辑/删除、网格控件可见性 |
| Sample CRUD | sample-crud, sample-dragdrop, sample-detail | 样本卡片、详情面板、拖拽放置、删除 |
| SubSample | subsample-crud, subsample-dragdrop | 容器视图、子样本 CRUD、子样本拖拽 |
| Search | search.spec.ts | 按 ID/类型/患者/标签/状态搜索 |
| UI/UX | theme-switch, stats-cards, permission-restrictions | 主题切换、统计卡片、权限限制 |

---

## Plan A: 核心交互流程测试（28 个测试用例）

覆盖 Box 管理 → BoxGrid → Sample Record → SampleListPanel → Pending Samples → Excel 导入 → Upper Items → Shelf Fridge

| # | 文件 | 测试数 |
|---|------|--------|
| 1 | `e2e/specs/box/box-crud.spec.ts` | 12 |
| 2 | `e2e/specs/box/box-grid.spec.ts` | 6 |
| 3 | `e2e/specs/record/sample-record-crud.spec.ts` | 9 |
| 4 | `e2e/specs/record/sample-list-panel.spec.ts` | 6 |
| 5 | `e2e/specs/record/pending-samples.spec.ts` | 6 |
| 6 | `e2e/specs/import/excel-import.spec.ts` | 9 |
| 7 | `e2e/specs/upper/upper-item-crud.spec.ts` | 9 |
| 8 | `e2e/specs/upper/shelf-fridge-view.spec.ts` | 4 |

## Plan B: 管理面板、地图 & 边界情况测试（33 个测试用例）

覆盖 Admin 类型管理 → Admin Box/Items 管理 → Admin Sample Records → FridgeSideMap → FridgeMapView → Box 拖拽 → 错误/边界情况

| # | 文件 | 测试数 |
|---|------|--------|
| 9 | `e2e/specs/admin/admin-item-type-management.spec.ts` | 7 |
| 10 | `e2e/specs/admin/admin-sample-type-management.spec.ts` | 5 |
| 11 | `e2e/specs/admin/admin-box-management.spec.ts` | 7 |
| 12 | `e2e/specs/admin/admin-upper-items.spec.ts` | 5 |
| 13 | `e2e/specs/admin/admin-sample-records.spec.ts` | 9 |
| 14 | `e2e/specs/map/fridge-side-map.spec.ts` | 8 |
| 15 | `e2e/specs/map/fridge-map-view.spec.ts` | 9 |
| 16 | `e2e/specs/box/box-dragdrop.spec.ts` | 4 |
| 17 | `e2e/specs/ui-ux/error-edge-cases.spec.ts` | 8 |

## 验证方式

```bash
# 启动服务
npm run dev               # 前端 :5173
node server/index.js      # 后端 :3001

# Plan A
npx playwright test e2e/specs/box/ e2e/specs/record/ e2e/specs/import/ e2e/specs/upper/

# Plan B
npx playwright test e2e/specs/admin/ e2e/specs/map/ e2e/specs/ui-ux/error-edge-cases.spec.ts

# UI 模式
npx playwright test --ui
```
