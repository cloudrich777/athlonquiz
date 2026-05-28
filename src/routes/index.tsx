import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import athlonMoto from "@/assets/athlon-moto.png";
import athlonLogo from "@/assets/athlon-logo.webp";
import soundEscape from "@/assets/escape.mp3";
import soundWin from "@/assets/win.mp3";
import soundRoleta from "@/assets/roleta.mp3";
import soundLose from "@/assets/lose.mp3";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Desafio 5 Anos Athlon Racing" },
      { name: "description", content: "Participe do Desafio 5 Anos da Athlon Racing e ganhe descontos exclusivos no Módulo M250-X." },
    ],
  }),
});

type Screen = "intro" | "quiz" | "analyze" | "roulette" | "win";

const QUESTIONS = [
  { q: "Você usa sua moto com frequência e gostaria de melhorar o desempenho e o ronco dela?", opts: ["Sim, uso todos os dias e quero mais performance", "Uso às vezes, mas queria melhorar", "Só lazer, mas curto moto forte", "Ainda não tenho moto"] },
  { q: "A Athlon Racing é referência no mercado por focar em quê?", opts: ["Performance em motos", "Peças de carro", "Acessórios genéricos", "Utilitários básicos"] },
  { q: "O que mais te incomoda na sua moto hoje?", opts: ["Falta de potência", "Ronco fraco", "Visual simples", "Nada, mas sempre dá pra melhorar"] },
  { q: "Os módulos da Athlon Racing são desenvolvidos principalmente para:", opts: ["Alta performance e ronco esportivo", "Diminuir velocidade", "Uso decorativo", "Carros"] },
  { q: "Qual produto da linha Athlon Racing você tem mais interesse?", opts: ["Módulo M250-X", "Vestuário Athlon", "Athlon Academy", "Tudo acima!"] },
  { q: "Se existisse uma forma de melhorar sua moto com até 90% de desconto hoje, você aproveitaria?", opts: ["Com certeza, não perderia!", "Talvez dependendo do produto", "Precisaria pensar mais", "Provavelmente não"] },
];

// Wheel order CLOCKWISE from top — matches reference image exactly.
// TENTE NOVAMENTE sits right next to 90% OFF so the near-miss feels natural.
type Prize = { label: string; code: string | null; pct: string | null; desc: string | null; url: string | null; c1: string; c2: string; txt: string };
const PRIZES: Prize[] = [
  { label: "90%\nOFF", code: "ATHLON90", pct: "90%", desc: "No Módulo Athlon M250-X 🔥", url: "https://athlonracing.com.br/products/modulo-m250-x", c1: "#1f7bff", c2: "#002a8a", txt: "#ffffff" },
  { label: "TENTE\nNOVAMENTE", code: null, pct: null, desc: null, url: null, c1: "#12141d", c2: "#05060d", txt: "#6c80b8" },
  { label: "COMBO\nATHLON\nGRÁTIS", code: "COMBOATHL", pct: "COMBO", desc: "Combo Athlon Grátis!", url: "https://athlonracing.com.br/collections/combos", c1: "#1f7bff", c2: "#002a8a", txt: "#ffffff" },
  { label: "10%\nOFF", code: "ATHLON10", pct: "10%", desc: "Na loja Athlon Racing", url: "https://athlonracing.com.br", c1: "#12141d", c2: "#05060d", txt: "#e6eeff" },
  { label: "BONÉ\nATHLON\nGRÁTIS", code: "BONEATHL", pct: "BONÉ", desc: "Boné Athlon Grátis!", url: "https://athlonracing.com.br", c1: "#1f7bff", c2: "#002a8a", txt: "#ffffff" },
  { label: "30%\nOFF", code: "ATHLON30", pct: "30%", desc: "Na loja Athlon Racing", url: "https://athlonracing.com.br", c1: "#12141d", c2: "#05060d", txt: "#e6eeff" },
  { label: "MOLETOM\nATHLON\nGRÁTIS", code: "MOLATHL", pct: "MOLETOM", desc: "Moletom Athlon Grátis!", url: "https://athlonracing.com.br", c1: "#1f7bff", c2: "#002a8a", txt: "#ffffff" },
  { label: "50%\nOFF", code: "ATHLON50", pct: "50%", desc: "Na loja Athlon Racing", url: "https://athlonracing.com.br", c1: "#12141d", c2: "#05060d", txt: "#e6eeff" },
  { label: "FRETE\nGRÁTIS", code: "FRETEAT", pct: "FRETE", desc: "Frete Grátis em qualquer produto", url: "https://athlonracing.com.br", c1: "#1f7bff", c2: "#002a8a", txt: "#ffffff" },
];

