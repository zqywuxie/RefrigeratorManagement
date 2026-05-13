
  # 冰箱管理系统

  This is a code bundle for 冰箱管理系统.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Login

  默认 root 用户会在后端启动或执行 seed 时创建：

  ```text
  username: root
  password: root123
  ```

  普通用户需要 root 登录后在页面右上角创建。样本权限按 `created_by` 判断，`uploader` 只是样本上传者备注字段。

  ## Docker deployment

  第一次部署：

  ```bash
  cp .env.docker.example .env
  # 修改 .env 中的 MYSQL_ROOT_PASSWORD 和 JWT_SECRET
  docker compose up -d --build
  ```

  说明：
  后端启动时会自动执行结构迁移和 root 账号兜底创建；生产环境不要执行 `docker compose exec -T backend npm run seed`。

  后续更新：

  ```bash
  git pull origin main
  docker compose up -d --build
  ```

  说明：
  只要没有删除 `mysql_data` volume，`docker compose up -d --build` 不会覆盖现有数据库业务数据。
  不要执行 `docker compose down -v`，也不要在生产环境运行 `npm run seed`。

  或直接执行：

  ```bash
  bash deploy.sh
  ```

  默认前端访问端口是 `80`，后端由前端 Nginx 通过 `/api` 反向代理。

  仅在本地演示或测试环境需要补模拟数据时，才显式执行：

  ```bash
  docker compose exec -T -e SEED_DEMO_DATA=true backend npm run seed
  ```

  ## Database backup

  Docker 部署会启动 `mysql-backup` 容器，默认每天 `03:00` 备份一次 MySQL，并在容器启动时立即备份一次。

  备份文件保存在服务器项目目录：

  ```bash
  backups/mysql/
  ```

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

  手动触发一次备份：

  ```bash
  docker compose restart mysql-backup
  ```

  从备份恢复数据库（会覆盖当前库，请先确认目标文件）：

  ```bash
  gunzip -c backups/mysql/biofridge_YYYYMMDD_HHMMSS.sql.gz \
    | docker compose exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" biofridge
  ```
  
