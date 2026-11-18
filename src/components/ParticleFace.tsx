import { useEffect, useRef, useState } from "react";
import portraitUrl from "@/assets/portrait.png";
import { ParticleEngine, THEMES, type EngineSettings, type Theme } from "@/lib/particle-engine";
import { AmbientAudio } from "@/lib/ambient-audio";
import { ProfileTabs } from "@/components/ProfileTabs";
import { profile } from "@/content/profile";

const DEFAULTS: EngineSettings = {
  dispersion: 1,
  size: 1,
  speed: 1,
  turbulence: 1,
  bloom: 0.2,
  theme: "original",
  autoLoop: true,
  pulse: 0,
};

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground tabular-nums">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );
}

export function ParticleFace() {
  const rootRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ParticleEngine | null>(null);
  const audioRef = useRef<AudioAnimationRef>({ audio: null, raf: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const [s, setS] = useState<EngineSettings>(DEFAULTS);
  const [count, setCount] = useState(0);
  const [formed, setFormed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [audioOn, setAudioOn] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [density, setDensity] = useState(40000);
  const [src, setSrc] = useState<string>(portraitUrl);

  useEffect(() => {
    const e = new ParticleEngine(mountRef.current!, { ...DEFAULTS });
    engineRef.current = e;
    return () => {
      e.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    setLoading(true);
    e.load(src, density)
      .then((n) => {
        setCount(n);
        setFormed(true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [src, density]);

  useEffect(() => {
    const e = engineRef.current;
    if (e) Object.assign(e.settings, s, { pulse: e.settings.pulse });
  }, [s]);

  useEffect(() => {
    const ref = audioRef.current;
    if (!audioOn) {
      ref.audio?.stop();
      ref.audio = null;
      cancelAnimationFrame(ref.raf);
      if (engineRef.current) engineRef.current.settings.pulse = 0;
      return;
    }
    ref.audio = new AmbientAudio();
    const tick = () => {
      if (engineRef.current && ref.audio) engineRef.current.settings.pulse = ref.audio.level();
      ref.raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      ref.audio?.stop();
      ref.audio = null;
      cancelAnimationFrame(ref.raf);
    };
  }, [audioOn]);

  const set = <K extends keyof EngineSettings>(k: K, v: EngineSettings[K]) =>
    setS((p) => ({ ...p, [k]: v }));
  const toggleForm = () => {
    const next = !formed;
    setFormed(next);
    set("autoLoop", false);
    engineRef.current?.setMorph(next ? 0 : 1);
  };
  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else rootRef.current?.requestFullscreen();
  };
  const onFile = (f?: File) => {
    if (f) setSrc(URL.createObjectURL(f));
  };

  return (
    <div
      ref={rootRef}
      className="relative h-screen w-full overflow-hidden bg-background text-foreground"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onFile(e.dataTransfer.files[0]);
      }}
    >
      <div ref={mountRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--background)_100%)]" />

      <section className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/90 to-transparent px-6 pb-28 pt-24 min-[900px]:inset-y-0 min-[900px]:right-auto min-[900px]:flex min-[900px]:w-[44%] min-[900px]:flex-col min-[900px]:justify-center min-[900px]:bg-none min-[900px]:pb-0 min-[900px]:pl-16 min-[900px]:pt-0">
        <p className="text-[10px] uppercase tracking-[0.4em] text-primary">{profile.greeting}</p>
        <h1 className="mt-3 font-display text-5xl leading-none md:text-7xl">{profile.name}</h1>
        <p className="mt-4 text-sm uppercase tracking-[0.25em] text-muted-foreground">
          {profile.roles.join(" · ")}
        </p>
        <ProfileTabs onTabChange={() => engineRef.current?.ripple()} />
        <p className="mt-6 hidden text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 min-[900px]:block">
          {loading ? "Loading portrait…" : "Hover the portrait to scatter it"}
        </p>
      </section>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1 rounded-full border border-border bg-card/60 p-1 backdrop-blur-xl min-[900px]:left-[60%]">
        <button
          onClick={toggleForm}
          className="rounded-full px-4 py-1.5 text-[10px] uppercase tracking-widest hover:bg-accent"
        >
          {formed ? "Disperse" : "Assemble"}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-full px-4 py-1.5 text-[10px] uppercase tracking-widest hover:bg-accent"
        >
          Photo
        </button>
        <button
          onClick={fullscreen}
          className="rounded-full px-4 py-1.5 text-[10px] uppercase tracking-widest hover:bg-accent"
        >
          Full
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>

      <button
        onClick={() => setPanelOpen((v) => !v)}
        className="absolute right-6 top-6 rounded-full border border-border bg-card/60 px-4 py-2 text-[10px] uppercase tracking-[0.3em] backdrop-blur-xl"
      >
        {panelOpen ? "Close" : "Settings"}
      </button>

      {panelOpen && (
        <aside className="absolute right-6 top-20 w-64 space-y-4 rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
          <Slider
            label="Dispersion force"
            value={s.dispersion}
            min={0}
            max={3}
            step={0.05}
            onChange={(v) => set("dispersion", v)}
          />
          <Slider
            label="Particle size"
            value={s.size}
            min={0.3}
            max={3}
            step={0.05}
            onChange={(v) => set("size", v)}
          />
          <Slider
            label="Speed"
            value={s.speed}
            min={0.1}
            max={3}
            step={0.05}
            onChange={(v) => set("speed", v)}
          />
          <Slider
            label="Turbulence"
            value={s.turbulence}
            min={0}
            max={3}
            step={0.05}
            onChange={(v) => set("turbulence", v)}
          />
          <Slider
            label="Bloom glow"
            value={s.bloom}
            min={0}
            max={2.5}
            step={0.05}
            onChange={(v) => set("bloom", v)}
          />
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Density
            </p>
            <div className="grid grid-cols-3 gap-1">
              {[20000, 40000, 60000].map((d) => (
                <button
                  key={d}
                  onClick={() => setDensity(d)}
                  className={`rounded-md py-1 text-[10px] ${density === d ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  {d / 1000}k
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Color theme
            </p>
            <div className="flex flex-wrap gap-1">
              {THEMES.map((t: Theme) => (
                <button
                  key={t}
                  onClick={() => set("theme", t)}
                  className={`rounded-md px-2 py-1 text-[10px] capitalize ${s.theme === t ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 pt-1 text-xs">
            <label className="flex items-center justify-between">
              <span>Auto-form loop</span>
              <input
                type="checkbox"
                checked={s.autoLoop}
                onChange={(e) => set("autoLoop", e.target.checked)}
                className="accent-primary"
              />
            </label>
            <label className="flex items-center justify-between">
              <span>Ambient sound + pulse</span>
              <input
                type="checkbox"
                checked={audioOn}
                onChange={(e) => setAudioOn(e.target.checked)}
                className="accent-primary"
              />
            </label>
          </div>
          <button
            onClick={() => engineRef.current?.resetView()}
            className="w-full rounded-md border border-border py-1.5 text-[10px] uppercase tracking-widest hover:bg-accent"
          >
            Reset camera
          </button>
        </aside>
      )}
    </div>
  );
}

type AudioAnimationRef = { audio: AmbientAudio | null; raf: number };