const playAudio = (src: string, loop = false): HTMLAudioElement => {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.play().catch(() => {});
  return audio;
};
function Index() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [curQ, setCurQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [secondUsed, setSecondUsed] = useState(false);
  const [showSecondChance, setShowSecondChance] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState<Prize | null>(null);
  const [countdown, setCountdown] = useState(600);
  const [copied, setCopied] = useState(false);

  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const wheelRef = useRef<HTMLCanvasElement | null>(null);
  const wheelAngleRef = useRef(0);
  const roletaAudioRef = useRef<HTMLAudioElement | null>(null);

  // ── Background speed-lines canvas (same vibe as original) ──
  useEffect(() => {
    const c = bgRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    let W = 0, H = 0, raf = 0;
    const resize = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    type Line = { x: number; y: number; vx: number; vy: number; len: number; maxLen: number; alpha: number; w: number; blue: boolean };
    const reset = (t: Line) => {
      t.x = W / 2 + (Math.random() - 0.5) * W * 0.7;
      t.y = H * 0.4 + Math.random() * H * 0.2;
      t.vx = (t.x - W / 2) * 0.012;
      t.vy = 0.5 + Math.random() * 1.2;
      t.len = 0; t.maxLen = 25 + Math.random() * 100;
      t.alpha = 0.04 + Math.random() * 0.1;
      t.w = 0.3 + Math.random() * 0.7;
      t.blue = Math.random() > 0.3;
    };
    const lines: Line[] = Array.from({ length: 70 }, () => {
      const t: Line = { x: 0, y: 0, vx: 0, vy: 0, len: 0, maxLen: 0, alpha: 0, w: 0, blue: true };
      reset(t); t.y = Math.random() * H; t.len = Math.random() * t.maxLen; return t;
    });
    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(7,8,15,.91)"; ctx.fillRect(0, 0, W, H);
      const bg = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, W * 0.55);
      bg.addColorStop(0, "rgba(0,50,180,.05)"); bg.addColorStop(1, "transparent");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      for (const t of lines) {
        t.x += t.vx * 0.9; t.y += t.vy * 2.5;
        t.len = Math.min(t.len + 2.5, t.maxLen);
        if (t.y > H + 60) reset(t);
        const nx = t.x - t.vx * t.len * 0.1, ny = t.y - t.vy * t.len * 0.15;
        ctx.strokeStyle = t.blue ? `rgba(0,90,255,${t.alpha})` : `rgba(160,190,255,${t.alpha * 0.5})`;
        ctx.lineWidth = t.w;
        ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(nx, ny); ctx.stroke();
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);


  // ── Wheel draw (premium / metallic) ──
  const drawWheel = useCallback((angle: number, motoImg?: HTMLImageElement) => {
    const canvas = wheelRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2;
    const R = W / 2 - 14;
    const Rinner = W / 2 * 0.26;
    const slice = (2 * Math.PI) / PRIZES.length;
    ctx.clearRect(0, 0, W, H);

    // ── outer metallic bezel ──
    const bezel = ctx.createLinearGradient(0, 0, 0, H);
    bezel.addColorStop(0, "#2a3a66");
    bezel.addColorStop(0.5, "#0a1230");
    bezel.addColorStop(1, "#1a2548");
    ctx.beginPath(); ctx.arc(cx, cy, R + 12, 0, Math.PI * 2);
    ctx.fillStyle = bezel; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.lineWidth = 2; ctx.stroke();

    // ── segments ──
    PRIZES.forEach((p, i) => {
      const a0 = angle + i * slice - Math.PI / 2;
      const a1 = a0 + slice;
      const grd = ctx.createRadialGradient(cx, cy, Rinner, cx, cy, R);
      grd.addColorStop(0, p.c1);
      grd.addColorStop(1, p.c2);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
      ctx.fillStyle = grd; ctx.fill();
    });

    // ── gloss highlight ──
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    const gloss = ctx.createLinearGradient(0, cy - R, 0, cy);
    gloss.addColorStop(0, "rgba(255,255,255,.16)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    ctx.fillRect(cx - R, cy - R, R * 2, R);
    ctx.restore();

    // ── dividers ──
    PRIZES.forEach((_, i) => {
      const a0 = angle + i * slice - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a0) * Rinner, cy + Math.sin(a0) * Rinner);
      ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
      ctx.strokeStyle = "rgba(255,255,255,.10)"; ctx.lineWidth = 1; ctx.stroke();
    });

    // ── labels ──
    PRIZES.forEach((p, i) => {
      const a0 = angle + i * slice - Math.PI / 2;
      const am = a0 + slice / 2;
      ctx.save();
      const textR = R * 0.66;
      ctx.translate(cx + Math.cos(am) * textR, cy + Math.sin(am) * textR);
      ctx.rotate(am);
      const isBig = p.pct === "90%";
      const fs = isBig ? 20 : 13;
      const lh = isBig ? 22 : 15;
      ctx.shadowColor = "rgba(0,0,0,.9)"; ctx.shadowBlur = 5; ctx.shadowOffsetY = 1;
      ctx.font = `900 ${fs}px "Orbitron", "Barlow Condensed", Impact, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = p.txt;
      const lines = p.label.split("\n");
      const totalH = (lines.length - 1) * lh;
      lines.forEach((ln, li) => ctx.fillText(ln, 0, li * lh - totalH / 2 + fs * 0.35));
      ctx.shadowColor = "transparent";
      ctx.restore();
    });

    // ── tiny rivets around the rim ──
    for (let i = 0; i < PRIZES.length; i++) {
      const a = angle + i * slice - Math.PI / 2 + slice / 2;
      const rx = cx + Math.cos(a) * (R - 6);
      const ry = cy + Math.sin(a) * (R - 6);
      ctx.beginPath(); ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fill();
    }

    // ── inner ring outline ──
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,.95)"; ctx.lineWidth = 2; ctx.stroke();

    // ── center hub (brushed steel disc) ──
    ctx.beginPath(); ctx.arc(cx, cy, Rinner + 10, 0, Math.PI * 2);
    ctx.fillStyle = "#05060d"; ctx.fill();
    const hubG = ctx.createRadialGradient(cx - 8, cy - 10, 2, cx, cy, Rinner);
    hubG.addColorStop(0, "#2d3a6e");
    hubG.addColorStop(0.55, "#0a1230");
    hubG.addColorStop(1, "#03050d");
    ctx.beginPath(); ctx.arc(cx, cy, Rinner, 0, Math.PI * 2);
    ctx.fillStyle = hubG; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, Rinner, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(120,170,255,.45)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, Rinner + 5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(31,123,255,.35)"; ctx.lineWidth = 1; ctx.stroke();


    // logo (only) centered in hub
    if (motoImg && motoImg.complete) {
      const maxW = (Rinner - 8) * 2;
      const ratio = motoImg.naturalHeight && motoImg.naturalWidth
        ? motoImg.naturalHeight / motoImg.naturalWidth
        : 0.25;
      const w = maxW;
      const h = w * ratio;
      ctx.save();
      ctx.shadowColor = "rgba(0,120,255,.6)"; ctx.shadowBlur = 16;
      ctx.drawImage(motoImg, cx - w / 2, cy - h / 2, w, h);
      ctx.restore();
    }
  }, []);

  // load logo for wheel hub
  const motoImgRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new Image();
    img.src = athlonLogo;
    img.onload = () => { motoImgRef.current = img; drawWheel(wheelAngleRef.current, img); };
  }, [drawWheel]);

  useEffect(() => {
    if (screen === "roulette") drawWheel(wheelAngleRef.current, motoImgRef.current ?? undefined);
  }, [screen, drawWheel]);

  // ── Quiz handlers ──
  const startQuiz = () => {
    playAudio(soundEscape);
    setCurQ(0); setSelected(null); setScreen("quiz");
  };
  

  // mini confetti burst at click point
  const fireConfetti = (x: number, y: number) => {
    const root = document.querySelector(".athlon-root");
    if (!root) return;
    const wrap = document.createElement("div");
    wrap.className = "confetti-burst";
    wrap.style.setProperty("--cx", `${x}px`);
    wrap.style.setProperty("--cy", `${y}px`);
    const colors = ["#0057ff", "#00aaff", "#ffd100", "#00e676", "#ff5577", "#a777ff"];
    for (let k = 0; k < 22; k++) {
      const p = document.createElement("i");
      const ang = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 110;
      p.style.setProperty("--tx", `${Math.cos(ang) * dist}px`);
      p.style.setProperty("--ty", `${Math.sin(ang) * dist}px`);
      p.style.setProperty("--rot", `${(Math.random() - 0.5) * 720}deg`);
      p.style.setProperty("--c", colors[k % colors.length]);
      p.style.animationDelay = `${Math.random() * 80}ms`;
      wrap.appendChild(p);
    }
    const pop = document.createElement("div");
    pop.className = "feedback-pop";
    pop.textContent = ["ACERTOU!", "PERFEITO!", "MANDOU BEM!", "BOA!"][Math.floor(Math.random() * 4)];
    root.appendChild(wrap);
    root.appendChild(pop);
    setTimeout(() => { wrap.remove(); pop.remove(); }, 1100);
  };

  const handleSelect = (i: number, ev?: React.MouseEvent) => {
    if (selected !== null) return;
    setSelected(i);
    playAudio(soundWin);
    if (ev) fireConfetti(ev.clientX, ev.clientY);
    setTimeout(() => {
      if (curQ + 1 >= QUESTIONS.length) {
        setScreen("analyze");
        setTimeout(() => setScreen("roulette"), 2600);
      } else {
        setCurQ((q) => q + 1);
        setSelected(null);
      }
    }, 850);
  };

  // ── Spin ──
  const spinWheel = (isSecond: boolean) => {
    if (spinning) return;
    setSpinning(true);
    roletaAudioRef.current = playAudio(soundRoleta, true);
    if (isSecond) setShowSecondChance(false);
  
    const slice = (2 * Math.PI) / PRIZES.length;
    const idx = isSecond ? 0 : 1; // 0 = 90% OFF, 1 = TENTE NOVAMENTE
    const turns = isSecond ? 11 : 9;
  
    const currentAngle = ((wheelAngleRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    
    const targetAngle = -(idx * slice + slice / 2);
    const normalizedTarget = ((targetAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    
    let delta = normalizedTarget - currentAngle;
    if (delta > 0) delta -= 2 * Math.PI;
    
    const target = delta - turns * 2 * Math.PI;
    const jitter = (Math.random() - 0.5) * slice * 0.4;
    const finalTarget = target + jitter;
  
    const dur = isSecond ? 8000 : 6000;
    const a0 = wheelAngleRef.current;
    const t0 = performance.now();
  
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3.5);
  
    const frame = (now: number) => {
      const t = Math.min((now - t0) / dur, 1);
      wheelAngleRef.current = a0 + finalTarget * easeOut(t);
      drawWheel(wheelAngleRef.current, motoImgRef.current ?? undefined);
      if (t < 1) { requestAnimationFrame(frame); return; }
      setSpinning(false);
      const landed = PRIZES[idx];
      setTimeout(() => {
        if (roletaAudioRef.current) {
          roletaAudioRef.current.pause();
          roletaAudioRef.current.currentTime = 0;
          roletaAudioRef.current = null;
        }
        if (!landed.code) { 
          playAudio(soundLose);
          setSecondUsed(true); setShowSecondChance(true); 
        } else { 
          playAudio(soundWin);
          setPrize(landed); setScreen("win"); 
        }
      }, 400);
    };
    requestAnimationFrame(frame);
  };

  // win countdown
  useEffect(() => {
    if (screen !== "win") return;
    setCountdown(600);
    const id = setInterval(() => setCountdown((s) => (s <= 0 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [screen]);

  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");

  const copyCoupon = () => {
    if (!prize?.code) return;
    navigator.clipboard.writeText(prize.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {});
  };

  return (
    <div className="athlon-root">
      <canvas ref={bgRef} className="bg-canvas" />
      <div className="wrap">
        <header className="hdr">
          <img src={athlonLogo} alt="Athlon Racing" className="hdr-logo-img" />
        </header>

        {/* ─── INTRO ─── */}
        {screen === "intro" && (
          <section className="screen-intro">
            
            <h1 className="intro-title">
              <span className="t-small">Bem-vindo ao</span>
              Desafio<br />
              <span className="t-blue">5 Anos Athlon!</span>
            </h1>

            <div className="moto-stage">
              <div className="moto-glow" />
              <img src={athlonMoto} alt="Athlon M250-X com moto" className="moto-img" />
              <div className="moto-shadow" />
            </div>

            <div className="intro-text-block">
              <p>
                Em comemoração ao <span className="hl">Aniversário de 5 Anos da Athlon Racing</span>, preparamos um desafio exclusivo onde você descobre a história da marca e <strong>desbloqueia descontos imperdíveis no Módulo Athlon M250-X.</strong>
                <br /><br />
                <strong>Acelere com a gente</strong> — responda, gire a roleta e leve para casa o melhor da performance Athlon.
              </p>
            </div>

            <button className="btn btn-blue" onClick={startQuiz}>
              ACEITAR O DESAFIO <span className="arrow">➜</span>
            </button>
          </section>
        )}

        {/* ─── QUIZ ─── */}
        {screen === "quiz" && (
          <section className="screen-quiz">
            <div className="prog-wrap">
              <div className="prog-header">
                <span className="prog-label">Pergunta {curQ + 1} de {QUESTIONS.length}</span>
                <span className="prog-pct">{Math.round(((curQ + 1) / QUESTIONS.length) * 100)}%</span>
              </div>
              <div className="prog-track"><div className="prog-fill" style={{ width: `${Math.round(((curQ + 1) / QUESTIONS.length) * 100)}%` }} /></div>
            </div>
            <div className="q-badge">PERGUNTA {String(curQ + 1).padStart(2, "0")}</div>
            <div className="q-card q-slide-in" key={curQ}>
              <div className="q-text">{QUESTIONS[curQ].q}</div>
              <div className="opts">
                {QUESTIONS[curQ].opts.map((opt, i) => (
                  <button
                    key={i}
                    className={`opt ${selected === i ? "opt-correct" : ""} ${selected !== null && selected !== i ? "opt-dim" : ""}`}
                    disabled={selected !== null}
                    onClick={(e) => handleSelect(i, e)}
                  >
                    <span className="opt-letter">{["A", "B", "C", "D"][i]}</span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── ANALYZE ─── */}
        {screen === "analyze" && (
          <section className="screen-analyze">
            <div className="speed-loader">
              <i style={{ top: "18%", width: "55%", animationDelay: "0s" }} />
              <i style={{ top: "38%", width: "40%", animationDelay: ".25s" }} />
              <i style={{ top: "55%", width: "65%", animationDelay: ".5s" }} />
              <i style={{ top: "72%", width: "45%", animationDelay: ".8s" }} />
            </div>
            <p className="analyze-p">Analisando suas respostas…<br /><strong>Preparando sua roleta</strong> com prêmios exclusivos.</p>
          </section>
        )}

        {/* ─── ROULETTE ─── */}
        {screen === "roulette" && (
          <section className="screen-roulette">
            
            <h2 className="roulette-title">ROLETA <span>ATHLON</span></h2>
            <p className="roulette-sub">Gire a roleta e descubra seu prêmio!</p>

            <div className="wheel-scene">
              <div className="wheel-outer-ring" />
              <div className="wheel-outer-ring2" />
              <div className="wheel-pointer">
                <svg width="34" height="44" viewBox="0 0 28 38">
                  <defs>
                    <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff6b6b" />
                      <stop offset="100%" stopColor="#aa0000" />
                    </linearGradient>
                  </defs>
                  <path d="M14 38 L2 6 Q14 -2 26 6 Z" fill="url(#pg)" />
                </svg>
              </div>
              <canvas ref={wheelRef} id="wheel-canvas" width={360} height={360} />
            </div>

            {showSecondChance && (
              <div className="sc-box">
                <div className="sc-title">🎯 QUASE LÁ!</div>
                <p>Você está <strong>perto demais</strong> de um prêmio incrível.<br />Tente <strong>mais uma vez</strong> e conquiste seu desconto!</p>
                <div className="spin-btn-wrap">
                  <div className="spin-pulse-ring" />
                  <button className="btn btn-spin" disabled={spinning} onClick={() => spinWheel(true)}>GIRAR NOVAMENTE <span className="arrow">➜</span></button>
                </div>
              </div>
            )}

            {!showSecondChance && !secondUsed && (
              <>
                <br />
                <div className="spin-btn-wrap">
                  <div className="spin-pulse-ring" />
                  <button className="btn btn-spin" disabled={spinning} onClick={() => spinWheel(false)}>GIRAR AGORA <span className="arrow">➜</span></button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ─── WIN ─── */}
        {screen === "win" && prize && (
          <section className="screen-win">
            <p className="win-eyebrow">🏆 &nbsp;Parabéns! Você ganhou!</p>
            <div className="win-card">
              <p className="win-lbl">Você ganhou</p>
              <div className="win-big">
                {prize.pct === "FRETE" ? <>FRETE<sub>GRÁTIS</sub></>
                  : prize.pct === "COMBO" ? <>COMBO<sub>GRÁTIS</sub></>
                  : prize.pct === "BONÉ" ? <>BONÉ<sub>GRÁTIS</sub></>
                  : prize.pct === "MOLETOM" ? <>MOLETOM<sub>GRÁTIS</sub></>
                  : <>{prize.pct}<sub>OFF</sub></>}
              </div>
              <p className="win-desc">{prize.desc}</p>
            </div>
            <div className="coupon-wrap">
              <div className="coupon-top"><p className="coupon-lbl">Seu cupom exclusivo</p></div>
              <div className="coupon-bottom">
                <div className="coupon-code">{prize.code}</div>
                <button className={`coupon-copy ${copied ? "copied" : ""}`} onClick={copyCoupon}>
                  {copied ? "✅ COPIADO!" : "📋 COPIAR"}
                </button>
              </div>
            </div>
            <div className="timer-wrap">
              <span className="timer-lbl">⏱ Expira em:</span>
              <span className="timer-val" style={{ color: countdown <= 60 ? "#ff3d57" : undefined }}>{mm}:{ss}</span>
            </div>
            <a className="btn btn-blue" href={prize.url ?? "#"} target="_blank" rel="noreferrer">🔥 &nbsp;USAR MEU DESCONTO AGORA</a>
            <p className="urgency"><strong>⚠️ Apenas para os próximos compradores.</strong><br />Cupom válido enquanto durar o estoque.</p>
            
          </section>
        )}
      </div>
    </div>
  );
}
