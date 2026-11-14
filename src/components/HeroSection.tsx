import React, { useEffect, useRef } from 'react';
import { ArrowRight, Terminal, Shield, Cpu, Activity } from 'lucide-react';
import { ActiveTab } from './Header';

interface HeroSectionProps {
  onIgnitePlane: () => void;
  onExploreArchitecture: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onIgnitePlane,
  onExploreArchitecture,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Background binary matrix stream effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = 480);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 480;
    };
    window.addEventListener('resize', handleResize);

    const fontSize = 14;
    const columns = Math.floor(width / fontSize);
    const drops: number[] = new Array(columns).fill(1);
    const binaryChars = '01001100 01101001 01110001 01110101 01101001 01100100 00100000 01001111 01010011'.split('');

    const render = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.12)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(67, 56, 202, 0.45)'; // cyber indigo / purple tint
      ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = binaryChars[Math.floor(Math.random() * binaryChars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillText(text, x, y);

        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-neutral-800 bg-gradient-to-b from-neutral-950 via-purple-950/20 to-neutral-950 py-12 md:py-16 px-6">
      {/* Background Matrix Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40 mix-blend-screen"
      />

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
        {/* Yellow Pill Badge matching IMG_2263_05506c8f */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 mb-5 rounded-full border border-amber-400/60 bg-amber-400/10 text-amber-300 text-xs font-mono font-bold tracking-widest uppercase shadow-sm shadow-amber-400/20">
          <Cpu className="w-3.5 h-3.5 text-amber-400" />
          <span>AI-DRIVEN OPERATING PLANE</span>
        </div>

        {/* Primary Headline matching attachment */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6 uppercase leading-tight font-sans">
          SHATTER THE BARRIER.
          <br />
          <span className="text-amber-400 drop-shadow-[0_0_25px_rgba(251,191,36,0.35)]">
            LIQUID OS IS HERE.
          </span>
        </h1>

        {/* Subtitle matching attachment */}
        <p className="text-base sm:text-lg text-neutral-300 max-w-2xl mx-auto mb-8 leading-relaxed font-sans font-normal">
          An AI-driven, liquid operating plane that merges instant UI generation with bulletproof binary orchestration. Command Ghidra, IDA, Frida and your entire reverse-engineering stack from one unified surface.
        </p>

        {/* Action Buttons matching attachment */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-center mb-10">
          <button
            onClick={onIgnitePlane}
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-neutral-950 bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all rounded shadow-lg shadow-amber-400/25 flex items-center justify-center gap-2 cursor-pointer font-sans"
          >
            <span>Ignite Your Plane</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExploreArchitecture}
            className="w-full sm:w-auto px-7 py-3.5 text-sm font-semibold text-neutral-200 border-2 border-purple-500/80 hover:border-purple-400 bg-purple-950/30 hover:bg-purple-900/40 active:scale-95 transition-all rounded flex items-center justify-center gap-2 cursor-pointer font-sans"
          >
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>Explore the Architecture</span>
          </button>
        </div>

        {/* Hardware Status Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl pt-6 border-t border-neutral-800/80 text-left">
          <div className="p-3 rounded bg-neutral-900/60 border border-neutral-800 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 mb-1">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>NNAPI COPROCESSOR</span>
            </div>
            <div className="text-sm font-bold text-neutral-100 font-mono">Hexagon NPU V73</div>
            <div className="text-[11px] text-emerald-400 font-mono">Hardware Tensor Bound</div>
          </div>

          <div className="p-3 rounded bg-neutral-900/60 border border-neutral-800 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 mb-1">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>A2D CRYPTO VAULT</span>
            </div>
            <div className="text-sm font-bold text-neutral-100 font-mono">AES-256-GCM / Argon2</div>
            <div className="text-[11px] text-purple-300 font-mono">Zero Egress Air-Gapped</div>
          </div>

          <div className="p-3 rounded bg-neutral-900/60 border border-neutral-800 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 mb-1">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>CLAUDE 3.5 API LAYER</span>
            </div>
            <div className="text-sm font-bold text-neutral-100 font-mono">POST /v1/messages</div>
            <div className="text-[11px] text-cyan-300 font-mono">Anthropic Compatible</div>
          </div>

          <div className="p-3 rounded bg-neutral-900/60 border border-neutral-800 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 mb-1">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>GGUF QUANT ENGINE</span>
            </div>
            <div className="text-sm font-bold text-neutral-100 font-mono">Q4_K_M · Q8_0 · FP16</div>
            <div className="text-[11px] text-amber-300 font-mono">Offline Automation Ready</div>
          </div>
        </div>
      </div>
    </section>
  );
};
