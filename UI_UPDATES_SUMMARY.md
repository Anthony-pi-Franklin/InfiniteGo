# UI 更新总结

本次更新实现了以下四个需求：

## 1. 移除左侧菜单中的 Color Section
- **修改文件**: `index.html`, `main.js`
- **描述**: 完全移除了游戏中的Color选择部分，因为玩家的颜色在进入房间时已被锁定

## 2. 双击小地图和Leader Board 进行嵌入/分离
- **修改文件**: `minimap.js`, `leaderboard.js`, `index.html`, `styles.css`, `main.js`
- **功能**:
  - **默认状态**: 小地图和领导板在游戏开始时自动嵌入左侧菜单
  - **双击分离**: 在菜单中双击小地图或领导板的标题，可将其分离为浮动窗口
  - **菜单隐藏**: 当菜单隐藏时，嵌入的小地图和领导板也会自动隐藏
  - **双击重新嵌入**: 在浮动状态下双击标题可重新嵌入到菜单中

## 3. 嵌入菜单中的小地图和Leader Board 可跟随菜单隐藏
- **实现方式**: 通过将组件放入菜单的占位符（placeholder）中
- **效果**: 菜单隐藏时，嵌入的组件自动隐藏；菜单显示时，组件也跟随显示

## 4. Leader Board 自动适配大小
- **修改文件**: `leaderboard.js`
- **功能**:
  - **自动大小调整**: 根据当前显示的玩家数量自动调整高度
  - **最多显示10个**: 超过10个玩家时，只显示排名前10的
  - **手动调整检测**: 用户手动调整大小后，自动调整功能会被禁用
  - **嵌入模式**: 在菜单中嵌入时，高度自动调整；分离为浮动窗口时仍可保留用户设置的大小

## 技术实现细节

### 核心变更

1. **minimap.js**:
   - 添加 `embedded` 标志追踪嵌入状态
   - 添加 `embedInSidebar()` 方法将minimap移入菜单
   - 添加 `separateFromSidebar()` 方法将minimap分离出来
   - 修改双击事件处理：嵌入状态下双击分离，浮动状态下双击折叠
   - 在嵌入状态下禁用拖拽、调整大小和画布导航功能

2. **leaderboard.js**:
   - 添加 `embedded` 标志追踪嵌入状态
   - 添加 `userResized` 标志追踪用户是否手动调整过大小
   - 添加 `embedInSidebar()` 方法将leaderboard移入菜单
   - 添加 `separateFromSidebar()` 方法将leaderboard分离出来
   - 添加 `autoAdjustHeight()` 方法根据条目数自动调整高度
   - 修改双击事件处理：嵌入状态下双击分离，浮动状态下双击折叠
   - 在嵌入状态下禁用拖拽和调整大小功能

3. **index.html**:
   - 移除Color选择section
   - 添加 `minimap-placeholder` 占位符用于嵌入小地图
   - 添加 `leaderboard-placeholder` 占位符用于嵌入领导板

4. **styles.css**:
   - 添加 `.embedded` 样式用于嵌入状态的组件
   - 样式包括静态定位、100%宽度、响应式布局等

5. **main.js**:
   - 修改 `setupComponents()` 方法，在初始化后自动将minimap和leaderboard嵌入菜单
   - 颜色按钮事件处理已移除

## 用户交互流程

### 初始状态（游戏开始时）
```
菜单（展开）
├─ Room Info
├─ Placement Mode
├─ Minimap （嵌入在此）
└─ Leaderboard （嵌入在此）
```

### 用户双击Minimap标题
```
浮动窗口模式激活
- Minimap浮动在右侧，可拖拽和调整大小
- 再次双击可以重新嵌入菜单
```

### 菜单隐藏时
```
所有嵌入的组件自动隐藏
- 当菜单再次显示时，组件恢复可见
- 浮动的组件保持可见
```

## 未来改进建议
- 可以添加persistent存储来记住用户的偏好设置（嵌入还是浮动）
- 可以优化嵌入时的canvas大小计算
- 可以添加更多的UI反馈（如拖拽预览）
