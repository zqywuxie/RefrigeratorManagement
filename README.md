
  # 动态冰箱样本管理界面

  This is a code bundle for 动态冰箱样本管理界面. The original project is available at https://www.figma.com/design/bb7ObtXhXQChxLyQ4aGZJB/%E5%8A%A8%E6%80%81%E5%86%B0%E7%AE%B1%E6%A0%B7%E6%9C%AC%E7%AE%A1%E7%90%86%E7%95%8C%E9%9D%A2.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Docker deployment

  第一次部署：

  ```bash
  cp .env.docker.example .env
  # 修改 .env 中的 MYSQL_ROOT_PASSWORD
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
  
