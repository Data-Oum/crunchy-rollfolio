import { useEffect, useRef } from "react";

export const PlasmaCanvas = ({ className = "" }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      hue: number;
      life: number;
      maxLife: number;
      type: 0 | 1;
    };
    const particles: P[] = [];

    const spawn = (type: 0 | 1 = 0) => {
      // type 0 = slow glow orbs, type 1 = fast micro sparks
      const big = type === 0;
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * (big ? 0.4 : 1.2),
        vy: (Math.random() - 0.5) * (big ? 0.4 : 1.0),
        size: big ? Math.random() * 5 + 2 : Math.random() * 1.8 + 0.4,
        // Crunchyroll orange (28°) or cursed purple (270°) or near-white sparks
        hue:
          type === 0
            ? Math.random() > 0.5
              ? 28
              : 270
            : Math.random() > 0.6
              ? 28
              : Math.random() > 0.5
                ? 270
                : 55,
        life: 0,
        maxLife: big ? Math.random() * 350 + 150 : Math.random() * 130 + 60,
        type,
      });
    };

    for (let i = 0; i < 25; i++) spawn(0);
    for (let i = 0; i < 70; i++) spawn(1);

    let t = 0;
    const LINK_DIST = 120;
    const visible: P[] = [];

    const draw = () => {
      t += 0.007;

      // Fade trail
      ctx.fillStyle = "rgba(5,3,8,0.11)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ── Warp grid ─────────────────────────────────────────────
      const cols = 18,
        rows = 10;
      const cw = canvas.width / cols,
        ch = canvas.height / rows;
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx <= cols; gx++) {
        ctx.beginPath();
        for (let gy = 0; gy <= rows; gy++) {
          const bx = gx * cw + Math.sin(t * 0.45 + gy * 0.38) * 9;
          const by = gy * ch + Math.cos(t * 0.38 + gx * 0.32) * 9;
          gy === 0 ? ctx.moveTo(bx, by) : ctx.lineTo(bx, by);
        }
        ctx.strokeStyle = "hsla(28,80%,55%,0.04)";
        ctx.stroke();
      }
      for (let gy = 0; gy <= rows; gy++) {
        ctx.beginPath();
        for (let gx = 0; gx <= cols; gx++) {
          const bx = gx * cw + Math.sin(t * 0.45 + gy * 0.38) * 9;
          const by = gy * ch + Math.cos(t * 0.38 + gx * 0.32) * 9;
          gx === 0 ? ctx.moveTo(bx, by) : ctx.lineTo(bx, by);
        }
        ctx.strokeStyle = "hsla(270,60%,55%,0.03)";
        ctx.stroke();
      }

      // ── Floating orbs (orange + purple) ───────────────────────
      for (let o = 0; o < 4; o++) {
        const ox =
          canvas.width * (0.15 + o * 0.23) + Math.sin(t * 0.55 + o * 1.9) * 110;
        const oy = canvas.height * 0.48 + Math.cos(t * 0.42 + o * 1.5) * 90;
        const r = 55 + Math.sin(t + o * 1.2) * 22;
        const hue = o % 2 === 0 ? 28 : 270;
        const sat = hue === 28 ? 90 : 65;
        const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
        grad.addColorStop(0, `hsla(${hue},${sat}%,60%,0.14)`);
        grad.addColorStop(0.5, `hsla(${hue},${sat}%,50%,0.06)`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Particles ─────────────────────────────────────────────
      visible.length = 0;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx + Math.sin(t + p.y * 0.011) * (p.type === 0 ? 0.28 : 0.55);
        p.y += p.vy + Math.cos(t + p.x * 0.011) * (p.type === 0 ? 0.22 : 0.45);

        const alpha =
          Math.sin((p.life / p.maxLife) * Math.PI) * (p.type === 0 ? 0.6 : 0.5);
        const sat = p.hue === 28 ? 95 : 70;
        const lgt = p.hue === 55 ? 90 : 60;
        const color = `hsla(${p.hue},${sat}%,${lgt}%,${alpha})`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        if (p.type === 0) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = `hsla(${p.hue},${sat}%,55%,${alpha * 0.8})`;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          spawn(p.type);
        } else if (p.type === 0) {
          visible.push(p);
        }
      }

      // ── Connect nearby glow orbs ───────────────────────────────
      ctx.lineWidth = 0.7;
      for (let a = 0; a < visible.length; a++) {
        for (let b = a + 1; b < visible.length; b++) {
          const dx = visible[a].x - visible[b].x;
          const dy = visible[a].y - visible[b].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            const lineAlpha = (1 - d / LINK_DIST) * 0.1;
            ctx.strokeStyle = `hsla(270,60%,60%,${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(visible[a].x, visible[a].y);
            ctx.lineTo(visible[b].x, visible[b].y);
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  );
};
