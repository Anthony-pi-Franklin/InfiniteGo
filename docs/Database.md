# PostgreSQL 数据库

项目已集成 PostgreSQL（容器与初始化脚本）以支持房间、状态快照、区块与落子记录、玩家信息的持久化；当前主要使用内存状态，后续可启用持久化。

## Compose 环境
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- 服务器端通过环境变量连接数据库，卷 `postgres_data` 持久化。

## 使用
```bash
# 启动所有服务
./launch.sh  # 或 PowerShell: .\Launch.ps1

# 连接数据库
psql -h localhost -p 5432 -U infinitego -d infinitego
```

## Go 集成
- `db.go` 配置连接池与初始化
- `models.go` 定义 `DBRoom`, `DBGameState`, `DBChunk`, `DBMove`, `DBPlayer`

## 维护
- 容器日志与备份/恢复
- 重置卷后重新初始化

## 安全建议
- 修改默认密码、开启 SSL、限制权限与网络暴露、定期备份。
