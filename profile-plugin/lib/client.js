/**
 * Desktop pet — browser half, in the client module system's lazy-CJS form.
 *
 * Executing this script only REGISTERS the factory below; the whole bundle body
 * (including the stylesheet insertion) runs at materialization. The factory
 * exports `inject` (required services) and `apply`, exactly like a shipped
 * client plugin.
 *
 * The pet registers one additive entry in the frame-wide `shell.overlay` slot,
 * which is click-through until the entry opts back into pointer events, so only
 * the round body itself is interactive.
 */
window.__ModuleLoader__.load({
	id: "dsh-desktop-pet",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");

		const CSS = `
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
    `;

		/** Required services: the slot registry and the fiber-scoped timer. */
		const inject = ["slots", "timer"];

		/**
		 * Mount the pet: one overlay entry plus its stylesheet, both owned by this
		 * fiber so stopping or removing the row restores the page exactly.
		 * @param ctx - client context carrying `slots` and `timer`.
		 */
		function apply(ctx) {
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-desktop-pet";
				tag.dataset.pluginCss = "dsh-desktop-pet/desktop-pet.css";
				tag.textContent = CSS;
				document.head.appendChild(tag);
				return () => { tag.remove(); };
			});

			/** Purple ball with two eyes that never lose sight of the pointer. */
			function DesktopPet() {
				const SIZE = 116, C = 58, EYE_W = 18, EYE_H = 27, EYE_OFF = 17;
				const sPos = React.useState(null), pos = sPos[0], setPos = sPos[1];
				const sEye = React.useState({ x: 0, y: 0 }), eye = sEye[0], setEye = sEye[1];
				const sLook = React.useState({ x: 0, y: 0 }), look = sLook[0], setLook = sLook[1];
				const sDrag = React.useState(false), dragging = sDrag[0], setDragging = sDrag[1];
				const sWink = React.useState(0), wink = sWink[0], setWink = sWink[1];
				const sAct = React.useState({ kind: "none", seq: 0 }), act = sAct[0], setAct = sAct[1];
				const ref = React.useRef({ pos: null, drag: null, mouse: null, lastMove: 0, lookTimer: null });
				const clamp = (v) => v < -1 ? -1 : (v > 1 ? 1 : v);

				React.useEffect(() => {
					const start = { x: window.innerWidth - SIZE - 34, y: window.innerHeight - SIZE - 30 };
					ref.current.pos = start;
					setPos(start);
				}, []);

				React.useEffect(() => {
					const aim = () => {
						const p = ref.current.pos, m = ref.current.mouse;
						if (p === null || m === null) return;
						setEye({
							x: clamp((m.x - (p.x + C)) / 170),
							y: clamp((m.y - (p.y + C)) / 170),
						});
					};
					const onMove = (event) => {
						ref.current.mouse = { x: event.clientX, y: event.clientY };
						ref.current.lastMove = Date.now();
						const drag = ref.current.drag;
						if (drag !== null) {
							const next = {
								x: Math.min(Math.max(event.clientX - drag.dx, 4), window.innerWidth - SIZE - 4),
								y: Math.min(Math.max(event.clientY - drag.dy, 4), window.innerHeight - SIZE - 4),
							};
							ref.current.pos = next;
							setPos(next);
						}
						aim();
					};
					const onUp = (event) => {
						const drag = ref.current.drag;
						if (drag === null) return;
						ref.current.drag = null;
						setDragging(false);
						const moved = Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY);
						if (moved < 5) setWink((n) => n + 1);
					};
					const noDrag = (event) => event.preventDefault();
					document.addEventListener("mousemove", onMove);
					document.addEventListener("mouseup", onUp);
					document.addEventListener("dragstart", noDrag);
					return () => {
						document.removeEventListener("mousemove", onMove);
						document.removeEventListener("mouseup", onUp);
						document.removeEventListener("dragstart", noDrag);
					};
				}, []);

				React.useEffect(() => {
					let stopped = false;
					const step = () => {
						if (stopped) return;
						ctx.timeout(() => {
							if (stopped) return;
							const roll = Math.random();
							if (roll < 0.34) {
								setWink((n) => n + 1);
							} else if (roll < 0.68) {
								if (Date.now() - ref.current.lastMove > 2500) {
									const angle = Math.random() * Math.PI * 2;
									const radius = 8 + Math.random() * 5;
									setLook({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
									if (ref.current.lookTimer !== null) ref.current.lookTimer();
									ref.current.lookTimer = ctx.timeout(() => {
										if (!stopped) setLook({ x: 0, y: 0 });
									}, 700 + Math.random() * 800);
								}
							} else if (roll < 0.85) {
								setAct((prev) => ({ kind: "bounce", seq: prev.seq + 1 }));
							} else {
								setAct((prev) => ({ kind: "wiggle", seq: prev.seq + 1 }));
							}
							step();
						}, 3200 + Math.random() * 4800);
					};
					step();
					return () => {
						stopped = true;
						if (ref.current.lookTimer !== null) {
							ref.current.lookTimer();
							ref.current.lookTimer = null;
						}
					};
				}, []);

				const onDown = (event) => {
					const p = ref.current.pos;
					if (p === null || event.button !== 0) return;
					event.preventDefault();
					ref.current.drag = {
						dx: event.clientX - p.x,
						dy: event.clientY - p.y,
						startX: event.clientX,
						startY: event.clientY,
					};
					setDragging(true);
				};

				const eyeRect = (side, cx) => React.createElement("rect", {
					className: "dsh-pet-eye " + side,
					x: cx - EYE_W / 2,
					y: C - EYE_H / 2,
					width: EYE_W,
					height: EYE_H,
					rx: EYE_W / 2,
					ry: EYE_W / 2,
					fill: "#ffffff",
				});
				const eyeGroup = (side, cx) => React.createElement("g", {
					key: side + "-" + wink,
					className: "dsh-pet-wink" + (wink > 0 ? " run" : ""),
				}, eyeRect(side, cx));

				const svg = React.createElement("svg", {
					key: "pet-" + act.seq,
					className: "dsh-pet-svg" + (act.kind === "none" ? "" : " " + act.kind),
					width: SIZE,
					height: SIZE,
					viewBox: "0 0 " + SIZE + " " + SIZE,
				},
					React.createElement("circle", {
						className: "dsh-pet-ball",
						cx: C, cy: C, r: C, fill: "#b28df5",
						onMouseDown: onDown,
					}),
					React.createElement("g", {
						className: "dsh-pet-look",
						style: { transform: "translate(" + look.x + "px," + look.y + "px)" },
					},
						React.createElement("g", {
							transform: "translate(" + (eye.x * 11) + "," + (eye.y * 11) + ")",
						},
							eyeGroup("left", C - EYE_OFF),
							eyeGroup("right", C + EYE_OFF),
						),
					),
				);

				return React.createElement("div", { className: "dsh-pet-layer" },
					React.createElement("div", {
						className: "dsh-pet-wrap" + (dragging ? " dragging" : ""),
						style: pos === null
							? { visibility: "hidden" }
							: { left: pos.x + "px", top: pos.y + "px", width: SIZE + "px", height: SIZE + "px" },
					}, svg),
				);
			}

			ctx.slots.inject("shell.overlay", () => ctx.slots.register(
				{ name: "shell.overlay", id: "dsh-desktop-pet", order: 1000, label: "桌面宠物" },
				DesktopPet,
			));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
