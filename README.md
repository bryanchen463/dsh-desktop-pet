# Desktop Pet · 紫色圆球桌宠

一只会盯着鼠标看的紫色圆球桌宠：眼睛永远跟着你的光标，可以随手拖到屏幕任意位置，点一下会眨眼，闲着的时候会自己眨眼、四处张望、弹跳和摇头。

最初作为 **DSH（DeepSeek Harness）动态 Cordis 插件** 开发，本仓库同时提供了**无依赖的网页版**，可以直接放进任何前端项目。

```
        ●  ●        ← 白色眼睛，跟随鼠标
     ╭──────────╮
     │   #b28df5 │   ← 平面紫色圆球（SVG 绘制，不会被圆角样式影响）
     ╰──────────╯
```

## 功能

| 能力 | 说明 |
| --- | --- |
| 眼睛追踪 | 眼睛按「鼠标相对球心」的方向偏移并夹取范围，球被拖到任何位置都成立 |
| 拖动 | 按住圆球拖到任意位置，松开停住；只有圆形本体可点，不遮挡周围点击 |
| 点击互动 | 点击一下连眨两下眼睛；位移小于 5px 才算点击，拖动不会误触 |
| 随机动作 | 每隔 3.2–8 秒随机执行：眨眼 / 四处张望 / 弹跳 / 摇头 |
| 呼吸感 | 常驻的轻微上下浮动，以及每 5.4 秒一次的自动眨眼 |
| 平面造型 | 纯色球体，无渐变、无内阴影，SVG `<circle>` 保证是正圆 |

## 两种用法

### 1. 无依赖网页版（任意项目可用）

```html
<script src="standalone/desktop-pet.js"></script>
<script>
  const pet = DesktopPet.create({
    size: 116,          // 直径（像素）
    color: '#b28df5',   // 球体颜色
    right: 34,          // 初始距右边缘
    bottom: 30,         // 初始距下边缘
    idleMin: 3200,      // 随机动作最小间隔（毫秒）
    idleMax: 8000,      // 随机动作最大间隔（毫秒）
  })

  pet.blink()                 // 手动眨眼
  pet.lookAround()            // 手动四处张望
  pet.play('bounce')          // 弹跳（也支持 'wiggle'）
  pet.setPosition(100, 200)   // 移动桌宠
  pet.destroy()               // 移除桌宠并清理所有监听与定时器
</script>
```

也可以自动挂载：

```html
<script src="standalone/desktop-pet.js" data-auto></script>
```

本地预览：直接用浏览器打开 `standalone/index.html`。

### 2. DSH 动态 Cordis 插件

`src/desktop-pet.client.js` 的内容就是 `cordis_define` 的 `code.client` 取值 —— 一段以 `return` 开头的**纯 JavaScript 函数体**（不能用 TypeScript / JSX / `import`，渲染必须使用 `React.createElement`）。

把该文件内容原样传给 `cordis_define`，再 `cordis_run` 启动即可：

```js
cordis_define({
  plugin: { kind: 'new', idPrefix: 'pet' },
  name: '紫球桌宠',
  purpose: '在应用右下角显示一个会追踪鼠标的桌宠。',
  code: { client: /* src/desktop-pet.client.js 的全部内容 */ '' },
})

cordis_run({ pluginId: 'pet-xxx', packageId: 'pkg-xxx', mode: 'run' })
```

运行时依赖（DSH 均已提供）：

- 客户端插槽 `shell.overlay`：全屏浮层，本体点击穿透，桌宠只是其中一个条目；
- 客户端服务 `timer`：使用 `ctx.timeout` 调度随机动作，随 Fiber 卸载自动回收；
- 内置符号：`React`、`styles`（样式随运行结束自动移除）。

## 文件结构

```
.
├── src/
│   └── desktop-pet.client.js   # DSH 动态 Cordis 插件（客户端半边，函数体）
├── standalone/
│   ├── desktop-pet.js          # 无依赖网页版
│   └── index.html              # 演示页
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## 实现要点

- **正圆**：用内联 SVG `<circle>` 绘制球体，不依赖 CSS `border-radius`，避免被宿主全局样式改成方形；同时不使用 `box-shadow`，防止在圆外出现方形阴影。
- **眼睛跟随**：外层 `<g>` 用属性 `transform` 做实时瞄准偏移；内层 `<g>` 负责点击/空闲触发的一次性动画；CSS `transform` 与 SVG 属性 `transform` 分处不同元素，互不覆盖。
- **动作重放**：一次性动画（眨眼、弹跳、摇头）通过重新挂载元素或强制重排后重新加类名来重放，不依赖定时器清理状态。
- **拖动与点击区分**：`mousedown` 记录起点，`mouseup` 时若位移小于 5px 判定为点击，触发眨眼。

## 版本历史

见 [CHANGELOG.md](CHANGELOG.md)。

## License

[MIT](LICENSE)
