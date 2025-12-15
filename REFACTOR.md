# InfiniteGo - 重构说明

## 项目概述
InfiniteGo 是一个基于 WebSocket 的实时围棋对战游戏，支持无限大的棋盘、多种颜色棋子和实时多人对战。

## 架构改进

### 1. 模块化重构
项目已从单文件架构重构为模块化ES6架构：

#### **前端文件结构**
```
client/
├── index.html          # 主HTML文件（精简）
├── styles.css          # 样式表
├── config.js           # 配置常量
├── main.js             # 应用入口
├── state.js            # 状态管理
├── net.js              # 网络通信
├── render.js           # Canvas渲染
├── input.js            # 输入处理
├── minimap.js          # 小地图组件
└── leaderboard.js      # 排行榜组件
```

### 2. 各模块职责

#### `config.js` - 配置管理
- 缩放范围和步进值
- 颜色定义（BLACK, WHITE, RED, BLUE）
- UI阈值和速度常量
- 存储键名

#### `state.js` - 游戏状态
- `GameState` 类管理：
  - 棋子集合 (stones Map)
  - 视图状态 (pan, scale)
  - 序列号 (seq)
  - localStorage持久化

#### `net.js` - 网络层
- `NetworkManager` 类处理：
  - WebSocket连接和重连
  - 消息序列化/反序列化
  - delta更新和棋盘状态同步
  - 移动和重启请求

#### `render.js` - 渲染引擎
- `Renderer` 类负责：
  - Canvas绘图循环
  - 网格绘制
  - 棋子渲染
  - 坐标转换（屏幕↔世界）

#### `input.js` - 输入管理
- `InputManager` 类处理：
  - 鼠标事件（点击、拖拽、滚轮）
  - 边缘滚动（8方向）
  - 放置模式切换

#### `minimap.js` - 小地图
- `Minimap` 类实现：
  - 棋盘全局视图
  - 视口指示器
  - 拖拽导航
  - 独立缩放

#### `leaderboard.js` - 排行榜
- `Leaderboard` 类提供：
  - 颜色统计和排序
  - 可拖拽浮动窗口
  - 双击折叠/展开

#### `main.js` - 应用主控
- `InfiniteGoApp` 类协调：
  - 组件初始化
  - 事件路由
  - UI控制绑定

### 3. 关键改进

#### ✅ 代码组织
- **单一职责**: 每个模块专注一个功能领域
- **依赖清晰**: 通过ES6 import/export明确依赖关系
- **易于测试**: 类化设计便于单元测试

#### ✅ 可维护性
- **配置集中**: 所有魔法数字移到config.js
- **状态隔离**: 游戏状态与UI逻辑分离
- **样式独立**: CSS完全分离到styles.css

#### ✅ 扩展性
- **新颜色**: 在CONFIG.COLORS添加即可
- **新组件**: 创建类并在main.js注册
- **新功能**: 各模块可独立扩展

### 4. 使用方式

#### 启动项目
```bash
docker-compose up -d
```

访问 `http://localhost:8081`

#### 开发调试
1. 修改模块文件后刷新浏览器（无需重启容器）
2. 使用浏览器DevTools查看ES6模块加载
3. console.log在各模块中正常工作

#### 添加新颜色
```javascript
// config.js
export const CONFIG = {
  COLORS: {
    BLACK: 1,
    WHITE: 2,
    RED: 3,
    BLUE: 4,
    GREEN: 5,  // 新增
  },
  STONE_COLORS: {
    1: '#000000',
    2: '#ffffff',
    3: '#ef4444',
    4: '#3b82f6',
    5: '#22c55e',  // 新增
  },
};
```

```html
<!-- index.html -->
<button class="color-btn" data-color="5">●</button>
```

```css
/* styles.css */
.color-btn[data-color="5"] {
  background: #22c55e;
}
```

### 5. 技术栈
- **前端**: ES6模块, Canvas API, WebSocket
- **后端**: Go 1.20, gorilla/websocket
- **部署**: Docker, docker-compose, Nginx

### 6. 浏览器兼容性
- Chrome/Edge 61+
- Firefox 60+
- Safari 11+
（需要ES6模块支持）

### 7. 未来优化方向
- [ ] TypeScript迁移（类型安全）
- [ ] 单元测试（Jest/Vitest）
- [ ] 构建工具（Vite打包）
- [ ] 棋局回放功能
- [ ] 用户系统（登录/昵称）
- [ ] 房间系统（多局游戏）

---

## 从旧版本迁移
旧版本的所有功能已完整保留：
- ✅ 实时对战
- ✅ 边缘滚动
- ✅ 鼠标滚轮缩放
- ✅ 小地图导航
- ✅ 排行榜统计
- ✅ 视图状态持久化
- ✅ 棋盘重启

## 贡献指南
1. 遵循现有模块结构
2. 新功能创建新模块
3. 修改配置时更新CONFIG
4. 样式改动只修改styles.css
5. 保持类和函数职责单一
