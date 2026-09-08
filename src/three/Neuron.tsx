import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useStore } from '../state/store';
import type { Neuron as NeuronData } from '../core/types';
import { makeGlowTexture, GREEN, NODE_IDLE, NODE_ON } from './glow';

const glowTex = makeGlowTexture();

export function Neuron({ neuron }: { neuron: NeuronData }) {
  const group = useRef<THREE.Group>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const coreMat = useRef<THREE.MeshBasicMaterial>(null!);
  const haloMat = useRef<THREE.SpriteMaterial>(null!);
  const halo = useRef<THREE.Sprite>(null!);
  const raycaster = useRef(new THREE.Raycaster());
  const planeRef = useRef<THREE.Plane | null>(null);
  const activityRef = useRef(0);
  const haloBaseRef = useRef(0.14);

  const { camera, gl } = useThree();

  const selected = useStore((s) => s.selectedNeuronId === neuron.id);
  const connectFrom = useStore((s) => s.connectFromId === neuron.id);
  const active = useStore((s) => s.activeNodesByRound[s.round]?.includes(neuron.id));
  const connectMode = useStore((s) => s.connectMode);
  const groupInfo = useStore((s) => s.groups.find((g) => g.memberIds.includes(neuron.id)));

  haloBaseRef.current = 0.14 + (selected ? 0.3 : 0) + (connectFrom ? 0.2 : 0);

  useFrame((state, dt) => {
    const t = Math.min(dt, 0.05);
    const target = active ? 1 : 0;
    activityRef.current += (target - activityRef.current) * Math.min(1, t * 8);
    const a = activityRef.current;
    mat.current.emissiveIntensity = a * 0.55;
    mat.current.color.lerp(active ? NODE_ON : NODE_IDLE, Math.min(1, t * 8));
    coreMat.current.opacity = 0.35 + a * 0.5;
    const s =
      neuron.radius * 6 * (1 + a * 0.5 + Math.sin(state.clock.elapsedTime * 3 + neuron.id.length) * 0.05 * a);
    halo.current.scale.set(s, s, 1);
    haloMat.current.opacity = haloBaseRef.current + a * 0.6;
  });

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const st = useStore.getState();
    if (st.connectMode) {
      if (!st.connectFromId) st.setConnectFromId(neuron.id);
      else if (st.connectFromId !== neuron.id) {
        st.addEdge(st.connectFromId, neuron.id);
        st.setConnectFromId(null);
      } else st.setConnectFromId(null);
      return;
    }
    st.selectNeuron(neuron.id);
    // 开始拖拽：沿相机朝向的平面移动
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    planeRef.current = new THREE.Plane().setFromNormalAndCoplanarPoint(dir, group.current.position);
    useStore.getState().setDragging(true);
    (e.nativeEvent.target as HTMLElement).setPointerCapture(e.nativeEvent.pointerId);
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const plane = planeRef.current;
    if (!plane) return;
    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.nativeEvent.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.nativeEvent.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.current.setFromCamera(ndc, camera);
    const pt = new THREE.Vector3();
    if (raycaster.current.ray.intersectPlane(plane, pt)) {
      useStore.getState().updateNeuron(neuron.id, { pos: [pt.x, pt.y, pt.z] });
    }
  };

  const onPointerUp = () => {
    if (planeRef.current) {
      planeRef.current = null;
      useStore.getState().setDragging(false);
    }
  };

  const onPointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    gl.domElement.style.cursor = connectMode ? 'crosshair' : 'pointer';
  };
  const onPointerOut = () => {
    gl.domElement.style.cursor = 'default';
  };

  return (
    <group
      ref={group}
      position={neuron.pos}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <mesh>
        <sphereGeometry args={[neuron.radius, 48, 48]} />
        <meshStandardMaterial
          ref={mat}
          color={NODE_IDLE}
          roughness={0.4}
          metalness={0.05}
          emissive={GREEN}
          emissiveIntensity={0}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[neuron.radius * 0.5, 32, 32]} />
        <meshBasicMaterial ref={coreMat} color="#bbf7d0" transparent opacity={0.35} />
      </mesh>
      {groupInfo && (
        <sprite scale={[neuron.radius * 3.4, neuron.radius * 3.4, 1]}>
          <spriteMaterial
            map={glowTex}
            color={groupInfo.color}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      )}
      <sprite ref={halo} scale={[neuron.radius * 6, neuron.radius * 6, 1]}>
        <spriteMaterial
          ref={haloMat}
          map={glowTex}
          color={GREEN}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  );
}
