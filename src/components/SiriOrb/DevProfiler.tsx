/**
 * src/components/SiriOrb/DevProfiler.tsx
 * Zero-cost in production. Logs slow renders (>16ms) in dev.
 *
 * Usage: <DevProfiler id="SiriOrb"><YourComponent /></DevProfiler>
 */
import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";

const IS_DEV = import.meta.env.DEV;

const onRender: ProfilerOnRenderCallback = (id, phase, actual, base) => {
  if (actual > 16) {
    console.warn(
      `%c[Profiler ⚠] ${id} ${phase} — ${actual.toFixed(1)}ms actual / ${base.toFixed(1)}ms base`,
      "color:#ef4444;font-weight:700",
    );
  } else if (actual > 8) {
    console.log(
      `%c[Profiler] ${id} ${phase} — ${actual.toFixed(1)}ms`,
      "color:#F47521",
    );
  }
};

export function DevProfiler({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  if (!IS_DEV) return <>{children}</>;
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}
