import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreePlanetCanvasProps {
  progress: number; // 0 to 1 scroll progress of the planet section
}

export const ThreePlanetCanvas: React.FC<ThreePlanetCanvasProps> = ({ progress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene setup
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 8);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // Planet Group (for unified rotation & translation)
    const planetGroup = new THREE.Group();
    scene.add(planetGroup);

    // Procedural Planet Texture using Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Deep dark oceanic indigo base
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#040711');
      grad.addColorStop(0.5, '#0b1329');
      grad.addColorStop(1, '#040711');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // Continent & terrain swirls
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 512;
        const radius = 40 + Math.random() * 110;
        const cGrad = ctx.createRadialGradient(x, y, 5, x, y, radius);
        cGrad.addColorStop(0, 'rgba(28, 48, 85, 0.45)');
        cGrad.addColorStop(0.6, 'rgba(16, 28, 55, 0.25)');
        cGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Golden nocturnal data clusters / study nodes
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * 1024;
        const y = 100 + Math.random() * 312;
        ctx.fillStyle = 'rgba(245, 158, 11, 0.65)';
        ctx.beginPath();
        ctx.arc(x, y, 1.2 + Math.random() * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle atmospheric cloud bands
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      for (let y = 80; y < 450; y += 40) {
        ctx.fillRect(0, y + Math.sin(y) * 10, 1024, 18);
      }
    }

    const planetTexture = new THREE.CanvasTexture(canvas);

    // Planet Sphere
    const planetGeo = new THREE.SphereGeometry(2.3, 64, 64);
    const planetMat = new THREE.MeshStandardMaterial({
      map: planetTexture,
      roughness: 0.7,
      metalness: 0.15,
      bumpScale: 0.05,
    });
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    planetGroup.add(planetMesh);

    // Atmospheric Glow Outer Shell (Fresnel-like rim lighting)
    const atmosphereGeo = new THREE.SphereGeometry(2.42, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 2.2);
          gl_FragColor = vec4(0.25, 0.55, 0.95, 1.0) * intensity * 1.4;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    planetGroup.add(atmosphereMesh);

    // Orbital Thin Ring 1 (Study Loop)
    const ringGeo1 = new THREE.RingGeometry(3.1, 3.12, 128);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = Math.PI * 0.42;
    ringMesh1.rotation.y = Math.PI * 0.15;
    planetGroup.add(ringMesh1);

    // Orbital Thin Ring 2 (Retention Orbit)
    const ringGeo2 = new THREE.RingGeometry(3.7, 3.72, 128);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = Math.PI * 0.55;
    ringMesh2.rotation.y = -Math.PI * 0.2;
    planetGroup.add(ringMesh2);

    // Floating Satellite / Focus Probe Node
    const probeGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const probeMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const probeMesh = new THREE.Mesh(probeGeo, probeMat);
    planetGroup.add(probeMesh);

    // =========================================================================
    // Premium Multi-Layer Celestial Starfield
    // =========================================================================

    // 1. Static Deep Background Stars (Distant, faint micro-stars)
    const deepStarCount = 550;
    const deepStarGeo = new THREE.BufferGeometry();
    const deepStarPos = new Float32Array(deepStarCount * 3);
    for (let i = 0; i < deepStarCount * 3; i += 3) {
      deepStarPos[i] = (Math.random() - 0.5) * 45;
      deepStarPos[i + 1] = (Math.random() - 0.5) * 35;
      deepStarPos[i + 2] = (Math.random() - 0.5) * 20 - 8;
    }
    deepStarGeo.setAttribute('position', new THREE.BufferAttribute(deepStarPos, 3));
    const deepStarMat = new THREE.PointsMaterial({
      color: 0xdbeafe,
      size: 0.035,
      transparent: true,
      opacity: 0.45,
    });
    const deepStars = new THREE.Points(deepStarGeo, deepStarMat);
    scene.add(deepStars);

    // 2. Naturally Twinkling Mid-Layer Stars (Custom Shader for organic breathing)
    const twinkleCount = 280;
    const twinkleGeo = new THREE.BufferGeometry();
    const twinklePos = new Float32Array(twinkleCount * 3);
    const twinkleSizes = new Float32Array(twinkleCount);
    const twinklePhases = new Float32Array(twinkleCount);
    const twinkleSpeeds = new Float32Array(twinkleCount);
    const twinkleColors = new Float32Array(twinkleCount * 3);

    const starColorPalette = [
      new THREE.Color(0xffffff), // Diamond white
      new THREE.Color(0xfef3c7), // Warm golden starlight
      new THREE.Color(0xe0f2fe), // Soft cosmic cyan
      new THREE.Color(0xf1f5f9), // Neutral ivory
    ];

    for (let i = 0; i < twinkleCount; i++) {
      const i3 = i * 3;
      twinklePos[i3] = (Math.random() - 0.5) * 36;
      twinklePos[i3 + 1] = (Math.random() - 0.5) * 26;
      twinklePos[i3 + 2] = (Math.random() - 0.5) * 16 - 2;

      // Varied star sizes
      twinkleSizes[i] = 1.2 + Math.random() * 2.6;
      // Individual twinkle phase & frequency (gentle, organic)
      twinklePhases[i] = Math.random() * Math.PI * 2;
      twinkleSpeeds[i] = 0.5 + Math.random() * 1.2;

      // Color variation
      const col = starColorPalette[Math.floor(Math.random() * starColorPalette.length)];
      twinkleColors[i3] = col.r;
      twinkleColors[i3 + 1] = col.g;
      twinkleColors[i3 + 2] = col.b;
    }

    twinkleGeo.setAttribute('position', new THREE.BufferAttribute(twinklePos, 3));
    twinkleGeo.setAttribute('size', new THREE.BufferAttribute(twinkleSizes, 1));
    twinkleGeo.setAttribute('phase', new THREE.BufferAttribute(twinklePhases, 1));
    twinkleGeo.setAttribute('speed', new THREE.BufferAttribute(twinkleSpeeds, 1));
    twinkleGeo.setAttribute('color', new THREE.BufferAttribute(twinkleColors, 3));

    const twinkleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        attribute float size;
        attribute float phase;
        attribute float speed;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vBrightness;

        void main() {
          vColor = color;
          // Organic, gentle sinusoidal twinkle
          float twinkle = sin(uTime * speed + phase) * 0.35 + 0.65;
          vBrightness = twinkle;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (12.0 / -mvPosition.z) * (0.8 + 0.3 * twinkle);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vBrightness;

        void main() {
          // Circular point with soft gaussian glow
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.05, d) * vBrightness * 0.85;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const twinkleStars = new THREE.Points(twinkleGeo, twinkleMat);
    scene.add(twinkleStars);

    // 3. Gentle Falling / Descending Cosmic Particles (Slow moving downward)
    const fallingCount = 65;
    const fallingGeo = new THREE.BufferGeometry();
    const fallingPos = new Float32Array(fallingCount * 3);
    const fallingVelocities = new Float32Array(fallingCount);

    for (let i = 0; i < fallingCount; i++) {
      const i3 = i * 3;
      fallingPos[i3] = (Math.random() - 0.5) * 30;
      fallingPos[i3 + 1] = (Math.random() - 0.5) * 28;
      fallingPos[i3 + 2] = (Math.random() - 0.5) * 12 - 1;
      // Subtle downward velocity
      fallingVelocities[i] = 0.006 + Math.random() * 0.014;
    }

    fallingGeo.setAttribute('position', new THREE.BufferAttribute(fallingPos, 3));
    const fallingMat = new THREE.PointsMaterial({
      color: 0xfde68a, // Soft warm amber / golden stardust
      size: 0.055,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const fallingParticles = new THREE.Points(fallingGeo, fallingMat);
    scene.add(fallingParticles);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x0a1020, 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 3.2);
    sunLight.position.set(-6, 4, 5);
    scene.add(sunLight);

    const blueFillLight = new THREE.DirectionalLight(0x38bdf8, 0.7);
    blueFillLight.position.set(6, -3, -2);
    scene.add(blueFillLight);

    // Responsive resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Slow idle planetary rotation
      planetMesh.rotation.y = elapsedTime * 0.08;

      // Probe orbit
      const probeAngle = elapsedTime * 0.45;
      probeMesh.position.set(
        Math.cos(probeAngle) * 3.11,
        Math.sin(probeAngle * 0.8) * 0.8,
        Math.sin(probeAngle) * 3.11
      );

      // Orbital rings subtle drift
      ringMesh1.rotation.z = elapsedTime * 0.02;
      ringMesh2.rotation.z = -elapsedTime * 0.015;

      // Stars subtle drift & Twinkle uniform update
      deepStars.rotation.y = elapsedTime * 0.003;
      twinkleMat.uniforms.uTime.value = elapsedTime;
      twinkleStars.rotation.y = elapsedTime * 0.004;

      // Update gently falling particles (drifting downwards with subtle horizontal sway)
      const fPositions = fallingGeo.attributes.position.array as Float32Array;
      const scrollDrift = (progressRef.current - 0.5) * 0.015;
      for (let i = 0; i < fallingCount; i++) {
        const i3 = i * 3;
        // Move downward
        fPositions[i3 + 1] -= fallingVelocities[i] + Math.abs(scrollDrift);
        // Subtle sinusoidal sway
        fPositions[i3] += Math.sin(elapsedTime * 0.8 + i) * 0.002;

        // Wrap around when past bottom boundary
        if (fPositions[i3 + 1] < -14) {
          fPositions[i3 + 1] = 14;
          fPositions[i3] = (Math.random() - 0.5) * 30;
        }
      }
      fallingGeo.attributes.position.needsUpdate = true;

      // Scroll-driven position & rotation
      // Progress 0: Planet is far right (x = 5.5 to 7.0 depending on aspect)
      // Progress 1: Planet is at center (x = 0 or 1.2 on large screens for split text)
      const isMobile = window.innerWidth < 768;
      const currentProg = progressRef.current;
      
      // Interpolate X position: from right to center
      const startX = isMobile ? 2.6 : 3.6;
      const targetX = isMobile ? 0 : 1.2;
      const currentX = THREE.MathUtils.lerp(startX, targetX, Math.min(Math.max(currentProg, 0), 1));
      
      // Tilt and vertical alignment with subtle parallax
      planetGroup.position.x = currentX;
      planetGroup.position.y = THREE.MathUtils.lerp(-0.2, 0, currentProg);
      planetGroup.rotation.z = 0.23 + (1 - currentProg) * 0.15;

      // Gentle camera parallax as user scrolls through space
      camera.position.y = (currentProg - 0.5) * -0.6;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      planetGeo.dispose();
      planetMat.dispose();
      atmosphereGeo.dispose();
      atmosphereMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      probeGeo.dispose();
      probeMat.dispose();
      deepStarGeo.dispose();
      deepStarMat.dispose();
      twinkleGeo.dispose();
      twinkleMat.dispose();
      fallingGeo.dispose();
      fallingMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{ overflow: 'hidden' }}
    />
  );
};
