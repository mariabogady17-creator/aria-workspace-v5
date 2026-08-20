import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

interface LoginSceneProps {
  className?: string;
  onPhaseChange?: (phaseIndex: number) => void;
}

export const LoginScene: React.FC<LoginSceneProps> = ({ className, onPhaseChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ReinhardToneMapping;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010006);
    scene.fog = new THREE.FogExp2(0x010006, 0.00035);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 1, 15000);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 3.0, 0.6, 0.1));

    const particleCount = 40000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const targetPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colorGen = new THREE.Color();

    for(let i=0; i<particleCount; i++) {
      positions[i*3] = (Math.random()-0.5)*5000;
      positions[i*3+1] = (Math.random()-0.5)*5000;
      positions[i*3+2] = (Math.random()-0.5)*5000;
      let hue = 0.6 + Math.random()*0.15; // Indigo/Purple hues
      if (Math.random() < 0.25) hue = 0.8 + Math.random()*0.1;
      colorGen.setHSL(hue, 0.9, 0.6);
      colors[i*3] = colorGen.r;
      colors[i*3+1] = colorGen.g;
      colors[i*3+2] = colorGen.b;
      sizes[i] = Math.random() * 2.5 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, pixelRatio: { value: window.devicePixelRatio } },
      vertexShader: `
        attribute float size; attribute vec3 color; varying vec3 vColor;
        uniform float time; uniform float pixelRatio;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * pixelRatio * (1500.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if(dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, dist);
          gl_FragColor = vec4(vColor, alpha * 0.9);
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    function generateHelix() {
      for(let i=0; i<particleCount; i++) {
        let t=i/particleCount, a=t*Math.PI*40, r=250+Math.sin(t*Math.PI*80)*40, y=(t-0.5)*6000;
        targetPositions[i*3]=Math.cos(a)*r; targetPositions[i*3+1]=y; targetPositions[i*3+2]=Math.sin(a)*r;
      }
    }
    function generateTorus() {
      for(let i=0; i<particleCount; i++) {
        let u=Math.random()*Math.PI*2, v=Math.random()*Math.PI*2, r1=800, r2=300+Math.random()*200;
        targetPositions[i*3]=(r1+r2*Math.cos(v))*Math.cos(u);
        targetPositions[i*3+1]=r2*Math.sin(v)+(Math.random()-0.5)*100;
        targetPositions[i*3+2]=(r1+r2*Math.cos(v))*Math.sin(u);
      }
    }
    function generateGalaxy() {
      for(let i=0; i<particleCount; i++) {
        let r=Math.pow(Math.random(),2)*1500, theta=r*0.015+Math.random()*Math.PI*2;
        let arm=Math.floor(Math.random()*4); theta+=arm*(Math.PI/2);
        let spread=(1500-r)*0.1+30;
        targetPositions[i*3]=Math.cos(theta)*r+(Math.random()-0.5)*spread;
        targetPositions[i*3+1]=(Math.random()-0.5)*spread*0.3;
        targetPositions[i*3+2]=Math.sin(theta)*r+(Math.random()-0.5)*spread;
      }
    }
    function generateSphere() {
      for(let i=0; i<particleCount; i++) {
        let u=Math.random(), v=Math.random(), theta=u*2*Math.PI, phi=Math.acos(2*v-1), r=800+Math.random()*200;
        targetPositions[i*3]=r*Math.sin(phi)*Math.cos(theta);
        targetPositions[i*3+1]=r*Math.sin(phi)*Math.sin(theta);
        targetPositions[i*3+2]=r*Math.cos(phi);
      }
    }

    const shapes=[{gen:generateHelix,name:'tunnel'},{gen:generateGalaxy,name:'galaxy'},{gen:generateTorus,name:'torus'},{gen:generateSphere,name:'sphere'}];
    let currentShapeIndex = 0;
    shapes[currentShapeIndex].gen();
    if (onPhaseChange) onPhaseChange(currentShapeIndex);

    let morphProgress=0, shapeTimer=0;
    const SHAPE_DURATION=12;
    let camTargetPos=new THREE.Vector3(0,0,0);
    let camTargetLook=new THREE.Vector3(0,0,0);
    let curLookAt=new THREE.Vector3(0,0,0);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      material.uniforms.pixelRatio.value = window.devicePixelRatio;
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    let animationFrameId: number;

    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      
      material.uniforms.time.value = time;
      shapeTimer += delta;
      
      if (shapeTimer >= SHAPE_DURATION) {
        shapeTimer = 0;
        currentShapeIndex = (currentShapeIndex + 1) % shapes.length;
        shapes[currentShapeIndex].gen();
        morphProgress = 0;
        if (onPhaseChange) onPhaseChange(currentShapeIndex);
        
        const pA = geometry.attributes.position.array as Float32Array;
        for(let i=0; i<particleCount; i++) {
          pA[i*3] += (Math.random()-0.5)*400;
          pA[i*3+1] += (Math.random()-0.5)*400;
          pA[i*3+2] += (Math.random()-0.5)*400;
        }
      }
      
      morphProgress += delta * 0.4;
      const posAttribute = geometry.attributes.position;
      const pArray = posAttribute.array as Float32Array;
      
      for(let i=0; i<particleCount; i++){
        let px=pArray[i*3], py=pArray[i*3+1], pz=pArray[i*3+2], tx=targetPositions[i*3], ty=targetPositions[i*3+1], tz=targetPositions[i*3+2];
        let dt = morphProgress < 1 ? 0.05 : 0.015;
        px += (tx - px) * dt;
        py += (ty - py) * dt;
        pz += (tz - pz) * dt;
        if(morphProgress >= 1) {
          px += Math.sin(time*1.5+i)*1.0;
          py += Math.cos(time*1.5+i)*1.0;
          pz += Math.sin(time*1.5+i)*1.0;
        }
        pArray[i*3] = px; pArray[i*3+1] = py; pArray[i*3+2] = pz;
      }
      
      posAttribute.needsUpdate = true;
      particleSystem.rotation.y = time * 0.1;
      
      let cycleTime = shapeTimer / SHAPE_DURATION;
      let n = shapes[currentShapeIndex].name;
      
      if(n === 'tunnel') {
        let y = -3000 + (cycleTime * 6000);
        camTargetPos.set(Math.sin(time)*50, y, Math.cos(time)*50);
        camTargetLook.set(Math.sin(time*1.2)*20, y+1000, Math.cos(time*1.2)*20);
      } else if(n === 'galaxy') {
        let d = 2500 - (cycleTime * 2300);
        let a = time * 0.3;
        camTargetPos.set(Math.sin(a)*d, Math.sin(time*0.5)*200+100, Math.cos(a)*d);
        camTargetLook.set(0,0,0);
      } else if(n === 'torus') {
        let y = 2000 - (cycleTime * 4000);
        camTargetPos.set(Math.sin(time*0.5)*100, y, Math.cos(time*0.5)*100);
        camTargetLook.set(0, y-500, 0);
      } else if(n === 'sphere') {
        let z = 2500 - (cycleTime * 5000);
        camTargetPos.set(Math.sin(time)*200, Math.cos(time)*200, z);
        camTargetLook.set(0,0, z-1000);
      }
      
      camera.position.lerp(camTargetPos, 0.03);
      curLookAt.lerp(camTargetLook, 0.05);
      camera.lookAt(curLookAt);
      
      composer.render();
    }
    
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [onPhaseChange]);

  return <canvas ref={canvasRef} className={className} />;
};
