# PostgreSQL Database Setup for InfiniteGo

本文档说明了 InfiniteGo 项目的 PostgreSQL 数据库配置和使用方法。

## 📋 概览

InfiniteGo 现已集成 PostgreSQL 数据库支持，用于持久化游戏状态、玩家数据和历史记录。虽然当前游戏逻辑仍使用内存存储，但数据库基础设施已就绪，可随时启用持久化功能。

## 🗄️ 数据库架构

### 核心表结构

#### 1. `rooms` - 房间表
存储游戏房间的元数据
```sql
- id (UUID): 房间唯一标识
- name (VARCHAR): 房间名称
- created_at, updated_at (TIMESTAMP): 时间戳
- is_active (BOOLEAN): 是否活跃
- max_players, current_players (INTEGER): 玩家数量
- server_seq (BIGINT): 服务器序列号
```

#### 2. `game_states` - 游戏状态快照表
存储游戏状态的完整快照，用于恢复和回放
```sql
- id (BIGSERIAL): 自增主键
- room_id (UUID): 关联房间
- server_seq (BIGINT): 状态序列号
- state_data (JSONB): 序列化的游戏状态
- created_at (TIMESTAMP): 创建时间
```

#### 3. `chunks` - 棋盘区块表
存储棋盘的分块数据
```sql
- id (BIGSERIAL): 自增主键
- room_id (UUID): 关联房间
- chunk_x, chunk_y (INTEGER): 区块坐标
- cells (JSONB): 区块内的棋子数据
- stone_count (INTEGER): 棋子数量
- created_at, updated_at (TIMESTAMP): 时间戳
```

#### 4. `moves` - 落子记录表
记录所有落子操作，用于回放和分析
```sql
- id (BIGSERIAL): 自增主键
- room_id (UUID): 关联房间
- player_id (VARCHAR): 玩家ID
- x, y (BIGINT): 落子坐标
- color (SMALLINT): 棋子颜色
- server_seq (BIGINT): 服务器序列号
- accepted (BOOLEAN): 是否接受该落子
- created_at (TIMESTAMP): 创建时间
```

#### 5. `players` - 玩家表
记录连接的玩家信息
```sql
- id (UUID): 玩家唯一标识
- room_id (UUID): 关联房间
- session_id (VARCHAR): 会话ID
- color (SMALLINT): 玩家颜色
- stone_count (INTEGER): 棋子数量
- connected_at, last_seen_at (TIMESTAMP): 连接时间
- is_connected (BOOLEAN): 是否在线
```

## 🐳 Docker 配置

### 环境变量

在 `docker-compose.yml` 中配置的数据库环境变量：

```yaml
postgres:
  environment:
    - POSTGRES_DB=infinitego
    - POSTGRES_USER=infinitego
    - POSTGRES_PASSWORD=infinitego_password

server:
  environment:
    - DB_HOST=postgres
    - DB_PORT=5432
    - DB_NAME=infinitego
    - DB_USER=infinitego
    - DB_PASSWORD=infinitego_password
    - DB_SSLMODE=disable
```

### 数据持久化

PostgreSQL 数据存储在 Docker 卷中：
```yaml
volumes:
  postgres_data:
    driver: local
```

## 🚀 使用方法

### 启动服务

使用 Docker Compose 启动所有服务（包括数据库）：

```bash
# Windows PowerShell
.\launch.ps1

# Linux/Mac
./launch.sh

# 或直接使用 docker-compose
docker-compose up -d
```

### 初始化数据库

数据库会在首次启动时自动初始化：
- 执行 `rt-sand-mvp/server/db/init.sql` 创建表结构
- 创建必要的索引和触发器
- 插入默认测试房间

### 连接数据库

#### 从容器外部连接

```bash
# 使用 psql 客户端
psql -h localhost -p 5432 -U infinitego -d infinitego

# 使用 Docker exec
docker exec -it infinitego-postgres psql -U infinitego -d infinitego
```

#### 从应用程序连接

