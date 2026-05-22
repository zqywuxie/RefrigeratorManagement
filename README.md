# 冰箱管理系统（BioFridge）

生物样本库信息管理系统，用于管理和追踪实验室冰箱中生物样本的存储、位置和状态。提供可视化冰箱布局、拖放操作、分层容器管理、Excel 导入导出等功能。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| UI 组件 | Radix UI (shadcn/ui) + MUI 7 + Tailwind CSS v4 |
| 拖放 | react-dnd (HTML5 + Touch Backend) |
| 动画 | motion (Framer Motion v12) |
| 图表 | recharts |
| 表单 | react-hook-form |
| 主题 | next-themes（明/暗切换） |
| 通知 | sonner（toast 通知） |
| 后端 | Node.js + Express 4 (ES Modules) |
| 数据库 | MySQL 8.0 (mysql2) |
| 认证 | JWT (HMAC-SHA256) + PBKDF2 密码哈希 |
| Excel | xlsx（导入导出） |
| 测试 | Playwright (E2E，88 个用例) |
| 容器化 | Docker Compose (Nginx + Node + MySQL + 备份) |

## 项目结构

```
├── src/                          # 前端 React 源码
│   ├── main.tsx                  # 入口
│   ├── styles/                   # 全局样式（Tailwind、主题、字体）
│   └── app/
│       ├── App.tsx               # 根组件（状态管理 & 业务逻辑）
│       ├── AuthContext.tsx        # 认证上下文
│       ├── api.ts                # API 客户端（所有后端接口）
│       ├── types.ts              # TypeScript 类型 & 常量
│       └── components/
│           ├── FridgeUnit.tsx              # 冰箱可视化（经典上下隔室 + 标签页）
│           ├── FridgeSelector.tsx          # 冰箱切换/创建下拉框
│           ├── FridgeMapView.tsx           # 2D 冰箱地图视图（鸟瞰）
│           ├── FridgeSideMap.tsx           # 侧边栏冰箱地图
│           ├── DrawerFridgeView.tsx        # 抽屉式冷冻箱主视图
│           ├── DrawerLayer.tsx             # 抽屉层网格
│           ├── DrawerSlot.tsx              # 单个抽屉槽位
│           ├── BoxView.tsx                 # 盒子内部视图
│           ├── BoxCard.tsx                 # 盒子卡片
│           ├── BoxGrid.tsx                 # 盒子精确网格
│           ├── CellSlot.tsx                # 盒子单元格
│           ├── ShelfFridgeView.tsx         # 层架式冰箱视图
│           ├── UpperOpenStorage.tsx        # 上层开放存储区域
│           ├── ItemCard.tsx                # 上层物品卡片
│           ├── SampleSlot.tsx              # 样本槽位（拖放目标）
│           ├── SampleCard.tsx              # 样本卡片（拖放源）
│           ├── SubSampleSlot.tsx           # 子样本槽位
│           ├── SubSampleCard.tsx           # 子样本卡片
│           ├── ContainerSubView.tsx        # 容器内部子样本网格
│           ├── SampleListPanel.tsx         # 样本记录列表面板
│           ├── PendingSamplesPanel.tsx     # 待导入样本面板
│           ├── DetailPanel.tsx             # 侧边详情面板
│           ├── AddSampleModal.tsx          # 添加/编辑样本
│           ├── AddItemModal.tsx            # 添加上层物品
│           ├── AddBoxModal.tsx             # 添加盒子
│           ├── AddBoxCellModal.tsx         # 添加盒子单元格
│           ├── AddSampleRecordModal.tsx    # 添加样本记录
│           ├── ExcelImportModal.tsx        # Excel 导入向导
│           ├── BatchEditModal.tsx          # 批量编辑
│           ├── BreadcrumbNav.tsx           # 面包屑导航
│           ├── LoginPage.tsx               # 登录/注册页面
│           ├── RootAdminPanel.tsx          # Root 管理员面板
│           └── ui/                         # ~45 个 shadcn/ui 组件
├── server/                       # Node.js 后端
│   ├── index.js                  # Express 入口
│   ├── db.js                     # MySQL 连接池
│   ├── authUtils.js              # JWT & PBKDF2 工具
│   ├── schemaMigrations.js       # 自动数据库迁移
│   ├── seed.js                   # 演示数据播种
│   ├── middleware/
│   │   └── auth.js               # 认证中间件（JWT 验证、角色检查、所有者检查）
│   └── routes/
│       ├── auth.js               # 登录/注册/个人信息
│       ├── refrigerators.js      # 冰箱 CRUD
│       ├── samples.js            # 样本 CRUD（旧版）
│       ├── subSamples.js         # 子样本 CRUD（旧版）
│       ├── drawers.js            # 抽屉管理
│       ├── boxes.js              # 盒子/盒子单元格 CRUD
│       ├── tubes.js              # 试管管理
│       ├── upperItems.js         # 上层物品 CRUD
│       ├── sampleRecords.js      # 样本记录 CRUD + 批量操作
│       ├── sampleTypes.js        # 样本类型管理
│       ├── itemTypes.js          # 物品类型管理
│       ├── import.js             # Excel 导入
│       ├── export.js             # 数据导出
│       └── admin.js              # 管理员接口
├── e2e/                          # Playwright E2E 测试
│   ├── specs/                    # 测试用例（auth, fridge, sample, subsample, search, admin, ui-ux）
│   └── fixtures/                 # 测试固件（认证、拖放、选择器）
├── scripts/
│   └── mysql-backup.sh           # MySQL 自动备份脚本
├── docker-compose.yml            # 4 容器编排
├── Dockerfile                    # 前端 Nginx 多阶段构建
└── nginx.conf                    # Nginx 反向代理配置
```

