import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeFocusCoreProps {
  isActive: boolean;
  progressPercent: number;
}

export const ThreeFocusCore: React.FC<ThreeFocusCoreProps> = ({
  isActive,
  progressPercent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 240;
    const height = container.clientHeight || 180;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 5.2;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group for gyroscopic rotation
    const gyroGroup = new THREE.Group();
    scene.add(gyroGroup);

    // Inner Core: Octahedron
    const coreGeo = new THREE.OctahedronGeometry(0.85, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, // Amber-400
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
      wireframe: false,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    gyroGroup.add(coreMesh);

    // Inner Wireframe Shell
    const wireGeo = new THREE.OctahedronGeometry(0.95, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    gyroGroup.add(wireMesh);

    // Outer Gimbal Ring 1 (XY plane)
    const ring1Geo = new THREE.TorusGeometry(1.4, 0.035, 16, 64);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.9,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    gyroGroup.add(ring1);

    // Outer Gimbal Ring 2 (YZ plane)
    const ring2Geo = new THREE.TorusGeometry(1.7, 0.03, 16, 64);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.4,
      metalness: 0.85,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 2;
    gyroGroup.add(ring2);

    // Outer Gimbal Ring 3 (XZ plane)
    const ring3Geo = new THREE.TorusGeometry(2.0, 0.025, 16, 64);
    const ring3Mat = new THREE.MeshStandardMaterial({
      color: 0x78716c,
      roughness: 0.5,
      metalness: 0.8,
    });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.rotation.y = Math.PI / 2;
    gyroGroup.add(ring3);

    // Orbiting Focus Spark particles
    const particleCount = 40;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const radius = 1.3 + Math.random() * 1.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      positions[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      positions[i * 3 + 1] = radius * Math.sin(phi);
      positions[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.07,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    gyroGroup.add(particles);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xfbbf24, 2.5, 10);
    pointLight1.position.set(3, 3, 3);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xf59e0b, 1.8, 10);
    pointLight2.position.set(-3, -2, -2);
    scene.add(pointLight2);

    // Interactive mouse parallax
    let targetRotX = 0;
    let targetRotY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotX = y * 0.4;
      targetRotY = x * 0.6;
    };
    container.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const speedMultiplier = isActive ? 2.2 : 0.6;

      // Rotate concentric rings on multiple axes
      ring1.rotation.z += 0.012 * speedMultiplier;
      ring1.rotation.x += 0.007 * speedMultiplier;

      ring2.rotation.y += 0.015 * speedMultiplier;
      ring2.rotation.z += 0.009 * speedMultiplier;

      ring3.rotation.x += 0.008 * speedMultiplier;
      ring3.rotation.y += 0.011 * speedMultiplier;

      // Pulse core with progress & breathing animation
      const breath = Math.sin(elapsedTime * (isActive ? 3.5 : 1.5)) * 0.08 + 1.0;
      coreMesh.scale.set(breath, breath, breath);
      coreMesh.rotation.y += 0.02 * speedMultiplier;
      coreMesh.rotation.x += 0.015 * speedMultiplier;

      wireMesh.rotation.y -= 0.015 * speedMultiplier;
      wireMesh.rotation.z += 0.01 * speedMultiplier;

      // Orbit particles
      particles.rotation.y += 0.005 * speedMultiplier;

      // Smooth mouse follow
      gyroGroup.rotation.x += (targetRotX - gyroGroup.rotation.x) * 0.05;
      gyroGroup.rotation.y += (targetRotY - gyroGroup.rotation.y) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // Resize handling
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newW = entry.contentRect.width;
        const newH = entry.contentRect.height;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      container.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      ring3Geo.dispose();
      ring3Mat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [isActive]);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div
        ref={containerRef}
        className="w-48 h-36 sm:w-56 sm:h-40 cursor-grab active:cursor-grabbing"
      />
      <div className="text-[11px] font-mono tracking-wider uppercase text-stone-400 mt-[-8px] flex items-center gap-1.5">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            isActive ? 'bg-amber-400 animate-ping' : 'bg-stone-500'
          }`}
        />
        <span>{isActive ? '3D Focus Matrix Active' : 'Focus Mode Ready'}</span>
      </div>
    </div>
  );
};
