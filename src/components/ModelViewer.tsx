import { Suspense, useRef, useEffect, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Center, Html } from '@react-three/drei';
import * as THREE from 'three';

// ── Loading spinner dentro do Canvas ────────────────────────
function LoadingIndicator() {
  return (
    <Html center>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        color: '#888',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
      }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid #333',
          borderTop: '3px solid #10b981',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        Carregando modelo...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Html>
  );
}

// ── Error Boundary para capturar falhas do Three.js ─────────
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ModelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('ModelViewer error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 p-8 text-center">
          <div className="text-2xl">⚠️</div>
          <p className="text-sm font-medium">Não foi possível carregar o modelo 3D</p>
          <p className="text-xs opacity-60">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Mesh do modelo ──────────────────────────────────────────
function ModelMesh({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  // Limpar cache do GLTF ao desmontar para evitar vazamento de memória
  useEffect(() => {
    return () => {
      useGLTF.clear(url);
    };
  }, [url]);

  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

// ── Cubo placeholder animado ────────────────────────────────
function PlaceholderCube() {
  const ref = useRef<THREE.Mesh>(null);

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

// ── Componente principal ────────────────────────────────────
interface ModelViewerProps {
  modelUrl: string | null;
  className?: string;
}

export function ModelViewer({ modelUrl, className = '' }: ModelViewerProps) {
  return (
    <div className={`rounded-2xl overflow-hidden bg-muted/30 border border-border ${className}`}>
      <ModelErrorBoundary>
        <Canvas
          camera={{ position: [3, 2, 3], fov: 45 }}
          style={{ height: '100%', minHeight: 300 }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <Suspense fallback={<LoadingIndicator />}>
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
      </ModelErrorBoundary>
    </div>
  );
}