## 数据库模型

数据库名称：**biofridge**（MySQL 8.0，所有表均使用软删除）

### 新版数据模型（样本记录 & 试管）

```
users ──┐
        │ created_by
        ▼
refrigerators ──┬── drawers ── boxes ──┬── box_cells
                │  (layer/row/col)      │
                │                       └── tubes ── sample_records
                │                            (patient-centric)
                ├── upper_items
                │   (4-row open storage)
                │
                └── (fridge_type: drawer | shelf)
```

### 旧版数据模型（样本 & 子样本）

```
users ──┐
        │ created_by
        ▼
refrigerators ── samples ── sub_samples
```

### 表说明

| 表 | 说明 |
|----|------|
| `users` | 用户（root / user 两种角色，PBKDF2 密码哈希） |
| `refrigerators` | 冰箱（抽屉式/层架式，可配置网格尺寸和温度） |
| `drawers` | 抽屉（2 层网格：Layer 1: 2×3，Layer 2: 5×3） |
| `boxes` | 盒子（精确模式含网格，简单模式为卡片） |
| `box_cells` | 盒子单元格（精确模式下的位置槽位） |
| `sample_records` | 样本记录（患者级别分组，含分组颜色编码） |
| `tubes` | 试管（盒子内的物理位置，关联样本记录） |
| `upper_items` | 上层物品（4 行开放存储，可选精确/简单模式） |
| `item_types` | 物品类型参考表（试剂、样本、耗材、临时物品等） |
| `sample_types` | 样本类型参考表（血清、血浆、尿液、DNA 等） |
| `samples` | 旧版样本容器（含可配置子样本网格） |
| `sub_samples` | 旧版子样本（位于样本容器内部） |

## 核心功能

### 认证与权限

- JWT 认证（手写 HMAC-SHA256 实现，无第三方 JWT 库依赖）
- PBKDF2 密码哈希（120,000 次迭代，SHA-256）
- 两级角色：`root`（全局管理员）和 `user`（仅可编辑自己创建的样本）
- 所有者检查：样本和子样本的修改受 `created_by` 字段保护

### 冰箱管理

- 两种冰箱类型：**抽屉式**（上层开放存储 + 下层抽屉组）和 **层架式**（4 行开放存储）
- 创建冰箱，自定义名称、描述、类型
- 每个冰箱可独立设置温度
- 删除冰箱时级联软删除所有关联数据
- 冰箱下拉选择器快速切换

