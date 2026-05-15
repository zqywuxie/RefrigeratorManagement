# 冰箱管理系统（BioFridge）

生物样本库信息管理系统，用于管理和追踪实验室冰箱中生物样本的存储、位置和状态。提供可视化冰箱布局、拖放操作、分层容器管理等功能。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| UI 组件 | Radix UI (shadcn/ui) + Tailwind CSS v4 |
| 拖放 | react-dnd (HTML5 Backend) |
| 动画 | Framer Motion |
| 图表 | recharts |
| 表单 | react-hook-form |
| 后端 | Node.js + Express 4 (ES Modules) |
| 数据库 | MySQL 8.0 (mysql2) |
| 认证 | JWT (HMAC-SHA256) + PBKDF2 密码哈希 |
| 测试 | Playwright (E2E，88 个用例) |
| 容器化 | Docker Compose (Nginx + Node + MySQL + 备份) |

## 项目结构

```
├── src/                     # 前端 React 源码
│   ├── main.tsx             # 入口
│   └── app/
│       ├── App.tsx          # 根组件（状态管理 & 业务逻辑）
│       ├── AuthContext.tsx   # 认证上下文
│       ├── api.ts           # API 客户端
│       ├── types.ts         # TypeScript 类型 & 常量
│       └── components/
│           ├── FridgeUnit.tsx          # 冰箱可视化（上下隔室 + 标签页）
│           ├── FridgeSelector.tsx      # 冰箱切换下拉框
│           ├── SampleSlot.tsx          # 样本槽位（放置目标）
│           ├── SampleCard.tsx          # 样本卡片（拖拽源）
│           ├── SubSampleSlot.tsx       # 子样本槽位
│           ├── SubSampleCard.tsx       # 子样本卡片
│           ├── ContainerSubView.tsx    # 容器内部子样本网格视图
│           ├── DetailPanel.tsx         # 侧边详情面板
│           ├── AddSampleModal.tsx      # 添加/编辑样本模态框
│           ├── LoginPage.tsx           # 登录/注册页面
│           ├── RootAdminPanel.tsx      # Root 管理员面板
│           └── ui/                     # ~45 个 shadcn/ui 组件
├── server/                  # Node.js 后端
│   ├── index.js             # Express 入口
│   ├── db.js                # MySQL 连接池
│   ├── authUtils.js         # JWT & PBKDF2 工具
│   ├── schemaMigrations.js  # 自动数据库迁移
│   ├── seed.js              # 演示数据播种
│   ├── middleware/
│   │   └── auth.js          # 认证中间件
│   └── routes/
│       ├── auth.js          # 登录/注册/个人信息
│       ├── refrigerators.js # 冰箱 CRUD
│       ├── samples.js       # 样本 CRUD
│       ├── subSamples.js    # 子样本 CRUD
│       ├── sampleTypes.js   # 样本类型管理
│       └── admin.js         # 管理员接口
├── e2e/                     # Playwright E2E 测试
│   ├── specs/               # 测试用例（auth, fridge, sample, search, subsample, admin, ui-ux）
│   └── fixtures/            # 测试固件（认证、拖放、选择器）
├── scripts/
│   └── mysql-backup.sh      # MySQL 自动备份脚本
├── docker-compose.yml       # 4 容器编排
├── Dockerfile               # 前端 Nginx 多阶段构建
└── nginx.conf               # Nginx 反向代理配置
```

## 数据库模型

数据库名称：**biofridge**（MySQL 8.0，所有表均使用软删除）

```
users ──┐
        │ created_by (FK)
        ▼
refrigerators ──┐
                │ refrigerator_id (FK)
                ▼
            samples ──┐
                      │ sample_id (FK)
                      ▼
                 sub_samples
```

| 表 | 说明 |
|----|------|
| `users` | 用户（root / user 两种角色，PBKDF2 密码哈希） |
| `refrigerators` | 冰箱（上下隔室，可配置网格尺寸和温度） |
| `samples` | 样本容器（血清/血浆/尿液/DNA/组织/全血，类型可扩展） |
| `sub_samples` | 子样本（位于样本容器内部的网格中） |

## 核心功能

### 认证与权限

- JWT 认证（手写 HMAC-SHA256 实现，无第三方 JWT 库依赖）
- PBKDF2 密码哈希（120,000 次迭代，SHA-256）
- 两级角色：`root`（全局管理员）和 `user`（仅可编辑自己创建的样本）
- 所有者检查：样本和子样本的修改受 `created_by` 字段保护

### 冰箱管理

- 创建冰箱，自定义名称、描述、上下隔室网格尺寸（最多 5×5）
- 每个隔室独立设置目标温度
- 删除冰箱时级联软删除所有关联样本和子样本
- 冰箱下拉选择器快速切换

### 可视化冰箱视图

- 逼真的冰箱渲染效果（CSS 渐变、阴影、架子隔板、装饰螺栓、门把手）
- 上下两个隔室，标签页切换
- 每个隔室的温度显示和容量进度条
- 基于样本健康状况的状态 LED（绿/黄/红）

### 样本管理

