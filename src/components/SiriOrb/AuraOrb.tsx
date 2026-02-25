/**
 * src/components/SiriOrb/AuraOrb.tsx
 *
 * Liquid plasma orb — Crunchyroll anime aesthetic.
 * Canvas-based, 60fps, mode-synced via ref (zero re-renders).
 *
 * States: idle(霊) → listening(聴) → thinking(念) → speaking(声)
 */

import type { VoiceState } from "@/hooks/useVoiceState";
import { memo, useEffect, useRef } from "react";

export type OrbMode = VoiceState;
interface Props {
  size: number;
  mode: OrbMode;
}

const C = {
  orange: [244, 117, 33],
  purple: [123, 47, 190],
  sakura: [255, 140, 170],
  cyan: [80, 210, 255],
  gold: [255, 200, 80],
  crimson: [220, 40, 60],
  white: [255, 255, 255],
} as const;

const rgba = (c: readonly number[], a: number) =>
  `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export const AuraOrb = memo(({ size, mode }: Props) => {
  const cv = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<OrbMode>(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = size * dpr;
    c.height = size * dpr;
    c.style.width = `${size}px`;
    c.style.height = `${size}px`;
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    const CX = size / 2,
      CY = size / 2,
      R = size * 0.4;

    const blobs = Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * Math.PI * 2,
      r: R * (0.12 + Math.random() * 0.22),
      speed: 0.005 + Math.random() * 0.008,
      phase: Math.random() * Math.PI * 2,
      color: [
        C.orange,
        C.purple,
        C.sakura,
        C.orange,
        C.purple,
        C.crimson,
        C.gold,
        C.cyan,
      ][i],
      sz: R * (0.22 + Math.random() * 0.28),
    }));

    const particles = Array.from({ length: 55 }, (_, i) => ({
      angle: (i / 55) * Math.PI * 2,
      orbitR: R * (0.5 + Math.random() * 0.6),
      tilt: (Math.random() - 0.5) * 0.7,
      spd: 0.003 + Math.random() * 0.009,
      sz: 0.5 + Math.random() * 1.8,
      op: 0.2 + Math.random() * 0.7,
      color: [C.orange, C.purple, C.sakura, C.cyan, C.gold][
        Math.floor(Math.random() * 5)
      ],
      front: Math.random() > 0.4,
    }));

    const tendrils = Array.from({ length: 10 }, (_, i) => ({
      base: (i / 10) * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
      spd: 0.01 + Math.random() * 0.01,
      len: R * (0.3 + Math.random() * 0.6),
      w: 0.4 + Math.random() * 1.2,
      color: [
        C.orange,
        C.purple,
        C.crimson,
        C.orange,
        C.purple,
        C.sakura,
        C.gold,
        C.cyan,
        C.orange,
        C.purple,
      ][i],
    }));

    const energyLines = Array.from({ length: 6 }, (_, i) => ({
      angle: (i / 6) * Math.PI * 2 + Math.random() * 0.5,
      length: R * (0.6 + Math.random() * 0.8),
      phase: Math.random() * Math.PI * 2,
      spd: 0.02 + Math.random() * 0.02,
      width: 0.5 + Math.random() * 1.0,
    }));

    let t = 0,
      E = 0.5,
      raf = 0;
    const kanji: Record<OrbMode, string> = {
      idle: "霊",
      listening: "聴",
      thinking: "念",
      speaking: "声",
    };

    const loop = () => {
      t++;
      const cm = modeRef.current;
      const tE =
        cm === "idle"
          ? 0.4
          : cm === "listening"
            ? 0.85
            : cm === "thinking"
              ? 0.65
              : 0.9;
      E += (tE - E) * 0.035;
      g.clearRect(0, 0, size, size);

      // Bloom
      const bR = R * (1.6 + Math.sin(t * 0.03) * 0.15 * E);
      const bl = g.createRadialGradient(CX, CY, R * 0.3, CX, CY, bR);
      bl.addColorStop(0, rgba(C.orange, 0.06 * E));
      bl.addColorStop(0.3, rgba(C.purple, 0.04 * E));
      bl.addColorStop(0.6, rgba(C.sakura, 0.02 * E));
      bl.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = bl;
      g.fillRect(0, 0, size, size);

      // Energy lines (not idle)
      if (cm !== "idle" || E > 0.5) {
        const la =
          cm === "idle" ? 0.05 : cm === "speaking" ? 0.35 * E : 0.2 * E;
        energyLines.forEach((el) => {
          el.phase += el.spd * (cm === "thinking" ? 2 : 1);
          const sR = R * 1.05,
            eR = sR + el.length * E * (0.4 + Math.sin(el.phase) * 0.3);
          const a = el.angle + Math.sin(el.phase * 0.7) * 0.3;
          const lg = g.createLinearGradient(
            CX + Math.cos(a) * sR,
            CY + Math.sin(a) * sR,
            CX + Math.cos(a) * eR,
            CY + Math.sin(a) * eR,
          );
          lg.addColorStop(0, rgba(C.orange, la));
          lg.addColorStop(0.5, rgba(C.crimson, la * 0.6));
          lg.addColorStop(1, "rgba(0,0,0,0)");
          g.beginPath();
          g.moveTo(CX + Math.cos(a) * sR, CY + Math.sin(a) * sR);
          g.lineTo(CX + Math.cos(a) * eR, CY + Math.sin(a) * eR);
          g.strokeStyle = lg;
          g.lineWidth = el.width * E;
          g.stroke();
        });
      }

      // Back particles
      particles
        .filter((p) => !p.front)
        .forEach((p) => {
          p.angle +=
            p.spd * (cm === "thinking" ? 2.5 : cm === "listening" ? 1.5 : 1);
          const x = CX + Math.cos(p.angle) * p.orbitR * Math.cos(p.tilt);
          const y = CY + Math.sin(p.angle) * p.orbitR;
          const d = (Math.cos(p.angle) * Math.cos(p.tilt) + 1) / 2;
          if (d < 0.5) {
            g.beginPath();
            g.arc(x, y, p.sz * d, 0, Math.PI * 2);
            g.fillStyle = rgba(p.color, p.op * d * 0.25 * E);
            g.fill();
          }
        });

      // Sphere
      const sg = g.createRadialGradient(
        CX - R * 0.18,
        CY - R * 0.22,
        R * 0.03,
        CX,
        CY,
        R,
      );
      sg.addColorStop(0, "rgba(15,10,22,.96)");
      sg.addColorStop(0.5, "rgba(8,4,14,.97)");
      sg.addColorStop(1, "rgba(3,1,8,.99)");
      g.beginPath();
      g.arc(CX, CY, R, 0, Math.PI * 2);
      g.fillStyle = sg;
      g.fill();

      // Clipped interior
      g.save();
      g.beginPath();
      g.arc(CX, CY, R - 1, 0, Math.PI * 2);
      g.clip();

      blobs.forEach((b, i) => {
        b.angle +=
          (b.speed + E * 0.005) *
          (cm === "thinking" ? 1.8 : cm === "speaking" ? 1.5 : 1);
        const bx =
          CX +
          Math.cos(b.angle + b.phase) *
            b.r *
            (1 + Math.sin(t * 0.02 + i) * 0.3);
        const by =
          CY +
          Math.sin(b.angle * 1.15 + b.phase) *
            b.r *
            (1 + Math.cos(t * 0.018 + i) * 0.25);
        const pr = b.sz * (0.8 + Math.sin(t * 0.025 + i * 1.1) * 0.2) * E;
        const pg = g.createRadialGradient(bx, by, 0, bx, by, pr);
        const a = 0.12 + E * 0.25;
        pg.addColorStop(0, rgba(b.color, a * 1.5));
        pg.addColorStop(0.4, rgba(b.color, a * 0.8));
        pg.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = pg;
        g.beginPath();
        g.arc(bx, by, pr, 0, Math.PI * 2);
        g.fill();
      });

      // Mode overlays
      const pulse = 0.6 + Math.sin(t * 0.05) * 0.2 + E * 0.2;
      if (cm === "listening") {
        for (let r = 0; r < 4; r++) {
          g.beginPath();
          g.arc(
            CX,
            CY,
            R * (0.15 + r * 0.16) * (1 + Math.sin(t * 0.06 + r) * 0.15),
            0,
            Math.PI * 2,
          );
          g.strokeStyle = rgba(
            r % 2 === 0 ? C.orange : C.sakura,
            (0.45 - r * 0.08) * pulse,
          );
          g.lineWidth = 1.8 - r * 0.3;
          g.stroke();
        }
        g.strokeStyle = rgba(C.gold, 0.75 * pulse);
        g.lineWidth = 2.2;
        g.beginPath();
        g.roundRect(CX - 6, CY - 12, 12, 18, 6);
        g.stroke();
        g.beginPath();
        g.arc(CX, CY + 9, 9, Math.PI, 0);
        g.stroke();
        g.beginPath();
        g.moveTo(CX, CY + 18);
        g.lineTo(CX, CY + 22);
        g.stroke();
      } else if (cm === "thinking") {
        for (let d = 0; d < 5; d++) {
          const da = (d / 5) * Math.PI * 2 + t * 0.07;
          const dc = d % 2 === 0 ? C.orange : C.cyan;
          const dg = g.createRadialGradient(
            CX + Math.cos(da) * R * 0.26,
            CY + Math.sin(da) * R * 0.26,
            0,
            CX + Math.cos(da) * R * 0.26,
            CY + Math.sin(da) * R * 0.26,
            8,
          );
          dg.addColorStop(0, rgba(dc, 0.8));
          dg.addColorStop(0.5, rgba(dc, 0.2));
          dg.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = dg;
          g.beginPath();
          g.arc(
            CX + Math.cos(da) * R * 0.26,
            CY + Math.sin(da) * R * 0.26,
            8,
            0,
            Math.PI * 2,
          );
          g.fill();
          g.beginPath();
          g.arc(
            CX + Math.cos(da) * R * 0.26,
            CY + Math.sin(da) * R * 0.26,
            3,
            0,
            Math.PI * 2,
          );
          g.fillStyle = rgba(dc, 0.7);
          g.fill();
        }
        for (let i = 0; i < 3; i++) {
          const la = t * 0.04 + i * 2.1,
            lr = R * 0.5;
          g.beginPath();
          g.moveTo(CX + Math.cos(la) * lr * 0.3, CY + Math.sin(la) * lr * 0.3);
          g.lineTo(CX + Math.cos(la) * lr, CY + Math.sin(la) * lr);
          g.strokeStyle = rgba(C.cyan, 0.3 * (1 - i * 0.2));
          g.lineWidth = 1;
          g.stroke();
        }
      } else if (cm === "speaking") {
        const bars = 11,
          bw = 3,
          gap = 2.5,
          tw = bars * bw + (bars - 1) * gap;
        for (let b = 0; b < bars; b++) {
          const bh =
            R *
            0.32 *
            (0.25 + Math.abs(Math.sin(t * 0.12 + b * 0.85)) * 0.8) *
            E;
          const bc = [C.orange, C.gold, C.sakura][b % 3];
          g.shadowColor = rgba(bc, 0.4);
          g.shadowBlur = 6;
          g.fillStyle = rgba(bc, 0.65 + (b % 2) * 0.15);
          g.beginPath();
          g.roundRect(CX - tw / 2 + b * (bw + gap), CY - bh / 2, bw, bh, 1.5);
          g.fill();
          g.shadowBlur = 0;
        }
        g.beginPath();
        g.arc(CX, CY, R * (0.85 + Math.sin(t * 0.08) * 0.08), 0, Math.PI * 2);
        g.strokeStyle = rgba(C.orange, 0.2 * pulse);
        g.lineWidth = 1.5;
        g.stroke();
      } else {
        const ks = Math.round(size * 0.14);
        g.font = `900 ${ks}px 'Noto Sans JP','Hiragino Sans',sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.shadowColor = rgba(C.orange, 0.5 * pulse);
        g.shadowBlur = 16;
        g.fillStyle = rgba(C.gold, 0.7 * pulse);
        g.fillText(kanji[cm], CX, CY - 2);
        g.shadowBlur = 0;
        g.font = `600 ${Math.round(size * 0.055)}px 'Courier New',monospace`;
        g.fillStyle = rgba(C.white, 0.18 * pulse);
        g.fillText("AURA", CX, CY + ks * 0.6);
      }
      g.restore();

      // Tendrils
      tendrils.forEach((tn) => {
        tn.phase +=
          tn.spd * (cm === "speaking" ? 1.5 : cm === "thinking" ? 2 : 1);
        const a = tn.base + Math.sin(tn.phase) * 0.4;
        const eR = R + tn.len * E * (0.2 + Math.sin(tn.phase * 1.1) * 0.25);
        const x1 = CX + Math.cos(a) * R * 0.93,
          y1 = CY + Math.sin(a) * R * 0.93;
        const x2 = CX + Math.cos(a + Math.sin(tn.phase) * 0.2) * eR;
        const y2 = CY + Math.sin(a + Math.sin(tn.phase) * 0.2) * eR;
        const tg = g.createLinearGradient(x1, y1, x2, y2);
        tg.addColorStop(0, rgba(tn.color, 0.5 * E));
        tg.addColorStop(1, "rgba(0,0,0,0)");
        g.beginPath();
        g.moveTo(x1, y1);
        g.quadraticCurveTo(
          CX + Math.cos(a + 0.15) * (R + eR) * 0.42,
          CY + Math.sin(a + 0.15) * (R + eR) * 0.42,
          x2,
          y2,
        );
        g.strokeStyle = tg;
        g.lineWidth = tn.w * E;
        g.stroke();
      });

      // Rim
      const rim = g.createRadialGradient(CX, CY, R * 0.8, CX, CY, R * 1.02);
      rim.addColorStop(0, "rgba(0,0,0,0)");
      rim.addColorStop(0.5, rgba(C.orange, 0.06 + E * 0.08));
      rim.addColorStop(0.85, rgba(C.orange, 0.15 + E * 0.12));
      rim.addColorStop(1, rgba(C.purple, 0.08));
      g.beginPath();
      g.arc(CX, CY, R, 0, Math.PI * 2);
      g.fillStyle = rim;
      g.fill();
      g.strokeStyle = rgba(C.orange, 0.15 + E * 0.18);
      g.lineWidth = 0.8;
      g.stroke();

      // Front particles
      particles
        .filter((p) => p.front)
        .forEach((p) => {
          const x = CX + Math.cos(p.angle) * p.orbitR * Math.cos(p.tilt);
          const y = CY + Math.sin(p.angle) * p.orbitR;
          const d = (Math.cos(p.angle) * Math.cos(p.tilt) + 1) / 2;
          if (d >= 0.5) {
            const pg = g.createRadialGradient(x, y, 0, x, y, p.sz * 2.5);
            pg.addColorStop(0, rgba(p.color, p.op * d * E));
            pg.addColorStop(1, "rgba(0,0,0,0)");
            g.beginPath();
            g.arc(x, y, p.sz * 2, 0, Math.PI * 2);
            g.fillStyle = pg;
            g.fill();
          }
        });

      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas ref={cv} style={{ display: "block", width: size, height: size }} />
  );
});
AuraOrb.displayName = "AuraOrb";