Go 代码会自动从环境变量读取配置并连接数据库。参见 `db.go` 中的 `InitDB()` 函数。

## 💻 Go 代码集成

### 初始化数据库连接

在 `cmd/main.go` 中添加：

```go
import "github.com/Anthony-pi-Franklin/InfiniteGo/rt-sand-mvp/server"

func main() {
    // 初始化数据库
    if err := server.InitDB(); err != nil {
        log.Fatalf("Failed to initialize database: %v", err)
    }
    defer server.CloseDB()

    // ... 其他启动逻辑
}
```

### 使用 GORM 查询数据

```go
// 创建新房间
room := server.DBRoom{
    Name:       "My Game Room",
    MaxPlayers: 5,
}
result := server.DB.Create(&room)

// 查询房间
var rooms []server.DBRoom
server.DB.Where("is_active = ?", true).Find(&rooms)

// 保存游戏状态
state := server.DBGameState{
    RoomID:    roomID,
    ServerSeq: seq,
    StateData: jsonData,
}
server.DB.Create(&state)
```

### 数据模型

所有数据模型定义在 `models.go` 中：
- `DBRoom` - 房间模型
- `DBGameState` - 游戏状态模型
- `DBChunk` - 区块模型
- `DBMove` - 落子记录模型
- `DBPlayer` - 玩家模型

## 🔧 维护和管理

### 查看日志

```bash
# 查看数据库日志
docker logs infinitego-postgres

# 实时查看日志
docker logs -f infinitego-postgres
```

### 备份数据库

```bash
# 备份
docker exec infinitego-postgres pg_dump -U infinitego infinitego > backup.sql

# 恢复
docker exec -i infinitego-postgres psql -U infinitego infinitego < backup.sql
```

### 重置数据库

```bash
# 停止服务
docker-compose down

# 删除数据卷
docker volume rm infinitego_postgres_data

# 重新启动（会重新初始化）
docker-compose up -d
```

## 📊 性能优化

### 已配置的索引

- `idx_rooms_active`: 活跃房间查询
- `idx_game_states_room`: 游戏状态按房间查询
- `idx_chunks_room`: 区块按房间查询
- `idx_chunks_coords`: 区块坐标查询
- `idx_moves_room`: 落子记录查询
- `idx_players_room`: 玩家按房间查询

### 连接池配置

在 `db.go` 中配置：
```go
sqlDB.SetMaxIdleConns(10)      // 最大空闲连接数
sqlDB.SetMaxOpenConns(100)     // 最大打开连接数
sqlDB.SetConnMaxLifetime(time.Hour) // 连接最大生命周期
```

## 🔐 安全建议

⚠️ **生产环境注意事项：**

1. **修改默认密码**：不要使用默认的 `infinitego_password`
2. **启用 SSL**：设置 `DB_SSLMODE=require`
3. **限制权限**：创建只读用户用于查询
4. **网络隔离**：不要暴露数据库端口到公网
5. **定期备份**：建立自动备份机制

## 📝 下一步开发

数据库基础设施已就绪，可以实现以下功能：

1. **持久化游戏状态**：服务器重启后恢复棋局
2. **历史记录回放**：查看和重放历史对局
3. **用户系统**：玩家注册和认证
4. **统计分析**：排行榜、胜率统计等
5. **分布式部署**：多服务器共享数据库

## 🐛 故障排查

### 数据库连接失败

1. 检查 PostgreSQL 容器是否运行：`docker ps`
2. 查看数据库日志：`docker logs infinitego-postgres`
3. 验证环境变量配置
4. 确认网络连接：`docker network inspect infinitego_infinitego-network`

### 性能问题

1. 检查慢查询日志
2. 分析查询计划：`EXPLAIN ANALYZE`
3. 添加必要的索引
4. 优化连接池配置

## 📚 相关文档

- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [GORM 文档](https://gorm.io/docs/)
- [Docker Compose 文档](https://docs.docker.com/compose/)

---

如有问题或建议，请查看项目 README.md 或提交 Issue。
