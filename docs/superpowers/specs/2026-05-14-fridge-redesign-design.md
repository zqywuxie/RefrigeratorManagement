# 冰箱空间布局与可视化重新设计

## Scope
仅针对抽屉式冰箱（Drawer Freezer）的前端 UI 重构，层架式冰箱（Shelf Freezer）不在本次范围。

## 数据模型

### 新增表

- **upper_items**: 上层开放存储物品，卡片式管理，无精确坐标。字段：id, refrigerator_id, row_number, name, item_type(试剂/样本/耗材/临时物品), quantity, owner, tags(JSON), note, image_url, qr_code, sort_order, created_at, updated_at, deleted_at
- **drawers**: 冰箱创建时自动根据固定布局生成。字段：id, refrigerator_id, layer(1|2), row_pos, col_pos, label, max_boxes, created_at
- **boxes**: 抽屉内的盒子。字段：id, drawer_id, name, mode(precise|simple), grid_rows, grid_cols, sample_type, project_name, quantity, owner, tags(JSON), note, created_at, updated_at, deleted_at
- **box_cells**: 精细模式下盒内样本格位。字段：id, box_id, position, barcode, sample_name, sample_status, note。唯一约束 (box_id, position)

### 现有表扩展
- refrigerators 加 `fridge_type ENUM('drawer','shelf')`
- 旧 samples / sub_samples 保持不变，旧冰箱继续工作

## 抽屉固定布局

- 第一层：2行 × 3列 = 6个抽屉，编号 A1-A3, B1-B3
- 第二层：5行 × 3列 = 15个抽屉，编号 C1-C3, D1-D3, E1-E3, F1-F3, G1-G3

## 组件架构

```
App
├── FridgeSelector          (现有，增加类型标签)
├── DrawerFridgeView        (新增)
│   ├── BreadcrumbNav        (新增)
│   ├── UpperOpenStorage     (新增)
│   │   ├── OpenStorageRow
│   │   ├── ItemCard         (拖拽排序)
│   │   └── ItemSearchBar
│   ├── DrawerLayer          (新增)
│   │   ├── DrawerGrid
│   │   └── DrawerSlot       (热力图底色)
│   └── BoxView              (新增)
│       ├── BoxCard
│       └── BoxGrid + CellSlot
├── DetailPanel              (现有，适配)
├── AddItemModal / AddBoxModal
└── StatsPanel               (扩展)
```

## 视图状态机

- level='fridge': 面包屑显示冰箱名，内容区展示上层开放存储 + 两层抽屉缩略图
- level='drawer': 面包屑显示冰箱 > 抽屉编号，内容区展示盒子列表
- level='box': 面包屑显示冰箱 > 抽屉 > 盒子，内容区展示精细网格或简略详情

## 导航

渐进式展开，面包屑任意节点可点击跳回。动画用横向滑动（motion）。

## 编码规则

- 抽屉简称：A1-G3（21个）
- 精细格位：行用字母(A-Z) + 列号(1-N)，如 A1, B3, H12

## 可视化

- 抽屉底色按占用率：绿(0-25%) → 蓝(26-50%) → 橙(51-80%) → 红(81-100%)
- 精细格位按状态着色：正常=浅蓝, 警告=黄, 严重=红, 已使用=灰, 空=白
- 搜索匹配高亮闪烁

## 技术栈

React 18 + Tailwind CSS 4 + shadcn/ui + react-dnd + motion + next-themes（全部已有）
