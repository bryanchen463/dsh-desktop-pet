/*!
 * Desktop Pet — 一只紫色圆球桌宠，眼睛始终盯着鼠标。
 * 无依赖：直接放进任意网页即可使用。
 *
 *   <script src="desktop-pet.js"></script>
 *   <script>DesktopPet.create()</script>
 *
 * 也可以自动挂载：
 *   <script src="desktop-pet.js" data-auto></script>
 *
 * MIT License
 */
(function (global) {
  'use strict'

  var NS = 'http://www.w3.org/2000/svg'
  var BASE = 116
  var VIEW = 116
  var CENTER = 58
  var EYE_W = 18
  var EYE_H = 27
  var EYE_OFF = 17
  var AIM_RANGE = 170
  var AIM_DISTANCE = 11
  var CLICK_SLOP = 5

  var CSS = [
    '.dsh-pet-layer{position:fixed;inset:0;z-index:9999;pointer-events:none;background:transparent}',
    '.dsh-pet-wrap{position:absolute;pointer-events:none;background:transparent;',
    '  animation:dsh-pet-bob 3.6s ease-in-out infinite}',
    '.dsh-pet-wrap.dragging{animation:none}',
    '@keyframes dsh-pet-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}',
    '.dsh-pet-svg{display:block;overflow:visible;transform-origin:50% 100%}',
    '.dsh-pet-svg.bounce{animation:dsh-pet-bounce .92s cubic-bezier(.3,.7,.4,1) 1}',
    '@keyframes dsh-pet-bounce{0%{transform:translateY(0) scale(1,1)}16%{transform:translateY(0) scale(1.09,.89)}',
    '  46%{transform:translateY(-28px) scale(.93,1.08)}74%{transform:translateY(0) scale(1.07,.93)}100%{transform:translateY(0) scale(1,1)}}',
    '.dsh-pet-svg.wiggle{animation:dsh-pet-wiggle 1.15s ease-in-out 1}',
    '@keyframes dsh-pet-wiggle{0%,100%{transform:rotate(0deg)}14%{transform:rotate(-12deg)}34%{transform:rotate(10deg)}',
    '  54%{transform:rotate(-8deg)}74%{transform:rotate(6deg)}88%{transform:rotate(-3deg)}}',
    '.dsh-pet-ball{pointer-events:auto;cursor:grab}',
    '.dsh-pet-wrap.dragging .dsh-pet-ball{cursor:grabbing}',
    '.dsh-pet-look{transition:transform .34s cubic-bezier(.34,1.4,.5,1)}',
    '.dsh-pet-eye{transform-box:fill-box;transform-origin:50% 50%;transform:rotate(16deg);',
    '  animation:dsh-pet-blink 5.4s ease-in-out infinite}',
    '.dsh-pet-eye.right{animation-delay:.14s}',
    '@keyframes dsh-pet-blink{0%,93%,100%{transform:rotate(16deg) scaleY(1)}96%{transform:rotate(16deg) scaleY(.14)}}',
    '.dsh-pet-wink{transform-box:fill-box;transform-origin:50% 50%}',
    '.dsh-pet-wink.run{animation:dsh-pet-wink .44s ease-in-out 1}',
    '@keyframes dsh-pet-wink{0%{transform:scaleY(1)}30%{transform:scaleY(.08)}50%{transform:scaleY(1)}68%{transform:scaleY(.12)}100%{transform:scaleY(1)}}',
  ].join('\n')

  var cssInjected = false

  function injectCss() {
    if (cssInjected || !document.head) return
    var style = document.createElement('style')
    style.setAttribute('data-desktop-pet', '')
    style.textContent = CSS
    document.head.appendChild(style)
    cssInjected = true
  }

  function svgNode(name, attrs) {
    var node = document.createElementNS(NS, name)
    for (var key in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) node.setAttribute(key, attrs[key])
    }
    return node
  }

  function clampUnit(value) {
    return value < -1 ? -1 : (value > 1 ? 1 : value)
  }

  function clampRange(value, min, max) {
    return value < min ? min : (value > max ? max : value)
  }

  function restart(node, className) {
    node.classList.remove(className)
    // 读取一次布局，强制浏览器重排，使同一个动画可以再次播放
    void node.getBoundingClientRect()
    node.classList.add(className)
  }

  /**
   * 创建一个桌宠。
   * @param {object} [options]
   * @param {number} [options.size=116]      直径（像素）
   * @param {string} [options.color='#b28df5'] 球体颜色
   * @param {number} [options.right=34]      初始距右边缘
   * @param {number} [options.bottom=30]     初始距下边缘
   * @param {number} [options.idleMin=3200]  随机动作最小间隔（毫秒）
   * @param {number} [options.idleMax=8000]  随机动作最大间隔（毫秒）
   * @returns {{element: HTMLElement, destroy: Function, blink: Function, lookAround: Function, play: Function, setPosition: Function}}
   */
  function create(options) {
    var o = options || {}
    var size = o.size || BASE
    var color = o.color || '#b28df5'
    var right = o.right === undefined ? 34 : o.right
    var bottom = o.bottom === undefined ? 30 : o.bottom
    var idleMin = o.idleMin === undefined ? 3200 : o.idleMin
    var idleMax = o.idleMax === undefined ? 8000 : o.idleMax

    injectCss()

    var layer = document.createElement('div')
    layer.className = 'dsh-pet-layer'
    var wrap = document.createElement('div')
    wrap.className = 'dsh-pet-wrap'
    wrap.style.width = size + 'px'
    wrap.style.height = size + 'px'
    layer.appendChild(wrap)
    document.body.appendChild(layer)

    var svg = svgNode('svg', {
      class: 'dsh-pet-svg', width: size, height: size,
      viewBox: '0 0 ' + VIEW + ' ' + VIEW,
    })
    var ball = svgNode('circle', { class: 'dsh-pet-ball', cx: CENTER, cy: CENTER, r: CENTER, fill: color })
    var lookGroup = svgNode('g', { class: 'dsh-pet-look' })
    var aimGroup = svgNode('g', {})
    var winkGroups = []
    var sides = ['left', 'right']

    for (var i = 0; i < sides.length; i++) {
      var side = sides[i]
      var cx = side === 'left' ? CENTER - EYE_OFF : CENTER + EYE_OFF
      var winkGroup = svgNode('g', { class: 'dsh-pet-wink' })
      winkGroup.appendChild(svgNode('rect', {
        class: 'dsh-pet-eye ' + side,
        x: cx - EYE_W / 2, y: CENTER - EYE_H / 2,
        width: EYE_W, height: EYE_H,
        rx: EYE_W / 2, ry: EYE_W / 2,
        fill: '#ffffff',
      }))
      winkGroups.push(winkGroup)
      aimGroup.appendChild(winkGroup)
    }
    lookGroup.appendChild(aimGroup)
    svg.appendChild(ball)
    svg.appendChild(lookGroup)
    wrap.appendChild(svg)

    var pos = { x: 0, y: 0 }
    var mouse = null
    var drag = null
    var lastMove = 0
    var idleTimer = null
    var lookTimer = null
    var stopped = false

    function maxX() { return Math.max(0, global.innerWidth - size) }
    function maxY() { return Math.max(0, global.innerHeight - size) }

    function render() {
      wrap.style.left = pos.x + 'px'
      wrap.style.top = pos.y + 'px'
    }

    function setPosition(x, y) {
      pos.x = clampRange(x, 0, maxX())
      pos.y = clampRange(y, 0, maxY())
      render()
    }

    function aim() {
      if (mouse === null) return
      var ax = clampUnit((mouse.x - (pos.x + size / 2)) / AIM_RANGE)
      var ay = clampUnit((mouse.y - (pos.y + size / 2)) / AIM_RANGE)
      aimGroup.setAttribute('transform', 'translate(' + (ax * AIM_DISTANCE) + ',' + (ay * AIM_DISTANCE) + ')')
    }

    function blink() {
      for (var i = 0; i < winkGroups.length; i++) restart(winkGroups[i], 'run')
    }

    function play(kind) {
      svg.classList.remove('bounce', 'wiggle')
      void svg.getBoundingClientRect()
      svg.classList.add(kind)
    }

    function lookAround() {
      var angle = Math.random() * Math.PI * 2
      var radius = 8 + Math.random() * 5
      lookGroup.style.transform = 'translate(' + (Math.cos(angle) * radius) + 'px,' + (Math.sin(angle) * radius) + 'px)'
      if (lookTimer !== null) global.clearTimeout(lookTimer)
      lookTimer = global.setTimeout(function () {
        lookGroup.style.transform = 'translate(0px,0px)'
        lookTimer = null
      }, 700 + Math.random() * 800)
    }

    function schedule() {
      if (stopped) return
      var span = Math.max(0, idleMax - idleMin)
      idleTimer = global.setTimeout(function () {
        if (stopped) return
        var roll = Math.random()
        if (roll < 0.34) {
          blink()
        } else if (roll < 0.68) {
          if (Date.now() - lastMove > 2500) lookAround()
        } else if (roll < 0.85) {
          play('bounce')
        } else {
          play('wiggle')
        }
        schedule()
      }, idleMin + Math.random() * span)
    }

    function onMove(event) {
      mouse = { x: event.clientX, y: event.clientY }
      lastMove = Date.now()
      if (drag !== null) {
        pos.x = clampRange(event.clientX - drag.dx, 4, Math.max(4, global.innerWidth - size - 4))
        pos.y = clampRange(event.clientY - drag.dy, 4, Math.max(4, global.innerHeight - size - 4))
        render()
      }
      aim()
    }

    function onUp(event) {
      var current = drag
      if (current === null) return
      drag = null
      wrap.classList.remove('dragging')
      var moved = Math.abs(event.clientX - current.startX) + Math.abs(event.clientY - current.startY)
      if (moved < CLICK_SLOP) blink()
    }

    function onDown(event) {
      if (event.button !== 0) return
      event.preventDefault()
      drag = { dx: event.clientX - pos.x, dy: event.clientY - pos.y, startX: event.clientX, startY: event.clientY }
      wrap.classList.add('dragging')
    }

    function onDragStart(event) {
      event.preventDefault()
    }

    function onResize() {
      setPosition(Math.min(pos.x, maxX()), Math.min(pos.y, maxY()))
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('dragstart', onDragStart)
    global.addEventListener('resize', onResize)
    ball.addEventListener('mousedown', onDown)

    setPosition(global.innerWidth - size - right, global.innerHeight - size - bottom)
    schedule()

    return {
      element: wrap,
      blink: blink,
      lookAround: lookAround,
      play: play,
      setPosition: setPosition,
      destroy: function () {
        stopped = true
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.removeEventListener('dragstart', onDragStart)
        global.removeEventListener('resize', onResize)
        if (idleTimer !== null) global.clearTimeout(idleTimer)
        if (lookTimer !== null) global.clearTimeout(lookTimer)
        if (layer.parentNode) layer.parentNode.removeChild(layer)
      },
    }
  }

  global.DesktopPet = { create: create }

  var current = document.currentScript
  if (current && current.hasAttribute('data-auto')) {
    var mount = function () { create() }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount)
    else mount()
  }
})(typeof window !== 'undefined' ? window : this)
