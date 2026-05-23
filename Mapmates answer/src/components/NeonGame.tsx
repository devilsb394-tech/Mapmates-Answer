import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

const LOBBIES = [-3, 0, 3];
const BASE_SPEED = 50;
const SPAWN_Z = -100;

function Player({ targetX, isGameOver }: { targetX: number, isGameOver: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (!meshRef.current || !ringRef.current) return;
    
    // Smooth lane changing (Spring-like)
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, delta * 12);
    ringRef.current.position.x = meshRef.current.position.x;
    
    if (!isGameOver) {
      meshRef.current.rotation.x += delta * 3;
      meshRef.current.rotation.y += delta * 2;
      meshRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.1;
      
      ringRef.current.rotation.z -= delta * 5;
      ringRef.current.rotation.y = Math.PI / 2;
      ringRef.current.position.y = meshRef.current.position.y;
    }
  });

  return (
    <group position={[0, 0, 5]}>
      <mesh ref={meshRef} castShadow>
        <octahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial emissive="#00f0ff" emissiveIntensity={2} color="#ffffff" wireframe />
      </mesh>
      <mesh ref={ringRef}>
        <torusGeometry args={[1, 0.05, 16, 32]} />
        <meshStandardMaterial emissive="#55ee99" emissiveIntensity={1} color="#ffffff" />
      </mesh>
    </group>
  );
}

function ObstaclesAndCoins({ isGameOver, onCollide, onCollect, logicRefs }: any) {
  const objectsRef = useRef<{ id: number, x: number, z: number, type: 'obstacle'|'coin', active: boolean, meshRef: THREE.Mesh }[]>([]);
  const nextSpawnTimer = useRef(0);
  const idCounter = useRef(0);

  const obstacleGeo = useMemo(() => new THREE.BoxGeometry(2, 2, 2), []);
  const obstacleMat = useMemo(() => new THREE.MeshStandardMaterial({ emissive: '#ff003c', emissiveIntensity: 2, color: '#222', wireframe: true }), []);
  
  const coinGeo = useMemo(() => new THREE.OctahedronGeometry(0.5, 0), []);
  const coinMat = useMemo(() => new THREE.MeshStandardMaterial({ emissive: '#ffdd00', emissiveIntensity: 3, color: '#fff' }), []);

  useFrame((_, delta) => {
    if (isGameOver) return;

    const speedMultiplier = 1 + logicRefs.current.score * 0.005;

    // Spawn mechanism
    nextSpawnTimer.current -= delta;
    if (nextSpawnTimer.current <= 0) {
      const isCoinTime = Math.random() > 0.6; // 40% chance for coin wave
      const emptyLane = Math.floor(Math.random() * 3);
      
      if (isCoinTime) {
         // Spawn coins in one or two lanes
         objectsRef.current.push({
           id: idCounter.current++, x: LOBBIES[emptyLane], z: SPAWN_Z, type: 'coin', active: true, meshRef: new THREE.Mesh()
         });
         nextSpawnTimer.current = 0.5 / speedMultiplier;
      } else {
         // Spawn obstacles
         for (let i = 0; i < 3; i++) {
           if (i === emptyLane) continue;
           objectsRef.current.push({
             id: idCounter.current++, x: LOBBIES[i], z: SPAWN_Z, type: 'obstacle', active: true, meshRef: new THREE.Mesh()
           });
         }
         nextSpawnTimer.current = 0.8 / speedMultiplier;
      }
    }

    const playerZ = 5;
    const playerX = logicRefs.current.playerTargetX;
    
    objectsRef.current.forEach((obj) => {
      if (!obj.active) return;
      obj.z += BASE_SPEED * delta * speedMultiplier;
      
      if (obj.meshRef) {
         obj.meshRef.position.set(obj.x, obj.type === 'coin' ? 1 : 0.5, obj.z);
         obj.meshRef.rotation.x += delta * (obj.type === 'coin' ? 5 : 1);
         obj.meshRef.rotation.y += delta * 2;
      }

      // Collision detection
      if (Math.abs(obj.z - playerZ) < 1.0 && Math.abs(obj.x - playerX) < 1.0) {
         if (obj.type === 'obstacle') {
            onCollide();
         } else {
            obj.active = false;
            onCollect();
            obj.meshRef.position.y = -100; // hide immediately
         }
      }

      if (obj.z > 10) {
         obj.active = false;
         if (obj.type === 'obstacle' && !isGameOver) logicRefs.current.score += 10;
      }
    });

    objectsRef.current = objectsRef.current.filter(o => o.active);
  });

  return (
    <group>
       {objectsRef.current.map((obj) => (
         <mesh key={obj.id} ref={el => { if (el) obj.meshRef = el; }} position={[obj.x, 0, obj.z]} geometry={obj.type === 'coin' ? coinGeo : obstacleGeo} material={obj.type === 'coin' ? coinMat : obstacleMat} />
       ))}
    </group>
  );
}

