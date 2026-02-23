import { useRef, useEffect } from "react";

interface PlasmaCanvasProps {
  className?: string;
}

export const PlasmaCanvas = ({ className = "" }: PlasmaCanvasProps) => {
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

    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; hue: number; life: number; maxLife: number;
    }> = [];

    const spawnParticle = () => {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        hue: Math.random() > 0.6 ? 270 : 25,
        life: 0,
        maxLife: Math.random() * 200 + 100,
      });
    };

    for (let i = 0; i < 40; i++) spawnParticle();

    let time = 0;
    const animate = () => {
      time += 0.01;
      ctx.fillStyle = "rgba(5, 5, 5, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx + Math.sin(time + p.y * 0.01) * 0.3;
        p.y += p.vy + Math.cos(time + p.x * 0.01) * 0.3;

        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.6;
        const glow = p.hue === 25
          ? `hsla(${p.hue}, 93%, 54%, ${alpha})`
          : `hsla(${p.hue}, 60%, 55%, ${alpha})`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.shadowBlur = 20;
        ctx.shadowColor = glow;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          spawnParticle();
        }
      }

      // Draw orbs
      for (let o = 0; o < 3; o++) {
        const ox = canvas.width * (0.2 + o * 0.3) + Math.sin(time * 0.7 + o * 2) * 80;
        const oy = canvas.height * 0.5 + Math.cos(time * 0.5 + o * 1.5) * 60;
        const radius = 40 + Math.sin(time + o) * 15;
        const hue = o === 1 ? 270 : 25;
        
        const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, radius);
        grad.addColorStop(0, `hsla(${hue}, 90%, 60%, 0.15)`);
        grad.addColorStop(0.5, `hsla(${hue}, 80%, 50%, 0.05)`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ox, oy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

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
