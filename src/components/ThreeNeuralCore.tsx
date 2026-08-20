import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface ThreeNeuralCoreProps {
  isGenerating?: boolean;
}

export const ThreeNeuralCore: React.FC<ThreeNeuralCoreProps> = ({ isGenerating }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 256;
    const height = container.clientHeight || 256;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // High-tech Icosahedron Wireframe
    const geometry = new THREE.IcosahedronGeometry(1, 4);
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color('#818cf8'),
      wireframe: true,
      transparent: true,
      opacity: 0.65,
      shininess: 100,
    });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Inner core glow
    const coreGeo = new THREE.SphereGeometry(0.6, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#818cf8'),
      transparent: true,
      opacity: 0.25,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // Lights
    const light = new THREE.PointLight(0x818cf8, 2, 10);
    light.position.set(2, 2, 2);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // Color updater based on CSS variables
    const updateColors = () => {
      const primaryColorStr = document.body.style.getPropertyValue('--primary').trim() || '#818cf8';
      const newColor = new THREE.Color(primaryColorStr);
      material.color.copy(newColor);
      coreMat.color.copy(newColor);
      light.color.copy(newColor);
    };

    updateColors();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'style') {
          updateColors();
        }
      });
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });

    camera.position.z = 2.8;

    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const rotSpeed = isGenerating ? 0.02 : 0.006;
      sphere.rotation.x += rotSpeed;
      sphere.rotation.y += rotSpeed;

      const time = Date.now() * 0.002;
      const pulseMultiplier = isGenerating ? 0.12 : 0.05;
      sphere.scale.setScalar(1 + Math.sin(time) * pulseMultiplier);
      core.scale.setScalar(1 + Math.cos(time * 1.5) * (pulseMultiplier * 1.5));

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 256;
      const h = container.clientHeight || 256;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      observer.disconnect();
    };
  }, [isGenerating]);

  return (
    <div className="w-64 h-64 relative z-20 pointer-events-none flex items-center justify-center">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
