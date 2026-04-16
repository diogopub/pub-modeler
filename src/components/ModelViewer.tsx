import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';

function ModelMesh({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);

  return (
    <Center>
      <group ref={ref}>
        <primitive object={scene} />
      </group>
    </Center>
  );
}

function PlaceholderCube() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.5;
      ref.current.rotation.x += delta * 0.2;
    }
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial
        color="hsl(160, 60%, 45%)"
        wireframe
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

interface ModelViewerProps {
  modelUrl: string | null;
  className?: string;
}

export function ModelViewer({ modelUrl, className = '' }: ModelViewerProps) {
  return (
    <div className={`rounded-2xl overflow-hidden bg-muted/30 border border-border ${className}`}>
      <Canvas
        camera={{ position: [3, 2, 3], fov: 45 }}
        style={{ height: '100%', minHeight: 300 }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          {modelUrl ? (
            <ModelMesh url={modelUrl} />
          ) : (
            <PlaceholderCube />
          )}
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={8}
          autoRotate={!modelUrl}
          autoRotateSpeed={1}
        />
      </Canvas>
    </div>
  );
}