function GridFloor() {
  const gridRef = useRef<THREE.GridHelper>(null);
  
  useFrame((state, delta) => {
    if (!gridRef.current) return;
    gridRef.current.position.z = (state.clock.elapsedTime * 30) % 10;
  });

  return (
    <group position={[0, -0.5, 0]}>
       <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -50]}>
         <planeGeometry args={[100, 200]} />
         <meshStandardMaterial color="#020205" />
       </mesh>
       <gridHelper ref={gridRef} args={[100, 100, '#00f0ff', '#111122']} position={[0, 0, -50]} />
    </group>
  );
}

function Starfield() {
  const starsRef = useRef<THREE.Points>(null);
  const [positions] = useState(() => {
    const pos = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      pos[i*3] = (Math.random() - 0.5) * 100;
      pos[i*3+1] = Math.random() * 50;
      pos[i*3+2] = -Math.random() * 100;
    }
    return pos;
  });

  useFrame((state, delta) => {
    if (starsRef.current) {
       starsRef.current.position.z += delta * 20;
       if (starsRef.current.position.z > 50) starsRef.current.position.z = 0;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.2} color="#ffffff" transparent opacity={0.8} />
    </points>
  );
}

function RetroCamera() {
  const state = useThree();
  useEffect(() => {
    state.camera.position.set(0, 3, 12);
    state.camera.lookAt(0, 0, -10);
  }, [state.camera]);
  return null;
}

export function NeonGame() {
  const [lane, setLane] = useState(1); // 0: left, 1: center, 2: right
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const logicRefs = useRef({ score: 0, playerTargetX: LOBBIES[1] });

  useEffect(() => {
    const t = setInterval(() => {
      if (!gameOver) setScore(logicRefs.current.score);
    }, 100);
    return () => clearInterval(t);
  }, [gameOver]);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver && e.code === 'Space') {
         restart();
         return;
      }
      if (gameOver) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        setLane(l => Math.max(0, l - 1));
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        setLane(l => Math.min(2, l + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver]);

  useEffect(() => {
    logicRefs.current.playerTargetX = LOBBIES[lane];
  }, [lane]);

  const restart = () => {
    setGameOver(false);
    setScore(0);
    logicRefs.current.score = 0;
    setLane(1);
  };

  const onScreenTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameOver) {
       restart();
       return;
    }
    const width = window.innerWidth;
    const clickX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    if (clickX < width / 2) {
      setLane(l => Math.max(0, l - 1));
    } else {
      setLane(l => Math.min(2, l + 1));
    }
  };

  return (
    <div className="w-full h-full relative bg-[#020205] overflow-hidden select-none outline-none" onClick={onScreenTap} onTouchStart={onScreenTap}>
      <div className="absolute top-6 left-6 z-10 flex flex-col">
         <span className="font-mono text-white/50 text-xs uppercase tracking-[4px]">Score</span>
         <span className="font-mono text-neon-blue text-4xl font-black tracking-widest pointer-events-none drop-shadow-[0_0_15px_rgba(0,240,255,0.8)]">
           {score}
         </span>
      </div>
      
      {gameOver && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md pointer-events-none">
          <h1 className="text-5xl md:text-7xl font-black text-neon-red tracking-tighter mb-2 animate-pulse drop-shadow-[0_0_25px_rgba(255,0,60,0.8)]">SYSTEM FAILURE</h1>
          <p className="text-2xl text-white/90 font-mono mb-8 uppercase tracking-[3px]">Final Score: <span className="text-neon-yellow">{score}</span></p>
          <div className="px-8 py-4 bg-white/10 border border-white/20 rounded-full">
            <p className="text-white font-bold tracking-widest uppercase animate-bounce">Tap or Press Space to Reboot</p>
          </div>
        </div>
      )}

      {/* Touch UI Hints for Mobile */}
      {!gameOver && score === 0 && (
         <div className="absolute bottom-10 left-0 right-0 flex justify-between px-10 pointer-events-none opacity-40">
            <div className="text-white font-mono text-sm uppercase tracking-widest">&larr; Tap Left</div>
            <div className="text-white font-mono text-sm uppercase tracking-widest">Tap Right &rarr;</div>
         </div>
      )}

      <Canvas shadows gl={{ antialias: false, powerPreference: "high-performance" }}>
        <color attach="background" args={['#010103']} />
        <fog attach="fog" args={['#010103', 10, 80]} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[0, 10, 10]} intensity={1.5} color="#00f0ff" />
        
        <RetroCamera />
        <Starfield />
        <GridFloor />
        <Player targetX={LOBBIES[lane]} isGameOver={gameOver} />
        <ObstaclesAndCoins 
           isGameOver={gameOver} 
           onCollide={() => setGameOver(true)} 
           onCollect={() => { logicRefs.current.score += 50; }}
           logicRefs={logicRefs} 
        />
        
        <EffectComposer>
          <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
