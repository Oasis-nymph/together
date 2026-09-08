import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useStore } from '../state/store';
import type { Edge as EdgeData, Vec3 } from '../core/types';
import { makeGlowTexture, GREEN, EDGE_IDLE, EDGE_ON } from './glow';

const glowTex = makeGlowTexture();

function hash01(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return ((h >>> 0) % 1000) / 1000;
}

/** 两点间的弯曲"神经纤维"曲线 */
function buildCurve(a: Vec3, b: Vec3, id: string): THREE.CatmullRomCurve3 {
  const p0 = new THREE.Vector3(...a);
  const p3 = new THREE.Vector3(...b);
  const chord = new THREE.Vector3().subVectors(p3, p0);
  const len = chord.length() || 1;
  let perp = new THREE.Vector3(1, 0, 0).cross(chord);
  if (perp.lengthSq() < 1e-4) perp = new THREE.Vector3(0, 1, 0).cross(chord);
  perp.normalize();
  const h1 = hash01(id);
  const h2 = hash01(id + 'b');
  const off = (h1 * 0.35 + 0.12) * len * (h2 < 0.5 ? 1 : -1);
  const p1 = p0.clone().add(chord.clone().multiplyScalar(0.33)).add(perp.clone().multiplyScalar(off));
  const p2 = p0.clone().add(chord.clone().multiplyScalar(0.66)).add(perp.clone().multiplyScalar(off));
  return new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
}

export function Link({ edge }: { edge: EdgeData }) {
  const from = useStore((s) => s.neurons.find((n) => n.id === edge.source));
  const to = useStore((s) => s.neurons.find((n) => n.id === edge.target));
  const active = useStore((s) => s.activeEdgesByRound[s.round]?.includes(edge.id));
  const selected = useStore((s) => s.selectedEdgeId === edge.id);
  const selectEdge = useStore((s) => s.selectEdge);

  const tubeMat = useRef<THREE.MeshStandardMaterial>(null!);
  const partMat = useRef<THREE.SpriteMaterial>(null!);
  const part = useRef<THREE.Sprite>(null!);
  const phase = useRef(hash01(edge.id));
  const activityRef = useRef(0);

  const curve = useMemo(
    () => (from && to ? buildCurve(from.pos, to.pos, edge.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [from?.pos, to?.pos, edge.id]
  );

  const tubeGeo = useMemo(
    () => (curve ? new THREE.TubeGeometry(curve, 48, 0.02 + edge.weight * 0.025, 8, false) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [curve, edge.weight]
  );

  useEffect(
    () => () => {
      tubeGeo?.dispose();
    },
    [tubeGeo]
  );

  useFrame((_, dt) => {
    if (!curve) return;
    const t = Math.min(dt, 0.05);
    const target = active ? 1 : 0;
    activityRef.current += (target - activityRef.current) * Math.min(1, t * 8);
    const a = activityRef.current;
    phase.current += t * (0.05 + hash01(edge.id + 's') * 0.05) * (a > 0.1 ? 3 : 1);
    part.current.position.copy(curve.getPoint(phase.current % 1));
    partMat.current.opacity += ((a > 0.1 ? 0.95 : 0.1) - partMat.current.opacity) * Math.min(1, t * 8);
    part.current.scale.setScalar(0.18 + a * 0.1);
    tubeMat.current.emissiveIntensity += ((a > 0.1 ? 0.55 : 0) - tubeMat.current.emissiveIntensity) * Math.min(1, t * 8);
    tubeMat.current.color.lerp(a > 0.1 ? EDGE_ON : EDGE_IDLE, Math.min(1, t * 8));
  });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    selectEdge(edge.id);
  };

  if (!from || !to || !curve || !tubeGeo) return null;

  return (
    <group>
      <mesh geometry={tubeGeo} onPointerDown={onDown}>
        <meshStandardMaterial
          ref={tubeMat}
          color={EDGE_IDLE}
          roughness={0.55}
          metalness={0.1}
          emissive={GREEN}
          emissiveIntensity={0}
          transparent
          opacity={selected ? 1 : 0.85}
        />
      </mesh>
      <sprite ref={part} scale={[0.2, 0.2, 1]}>
        <spriteMaterial
          ref={partMat}
          map={glowTex}
          color={GREEN}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  );
}
