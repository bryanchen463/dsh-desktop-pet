# Desktop Pet · 紫色圆球桌宠

一只会盯着鼠标看的紫色圆球桌宠：眼睛永远跟着你的光标，可以随手拖到屏幕任意位置，点一下会眨眼，闲着的时候会自己眨眼、四处张望、弹跳和摇头。

最初作为 **DSH（DeepSeek Harness）动态 Cordis 插件** 开发，现在仓库里同时提供三种形态：

- `profile-plugin/` —— 可永久安装进 DSH Web 客户端的 out-of-tree 客户端插件；
- `src/desktop-pet.client.js` —— 动态 Cordis 插件（会话内临时加载，进程重启即消失）；
- `standalone/` —— 无依赖网页版，直接放进任意前端项目。

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

## 引入方式

### 方式一：安装进 DSH 的 Web profile（推荐，重启后仍在）

DSH 的每个 profile 都有一层自己的补丁层 `cordis.patch.yml`，用来插入 out-of-tree 插件行；桌宠是纯浏览器 UI，所以它是一行**客户端插件**行。

**1. 复制插件包**

```powershell
# Windows PowerShell
$profile = "$env:USERPROFILE\.dsh\profiles\web"
New-Item -ItemType Directory -Force "$profile\plugins\dsh-desktop-pet\lib" | Out-Null
Copy-Item .\profile-plugin\package.json   "$profile\plugins\dsh-desktop-pet\package.json" -Force
Copy-Item .\profile-plugin\lib\index.js   "$profile\plugins\dsh-desktop-pet\lib\index.js" -Force
Copy-Item .\profile-plugin\lib\client.js  "$profile\plugins\dsh-desktop-pet\lib\client.js" -Force
```

```bash
# macOS / Linux
profile="${DSH_HOME:-$HOME/.dsh}/profiles/web"
mkdir -p "$profile/plugins/dsh-desktop-pet/lib"
cp profile-plugin/package.json  "$profile/plugins/dsh-desktop-pet/package.json"
cp profile-plugin/lib/index.js  "$profile/plugins/dsh-desktop-pet/lib/index.js"
cp profile-plugin/lib/client.js "$profile/plugins/dsh-desktop-pet/lib/client.js"
```

**2. 在 profile 的补丁层里加一行**

编辑 `${DSH_HOME:-~/.dsh}/profiles/web/cordis.patch.yml`：

```yaml
- insert:
    - id: desktop-pet
      name: './plugins/dsh-desktop-pet/lib/index.js'
```

文件里已经有 `- insert:` 列表时，直接把这两行追加到该列表末尾（保持 4 空格 / 6 空格缩进）。

**3. 重启该 profile 后刷新页面**

```bash
dsh --profile web
```

桌宠出现在窗口右下角。补丁层是 `patchReload: live` 的，部分环境下保存 `cordis.patch.yml` 后直接刷新页面就已经生效；没出现就重启一次 profile。

**卸载**：删掉 `plugins/dsh-desktop-pet/` 目录，并删除补丁层里那两行，重启即可。

**自定义**：球体颜色写在 `profile-plugin/lib/client.js` 的 `circle` 上（`fill: "#b28df5"`），尺寸是文件里的 `SIZE = 116`（眼睛几何用 116 的 viewBox，改 `SIZE` 只缩放不重排）；注册位置在 `ctx.slots.register(...)`，`order` 控制它在浮层里的层级。

### 方式二：动态 Cordis 插件（临时试用）

在任何带 Cordis 工具集的 DSH 会话里，把 `src/desktop-pet.client.js` 的内容交给它：

```js
cordis_define({
  plugin: { kind: 'new', idPrefix: 'pet' },
  name: '紫球桌宠',
  purpose: '在应用右下角显示一个会追踪鼠标的桌宠。',
  code: { client: /* src/desktop-pet.client.js 的全部内容 */ '' },
})
cordis_run({ pluginId: 'pet-xxx', packageId: 'pkg-xxx', mode: 'run' })
```

首次运行需要你在界面上批准；好处是改一行就能立刻重载，代价是**进程重启后消失**。

### 方式三：无依赖网页版

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

也可以自动挂载：`<script src="standalone/desktop-pet.js" data-auto></script>`。
本地预览：直接用浏览器打开 `standalone/index.html`。

## 文件结构

```
.
├── profile-plugin/             # 方式一：可安装进 dsh Web profile 的插件包
│   ├── package.json            #   声明 dsh.client（platform: web）
│   └── lib/
│       ├── index.js            #   node 半边：空 apply，只为 Loader 提供一行
│       └── client.js           #   浏览器半边：__ModuleLoader__ 懒加载工厂
├── src/
│   └── desktop-pet.client.js   # 方式二：动态 Cordis 插件的函数体
├── standalone/
│   ├── desktop-pet.js          # 方式三：无依赖网页版
│   └── index.html              #   演示页
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## 实现要点

- **正圆**：用内联 SVG `<circle>` 绘制球体，不依赖 CSS `border-radius`，避免被宿主全局样式改成方形；同时不使用 `box-shadow`，防止在圆外出现方形阴影。
- **眼睛跟随**：外层 `<g>` 用属性 `transform` 做实时瞄准偏移；内层 `<g>` 负责点击/空闲触发的一次性动画；CSS `transform` 与 SVG 属性 `transform` 分处不同元素，互不覆盖。
- **动作重放**：一次性动画（眨眼、弹跳、摇头）通过换 `key` 重挂元素（插件版）或强制重排后重新加类名（网页版）来重放，不依赖定时器清理状态。
- **拖动与点击区分**：`mousedown` 记录起点，`mouseup` 时若位移小于 5px 判定为点击，触发眨眼。
- **DSH 客户端插件模型**：`package.json` 的 `dsh.client` 让 client-modules 的 node 半边把本包扫进 `window.__DSH_BOOT__` 并托管它的 `client.js`；脚本执行时只注册工厂，真正的副作用（含样式注入）发生在 materialize 时。插件向 `shell.overlay`（全屏浮层、默认点击穿透）注册一个条目，因此不会遮挡页面操作。
- **生命周期**：样式用 `ctx.effect` 持有，定时器用 `ctx.timeout` 创建，监听器在 `useEffect` 的清理函数里注销；停用、更新或删除这一行，页面会回到原样。

## 已验证环境

- DSH `0.1.2-rc.1`，Web profile（`~/.dsh/profiles/web`），Windows。
- 方式一：复制插件包 + 补丁层插入一行 → 刷新页面后桌宠出现，鼠标追踪、拖动、点击眨眼、随机动作全部正常。

## 版本历史

见 [CHANGELOG.md](CHANGELOG.md)。

## License

[MIT](LICENSE)