### 可视化冰箱视图

- 逼真的冰箱渲染效果（CSS 渐变、阴影、架子隔板、装饰螺栓、门把手）
- 上下两个隔室，标签页切换
- 每个隔室的温度显示和容量进度条
- 基于样本健康状况的状态 LED（绿/黄/红）

### 抽屉式冷冻箱系统

- **2 层抽屉网格**：第 1 层 2×3（6 个抽屉），第 2 层 5×3（15 个抽屉）
- 每个抽屉可容纳多个盒子，可配置最大盒子数
- 抽屉标签（A1-G3）和容量可视化
- 面包屑导航：冰箱 → 抽屉 → 盒子 → 网格

### 盒子管理

- **精确模式**：可配置行列网格，单元格级位置跟踪
- **简单模式**：卡片式展示，含名称、样本类型、项目、数量信息
- 盒子所有权和项目元数据
- 盒子内拖放重新排列

### 样本记录 & 试管

- **患者级别分组**：按患者/样本代码组织试管
- **分组颜色编码**：12 色调色板自动轮换
- 试管分配到盒子精确位置
- 可视化试管在盒子网格中的位置
- 样本记录列表支持多选和批量编辑

### 层架式冰箱视图

- 4 行开放存储区域
- 物品类型可扩展（试剂、样本、耗材、临时物品）
- 支持精确模式和简单模式

### 样本管理（旧版）

- 五种样本状态：`normal` 正常（蓝）、`warning` 温度异常（黄）、`critical` 严重异常（红）、`used` 已使用（灰）、`pending` 待处理（紫）
- **拖放操作**：在隔室内和跨隔室移动样本，自动冲突解决（交换位置）
- 每个样本是容器，内部有可配置的子样本网格（rows/cols 可调）
- 自动 ID 生成（S-001、S-002…）
- 软删除记录恢复：新建样本时优先复用已删除记录的 ID

### 子样本管理（旧版）

- 点击样本进入容器内部视图，展示子样本网格
- 容器内子样本拖放重新排列
- 嵌套网格尺寸可调
- 自动 ID 生成（SS-001、SS-002…）

### 搜索

- 实时搜索过滤，即刻响应输入
- 支持按：样本 ID、名称、类型、患者 ID、上传者、标签、状态标签搜索
- 搜索结果在冰箱网格上高亮显示，匹配项计数指示器
- 支持样本记录搜索

### 2D 冰箱地图

- 鸟瞰视图展示所有抽屉和盒子
- 基于占用率/样本状态的颜色编码
- 侧边栏迷你地图快速导航

### Excel 导入/导出

- **导入向导**：上传 Excel、智能字段映射（中英文）、预览、位置分配
- **待处理面板**：拖放未分配样本到盒子位置
- **数据导出**：样本记录、盒子、上层物品导出为 XLSX（管理员）

### 批量编辑

- 多选样本记录
- 批量更新来源、类型、采集阶段、日期

### 侧边详情面板

- 从右侧滑入，显示样本完整信息（ID、名称、类型、状态、温度、采集日期、患者 ID、上传者、体积、位置、标签、备注）
- 一键状态更改按钮，查看/编辑模式切换
- 所有者或 root 用户可删除

### 管理员面板

- **摘要仪表板**：冰箱数、总容量、用户数、异常数、使用率
- **用户管理**：表格视图，支持角色修改、密码重置、用户删除
- **分布统计**：样本状态分布和类型分布（进度条）
- **冰箱概览**：所有冰箱的卡片视图
- **统一样本列表**：跨冰箱搜索/过滤/编辑/删除/状态更改
- **盒子管理**：查看所有盒子及试管详情
- **样本记录管理**：查看和管理所有样本记录
- **上层物品管理**：查看和删除上层物品
- **数据导出**：导出样本记录、盒子和上层物品为 XLSX

### 明/暗主题

- 完整的明暗主题实现，CSS 自定义属性驱动，偏好持久化保存

## API 接口

### 认证

