# InfiniteGo 快速启动指南

## ⚡ 一键启动

### Windows (PowerShell)
```powershell
cd E:\Document\code\InfiniteGo
.\u005cLaunch.ps1
.Launch.ps1 -Action restart
.Launch.ps1 -Action logs
```

### Linux/Mac (Bash)
```bash
cd ~/InfiniteGo
chmod +x launch.sh
./launch.sh
./launch.sh restart
./launch.sh logs
```

## 📍 访问地址

- 大厅: http://localhost:8081/lobby.html
- 游戏: http://localhost:8081/index.html
- API: http://localhost:8080/api/rooms

## 🔧 常用命令

| 操作 | PowerShell | Bash |
|------|------------|------|
| 启动 | .\Launch.ps1 -Action up | ./launch.sh up |
| 停止 | .\Launch.ps1 -Action down | ./launch.sh down |
| 重启 | .\Launch.ps1 -Action restart | ./launch.sh restart |
| 日志 | .\Launch.ps1 -Action logs | ./launch.sh logs |
| 清理 | .\Launch.ps1 -Action clean | ./launch.sh clean |

## 🐛 Docker 手动命令

```bash
docker-compose ps
docker-compose logs
docker-compose build --no-cache
docker-compose down && docker-compose up -d
docker-compose exec server bash
docker-compose exec client bash
```

## 📋 故障排除

- 404 错误 → `.\Launch.ps1 -Action restart`
- 无法连接 → `docker-compose ps` / `docker-compose logs server`
- 端口占用 → 修改 `docker-compose.yml` 中端口映射

## 🌐 局域网访问

在同一网络设备上访问：`http://<服务器IP>:8081/lobby.html`

更多信息：见 [Docker 部署](./Docker.md) 与 [Rooms 多房间](./Rooms.md)。