- 五种样本状态：`normal` 正常（蓝）、`warning` 温度异常（黄）、`critical` 严重异常（红）、`used` 已使用（灰）、`pending` 待处理（紫）
- **拖放操作**：在隔室内和跨隔室移动样本，自动冲突解决（交换位置）
- 每个样本是容器，内部有可配置的子样本网格（rows/cols 可调）
- 自动 ID 生成（S-001、S-002…）
- 软删除记录恢复：新建样本时优先复用已删除记录的 ID

### 子样本管理

- 点击样本进入容器内部视图，展示子样本网格
- 容器内子样本拖放重新排列
- 嵌套网格尺寸可调
- 自动 ID 生成（SS-001、SS-002…）

### 搜索

- 实时搜索过滤，即刻响应输入
- 支持按：样本 ID、名称、类型、患者 ID、上传者、标签、状态标签搜索
- 搜索结果在冰箱网格上高亮显示，匹配项计数指示器

### 侧边详情面板

- 从右侧滑入，显示样本完整信息（ID、名称、类型、状态、温度、采集日期、患者 ID、上传者、体积、位置、标签、备注）
- 一键状态更改按钮，查看/编辑模式切换

### 统计面板

- 容量使用率（已用/总槽位、百分比）
- 各隔室样本计数和异常计数（脉冲动画）
- 子样本汇总和标签频率统计

### 添加/编辑模态框

- 统一的样本/子样本创建编辑表单
- 自动填写上传者用户名
- 支持动态添加新样本类型（自动扩展数据库枚举）

### 用户菜单

- "我的已上传样本"下拉菜单，快速跳转到当前用户的项目
- 用户注册入口（仅 root 可见）
- 明/暗主题切换

### Root 管理员面板

- **摘要仪表板**：冰箱数、总容量、用户数、异常数、使用率
- **用户管理**：表格视图，支持角色修改、密码重置、用户删除
- **分布统计**：样本状态分布和类型分布（进度条）
- **冰箱概览**：所有冰箱的卡片视图
- **统一样本列表**：跨冰箱搜索/过滤/编辑/删除/状态更改

### 明/暗主题

- 完整的明暗主题实现，CSS 自定义属性驱动，偏好持久化保存

## API 接口

| 路由 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/auth/login` | POST | 无 | 用户登录 |
| `/api/auth/register` | POST | 无 | 用户注册 |
| `/api/auth/me` | GET | 需要 | 获取当前用户信息 |
| `/api/refrigerators` | GET | 无 | 获取所有冰箱 |
| `/api/refrigerators/:id` | GET | 无 | 获取单个冰箱 |
| `/api/refrigerators` | POST | root | 创建冰箱 |
| `/api/refrigerators/:id` | PUT | root | 更新冰箱 |
| `/api/refrigerators/:id` | DELETE | root | 删除冰箱（软删除） |
| `/api/refrigerators/:fridgeId/samples` | GET | 无 | 获取冰箱下的所有样本（含子样本） |
| `/api/refrigerators/:fridgeId/samples` | POST | 需要 | 创建样本 |
| `/api/refrigerators/:fridgeId/samples/:id` | PUT | 所有者 | 更新样本 |
| `/api/refrigerators/:fridgeId/samples/:id` | DELETE | 所有者 | 删除样本（软删除） |
| `/api/samples/:sampleId/sub-samples` | GET | 无 | 获取样本的子样本列表 |
| `/api/samples/:sampleId/sub-samples` | POST | 需要 | 创建子样本 |
| `/api/samples/:sampleId/sub-samples/:id` | PUT | 所有者 | 更新子样本 |
| `/api/samples/:sampleId/sub-samples/:id` | DELETE | 所有者 | 删除子样本（软删除） |
| `/api/sample-types` | GET | 无 | 获取所有样本类型 |
| `/api/sample-types` | POST | 无 | 添加新样本类型 |
| `/api/admin/summary` | GET | root | 管理员摘要统计 |
| `/api/admin/users` | GET | root | 列出所有用户 |
| `/api/admin/users` | POST | root | 创建用户 |
| `/api/admin/users/:username` | PATCH | root | 修改用户（角色/密码） |
| `/api/admin/users/:username` | DELETE | root | 删除用户 |
| `/api/admin/samples` | GET | root | 跨冰箱统一样本列表 |

## 快速开始

### 本地开发

```bash
# 1. 安装依赖
npm install

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
docker compose up -d --build
```

- 后端启动时自动执行结构迁移和 root 账号兜底创建
- 只要未删除 `mysql_data` volume，`docker compose up -d --build` 不会覆盖现有数据
- 不要执行 `docker compose down -v`，也不要在生产环境运行 `npm run seed`
- 仅在本地测试环境需要模拟数据时，才执行：

```bash
docker compose exec -T -e SEED_DEMO_DATA=true backend npm run seed
```

### 数据库备份

Docker 部署会启动 `mysql-backup` 容器，默认每天凌晨 3:00 自动备份，并在容器启动时立即备份一次。备份文件保存在 `backups/mysql/`。

可在 `.env` 中调整：

```bash
BACKUP_AT_HOUR=3
BACKUP_RETENTION_DAYS=14
BACKUP_RUN_ON_START=true
```

查看备份日志：

```bash
docker compose logs mysql-backup --tail 80
```

从备份恢复数据库：

```bash
gunzip -c backups/mysql/biofridge_YYYYMMDD_HHMMSS.sql.gz \
  | docker compose exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" biofridge
```

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
