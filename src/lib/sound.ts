import { useSettings } from "@/state/settings";

type Name = "drop" | "tick" | "stamp" | "error";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ensure(): { ctx: AudioContext; master: GainNode } | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx && master ? { ctx, master } : null;
  } catch {
    return null;
  }
}

function noise(ctx: AudioContext, seconds: number): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

function env(
  ctx: AudioContext,
  node: AudioNode,
  out: AudioNode,
  peak: number,
  attack: number,
  decay: number,
) {
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  node.connect(g);
  g.connect(out);
}

const voices: Record<Name, (ctx: AudioContext, out: AudioNode) => void> = {
  drop(ctx, out) {
    const n = noise(ctx, 0.18);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(900, ctx.currentTime);
    f.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.14);
    f.Q.value = 0.8;
    n.connect(f);
    env(ctx, f, out, 0.5, 0.02, 0.14);
    n.start();
  },

  tick(ctx, out) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(1320, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);
    env(ctx, o, out, 0.35, 0.004, 0.05);
    o.start();
    o.stop(ctx.currentTime + 0.08);
  },

  stamp(ctx, out) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(140, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.12);
    env(ctx, o, out, 1.0, 0.005, 0.16);
    o.start();
    o.stop(ctx.currentTime + 0.2);
    const n = noise(ctx, 0.08);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1200;
    n.connect(f);
    env(ctx, f, out, 0.5, 0.003, 0.07);
    n.start();
  },

  error(ctx, out) {
    [440, 330].forEach((hz, i) => {
      const o = ctx.createOscillator();
      o.type = "triangle";
      const t = ctx.currentTime + i * 0.13;
      o.frequency.setValueAtTime(hz, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + 0.14);
    });
  },
};

export function play(name: Name) {
  const s = useSettings.getState().settings;
  if (!s?.soundEnabled) return;
  const a = ensure();
  if (!a) return;
  a.master.gain.value = Math.max(0, Math.min(1, s.soundVolume));
  try {
    voices[name](a.ctx, a.master);
  } catch {
    return;
  }
}
