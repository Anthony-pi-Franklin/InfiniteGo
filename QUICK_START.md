# InfiniteGo 快速启动指南

## ⚡ 一键启动

### Windows (PowerShell)
```powershell
# 进入项目目录
cd E:\Document\code\InfiniteGo

# 启动所有服务
.\Launch.ps1

# 或指定操作
.\Launch.ps1 -Action restart    # 重启
.\Launch.ps1 -Action logs       # 查看日志
```

### Linux/Mac (Bash)
```bash
# 进入项目目录
cd ~/InfiniteGo

# 赋予执行权限
chmod +x launch.sh

# 启动所有服务
./launch.sh

# 或指定操作
./launch.sh restart    # 重启
./launch.sh logs       # 查看日志
```

---

## 📍 访问地址

启动后自动打开浏览器，或手动访问：

| 页面 | URL | 说明 |
|------|-----|------|
| **大厅** | http://localhost:8081 | 房间选择和创建 |
| **游戏** | http://localhost:8081/index.html | 游戏页面 |
| **API** | http://localhost:8080/api/rooms | 房间列表 |

---

## 🔧 常用命令

| 操作 | PowerShell | Bash |
|------|-----------|------|
| 启动 | `.\Launch.ps1 -Action up` | `./launch.sh up` |
| 停止 | `.\Launch.ps1 -Action down` | `./launch.sh down` |
| 重启 | `.\Launch.ps1 -Action restart` | `./launch.sh restart` |
| 日志 | `.\Launch.ps1 -Action logs` | `./launch.sh logs` |
| 清理 | `.\Launch.ps1 -Action clean` | `./launch.sh clean` |

---

## 🐛 Docker 手动命令

```bash
# 查看容器状态
docker-compose ps

# 查看完整日志
docker-compose logs

# 重建镜像
docker-compose build --no-cache

# 完全重启
docker-compose down && docker-compose up -d

# 进入容器调试
docker-compose exec server bash
docker-compose exec client bash
```

---

## 📋 故障排除

### 问题：404 错误
```powershell
# 解决方案
.\Launch.ps1 -Action restart
```

### 问题：无法连接服务器
```bash
# 检查容器是否运行
docker-compose ps

# 查看容器日志
docker-compose logs server
docker-compose logs client
```

### 问题：端口被占用
修改 `docker-compose.yml`：
```yaml
ports:
  - "8082:80"  # 改为其他端口
```

---

## 🌐 局域网访问

在同一网络的其他设备访问：
```
http://<服务器IP>:8081/lobby.html
```

找服务器 IP：
- **Windows**: `ipconfig` 查看 IPv4
- **Linux/Mac**: `ifconfig` 或 `ip addr`

---

## 📦 部署架构

```
┌─────────────────────────────────────┐
│        Docker Compose               │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────┐  ┌──────────────┐ │
│  │   Nginx      │  │  Go Server   │ │
│  │  (Port 8081) │──│ (Port 8080)  │ │
│  └──────────────┘  └──────────────┘ │
│                                     │
├─────────────────────────────────────┤
│  infinitego-network (Bridge)        │
└─────────────────────────────────────┘
```

---

## ✅ 文件修复说明

### 1. nginx.conf
- ✅ 修复 404：允许 SPA 路由回退到 lobby.html
- ✅ 添加 API 代理：`/api/` 转发到后端
- ✅ 完善 WebSocket：配置超时和转发头

### 2. docker-compose.yml
- ✅ 添加容器健康检查
- ✅ 设置自动重启策略
- ✅ 配置服务依赖关系
- ✅ 添加环境变量支持

### 3. Launch.ps1
- ✅ Docker 和 Daemon 检查
- ✅ 自动打开浏览器
- ✅ 彩色状态输出
- ✅ 完整的错误处理

---

## 📚 更多信息

- [完整 Docker 部署指南](./DOCKER_DEPLOYMENT.md)
- [多房间功能说明](./MULTI_ROOM_GUIDE.md)
- [Docker Compose 文档](https://docs.docker.com/compose/)

---

## 💡 提示

- 首次启动会自动构建镜像，可能需要几分钟
- 关闭脚本不会停止容器，需要手动 `down` 或用脚本的 `down` 操作
- 日志会自动滚动，Ctrl+C 退出日志查看
- 局域网访问前确保防火墙允许 8081 和 8080 端口

---

**祝游戏愉快！🎮**
