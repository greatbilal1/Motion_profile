// Generative ambient drone with a slow heartbeat pulse; exposes pulse level 0..1.
export class AmbientAudio {
  ctx: AudioContext;
  master: GainNode;
  analyser: AnalyserNode;
  data: Uint8Array<ArrayBuffer>;
  private nodes: AudioScheduledSourceNode[] = [];
  private beat = 0;
  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.connect(this.master);
    [55, 82.4, 110, 164.8].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 6;
      const g = this.ctx.createGain();
      g.gain.value = 0.08;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.07 + i * 0.05;
      const lg = this.ctx.createGain();
      lg.gain.value = 0.05;
      lfo.connect(lg);
      lg.connect(g.gain);
      o.connect(g);
      g.connect(filter);
      o.start();
      lfo.start();
      this.nodes.push(o, lfo);
    });
    this.master.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 2);
    this.beat = window.setInterval(() => this.thump(), 1100);
  }
  private thump() {
    const t = this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.45);
  }
  level() {
    this.analyser.getByteFrequencyData(this.data);
    let s = 0;
    for (let i = 0; i < 12; i++) s += this.data[i] ?? 0;
    return Math.min(1, Math.max(0, (s / 12 / 255 - 0.25) * 2));
  }
  stop() {
    clearInterval(this.beat);
    this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    setTimeout(() => this.ctx.close(), 600);
  }
}
