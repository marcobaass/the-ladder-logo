import * as THREE from 'three'
import vertexShader from './shaders/particles.vert.glsl'
import fragmentShader from './shaders/particles.frag.glsl'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'


// Grid dimensions for wave surface
const GRID_SIZE = 75
const COUNT = GRID_SIZE * GRID_SIZE

export function initParticles(scene: THREE.Scene) {
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
  loader.load('/model/the-ladder.glb', (gltf) => {
    // Make it visible without lights by switching to basic material
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0xffffff })
      }
    })
    
    // Log bounding box to check size/position
    const box = new THREE.Box3().setFromObject(gltf.scene)
    console.log('Size:', box.getSize(new THREE.Vector3()))
    console.log('Center:', box.getCenter(new THREE.Vector3()))

    gltf.scene.rotation.y = Math.PI * 0.5
    gltf.scene.rotation.x = -Math.PI * 0.06
    
    scene.add(gltf.scene)
  })
  
  // Torus parameters
  const torusRadius = 2    // Main radius (center to tube center)
  const tubeRadius = 0.8   // Tube radius

  // Offset to center the torus on screen (moved to shader uniform)
  const torusOffsetY = -3
  const torusOffsetZ = -6

  // Generate torus points parametrically with biased distribution
  // More particles on outer (v=0) and inner (v=π) edges of the tube
  const torusPoints: { x: number; y: number; z: number }[] = []
  for (let i = 0; i < COUNT; i++) {
    // u = angle around the main ring (uniform distribution)
    const u = Math.random() * Math.PI * 2

    // v = angle around the tube cross-section (biased toward 0 and π)
    // This clusters particles at outer (v=0) and inner (v=π) edges
    let v
    if (Math.random() < 0.70) {
      // Cluster near outer edge (v = 0)
      v = (Math.pow(Math.random(), 0.5) - 0.75) * Math.PI * 0.75
    } else {
      // Cluster near inner edge (v = π)
      v = Math.PI + (Math.pow(Math.random(), 0.5) - 0.75) * Math.PI * 0.75
    }

    // Parametric torus equations
    const x = (torusRadius + tubeRadius * Math.cos(v)) * Math.cos(u)
    const y = (torusRadius + tubeRadius * Math.cos(v)) * Math.sin(u)
    const z = tubeRadius * Math.sin(v)

    // Add small jitter
    const jitter = 0.05
    torusPoints.push({
      x: x + (Math.random() - 0.5) * jitter,
      y: y + (Math.random() - 0.5) * jitter,
      z: z + (Math.random() - 0.5) * jitter
    })
  }

  // Sort torus points by Y (bottom to top)
  torusPoints.sort((a, b) => a.y - b.y)

  // Create array of particle indices with their wave Y positions
  const waveYPositions: { idx: number; waveY: number }[] = []
  for (let i = 0; i < COUNT; i++) {
    waveYPositions.push({
      idx: i,
      waveY: start[i * 3 + 1]  // Y component of wave position
    })
  }

  // Sort by wave Y (lowest Y = bottom of wave = animates first)
  waveYPositions.sort((a, b) => a.waveY - b.waveY)

  // Assign torus positions and index:
  // - Particle with lowest wave Y gets lowest torus Y (both bottoms match)
  // - Index based on wave Y position
  for (let i = 0; i < COUNT; i++) {
    const particleIdx = waveYPositions[i].idx
    const i3 = particleIdx * 3

    // Assign sorted torus position (raw, centered at origin - offset applied in shader)
    target[i3 + 0] = torusPoints[i].x
    target[i3 + 1] = torusPoints[i].y
    target[i3 + 2] = torusPoints[i].z

    // Assign index (0 = animates first, 1 = animates last)
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
      uTorusZ: { value: 4 },
      uTorusScale: { value: 0.5 },  // 1.0 = normal size, 0.5 = half, 2.0 = double
      uTorusOffset: { value: new THREE.Vector2(torusOffsetY, torusOffsetZ) }  // Y and Z offset
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
