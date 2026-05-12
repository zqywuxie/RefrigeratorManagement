
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
  docker compose exec -T backend npm run seed
  ```

  后续更新：

  ```bash
  git pull origin main
  docker compose up -d --build
  docker compose exec -T backend npm run seed
  ```

  或直接执行：

  ```bash
  bash deploy.sh
  ```

  默认前端访问端口是 `80`，后端由前端 Nginx 通过 `/api` 反向代理。
  
