# dsh-desktop-pet（DSH Web 客户端插件包）

把桌宠作为 **out-of-tree 客户端插件** 安装进任意 DSH 部署：复制本目录，然后在对应 profile 的
`cordis.patch.yml` 里插入一行即可。完整步骤见仓库根目录的 [README](../README.md#方式一安装进-dsh-的-web-profile推荐重启后仍在)。

```
package.json      # name=dsh-desktop-pet；dsh.client 声明 platform: web
lib/index.js      # node 半边：空 apply，只为 Loader 提供一行
lib/client.js     # 浏览器半边：window.__ModuleLoader__.load({ id, factory })
```

补丁层内容：

```yaml
- insert:
    - id: desktop-pet
      name: './plugins/dsh-desktop-pet/lib/index.js'
```

## 为什么这样就能生效

- `package.json` 里的 `dsh.client` 让 `@deepseek-ai/dsh-client-modules` 的 node 半边把本包识别为
  客户端插件：它读取 `exports["./client"]`，把入口写进注入页面的 `window.__DSH_BOOT__`，并由
  webserver 提供对应的 `client.js`。
- `lib/client.js` 只做一件事——注册工厂 `id` + `factory(require)`；`id` 必须等于包名
  （浏览器模块表的键就是包名）。真正的副作用发生在 materialize 时，所以样式注入写在工厂内部。
- 工厂导出的 `inject = ["slots", "timer"]` 是 Cordis 服务级依赖：等 `slots` 与 `timer` 就绪后
  `apply(ctx)` 才会执行；`dsh.client.inject` 里的 `@deepseek-ai/dsh-client-ui-layout` 则保证
  本行在声明了 `shell.overlay` 的 layout 之后合成。
- 桌宠只往 `shell.overlay`（全屏、默认点击穿透的列表槽）加一个条目，因此不会替换或遮挡任何
  内置 UI；`ctx.effect` 与 `ctx.timeout` 让样式与定时器都随这一行的生命周期回收。
