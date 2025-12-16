# Docker 部署指南

## 问题说明

之前 Docker 配置存在的问题：
1. **nginx.conf 404 错误**：`try_files $uri $uri/ =404` 导致无法回退到 index.html，找不到新的 lobby.html
2. **缺少 API 代理**：nginx 没有配置代理 `/api/` 路由到后端
3. **WebSocket 连接配置不完整**：缺少超时和转发头设置
4. **启动脚本不完善**：没有完整的 Docker 管理逻辑

## 修复内容

### 1. nginx.conf 更新

**关键改进：**
- ✅ 修改首页为 `lobby.html`
- ✅ 修复 SPA 路由：`try_files $uri $uri/ /lobby.html` 允许回退
- ✅ 添加 `/api/` 代理，确保房间列表 API 正常工作
- ✅ 完善 WebSocket 代理配置（超时时间、转发头）
- ✅ 添加静态文件缓存配置

### 2. docker-compose.yml 增强

**新增功能：**
- ✅ 版本标记 (`version: '3.8'`)
- ✅ 容器命名便于管理
- ✅ 健康检查 (healthcheck)
- ✅ 自动重启策略 (`restart: unless-stopped`)
- ✅ 环境变量配置
- ✅ 服务依赖关系 (`depends_on`)

### 3. Launch.ps1 完整脚本

功能包括：
- ✅ Docker 和 Docker Daemon 检查
- ✅ 五种操作模式：up/down/restart/logs/clean
- ✅ 彩色输出和状态提示
- ✅ 自动打开浏览器
- ✅ 服务健康检查
- ✅ 错误处理

## 使用方法

### 方式一：PowerShell 脚本（推荐）

```powershell
# 启动所有服务（默认）
.\Launch.ps1

# 或指定操作
.\Launch.ps1 -Action up      # 启动服务
.\Launch.ps1 -Action down    # 停止服务
.\Launch.ps1 -Action restart # 重启服务
.\Launch.ps1 -Action logs    # 查看日志
.\Launch.ps1 -Action clean   # 清理资源
```

### 方式二：命令行（Docker 直接）

```bash
# 启动
docker-compose up -d

# 重启
docker-compose restart

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

## 访问地址

启动后可通过以下地址访问：

| 服务 | 地址 | 说明 |
|------|------|------|
| 大厅页面 | http://localhost:8081 | 房间选择界面 |
| 大厅页面 | http://localhost:8081/lobby.html | 直接访问 |
| 游戏界面 | http://localhost:8081/index.html | 游戏页面 |
| API - 房间列表 | http://localhost:8080/api/rooms | 获取房间信息 |
| WebSocket | ws://localhost:8081/ws | 游戏连接 |

## 故障排除

### 1. 启动后仍然 404

**原因**：Docker 容器没有重新构建
**解决**：
```powershell
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

或使用脚本：
```powershell
.\Launch.ps1 -Action restart
```

### 2. 房间列表 API 无法访问

**检查**：
```bash
# 查看 nginx 日志
docker-compose logs client

# 测试 API
curl http://localhost:8080/api/rooms
```

**解决**：确保 nginx.conf 中有 `/api/` 代理配置

### 3. WebSocket 连接失败

**检查**：
- 确保 nginx.conf 中 WebSocket 代理配置正确
- 查看浏览器开发者工具中的网络选项卡
- 查看容器日志：`docker-compose logs -f`

### 4. 港口已被占用

```powershell
# 查看占用端口的进程
netstat -ano | findstr :8081

# 修改 docker-compose.yml 中的端口映射
# 例如改为：
#   ports:
#     - "8082:80"  # 改为 8082
```

## 环境变量

可以在 `.env` 文件中配置（如需要）：

```env
# Server 环境
SERVER_PORT=8080
CLIENT_PORT=8081

# Docker
COMPOSE_PROJECT_NAME=infinitego
```

## 性能优化建议

1. **增加内存限制**（可选）：
```yaml
services:
  server:
    deploy:
      resources:
        limits:
          memory: 512M
```

2. **使用 Docker 卷存储游戏数据**：
```yaml
volumes:
  game-data:
services:
  server:
    volumes:
      - game-data:/app/data
```

3. **启用日志轮转**：
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 局域网部署

在局域网中其他设备访问：

```
http://<服务器IP>:8081/lobby.html
```

例如：`http://192.168.1.100:8081/lobby.html`

## 生产环境建议

1. 使用环境变量管理敏感配置
2. 启用 SSL/TLS（在 Nginx 中配置）
3. 添加日志聚合和监控
4. 使用 Docker Volume 持久化数据
5. 定期备份容器数据
6. 使用 Docker Registry 管理镜像

## 清理和维护

```powershell
# 清理所有容器和镜像
.\Launch.ps1 -Action clean

# 或手动清理
docker system prune -a --volumes
```

## 更多帮助

查看 Docker Compose 官方文档：https://docs.docker.com/compose/
