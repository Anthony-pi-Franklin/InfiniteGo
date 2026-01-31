# InfiniteGo 前端架构

## 目录结构

```
client/
├── core/                    # 核心模块
│   ├── EventBus.js          # 事件总线 - 组件间解耦通信
│   └── index.js             # 核心模块导出
├── ui/                      # UI 组件
│   ├── FloatingPanel.js     # 浮动面板基类
│   ├── MinimapPanel.js      # 小地图面板
│   ├── LeaderboardPanel.js  # 排行榜面板
│   ├── UIManager.js         # UI 管理器
│   └── index.js             # UI 模块导出
├── config.js                # 配置常量
├── state.js                 # 游戏状态管理
├── render.js                # 主画布渲染
├── input.js                 # 输入处理
├── net.js                   # 网络通信
├── main.js                  # 应用入口
├── minimap.js               # 向后兼容导出
├── leaderboard.js           # 向后兼容导出
├── lobby.js                 # 大厅页面
├── index.html               # 游戏页面
└── lobby.html               # 大厅页面
```

## 架构设计

### 1. 事件总线 (EventBus)

位于 `core/EventBus.js`，提供发布-订阅模式的组件通信：

```javascript
import { eventBus, Events } from './core/EventBus.js';

// 订阅事件
eventBus.on(Events.STATE_DELTA, (data) => {
  console.log('State changed:', data);
});

// 发布事件
eventBus.emit(Events.STATE_DELTA, { added: [], removed: [] });
```

**预定义事件：**
- `NETWORK_*` - 网络相关事件
- `STATE_*` - 状态变化事件
- `INPUT_*` - 输入事件
- `VIEW_*` - 视图事件
- `UI_*` - UI 事件
- `PANEL_*` - 面板事件

### 2. 浮动面板基类 (FloatingPanel)

位于 `ui/FloatingPanel.js`，提供所有浮动面板的通用功能：

- 拖拽移动
- 调整大小
- 碰撞检测与避让
- 嵌入/分离侧边栏
- 位置约束（视口边界）

**继承示例：**

```javascript
class MyPanel extends FloatingPanel {
  constructor(element, state) {
    super(element, {
      id: 'my-panel',
      placeholderId: 'my-placeholder',
      defaultPosition: { top: '16px', right: '16px' },
      defaultSize: { width: '200px', height: 'auto' },
      minSize: { width: 100, height: 100 },
    });
    
    this.state = state;
  }
  
  // 重写回调
  onResize(width, height) { /* 处理调整大小 */ }
  onEmbed() { /* 嵌入侧边栏时 */ }
  onSeparate() { /* 分离时 */ }
}
```

### 3. UI 管理器 (UIManager)

位于 `ui/UIManager.js`，集中管理 UI 状态：

- 侧边栏显示/隐藏/调整大小
- 面板注册与管理
- 状态显示更新
- 触发碰撞检测

```javascript
import { uiManager } from './ui/UIManager.js';

uiManager.initialize();
uiManager.registerPanel('minimap', minimapPanel);
uiManager.updateStatus('Connected');
```

### 4. 配置管理 (Config)

位于 `config.js`，集中所有配置：

```javascript
import { CONFIG, getColorConfig, getAvailableColors } from './config.js';

// 使用配置
const scale = CONFIG.DEFAULT_SCALE;

// 获取颜色配置
const colorInfo = getColorConfig(0); // { fill, stroke, name, uiBg, uiText }
```

### 5. 状态管理 (GameState)

位于 `state.js`，管理游戏状态并发射事件：

```javascript
import { GameState } from './state.js';

const state = new GameState();
state.applyDelta(delta);  // 自动发射 STATE_UPDATED 事件
state.getColorCounts();   // 获取各颜色棋子数量
```

## 扩展指南

### 添加新的浮动面板

1. 创建继承 `FloatingPanel` 的新类
2. 在 HTML 中添加面板元素
3. 在 `main.js` 中实例化并注册到 `uiManager`

### 添加新事件

1. 在 `core/EventBus.js` 的 `Events` 中添加事件常量
2. 在相应位置发射事件
3. 在需要响应的组件中订阅事件

### 添加新颜色

1. 在 `config.js` 中添加到 `COLORS`、`COLOR_NAMES`、`STONE_COLORS` 等
2. 在服务端添加对应支持

## 最佳实践

1. **组件解耦**：通过事件总线通信，避免直接引用
2. **继承复用**：浮动面板使用基类，避免重复代码
3. **配置集中**：所有常量放在 `config.js`
4. **状态统一**：游戏状态通过 `GameState` 管理
5. **清理资源**：组件销毁时调用 `destroy()` 方法
