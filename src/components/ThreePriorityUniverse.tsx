import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  Sparkles,
  RotateCcw,
  Play,
  Maximize2,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { ScoredTopic, Subject } from '../types';

interface ThreePriorityUniverseProps {
  scoredTopics: ScoredTopic[];
  subjects: Subject[];
  onStudyNow: (topic: ScoredTopic) => void;
  onUpdateProgress: (topic: ScoredTopic) => void;
}

export const ThreePriorityUniverse: React.FC<ThreePriorityUniverseProps> = ({
  scoredTopics,
  subjects,
  onStudyNow,
  onUpdateProgress,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Hovered / selected topic state
  const [hoveredTopic, setHoveredTopic] = useState<ScoredTopic | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<ScoredTopic | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string | null>(null);

  // Ref to trigger camera centering from react state
  const focusTargetRef = useRef<THREE.Vector3 | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Filter topics
  const displayTopics = useMemo(() => {
    if (!activeSubjectFilter) return scoredTopics;
    return scoredTopics.filter((t) => t.subject.id === activeSubjectFilter);
  }, [scoredTopics, activeSubjectFilter]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f172a, 0.035);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 3, 13);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor(0x0f172a, 1); // Slate-900 cosmic backdrop
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Root cluster group that orbits
    const universeGroup = new THREE.Group();
    scene.add(universeGroup);

    // Ambient and point lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const centerLight = new THREE.PointLight(0xfbbf24, 2, 25);
    centerLight.position.set(0, 0, 0);
    universeGroup.add(centerLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 1.2);
    topLight.position.set(5, 10, 7);
    scene.add(topLight);

    // 3D Grid Coordinate Planes
    const gridHelper = new THREE.GridHelper(16, 16, 0x334155, 0x1e293b);
    gridHelper.position.y = -3.5;
    universeGroup.add(gridHelper);

    // Floating Stardust Particles
    const dustCount = 200;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 26;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.08,
      transparent: true,
      opacity: 0.45,
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    universeGroup.add(dustParticles);

    // Topic Meshes Mapping
    const topicMeshes: {
      mesh: THREE.Mesh;
      haloMesh: THREE.Mesh;
      ringMesh?: THREE.Mesh;
      scored: ScoredTopic;
      originalPos: THREE.Vector3;
    }[] = [];

    // Map each topic into 3D Space:
    // X = Student Weakness (-5.5 to 5.5)
    // Y = Exam Urgency (-2 to 4.5)
    // Z = Incompleteness & Importance (-4.5 to 4.5)
    const nodesGroup = new THREE.Group();
    universeGroup.add(nodesGroup);

    displayTopics.forEach((scored, idx) => {
      const { breakdown, priorityScore, priorityLevel } = scored;

      // X: Weakness (0 to 100) -> (-5 to +5)
      const weaknessVal = breakdown.rawWeakness ?? 50;
      const posX = ((weaknessVal - 50) / 50) * 5.2 + (Math.random() - 0.5) * 0.4;

      // Y: Urgency (0 to 100) -> (-2 to 4.5)
      const urgencyVal = breakdown.rawUrgency ?? 50;
      const posY = ((urgencyVal - 50) / 50) * 3.2 + (idx === 0 ? 1.0 : 0);

      // Z: Incompleteness & Importance -> (-4.5 to 4.5)
      const incVal = breakdown.rawIncompleteness ?? 50;
      const posZ = ((incVal - 50) / 50) * 4.5 + (Math.random() - 0.5) * 0.4;

      // Colors based on priority
      let hexColor = 0xf43f5e; // High: Ruby / Crimson
      let emissive = 0xbe123c;
      if (priorityLevel === 'Medium') {
        hexColor = 0xf59e0b; // Amber
        emissive = 0xb45309;
      } else if (priorityLevel === 'Low') {
        hexColor = 0x10b981; // Emerald
        emissive = 0x047857;
      }

      // Radius scales slightly with priorityScore
      const radius = 0.35 + (priorityScore / 100) * 0.25;

      const sphereGeo = new THREE.SphereGeometry(radius, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: hexColor,
        emissive: emissive,
        emissiveIntensity: 0.65,
        roughness: 0.25,
        metalness: 0.6,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(posX, posY, posZ);
      sphere.userData = { topicId: scored.topic.id, scoredTopic: scored };
      nodesGroup.add(sphere);

      // Outer wireframe halo
      const haloGeo = new THREE.IcosahedronGeometry(radius * 1.35, 1);
      const haloMat = new THREE.MeshBasicMaterial({
        color: hexColor,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      sphere.add(haloMesh);

      // Special Beacon for Rank #1 Topic!
      let ringMesh: THREE.Mesh | undefined;
      if (idx === 0) {
        const rankRingGeo = new THREE.TorusGeometry(radius * 1.8, 0.03, 16, 64);
        const rankRingMat = new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0.85,
        });
        ringMesh = new THREE.Mesh(rankRingGeo, rankRingMat);
        ringMesh.rotation.x = Math.PI / 2;
        sphere.add(ringMesh);
      }

      topicMeshes.push({
        mesh: sphere,
        haloMesh,
        ringMesh,
        scored,
        originalPos: new THREE.Vector3(posX, posY, posZ),
      });
    });

    // Subject Constellation Lines
    // Connect topics that share the same subject
    const subjectMap = new Map<string, THREE.Vector3[]>();
    topicMeshes.forEach((t) => {
      const sid = t.scored.subject.id;
      if (!subjectMap.has(sid)) subjectMap.set(sid, []);
      subjectMap.get(sid)!.push(t.originalPos);
    });

    const linesGroup = new THREE.Group();
    universeGroup.add(linesGroup);

    subjectMap.forEach((positions) => {
      if (positions.length > 1) {
        for (let i = 0; i < positions.length - 1; i++) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            positions[i],
            positions[i + 1],
          ]);
          const lineMat = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.25,
            linewidth: 1,
          });
          const line = new THREE.Line(lineGeo, lineMat);
          linesGroup.add(line);
        }
      }
    });

    // Mouse Controls & Raycasting
    const raycaster = new THREE.Raycaster();
    const mouse2D = new THREE.Vector2(-999, -999);

    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotationVelocityX = 0;
    let rotationVelocityY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse2D.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse2D.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        rotationVelocityY = deltaX * 0.005;
        rotationVelocityX = deltaY * 0.005;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.min(22, Math.max(6, camera.position.z + e.deltaY * 0.01));
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clickMouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      );
      raycaster.setFromCamera(clickMouse, camera);
      const intersects = raycaster.intersectObjects(
        topicMeshes.map((t) => t.mesh)
      );

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const scored = hit.userData.scoredTopic as ScoredTopic;
        setSelectedTopic(scored);
      }
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('click', onClick);

    // Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Auto rotation when enabled and not dragging
      if (autoRotate && !isDragging) {
        universeGroup.rotation.y += 0.003;
      }

      // Drag inertia
      if (!isDragging) {
        universeGroup.rotation.y += rotationVelocityY;
        universeGroup.rotation.x += rotationVelocityX;
        rotationVelocityY *= 0.92;
        rotationVelocityX *= 0.92;
      } else {
        universeGroup.rotation.y += rotationVelocityY;
        universeGroup.rotation.x += rotationVelocityX;
      }

      // Keep pitch within gentle bounds
      universeGroup.rotation.x = Math.max(-0.6, Math.min(0.6, universeGroup.rotation.x));

      // Animate topic nodes (gentle float & halo rotation)
      topicMeshes.forEach((t, i) => {
        const floatOffset = Math.sin(elapsed * 2 + i * 0.8) * 0.06;
        t.mesh.position.y = t.originalPos.y + floatOffset;
        t.haloMesh.rotation.y += 0.015;
        t.haloMesh.rotation.z += 0.01;

        if (t.ringMesh) {
          t.ringMesh.rotation.z += 0.025;
          const pulse = 1.0 + Math.sin(elapsed * 4) * 0.12;
          t.ringMesh.scale.set(pulse, pulse, pulse);
        }
      });

      // Smooth camera focus transition if focusTarget is set
      if (focusTargetRef.current) {
        camera.lookAt(focusTargetRef.current);
      } else {
        camera.lookAt(0, 0, 0);
      }

      // Raycasting for hover tooltip
      raycaster.setFromCamera(mouse2D, camera);
      const intersects = raycaster.intersectObjects(
        topicMeshes.map((t) => t.mesh)
      );

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const scored = hit.userData.scoredTopic as ScoredTopic;
        setHoveredTopic(scored);

        // Calculate screen projection for HUD
        const screenPos = hit.position.clone();
        hit.getWorldPosition(screenPos);
        screenPos.project(camera);
        const screenX = ((screenPos.x + 1) * width) / 2;
        const screenY = ((-screenPos.y + 1) * height) / 2;
        setHoverPos({ x: screenX, y: screenY });

        // Enlarge hovered mesh
        hit.scale.set(1.25, 1.25, 1.25);
      } else {
        setHoveredTopic(null);
        topicMeshes.forEach((t) => {
          t.mesh.scale.set(1, 1, 1);
        });
      }

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
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      gridHelper.dispose();
    };
  }, [displayTopics, autoRotate]);

  const handleFocusTopTopic = () => {
    if (scoredTopics.length > 0 && cameraRef.current) {
      const top = scoredTopics[0];
      setSelectedTopic(top);
    }
  };

  const handleResetView = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 3, 13);
      focusTargetRef.current = null;
    }
    setSelectedTopic(null);
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-[#06070a] shadow-2xl select-none">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-[460px] sm:h-[540px] cursor-grab active:cursor-grabbing"
      />

      {/* Top 3D HUD Navigation Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none z-10">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1017]/80 backdrop-blur-md border border-white/[0.08] text-white text-xs font-semibold shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>3D Priority Constellation</span>
          </div>
          <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-md bg-white/[0.04] text-stone-400 text-[11px] backdrop-blur-sm border border-white/[0.08]">
            Drag to Orbit • Scroll to Zoom • Click Nodes
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Auto Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-md transition-all border flex items-center gap-1.5 cursor-pointer shadow-md ${
              autoRotate
                ? 'bg-amber-400/20 border-amber-400/40 text-amber-300'
                : 'bg-[#0d1017]/80 border-white/[0.08] text-stone-400 hover:text-stone-200'
            }`}
          >
            <Play className={`w-3 h-3 ${autoRotate ? 'fill-amber-400' : ''}`} />
            <span>{autoRotate ? 'Orbiting' : 'Paused'}</span>
          </button>

          {/* Reset Camera */}
          <button
            onClick={handleResetView}
            title="Reset 3D camera"
            className="p-1.5 rounded-lg bg-[#0d1017]/80 border border-white/[0.08] text-stone-300 hover:text-white backdrop-blur-md shadow-md cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Target #1 Topic */}
          <button
            onClick={handleFocusTopTopic}
            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Focus #1 Priority</span>
          </button>
        </div>
      </div>

      {/* Axis Coordinate Indicators (PRD transparency) */}
      <div className="absolute bottom-4 left-4 pointer-events-none hidden md:flex flex-col gap-1 text-[11px] text-stone-400 bg-[#0d1017]/80 p-2.5 rounded-xl border border-white/[0.08] backdrop-blur-md">
        <span className="font-semibold text-stone-300 uppercase tracking-wider text-[10px]">
          3D Space Dimensions
        </span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Y-Axis: Exam Urgency (Days Remaining)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>X-Axis: Student Weakness & Gap</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span>Z-Axis: Syllabus Incompleteness</span>
        </div>
      </div>

      {/* Subject Filter Bar inside 3D View */}
      <div className="absolute bottom-4 right-4 pointer-events-auto flex items-center gap-1.5 bg-[#0d1017]/80 p-1 rounded-xl border border-white/[0.08] backdrop-blur-md shadow-lg max-w-sm overflow-x-auto text-xs">
        <button
          onClick={() => setActiveSubjectFilter(null)}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
            activeSubjectFilter === null
              ? 'bg-white text-stone-950 font-semibold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          All
        </button>
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSubjectFilter(s.id)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer truncate max-w-[110px] ${
              activeSubjectFilter === s.id
                ? 'bg-amber-400 text-stone-950 font-semibold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Hover Tooltip Overlay */}
      {hoveredTopic && hoverPos && !selectedTopic && (
        <div
          style={{
            left: `${Math.min(Math.max(hoverPos.x - 120, 16), window.innerWidth - 300)}px`,
            top: `${Math.min(Math.max(hoverPos.y - 130, 60), 380)}px`,
          }}
          className="absolute z-20 pointer-events-none w-64 p-3 rounded-xl bg-[#0d1017]/95 border border-white/[0.12] shadow-2xl backdrop-blur-md text-stone-100 space-y-1.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-stone-400 font-medium">{hoveredTopic.subject.name}</span>
            <span
              className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                hoveredTopic.priorityLevel === 'High'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                  : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
              }`}
            >
              {hoveredTopic.priorityScore}/100 Priority
            </span>
          </div>

          <h4 className="font-semibold text-xs text-white leading-tight line-clamp-1">
            {hoveredTopic.topic.name}
          </h4>

          <p className="text-[11px] text-stone-300 line-clamp-2">
            {hoveredTopic.reason}
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-white/[0.08] text-[10px] text-stone-400">
            <span>Exam in {hoveredTopic.examDaysRemaining} days</span>
            <span className="text-amber-400 font-medium">Click to inspect</span>
          </div>
        </div>
      )}

      {/* Selected Topic Interactive Detail Card */}
      {selectedTopic && (
        <div className="absolute top-16 right-4 z-20 w-80 p-5 rounded-2xl bg-[#0d1017]/95 border border-white/[0.14] shadow-2xl backdrop-blur-xl text-stone-100 space-y-3 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/[0.06] text-stone-300 border border-white/[0.08]">
                {selectedTopic.subject.name}
              </span>
              <h3 className="text-sm font-semibold text-white mt-1.5">
                {selectedTopic.topic.name}
              </h3>
            </div>
            <button
              onClick={() => setSelectedTopic(null)}
              className="text-stone-400 hover:text-white p-1 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-amber-400 font-mono">
              {selectedTopic.priorityScore}
            </span>
            <span className="text-xs text-stone-400">/ 100 Priority Score</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded font-semibold ml-auto ${
                selectedTopic.priorityLevel === 'High'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                  : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
              }`}
            >
              {selectedTopic.priorityLevel}
            </span>
          </div>

          <p className="text-xs text-stone-300 leading-relaxed bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
            {selectedTopic.reason}
          </p>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-400">
            <div className="bg-black/40 p-2 rounded-lg border border-white/[0.06]">
              <span className="block text-stone-500">Exam Proximity</span>
              <span className="font-semibold text-stone-200">
                {selectedTopic.examDaysRemaining} days remaining
              </span>
            </div>
            <div className="bg-black/40 p-2 rounded-lg border border-white/[0.06]">
              <span className="block text-stone-500">Completion</span>
              <span className="font-semibold text-stone-200">
                {selectedTopic.topic.completion}% syllabus
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={() => {
                onStudyNow(selectedTopic);
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Study Now</span>
            </button>
            <button
              onClick={() => {
                onUpdateProgress(selectedTopic);
              }}
              className="py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-stone-200 font-medium text-xs transition-colors cursor-pointer border border-white/[0.08]"
            >
              Log Progress
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