| 路由 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/auth/login` | POST | 无 | 用户登录 |
| `/api/auth/register` | POST | 无 | 用户注册 |
| `/api/auth/me` | GET | 需要 | 获取当前用户信息 |

### 冰箱

| 路由 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/refrigerators` | GET | 无 | 获取所有冰箱 |
| `/api/refrigerators` | POST | root | 创建冰箱 |
| `/api/refrigerators/:id` | GET | 无 | 获取单个冰箱 |
| `/api/refrigerators/:id` | PUT | root | 更新冰箱 |
| `/api/refrigerators/:id` | DELETE | root | 删除冰箱（软删除） |

### 抽屉 & 盒子 & 试管

| 路由 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/refrigerators/:fridgeId/drawers` | GET | 无 | 获取冰箱的抽屉列表 |
| `/api/drawers/:id` | PATCH/PUT | root | 更新抽屉（容量等） |
| `/api/drawers/:drawerId/boxes` | GET/POST | 视操作 | 获取/创建抽屉中的盒子 |
| `/api/boxes` | POST | 需要 | 创建独立盒子 |
| `/api/boxes/:id` | PUT/DELETE | 需要 | 更新/删除盒子 |
| `/api/boxes/:boxId/cells` | GET/POST | 无 | 获取/创建盒子单元格 |
| `/api/boxes/cells/:id` | PUT/DELETE | 无 | 更新/删除单元格 |
| `/api/boxes/:boxId/tubes` | GET | 无 | 获取盒子中的试管列表 |

### 样本记录 & 试管

| 路由 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/sample-records` | GET/POST | 视操作 | 获取/创建样本记录 |
| `/api/sample-records/:id` | GET/PUT/DELETE | 视操作 | 获取/更新/删除样本记录 |
| `/api/sample-records/batch` | PUT | 需要 | 批量更新样本记录 |
| `/api/sample-records/:sampleId/tubes` | POST | 需要 | 向样本记录添加试管 |
| `/api/tubes/:id` | PUT/DELETE | 需要 | 更新/删除试管 |

### 上层物品

| 路由 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/refrigerators/:fridgeId/upper-items` | GET/POST | 无 | 获取/创建上层物品 |
| `/api/upper-items/:id` | PUT/DELETE | 视操作 | 更新/删除上层物品 |

### 旧版样本 & 子样本

| 路由 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/refrigerators/:fridgeId/samples` | GET | 无 | 获取冰箱下的所有样本 |
| `/api/refrigerators/:fridgeId/samples` | POST | 需要 | 创建样本 |
| `/api/refrigerators/:fridgeId/samples/:id` | PUT | 所有者 | 更新样本 |
| `/api/refrigerators/:fridgeId/samples/:id` | DELETE | 所有者 | 删除样本（软删除） |
| `/api/samples/:sampleId/sub-samples` | GET | 无 | 获取子样本列表 |
| `/api/samples/:sampleId/sub-samples` | POST | 需要 | 创建子样本 |
| `/api/samples/:sampleId/sub-samples/:id` | PUT | 所有者 | 更新子样本 |
| `/api/samples/:sampleId/sub-samples/:id` | DELETE | 所有者 | 删除子样本（软删除） |

### 类型管理

| 路由 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/sample-types` | GET/POST | 无 | 获取/创建样本类型 |
| `/api/item-types` | GET/POST | 无 | 获取/创建物品类型 |

### 导入/导出

| 路由 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/import/parse-excel` | POST | 需要 | 解析上传的 Excel 文件 |
| `/api/import/assign` | POST | 需要 | 分配导入的样本到位置 |
| `/api/export/sample-records` | GET | root | 导出样本记录为 XLSX |
| `/api/export/boxes` | GET | root | 导出盒子为 XLSX |
| `/api/export/upper-items` | GET | root | 导出上层物品为 XLSX |

### 管理员

