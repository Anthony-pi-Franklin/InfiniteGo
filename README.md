# InfiniteGo

InfiniteGo 是一个受围棋启发的实时多人超大规模棋盘游戏，用于局域网联机。与传统回合制不同，InfiniteGo 取消了回合，采用抢占式落子，强调速度与响应性。

**核心特性**
- 大棋盘：稀疏存储，支持超大坐标空间。
- 实时多人：单房间 3–5 人低延迟联机。
- 规则简洁：无气则提子，保留围棋核心机制。
- 轻量后端：单线程按序处理，状态权威一致。
- 模块化架构：前后端分层清晰，易扩展与优化。

## 快速开始

Windows（PowerShell）：

```powershell
cd E:\Document\code\InfiniteGo
 .\Launch.ps1                 # 一键启动
 .\Launch.ps1 -Action logs    # 查看日志
 .\Launch.ps1 -Action restart # 重启
```

Linux/Mac（Bash）：

```bash
cd ~/InfiniteGo
chmod +x launch.sh
./launch.sh            # 一键启动
./launch.sh logs       # 查看日志
./launch.sh restart    # 重启
```

启动后访问：
- 大厅： http://localhost:8081/lobby.html
- 游戏： http://localhost:8081/index.html
- 房间列表 API： http://localhost:8080/api/rooms

更多命令与故障排查见文档：见 [docs/Getting_Started.md](docs/Getting_Started.md)。

## Docker 部署概览

本项目提供完整的 Docker Compose 工作流（健康检查、自动重启、API 代理、WebSocket 转发）。

常用命令：

```bash
docker-compose up -d
docker-compose logs -f
docker-compose restart
docker-compose down
```

Nginx 已配置 SPA 路由与 `/api/` 代理，WebSocket 长连接参数完善。详细部署与修复说明见 [docs/Docker.md](docs/Docker.md)。

## 多房间（Rooms）

- 通过 `RoomManager` 支持多房间，使用 `/ws?room=<ID>` 连接指定房间。
- 前端提供大厅页面选择/创建房间与颜色；进入房间后颜色锁定。

使用指南与 API 端点说明见 [docs/Rooms.md](docs/Rooms.md)。

## 架构与模块

RT-Sand MVP 目录结构：
- `rt-sand-mvp/server`：Go 权威服务器（区块存储、WebSocket）。
- `rt-sand-mvp/client`：HTML/Canvas 客户端（渲染、交互）。
- `rt-sand-mvp/protocol`：消息 Protobuf 定义。

前端 ES6 模块职责与扩展建议见 [docs/Architecture.md](docs/Architecture.md)。

## 数据库

已集成 PostgreSQL 基础设施（容器、初始化脚本、环境变量），便于持久化房间、状态快照、落子记录与玩家信息。现阶段主要使用内存状态，后续可无缝启用持久化。

详情见 [docs/Database.md](docs/Database.md)。

## 测试与 UI 更新

- UI 更新与交互变更总结见 [docs/UI_Updates.md](docs/UI_Updates.md)。
- 测试清单与浏览器兼容性见 [docs/Testing.md](docs/Testing.md)。

## 本地运行（无需脚本）

```bash
cd rt-sand-mvp/server
go run ./cmd
# 浏览器访问 http://localhost:8080
```

## 许可

详见仓库内 LICENSE。
