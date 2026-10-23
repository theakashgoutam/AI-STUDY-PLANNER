import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeHeroGemProps {
  priorityScore: number;
  priorityLevel: 'High' | 'Medium' | 'Low';
}

export const ThreeHeroGem: React.FC<ThreeHeroGemProps> = ({
  priorityScore,
  priorityLevel,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 100;
    const height = container.clientHeight || 100;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.z = 3.6;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Determine colors by priority level
    let mainColor = 0xf43f5e; // Rose
    let emissiveColor = 0xbe123c;
    if (priorityLevel === 'Medium') {
      mainColor = 0xf59e0b; // Amber
      emissiveColor = 0xb45309;
    } else if (priorityLevel === 'Low') {
      mainColor = 0x10b981; // Emerald
      emissiveColor = 0x047857;
    }

    // 3D Gem Mesh: Icosahedron
    const gemGeo = new THREE.IcosahedronGeometry(0.9, 0);
    const gemMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      emissive: emissiveColor,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.85,
      flatShading: true,
    });
    const gemMesh = new THREE.Mesh(gemGeo, gemMat);
    group.add(gemMesh);

    // Surrounding thin wireframe orbit
    const ringGeo = new THREE.TorusGeometry(1.3, 0.02, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.6,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    group.add(ringMesh);

    // Orbiting particle satellite
    const satGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const satMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const satellite = new THREE.Mesh(satGeo, satMat);
    group.add(satellite);

    // Lights
    const ambLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(2, 3, 2);
    scene.add(dirLight);

    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    container.addEventListener('mousemove', onMouseMove);

    const clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Spin gem
      gemMesh.rotation.x += 0.01;
      gemMesh.rotation.y += 0.015;

      // Pulse size with priority urgency
      const pulseSpeed = priorityLevel === 'High' ? 3.0 : 1.8;
      const pulse = 1.0 + Math.sin(elapsed * pulseSpeed) * 0.06;
      gemMesh.scale.set(pulse, pulse, pulse);

      // Rotate orbit ring
      ringMesh.rotation.z += 0.012;
      ringMesh.rotation.y += 0.008;

      // Orbit satellite
      const satRadius = 1.3;
      satellite.position.x = Math.cos(elapsed * 2.0) * satRadius;
      satellite.position.y = Math.sin(elapsed * 2.0) * satRadius * Math.cos(Math.PI / 3);
      satellite.position.z = Math.sin(elapsed * 2.0) * satRadius * Math.sin(Math.PI / 3);

      // Mouse lean
      group.rotation.y += (mouseX * 0.8 - group.rotation.y) * 0.08;
      group.rotation.x += (-mouseY * 0.8 - group.rotation.x) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      container.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      gemGeo.dispose();
      gemMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      satGeo.dispose();
      satMat.dispose();
    };
  }, [priorityScore, priorityLevel]);

  return (
    <div
      ref={mountRef}
      className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 cursor-pointer"
      title="3D Priority Indicator"
    />
  );
};
