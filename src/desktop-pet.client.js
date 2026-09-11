/**
 * DSH 动态 Cordis 插件 —— 桌宠（客户端半边）
 *
 * 本文件的内容就是 cordis_define 的 `code.client` 参数的取值：
 * 它是一段「纯 JavaScript 函数体」，以 `return` 开头，不能用
 * TypeScript / JSX / import / require，渲染时必须使用 React.createElement。
 *
 * 用法：
 *   1. cordis_define({ plugin: { kind: 'new', idPrefix: 'pet' }, name: '紫球桌宠',
 *        purpose: '...', code: { client: <本文件全部内容> } })
 *   2. cordis_run({ pluginId, packageId, mode: 'run' })
 *
 * 依赖（均为 DSH 已提供的运行时能力）：
 *   - 客户端插槽 `shell.overlay`（全屏浮层，本体点击穿透）
 *   - 客户端服务 `timer`（ctx.timeout，随 Fiber 卸载自动回收）
 *   - 内置符号：React、styles
 */
return {
  inject: ['timer'],
  apply(ctx) {
    const slots = ctx.get('slots'); if (slots === undefined) return
    const disposeStyles = styles.insert(`
      .dsh-pet-layer{position:fixed;inset:0;z-index:9999;pointer-events:none;background:transparent}
      .dsh-pet-wrap{position:absolute;pointer-events:none;background:transparent;
        animation:dsh-pet-bob 3.6s ease-in-out infinite}
      .dsh-pet-wrap.dragging{animation:none}
      @keyframes dsh-pet-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
      .dsh-pet-svg{display:block;overflow:visible;transform-origin:50% 100%}
      .dsh-pet-svg.bounce{animation:dsh-pet-bounce .92s cubic-bezier(.3,.7,.4,1) 1}
      @keyframes dsh-pet-bounce{0%{transform:translateY(0) scale(1,1)}16%{transform:translateY(0) scale(1.09,.89)}
        46%{transform:translateY(-28px) scale(.93,1.08)}74%{transform:translateY(0) scale(1.07,.93)}100%{transform:translateY(0) scale(1,1)}}
      .dsh-pet-svg.wiggle{animation:dsh-pet-wiggle 1.15s ease-in-out 1}
      @keyframes dsh-pet-wiggle{0%,100%{transform:rotate(0deg)}14%{transform:rotate(-12deg)}34%{transform:rotate(10deg)}
        54%{transform:rotate(-8deg)}74%{transform:rotate(6deg)}88%{transform:rotate(-3deg)}}
      .dsh-pet-ball{pointer-events:auto;cursor:grab}
      .dsh-pet-wrap.dragging .dsh-pet-ball{cursor:grabbing}
      .dsh-pet-look{transition:transform .34s cubic-bezier(.34,1.4,.5,1)}
      .dsh-pet-eye{transform-box:fill-box;transform-origin:50% 50%;transform:rotate(16deg);
        animation:dsh-pet-blink 5.4s ease-in-out infinite}
      .dsh-pet-eye.right{animation-delay:.14s}
      @keyframes dsh-pet-blink{0%,93%,100%{transform:rotate(16deg) scaleY(1)}96%{transform:rotate(16deg) scaleY(.14)}}
      .dsh-pet-wink{transform-box:fill-box;transform-origin:50% 50%}
      .dsh-pet-wink.run{animation:dsh-pet-wink .44s ease-in-out 1}
      @keyframes dsh-pet-wink{0%{transform:scaleY(1)}30%{transform:scaleY(.08)}50%{transform:scaleY(1)}68%{transform:scaleY(.12)}100%{transform:scaleY(1)}}
    `)
    ctx.effect(() => disposeStyles)
    slots.inject('shell.overlay', () => slots.register({name:'shell.overlay',id:'dsh-desktop-pet',order:1000,label:'紫球桌宠'}, () => {
      const SIZE = 116, C = 58, EYE_W = 18, EYE_H = 27, EYE_OFF = 17
      const sPos = React.useState(null), pos = sPos[0], setPos = sPos[1]
      const sEye = React.useState({x:0,y:0}), eye = sEye[0], setEye = sEye[1]
      const sLook = React.useState({x:0,y:0}), look = sLook[0], setLook = sLook[1]
      const sDrag = React.useState(false), dragging = sDrag[0], setDragging = sDrag[1]
      const sWink = React.useState(0), wink = sWink[0], setWink = sWink[1]
      const sAct = React.useState({kind:'none',seq:0}), act = sAct[0], setAct = sAct[1]
      const ref = React.useRef({ pos: null, drag: null, mouse: null, lastMove: 0, mounted: false, lookTimer: null })
      const clamp = (v) => v < -1 ? -1 : (v > 1 ? 1 : v)

      React.useEffect(() => {
        const start = { x: window.innerWidth - SIZE - 34, y: window.innerHeight - SIZE - 30 }
        ref.current.pos = start
        setPos(start)
      }, [])

      React.useEffect(() => {
        const aim = () => {
          const p = ref.current.pos, m = ref.current.mouse
          if (p === null || m === null) return
          setEye({ x: clamp((m.x - (p.x + C)) / 170), y: clamp((m.y - (p.y + C)) / 170) })
        }
        const onMove = (e) => {
          ref.current.mouse = { x: e.clientX, y: e.clientY }
          ref.current.lastMove = Date.now()
          const d = ref.current.drag
          if (d !== null) {
            const nx = Math.min(Math.max(e.clientX - d.dx, 4), window.innerWidth - SIZE - 4)
            const ny = Math.min(Math.max(e.clientY - d.dy, 4), window.innerHeight - SIZE - 4)
            const next = { x: nx, y: ny }
            ref.current.pos = next
            setPos(next)
          }
          aim()
        }
        const onUp = (e) => {
          const d = ref.current.drag
          if (d === null) return
          ref.current.drag = null
          setDragging(false)
          if (Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) < 5) setWink((n) => n + 1)
        }
        const noDrag = (e) => e.preventDefault()
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
        document.addEventListener('dragstart', noDrag)
        return () => {
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onUp)
          document.removeEventListener('dragstart', noDrag)
        }
      }, [])

      React.useEffect(() => {
        ref.current.mounted = true
        let stopped = false
        const step = () => {
          if (stopped) return
          ctx.timeout(() => {
            if (stopped) return
            const r = Math.random()
            if (r < 0.34) {
              setWink((n) => n + 1)
            } else if (r < 0.68) {
              if (Date.now() - ref.current.lastMove > 2500) {
                const a = Math.random() * Math.PI * 2, rad = 8 + Math.random() * 5
                setLook({ x: Math.cos(a) * rad, y: Math.sin(a) * rad })
                if (ref.current.lookTimer !== null) ref.current.lookTimer()
                ref.current.lookTimer = ctx.timeout(() => {
                  if (!stopped) setLook({ x: 0, y: 0 })
                }, 700 + Math.random() * 800)
              }
            } else if (r < 0.85) {
              setAct((prev) => ({ kind: 'bounce', seq: prev.seq + 1 }))
            } else {
              setAct((prev) => ({ kind: 'wiggle', seq: prev.seq + 1 }))
            }
            step()
          }, 3200 + Math.random() * 4800)
        }
        step()
        return () => {
          stopped = true
          ref.current.mounted = false
          if (ref.current.lookTimer !== null) { ref.current.lookTimer(); ref.current.lookTimer = null }
        }
      }, [])

      const onDown = (e) => {
        const p = ref.current.pos
        if (p === null || e.button !== 0) return
        e.preventDefault()
        ref.current.drag = { dx: e.clientX - p.x, dy: e.clientY - p.y, startX: e.clientX, startY: e.clientY }
        setDragging(true)
      }
      const eyeRect = (side, cx) => React.createElement('rect', {
        className: 'dsh-pet-eye ' + side,
        x: cx - EYE_W / 2, y: C - EYE_H / 2, width: EYE_W, height: EYE_H, rx: EYE_W / 2, ry: EYE_W / 2,
        fill: '#ffffff',
      })
      const eyeGroup = (side, cx) => React.createElement('g', {
        key: side + '-' + wink,
        className: 'dsh-pet-wink' + (wink > 0 ? ' run' : ''),
      }, eyeRect(side, cx))
      const svg = React.createElement('svg', {
        key: 'pet-' + act.seq,
        className: 'dsh-pet-svg' + (act.kind === 'none' ? '' : ' ' + act.kind),
        width: SIZE, height: SIZE, viewBox: '0 0 ' + SIZE + ' ' + SIZE,
      },
        React.createElement('circle', { className: 'dsh-pet-ball', cx: C, cy: C, r: C, fill: '#b28df5', onMouseDown: onDown }),
        React.createElement('g', { className: 'dsh-pet-look', style: { transform: 'translate(' + look.x + 'px,' + look.y + 'px)' } },
          React.createElement('g', { transform: 'translate(' + (eye.x * 11) + ',' + (eye.y * 11) + ')' },
            eyeGroup('left', C - EYE_OFF),
            eyeGroup('right', C + EYE_OFF),
          ),
        ),
      )
      return React.createElement('div', { className: 'dsh-pet-layer' },
        React.createElement('div', {
          className: 'dsh-pet-wrap' + (dragging ? ' dragging' : ''),
          style: pos === null ? { visibility: 'hidden' } : { left: pos.x + 'px', top: pos.y + 'px', width: SIZE + 'px', height: SIZE + 'px' },
        }, svg),
      )
    }))
  }
}
