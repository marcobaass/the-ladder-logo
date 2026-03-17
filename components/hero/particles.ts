import * as THREE from 'three'
import vertexShader from './shaders/particles.vert.glsl'
import fragmentShader from './shaders/particles.frag.glsl'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'


// Grid dimensions for wave surface
const GRID_SIZE = 75
const COUNT = GRID_SIZE * GRID_SIZE

export async function initParticles(scene: THREE.Scene) {
  const geometry = new THREE.BufferGeometry()
  
  const start = new Float32Array(COUNT * 3)
  const target = new Float32Array(COUNT * 3)
  const random = new Float32Array(COUNT)
  const index = new Float32Array(COUNT)

  // FIRST LOOP: Generate wave start positions
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const idx = i * GRID_SIZE + j
      const i3 = idx * 3

      // Grid position normalized to -1 to 1, then scaled
      const x = ((i / GRID_SIZE) - 0.5) * 25
      const z = ((j / GRID_SIZE) - 0.5) * 25

      // Wave function - combine multiple sine waves for organic look
      let y = Math.sin(x * 0.4) * Math.cos(z * 0.3) * 2.5
             + Math.sin(x * 0.2 + z * 0.15) * 1.5
             + Math.cos(z * 0.5) * 0.8

      // strength of wave shape
      y = y * 0.5;

      // Start position on the wave surface
      start[i3 + 0] = x
      start[i3 + 1] = y
      start[i3 + 2] = z
      
      random[idx] = Math.random()
    }
  }
  
  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync('/model/the-ladder.glb')
  
  // Rotation of the ladder frontal
  gltf.scene.rotation.y = Math.PI * 0.5
  gltf.scene.rotation.x = -Math.PI * 0.03
  gltf.scene.updateMatrixWorld(true)

  // Merge all meshes into one for the surface sampler
  const meshes: THREE.Mesh[] = []
  gltf.scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      meshes.push(child as THREE.Mesh)
    }
  })

  // Sampling points across the surface of each mesh
  const modelPoints: { x: number; y: number; z: number }[] = []
  const tempPos = new THREE.Vector3()
  for (const mesh of meshes) {
    const sampler = new MeshSurfaceSampler(mesh).build()
    const samplesForThisMesh = Math.floor(COUNT / meshes.length)
    for (let i = 0; i < samplesForThisMesh; i++) {
      sampler.sample(tempPos)
      mesh.localToWorld(tempPos)
      const snap = 0.1  // grid cell size — smaller = finer grid
      modelPoints.push({
        x: Math.round(tempPos.x / snap) * snap,
        y: Math.round(tempPos.y / snap) * snap,
        z: Math.round(tempPos.z / snap) * snap,
      })
    }
  }
  // Fill remaining if COUNT wasn't evenly divisible
  while (modelPoints.length < COUNT) {
    const sampler = new MeshSurfaceSampler(meshes[0]).build()
    sampler.sample(tempPos)
    meshes[0].localToWorld(tempPos)
    const snap = 0.1
    modelPoints.push({
      x: Math.round(tempPos.x / snap) * snap,
      y: Math.round(tempPos.y / snap) * snap,
      z: Math.round(tempPos.z / snap) * snap,
    })
  }

  modelPoints.sort((a, b) => a.y - b.y)

  const waveYPositions: { idx: number; waveY: number }[] = []
  for (let i = 0; i < COUNT; i++) {
    waveYPositions.push({
    idx: i,
    waveY: start[i * 3 + 1]
    })
  }
  waveYPositions.sort((a, b) => a.waveY - b.waveY)

  for (let i = 0; i < COUNT; i++) {
    const particleIdx = waveYPositions[i].idx
    const i3 = particleIdx * 3

    target[i3 + 0] = modelPoints[i].x
    target[i3 + 1] = modelPoints[i].y
    target[i3 + 2] = modelPoints[i].z

    index[particleIdx] = i / (COUNT - 1)
  }


  // Three.js Points needs 'position' attribute to know vertex count
  geometry.setAttribute('position', new THREE.BufferAttribute(start, 3))
  geometry.setAttribute('aStartPosition', new THREE.BufferAttribute(start, 3))
  geometry.setAttribute('aTargetPosition', new THREE.BufferAttribute(target, 3))
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(random, 1))
  geometry.setAttribute('aIndex', new THREE.BufferAttribute(index, 1))

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uSize: { value: 60 },
      uTargetScale: { value: 0.5 },
      uTargetOffset: { value: new THREE.Vector3(0, -5, 0) }, // offset for the ladder
    },
    vertexShader,
    fragmentShader
  })

  const points = new THREE.Points(geometry, material)

  // Force update
  points.frustumCulled = false // Disable frustum culling

  points.rotation.x = -Math.PI * 0.15
  points.position.y = 5
  points.position.z = 10

  scene.add(points)

  return { points, material, geometry }
}
