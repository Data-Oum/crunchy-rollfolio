/**
 * src/components/SiriOrb/PlasmaOrb.tsx
 * Canvas animation runs its own RAF loop.
 * Mode synced via modeRef — never causes React re-renders.
 */
import { memo, useEffect, useRef } from "react";

export type OrbMode = "idle" | "listening" | "thinking" | "speaking";

export const PlasmaOrb = memo(
  ({ size, mode }: { size: number; mode: OrbMode }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const modeRef = useRef<OrbMode>(mode);
    const rafRef = useRef(0);

    // Sync mode → ref only. Zero re-renders.
    useEffect(() => {
      modeRef.current = mode;
    }, [mode]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const CX = size / 2,
        CY = size / 2,
        R = size * 0.42;

      const blobs = Array.from({ length: 6 }, (_, i) => ({
        angle: (i / 6) * Math.PI * 2,
        r: R * (0.15 + Math.random() * 0.2),
        speed: 0.007 + Math.random() * 0.008,
        phase: Math.random() * Math.PI * 2,
        hue: [28, 270, 28, 270, 45, 300][i] as number,
        sz: R * (0.25 + Math.random() * 0.3),
      }));

      const particles = Array.from({ length: 50 }, (_, i) => ({
        angle: (i / 50) * Math.PI * 2,
        orbitR: R * (0.65 + Math.random() * 0.4),
        orbitTilt: (Math.random() - 0.5) * 0.6,
        orbitSpeed: 0.004 + Math.random() * 0.008,
        sz: 0.7 + Math.random() * 1.4,
        opacity: 0.3 + Math.random() * 0.6,
        hue: Math.random() > 0.5 ? 28 : 270,
        front: Math.random() > 0.45,
      }));

      const tendrils = Array.from({ length: 8 }, (_, i) => ({
        baseAngle: (i / 8) * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.012 + Math.random() * 0.008,
        length: R * (0.3 + Math.random() * 0.5),
        width: 0.6 + Math.random() * 1.0,
        hue: i % 2 === 0 ? 28 : 270,
      }));

      let t = 0,
        energy = 0.5;

      const draw = () => {
        t++;
        const cm = modeRef.current;
        const tE =
          cm === "idle"
            ? 0.45
            : cm === "listening"
              ? 0.9
              : cm === "thinking"
                ? 0.65
                : 0.8;
        energy += (tE - energy) * 0.04;
        const E = energy;
        ctx.clearRect(0, 0, size, size);

        // Ambient glow
        const amb = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 1.5);
        amb.addColorStop(0, `rgba(244,117,33,${0.08 * E})`);
        amb.addColorStop(0.5, `rgba(123,47,190,${0.04 * E})`);
        amb.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = amb;
        ctx.fillRect(0, 0, size, size);

        // Back particles
        particles
          .filter((p) => !p.front)
          .forEach((p) => {
            p.angle += p.orbitSpeed;
            const x = CX + Math.cos(p.angle) * p.orbitR * Math.cos(p.orbitTilt);
            const y = CY + Math.sin(p.angle) * p.orbitR;
            const d = (Math.cos(p.angle) * Math.cos(p.orbitTilt) + 1) / 2;
            if (d < 0.5) {
              ctx.beginPath();
              ctx.arc(x, y, p.sz * d, 0, Math.PI * 2);
              ctx.fillStyle = `hsla(${p.hue},85%,65%,${p.opacity * d * 0.25 * E})`;
              ctx.fill();
            }
          });

        // Glass sphere
        const glass = ctx.createRadialGradient(
          CX - R * 0.2,
          CY - R * 0.25,
          R * 0.04,
          CX,
          CY,
          R,
        );
        glass.addColorStop(0, "rgba(12,8,18,0.97)");
        glass.addColorStop(0.6, "rgba(5,3,10,0.98)");
        glass.addColorStop(1, "rgba(2,1,5,0.99)");
        ctx.beginPath();
        ctx.arc(CX, CY, R, 0, Math.PI * 2);
        ctx.fillStyle = glass;
        ctx.fill();

        // Clipped interior blobs
        ctx.save();
        ctx.beginPath();
        ctx.arc(CX, CY, R - 1, 0, Math.PI * 2);
        ctx.clip();

        blobs.forEach((b, i) => {
          b.angle += b.speed + E * 0.004;
          const bx =
            CX +
            Math.cos(b.angle + b.phase) *
              b.r *
              (1 + Math.sin(t * 0.02 + i) * 0.25);
          const by =
            CY +
            Math.sin(b.angle * 1.2 + b.phase) *
              b.r *
              (1 + Math.cos(t * 0.016 + i) * 0.2);
          const pr = b.sz * (0.85 + Math.sin(t * 0.03 + i * 1.1) * 0.15) * E;
          const pg = ctx.createRadialGradient(bx, by, 0, bx, by, pr);
          const a = 0.15 + E * 0.22;
          if (b.hue === 28 || b.hue === 45) {
            pg.addColorStop(0, `rgba(255,160,60,${a * 1.4})`);
            pg.addColorStop(0.4, `rgba(244,117,33,${a})`);
          } else {
            pg.addColorStop(0, `rgba(160,80,255,${a * 1.1})`);
            pg.addColorStop(0.4, `rgba(123,47,190,${a})`);
          }
          pg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.arc(bx, by, pr, 0, Math.PI * 2);
          ctx.fill();
        });

        const pulse = 0.6 + Math.sin(t * 0.055) * 0.2 + E * 0.2;

        // Mode overlay
        if (cm === "listening") {
          for (let ring = 0; ring < 3; ring++) {
            const rr =
              R *
              (0.2 + ring * 0.18) *
              (1 + Math.sin(t * 0.05 + ring * 1.2) * 0.12);
            ctx.beginPath();
            ctx.arc(CX, CY, rr, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(244,117,33,${(0.4 - ring * 0.1) * pulse})`;
            ctx.lineWidth = 1.5 - ring * 0.4;
            ctx.stroke();
          }
          ctx.strokeStyle = `rgba(255,200,100,${0.7 * pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(CX - 7, CY - 14, 14, 20, 7);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(CX, CY + 10, 10, Math.PI, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(CX, CY + 20);
          ctx.lineTo(CX, CY + 25);
          ctx.stroke();
        } else if (cm === "thinking") {
          for (let d = 0; d < 4; d++) {
            const da = (d / 4) * Math.PI * 2 + t * 0.06;
            ctx.beginPath();
            ctx.arc(
              CX + Math.cos(da) * R * 0.28,
              CY + Math.sin(da) * R * 0.28,
              3.5,
              0,
              Math.PI * 2,
            );
            ctx.fillStyle = `rgba(244,117,33,${0.5 + d * 0.12})`;
            ctx.fill();
          }
        } else if (cm === "speaking") {
          const bars = 9,
            bW = 3,
            totW = bars * bW + (bars - 1) * 3;
          for (let b = 0; b < bars; b++) {
            const bh =
              R *
              0.28 *
              (0.3 + Math.abs(Math.sin(t * 0.1 + b * 0.9)) * 0.8) *
              E;
            ctx.fillStyle = `rgba(244,117,33,${0.6 + (b % 2) * 0.2})`;
            ctx.beginPath();
            ctx.roundRect(
              CX - totW / 2 + b * (bW + 3),
              CY - bh / 2,
              bW,
              bh,
              1.5,
            );
            ctx.fill();
          }
        } else {
          ctx.font = `800 ${Math.round(size * 0.115)}px 'Courier New',monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowColor = `rgba(244,117,33,${0.4 * pulse})`;
          ctx.shadowBlur = 12;
          ctx.fillStyle = `rgba(255,200,120,${0.75 * pulse})`;
          ctx.fillText("AURA", CX, CY - 2);
          ctx.shadowBlur = 0;
        }
        ctx.restore();

        // Tendrils
        tendrils.forEach((tn) => {
          tn.phase += tn.speed;
          const ang = tn.baseAngle + Math.sin(tn.phase) * 0.35;
          const extR =
            R + tn.length * E * (0.25 + Math.sin(tn.phase * 1.1) * 0.2);
          const tx1 = CX + Math.cos(ang) * R * 0.92,
            ty1 = CY + Math.sin(ang) * R * 0.92;
          const tx2 = CX + Math.cos(ang + Math.sin(tn.phase) * 0.2) * extR;
          const ty2 = CY + Math.sin(ang + Math.sin(tn.phase) * 0.2) * extR;
          const tg = ctx.createLinearGradient(tx1, ty1, tx2, ty2);
          tg.addColorStop(
            0,
            tn.hue === 28
              ? `rgba(244,117,33,${0.5 * E})`
              : `rgba(123,47,190,${0.4 * E})`,
          );
          tg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath();
          ctx.moveTo(tx1, ty1);
          ctx.quadraticCurveTo(
            CX + Math.cos(ang + 0.15) * (R + extR) * 0.42,
            CY + Math.sin(ang + 0.15) * (R + extR) * 0.42,
            tx2,
            ty2,
          );
          ctx.strokeStyle = tg;
          ctx.lineWidth = tn.width * E;
          ctx.stroke();
        });

        // Rim glow
        const rim = ctx.createRadialGradient(CX, CY, R * 0.82, CX, CY, R);
        rim.addColorStop(0, "rgba(0,0,0,0)");
        rim.addColorStop(0.6, `rgba(244,117,33,${0.08 + E * 0.06})`);
        rim.addColorStop(0.88, `rgba(244,117,33,${0.18 + E * 0.1})`);
        rim.addColorStop(1, "rgba(123,47,190,0.08)");
        ctx.beginPath();
        ctx.arc(CX, CY, R, 0, Math.PI * 2);
        ctx.fillStyle = rim;
        ctx.fill();
        ctx.strokeStyle = `rgba(244,117,33,${0.18 + E * 0.15})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Front particles
        particles
          .filter((p) => p.front)
          .forEach((p) => {
            const x = CX + Math.cos(p.angle) * p.orbitR * Math.cos(p.orbitTilt);
            const y = CY + Math.sin(p.angle) * p.orbitR;
            const d = (Math.cos(p.angle) * Math.cos(p.orbitTilt) + 1) / 2;
            if (d >= 0.5) {
              const pg = ctx.createRadialGradient(x, y, 0, x, y, p.sz * 2.2);
              pg.addColorStop(0, `hsla(${p.hue},88%,72%,${p.opacity * d * E})`);
              pg.addColorStop(1, "hsla(0,0%,0%,0)");
              ctx.beginPath();
              ctx.arc(x, y, p.sz * 1.8, 0, Math.PI * 2);
              ctx.fillStyle = pg;
              ctx.fill();
            }
          });

        rafRef.current = requestAnimationFrame(draw);
      };

      draw();
      return () => cancelAnimationFrame(rafRef.current);
    }, [size]);

    return (
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: size, height: size }}
      />
    );
  },
);
PlasmaOrb.displayName = "PlasmaOrb";
