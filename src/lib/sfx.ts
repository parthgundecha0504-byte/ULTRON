let ctx: AudioContext | null = null;
function ac() {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function vaultSlam() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const buf = a.createBuffer(1, a.sampleRate * 0.8, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const n = a.createBufferSource();
  n.buffer = buf;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const ng = a.createGain();
  ng.gain.value = 1.2;
  n.connect(lp).connect(ng).connect(a.destination);
  n.start(t);
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(32, t + 0.6);
  g.gain.setValueAtTime(1, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + 1);
}

export function siren() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = "square";
  for (let i = 0; i < 4; i++) {
    o.frequency.setValueAtTime(600, t + i * 0.35);
    o.frequency.linearRampToValueAtTime(1300, t + i * 0.35 + 0.3);
  }
  g.gain.setValueAtTime(0.15, t);
  g.gain.linearRampToValueAtTime(0, t + 1.4);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + 1.45);
}

export function blip(freq = 440) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + 0.13);
}

export function shatterSfx() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const buf = a.createBuffer(1, a.sampleRate * 0.4, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const n = a.createBufferSource();
  n.buffer = buf;
  const hp = a.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2500;
  const g = a.createGain();
  g.gain.value = 0.5;
  n.connect(hp).connect(g).connect(a.destination);
  n.start(t);
}
