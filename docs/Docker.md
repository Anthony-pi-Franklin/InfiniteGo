# Docker 部署与修复指南

本项目使用 Docker Compose 管理 `server` 与 `client(Nginx)` 服务，已配置健康检查、自动重启、API 代理与 WebSocket 转发。

## 核心修复

- Nginx SPA 路由回退到 `lobby.html`
- `/api/` 代理到后端 `server:8080`
- WebSocket `/ws` 转发并配置长超时
- Compose 增强：健康检查、自动重启、依赖关系、环境变量

## 使用方式

```bash
docker-compose up -d
docker-compose logs -f
docker-compose restart
docker-compose down
```

## 故障排除

- 启动仍 404：
```powershell
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```
- API 无法访问：检查 Nginx `/api/` 代理配置与 `client` 日志
- WebSocket 失败：检查 `/ws` 配置与浏览器网络面板
- 端口占用：调整 `docker-compose.yml` 的端口映射

## 脚本支持

- Windows：`Launch.ps1`（up/down/restart/logs/clean）
- Linux/Mac：`launch.sh`

## 参考

- 详尽修复摘要见提交记录与此前的修复总结（已合并）。
- 快速操作卡：见 [Getting_Started.md](./Getting_Started.md)。
