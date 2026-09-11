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

## 在其他 DSH 部署中使用

三种引入方式，按「要不要让它一直存在」选：

| 方式 | 适用场景 | 生命周期 |
| --- | --- | --- |
| 一、profile 插件 | 自己长期用、给团队装机、随 dsh 一起启动 | 跟进程走，**重启后仍在** |
| 二、动态 Cordis 插件 | 临时试玩、改一行就想立刻看到效果 | 只在当前进程，重启即消失 |
| 三、无依赖网页版 | 非 DSH 的网页项目 | 页面级 |

### 方式一：安装到任意 DSH 部署（推荐，重启后仍在）

**前置条件**

- 目标是 DSH 的 **Web 界面**（`dsh --profile web`），实测版本 `0.1.2-rc.1`；
- 有权限写入 `${DSH_HOME:-~/.dsh}/profiles/`（Windows 是 `%USERPROFILE%\.dsh\profiles\`）；
- 只需要重启该 profile —— **不用改 host 组合、也不用动 agent preset**：桌宠是纯浏览器 UI，落在 profile 补丁层 `cordis.patch.yml` 里的一行**客户端插件**上。

**第 1 步 · 找到 profile 目录**

```bash
echo "${DSH_HOME:-$HOME/.dsh}"                 # Windows: echo $env:USERPROFILE\.dsh
ls   "${DSH_HOME:-$HOME/.dsh}/profiles"        # Web 界面的 profile 通常叫 web
ls   "${DSH_HOME:-$HOME/.dsh}/profiles/web"    # 里面应有 cordis.yml / cordis.patch.yml / plugins/
```

profile 名不一定是 `web`，以目录里同时存在 `cordis.yml` 与 `cordis.patch.yml` 的那个为准。

**第 2 步 · 把插件包放进 profile 的 `plugins/` 目录**

A. 已经 clone 了本仓库 —— 复制 `profile-plugin/`

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

B. 不想手工拷贝 —— 直接在 `plugins/` 里 clone 本仓库

```bash
cd "${DSH_HOME:-$HOME/.dsh}/profiles/web/plugins"
git clone https://github.com/bryanchen463/dsh-desktop-pet.git
```

这种方式的插件包实际位于 `plugins/dsh-desktop-pet/profile-plugin/`，所以第 3 步的补丁行路径要写成
`./plugins/dsh-desktop-pet/profile-plugin/lib/index.js`；以后升级只需 `git pull` 再重启 profile。

**第 3 步 · 在 profile 的补丁层插入插件行**

编辑 `${DSH_HOME:-~/.dsh}/profiles/web/cordis.patch.yml`：

```yaml
- insert:
    - id: desktop-pet
      name: './plugins/dsh-desktop-pet/lib/index.js'
```

- 文件里已经有 `- insert:` 列表时，把 `- id:` / `name:` 两行追加到该列表末尾，缩进保持 4 空格（列表项）与 6 空格（字段）；
- 路径是**相对 profile 目录**的，必须指向 **node 半边** `lib/index.js`（不是 `client.js`，浏览器半边由它自己托管）；
- `id` 可以自取，只要不与文件里已有 id 重复；桌宠在浮层内按 `order: 1000` 排序。

**第 4 步 · 重启该 profile，然后刷新页面**

```bash
dsh --profile web
```

右下角出现紫球。补丁层是 `patchReload: live` 的，部分环境下保存 `cordis.patch.yml` 后直接刷新页面就已生效；没出现就重启一次 profile。

**第 5 步 · 确认生效**

1. 移动鼠标：眼睛跟着转（页面上方、左侧都会看）；
2. 按住圆球拖动：能拖到任意位置，松开停住；
3. 点击一下：连眨两下眼睛；
4. 什么都不做：3–8 秒内会自己眨眼 / 张望 / 弹跳 / 摇头。

注意两点：拖动位置不写盘（插件不做持久化），刷新后回到右下角；想让它对每个新会话都在，用这种方式而不是方式二。

**排查**

| 现象 | 检查 |
| --- | --- |
| 刷新后没有紫球 | 补丁行路径是否指向 `lib/index.js`（不是 `client.js`）；是否重启了 profile；浏览器强制刷新（Ctrl+F5） |
| 启动时报 `client bundle not found` | 目录里必须同时有 `lib/index.js` 与 `lib/client.js`，且 `package.json` 的 `exports["./client"]` 指向后者 |
| 有紫球但眼睛不动 | `lib/client.js` 顶部的 `inject` 需要 `slots` 与 `timer` 两个客户端服务，别删掉 |
| 不确定是插件还是旧的动态插件在渲染 | 停掉动态插件后刷新，仍能看到紫球即为插件生效 |
| 想给另一个 profile 也装上 | 每个 profile 独立，对该 profile 重复第 2–4 步 |

**升级 / 卸载**

- 升级：clone 方式直接 `git pull`；复制方式重新覆盖三个文件；然后重启 profile。
- 卸载：删除 `plugins/dsh-desktop-pet/` 目录 + 删除补丁层里那两行 + 重启 profile。样式、定时器、监听器都由这一行持有，会一并回收，页面回到原样。

**自定义**：球体颜色在 `profile-plugin/lib/client.js` 里 `circle` 的 `fill: "#b28df5"`；尺寸是文件里的 `SIZE = 116`（眼睛几何基于 116 的 viewBox，改 `SIZE` 只缩放不重排）；浮层里的层级由 `ctx.slots.register(..., { order: 1000 })` 控制。

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
│   ├── README.md               #   为什么这样就能生效
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
- 方式一：复制插件包 + 补丁层插入一行 → **停掉同名动态插件后刷新页面，桌宠依然出现**，鼠标追踪、拖动、点击眨眼、随机动作全部正常。

## 版本历史

见 [CHANGELOG.md](CHANGELOG.md)。

## License

[MIT](LICENSE)