| 路由 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/admin/summary` | GET | root | 管理员摘要统计 |
| `/api/admin/users` | GET/POST | root | 列出/创建用户 |
| `/api/admin/users/:username` | PATCH/DELETE | root | 修改/删除用户 |
| `/api/admin/samples` | GET | root | 跨冰箱统一样本列表 |
| `/api/admin/boxes` | GET | root | 所有盒子列表 |
| `/api/admin/boxes/:id` | GET | root | 盒子详情（含试管） |
| `/api/admin/sample-records` | GET | root | 所有样本记录列表 |
| `/api/admin/upper-items` | GET/PUT/DELETE | root | 上层物品管理 |

### 系统

| 路由 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/health` | GET | 无 | 后端数据库健康检查 |
| `/healthz` | GET | 无 | 前端健康检查（Nginx） |

## 快速开始

### 本地开发

```bash
# 1. 安装依赖
npm install
cd server && npm install

# 2. 配置环境变量（创建 server/.env）
#   DB_HOST=localhost
#   DB_PORT=3306
#   DB_USER=root
#   DB_PASSWORD=your_password
#   DB_NAME=biofridge
#   JWT_SECRET=your_secret_key

# 3. 初始化数据库（自动迁移 + 种子数据）
node server/seed.js

# 4. 启动后端（端口 3001）
node server/index.js

# 5. 启动前端（端口 5173）
npm run dev
```

### Docker 部署

```bash
# 第一次部署
cp .env.docker.example .env
# 修改 .env 中的 MYSQL_ROOT_PASSWORD 和 JWT_SECRET
docker compose up -d --build

# 后续更新
git pull origin main
docker compose up -d --build --remove-orphans
```

- 后端启动时自动执行结构迁移和 root 账号兜底创建
- 后端如果迁移失败或数据库不可用，会直接退出并由 Docker 自动重启，不再带病启动
- 只要未删除 `mysql_data` volume，`docker compose up -d --build` 不会覆盖现有数据
- 不要执行 `docker compose down -v`，也不要在生产环境运行 `npm run seed`
- 仅在本地测试环境需要模拟数据时，才执行：

```bash
docker compose exec -T -e SEED_DEMO_DATA=true backend npm run seed
```

### 部署健康检查

```bash
# 查看容器健康状态
docker compose ps

# 前端健康检查
curl http://localhost:${FRONTEND_PORT:-80}/healthz

# 后端健康检查
docker compose exec backend node -e "fetch('http://127.0.0.1:3001/api/health').then(r => r.text().then(t => console.log(r.status, t)))"
```

### 数据库与图片备份

Docker 部署会启动 `mysql-backup` 容器，默认每天凌晨 3:00 自动备份，并在容器启动时立即备份一次。备份文件保存在 `backups/mysql/`。

上传的盒子图片保存在宿主机 `uploads/`，并由 `uploads-backup` 容器独立备份到 `backups/uploads/`。MySQL 中只保存图片元数据和相对路径，恢复图片时需要同时恢复 `uploads/` 文件。

可在 `.env` 中调整：

```bash
BACKUP_AT_HOUR=3
BACKUP_RETENTION_DAYS=14
BACKUP_RUN_ON_START=true
UPLOADS_BACKUP_AT_HOUR=3
UPLOADS_BACKUP_RETENTION_DAYS=14
UPLOADS_BACKUP_RUN_ON_START=true
```

查看备份日志：

```bash
docker compose logs mysql-backup --tail 80
docker compose logs uploads-backup --tail 80
```

从备份恢复数据库：

```bash
gunzip -c backups/mysql/biofridge_YYYYMMDD_HHMMSS.sql.gz \
  | docker compose exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" biofridge
```

从备份恢复上传图片：

```bash
mkdir -p uploads
tar -xzf backups/uploads/uploads_YYYYMMDD_HHMMSS.tar.gz -C uploads
```

完整恢复时，先恢复数据库，再恢复 `uploads/`，确保 `box_images.image_path` 能对应到实际图片文件。

### 运行测试

```bash
npx playwright install
npx playwright test
```

## 默认账户

| 角色 | 用户名 | 密码 |
|------|--------|------|
| Root 管理员 | root | root123 |
| 普通用户 | demo | demo123 |

普通用户需要 root 登录后在页面右上角创建。样本权限按 `created_by` 判断，`uploader` 为样本上传者备注字段。
