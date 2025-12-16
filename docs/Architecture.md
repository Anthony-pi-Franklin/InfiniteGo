# 架构与模块

前端采用 ES6 模块化：

- `config.js`：配置常量（缩放、颜色、阈值等）
- `state.js`：游戏状态（stones、视图、持久化）
- `net.js`：WebSocket 连接与消息编解码
- `render.js`：Canvas 渲染与坐标转换
- `input.js`：输入交互与滚动/缩放
- `minimap.js`：小地图视图与导航
- `leaderboard.js`：排行榜统计与窗口管理
- `main.js`：应用总控与事件路由

后端使用 Go：
- 单线程房间处理，权威状态
- 稀疏棋盘区块存储
- WebSocket 端点与 API（房间列表）

未来优化：TypeScript、测试（Vitest/Jest）、打包（Vite）、回放与用户系统。
