import React, { useEffect, useRef, useState } from 'react';

interface Comet {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number; // in radians
  headRadius: number;
  opacity: number;
  maxOpacity: number;
  life: number;
  maxLife: number;
  headColor: string;
  tailColor: string;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
}

interface CosmicBackgroundProps {
  isPlanetSettled?: boolean;
}

export const CosmicBackground: React.FC<CosmicBackgroundProps> = ({
  isPlanetSettled = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animStage, setAnimStage] = useState<number>(0); 
  // Stages: 0: initial planet, 1: planet settled, 2: glow expands, 3: stars appear, 4: cosmic active + shooting stars

  // Manage graceful sequence on load
  useEffect(() => {
    // Stage 1: Planet settling (~600ms)
    const t1 = setTimeout(() => setAnimStage(1), 600);
    // Stage 2: Glow expands (~1400ms)
    const t2 = setTimeout(() => setAnimStage(2), 1400);
    // Stage 3: Stars gradually appear (~2200ms)
    const t3 = setTimeout(() => setAnimStage(3), 2200);
    // Stage 4: Cosmic background fully active + comets (~3000ms)
    const t4 = setTimeout(() => setAnimStage(4), 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const checkReducedMotion = () => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    };
    let reducedMotion = checkReducedMotion();

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
    };
    mediaQuery.addEventListener('change', handleMotionChange);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
    };
    window.addEventListener('resize', handleResize);

    // Color palettes for organic starlight
    const starColors = [
      '#ffffff', // Pure white
      '#fef3c7', // Warm celestial amber
      '#e0f2fe', // Soft cyan
      '#f1f5f9', // Pearl silver
      '#fed7aa', // Light peach
    ];

    // Generate static/twinkling stars
    let stars: Star[] = [];
    const initStars = () => {
      stars = [];
      const isMobile = width < 768;
      // Starlight density: moderate, never cluttered
      const count = isMobile ? 85 : 175;

      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() < 0.85 ? 0.6 + Math.random() * 0.8 : 1.4 + Math.random() * 0.9,
          baseAlpha: 0.15 + Math.random() * 0.55,
          twinkleSpeed: 0.5 + Math.random() * 1.5,
          twinklePhase: Math.random() * Math.PI * 2,
          color: starColors[Math.floor(Math.random() * starColors.length)],
        });
      }
    };
    initStars();

    // Shooting Stars / Comets System
    let comets: Comet[] = [];
    let lastCometSpawn = performance.now();
    // Next comet spawn interval (random between 4500ms and 8500ms)
    let nextCometDelay = 3500 + Math.random() * 3500;

    const spawnComet = () => {
      if (reducedMotion) return;
      // Never spawn if there's already an active comet on screen (keeps it rare and realistic)
      if (comets.length >= 1) return;

      const isMobile = width < 768;
      // Trajectory angle: ~28 to 44 degrees downward
      const angle = (Math.PI / 180) * (30 + Math.random() * 14);
      // Speed: smooth and swift (12 to 18 px/frame)
      const speed = isMobile ? 10 + Math.random() * 4 : 13 + Math.random() * 6;
      // Length: 120 to 220px long glowing tail
      const length = isMobile ? 90 + Math.random() * 60 : 140 + Math.random() * 90;
      // Start near top or upper-left
      const startX = Math.random() < 0.6 ? Math.random() * (width * 0.75) : -40;
      const startY = startX < 0 ? Math.random() * (height * 0.4) : -20 - Math.random() * 50;

      const maxLife = isMobile ? 45 : 60;

      comets.push({
        x: startX,
        y: startY,
        length,
        speed,
        angle,
        headRadius: 1.6 + Math.random() * 0.8,
        opacity: 0,
        maxOpacity: 0.55 + Math.random() * 0.25, // Subtle, never distracting
        life: 0,
        maxLife,
        headColor: Math.random() < 0.6 ? '#ffffff' : '#fef08a',
        tailColor: Math.random() < 0.5 ? 'rgba(245, 158, 11, 0.45)' : 'rgba(56, 189, 248, 0.4)',
      });
    };

    let clock = 0;

    // Animation Loop
    const render = (timestamp: number) => {
      animId = requestAnimationFrame(render);
      clock += 0.016;

      ctx.clearRect(0, 0, width, height);

      // Check if page/tab is hidden to save battery
      if (document.hidden) return;

      // 1. Render Stars (gradually fade in based on stage)
      const starStageMultiplier = animStage >= 4 ? 1 : animStage === 3 ? 0.65 : animStage === 2 ? 0.3 : 0.05;

      if (starStageMultiplier > 0.01) {
        for (let i = 0; i < stars.length; i++) {
          const star = stars[i];
          // Gentle sinusoidal twinkle
          const twinkle = Math.sin(clock * star.twinkleSpeed + star.twinklePhase) * 0.3 + 0.7;
          const alpha = star.baseAlpha * twinkle * starStageMultiplier;

          ctx.fillStyle = star.color;
          ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Render & Update Comets / Falling Stars (Only in stage 4 or later)
      if (animStage >= 4 && !reducedMotion) {
        // Spawn check
        if (timestamp - lastCometSpawn > nextCometDelay) {
          spawnComet();
          lastCometSpawn = timestamp;
          nextCometDelay = 4200 + Math.random() * 4500;
        }

        for (let i = comets.length - 1; i >= 0; i--) {
          const c = comets[i];
          c.life++;

          // Natural lifecycle:
          // 0 -> 25% life: fade in
          // 25% -> 70% life: full opacity
          // 70% -> 100% life: graceful fade out
          const lifeProgress = c.life / c.maxLife;
          if (lifeProgress < 0.25) {
            c.opacity = (lifeProgress / 0.25) * c.maxOpacity;
          } else if (lifeProgress > 0.65) {
            c.opacity = (1 - (lifeProgress - 0.65) / 0.35) * c.maxOpacity;
          } else {
            c.opacity = c.maxOpacity;
          }

          // Advance comet position
          const dx = Math.cos(c.angle) * c.speed;
          const dy = Math.sin(c.angle) * c.speed;
          c.x += dx;
          c.y += dy;

          // Tail origin (backwards along trajectory)
          const tailX = c.x - Math.cos(c.angle) * c.length;
          const tailY = c.y - Math.sin(c.angle) * c.length;

          // Draw comet tail with smooth elongated gradient
          const grad = ctx.createLinearGradient(tailX, tailY, c.x, c.y);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          grad.addColorStop(0.5, c.tailColor);
          grad.addColorStop(0.9, 'rgba(255, 255, 255, 0.7)');
          grad.addColorStop(1, '#ffffff');

          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.2;
          ctx.lineCap = 'round';
          ctx.globalAlpha = Math.max(0, Math.min(1, c.opacity));
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(c.x, c.y);
          ctx.stroke();

          // Draw bright comet head with soft starlight glow
          const headBloom = ctx.createRadialGradient(
            c.x,
            c.y,
            0,
            c.x,
            c.y,
            c.headRadius * 3.5
          );
          headBloom.addColorStop(0, '#ffffff');
          headBloom.addColorStop(0.4, c.headColor);
          headBloom.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.fillStyle = headBloom;
          ctx.beginPath();
          ctx.arc(c.x, c.y, c.headRadius * 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

          // Remove comet if life completed or moved off-screen
          if (c.life >= c.maxLife || c.x > width + 100 || c.y > height + 100) {
            comets.splice(i, 1);
          }
        }
      }

      ctx.globalAlpha = 1.0;
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, [animStage]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden"
    >
      {/* Deep Space Background Layer with subtle gradient nebula breathing */}
      <div
        className={`absolute inset-0 bg-[#06070a] transition-opacity duration-1000 ${
          animStage >= 1 ? 'opacity-100' : 'opacity-90'
        }`}
      />

      {/* Nebula 1: Deep Indigo Cosmic Dust (Top Right / Center) */}
      <div
        className={`absolute top-[-10%] right-[-5%] w-[800px] h-[600px] rounded-full bg-gradient-to-br from-indigo-950/25 via-sky-950/15 to-transparent blur-[140px] pointer-events-none transition-all duration-[2000ms] ${
          animStage >= 2
            ? 'opacity-80 scale-100'
            : 'opacity-20 scale-90'
        }`}
      />

      {/* Nebula 2: Warm Celestial Amber Glow (Mid Left / Workspace) */}
      <div
        className={`absolute top-[40%] left-[-10%] w-[650px] h-[550px] rounded-full bg-gradient-to-tr from-amber-500/[0.04] via-amber-700/[0.02] to-transparent blur-[130px] pointer-events-none transition-all duration-[2500ms] ${
          animStage >= 2
            ? 'opacity-70 scale-100'
            : 'opacity-10 scale-90'
        }`}
      />

      {/* Nebula 3: Subtle Violet Core (Bottom Right) */}
      <div
        className={`absolute bottom-[-10%] right-[10%] w-[700px] h-[500px] rounded-full bg-gradient-to-tl from-purple-950/20 via-indigo-950/10 to-transparent blur-[150px] pointer-events-none transition-all duration-[2500ms] ${
          animStage >= 3
            ? 'opacity-60 scale-100'
            : 'opacity-0 scale-95'
        }`}
      />

      {/* Starlight & Shooting Star Canvas Layer */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
          animStage >= 3 ? 'opacity-100' : 'opacity-40'
        }`}
      />
    </div>
  );
};
