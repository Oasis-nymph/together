import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStore } from '../state/store';
import { Neuron } from './Neuron';
import { Link } from './Link';

export function Scene() {
  const neurons = useStore((s) => s.neurons);
  const edges = useStore((s) => s.edges);
  const dragging = useStore((s) => s.dragging);
  const deselectAll = useStore((s) => s.deselectAll);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.enabled = !dragging;
  }, [dragging]);

  return (
    <Canvas
      camera={{ position: [0, 0, 16], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={(e) => {
        if (e.type === 'click') deselectAll();
      }}
    >
      <color attach="background" args={['#ffffff']} />
      <fog attach="fog" args={['#ffffff', 18, 50]} />
      <ambientLight intensity={0.95} />
      <directionalLight position={[8, 10, 6]} intensity={1.6} />
      <directionalLight position={[-6, -4, 8]} intensity={0.6} color="#eaf1ff" />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={46}
      />
      {neurons.map((n) => (
        <Neuron key={n.id} neuron={n} />
      ))}
      {edges.map((e) => (
        <Link key={e.id} edge={e} />
      ))}
    </Canvas>
  );
}
