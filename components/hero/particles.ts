import * as THREE from 'three'
import vertexShader from './shaders/particles.vert.glsl'
import fragmentShader from './shaders/particles.frag.glsl'


// Grid dimensions for wave surface
const GRID_SIZE = 79
const COUNT = GRID_SIZE * GRID_SIZE

/** Static camera-facing tilt; mouse tilt is applied on `tiltPivot`. */
export const PARTICLES_BASE_ROT_X = -Math.PI * 0.075

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
  
  const modelPoints: { x: number; y: number; z: number }[] = []

  const img = new Image()
  img.src = '/model/the-ladder.png'
  await new Promise<void>(resolve => {
    img.onload = () => resolve()
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, img.width, img.height)

  const snap = 0.10
  const logoScale = 10
  const aspectRatio = img.width / img.height

  const usedKeys = new Set<string>()
  
  for (let row = 0; row < img.height; row ++) {
    const ny = 1 -row / img.height
    const gy = Math.round(ny * logoScale / snap) * snap
    const rowIndex = Math.round(ny * logoScale / snap)
    const offset = (rowIndex % 2) * snap / 2

    for (let col = 0; col < img.width; col ++) {
      const pixelIndex = (row * img.width + col) * 4
      const alpha = imageData.data[pixelIndex + 3]
      if (alpha < 128) continue

      const nx = col / img.width
      const rawX = (nx - 0.5) * logoScale * aspectRatio
      const gx = Math.round((rawX - offset) / snap) * snap + offset

      const key = `${gx},${gy}`
      if (!usedKeys.has(key)) {
        usedKeys.add(key)
        modelPoints.push({ x: gx, y: gy, z: 0 })
      }
    }
  }

  const usableCount = Math.min(modelPoints.length, COUNT)
  console.log('Image grid points:', modelPoints.length, 'usable:', usableCount, 'COUNT:', COUNT)

  const centerX = modelPoints.reduce((s, p) => s + p.x, 0) / modelPoints.length
  const centerY = modelPoints.reduce((s, p) => s + p.y, 0) / modelPoints.length

  const maxRadius = Math.max(
    ...modelPoints.map(p => Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2))
  )


  while (modelPoints.length < COUNT) {
    modelPoints.push({ x: 0, y: 0, z: -999 })
  }
  modelPoints.length = COUNT

  // Logo fill order: strict bottom-to-top rows.
  modelPoints.sort((a, b) => {
    const aZero = a.z === -999 ? 1 : 0
    const bZero = b.z === -999 ? 1 : 0
    if (aZero !== bZero) return aZero - bZero // real logo points first
    if (a.y !== b.y) return a.y - b.y
    const aCenterDist = Math.abs(a.x - centerX)
    const bCenterDist = Math.abs(b.x - centerX)
    if (aCenterDist !== bCenterDist) return aCenterDist - bCenterDist
    return a.x - b.x
  })

  // Wave pickup order: strict row-by-row in generation order.
  // With idx = i * GRID_SIZE + j, row is j and column is i.
  const waveRowPositions: { idx: number; row: number; col: number }[] = []
  for (let idx = 0; idx < COUNT; idx++) {
    waveRowPositions.push({
      idx,
      row: idx % GRID_SIZE,
      col: Math.floor(idx / GRID_SIZE),
    })
  }
  // Break strand-like motion: keep row order, but decorrelate pickup inside each row.
  // Fill timing still comes from orderedTargets via `index`, so center-first logo build remains.
  waveRowPositions.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row
    const aRand = random[a.idx]
    const bRand = random[b.idx]
    if (aRand !== bRand) return aRand - bRand
    return a.col - b.col
  })

  for (let i = 0; i < COUNT; i++) {
    const particleIdx = waveRowPositions[i].idx
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

  const uTargetScale = 0.35
  const uTargetOffset = new THREE.Vector3(0, -5, 0)

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    dithering: true,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uSize: { value: 60 },
      uTargetScale: { value: uTargetScale },
      uTargetOffset: { value: uTargetOffset.clone() }, // offset for the ladder
      uKeepRatio: { value: usableCount / COUNT },
      uEdgeRadius: { value: maxRadius },
      uModelCenter: { value: new THREE.Vector3(centerX, centerY) },
      uLightPosition: { value: new THREE.Vector2(centerX, centerY) },
      uLightIntensity: { value: 0.0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uLogoPulse: { value: 0.0 },
    },
    vertexShader,
    fragmentShader
  })
  material.toneMapped = false;

  const points = new THREE.Points(geometry, material)

  // Force update
  points.frustumCulled = false // Disable frustum culling

  // Centroid of morphed logo in buffer space (same as shader: aTarget * scale + offset)
  const logoCentroidLocal = new THREE.Vector3(
    centerX * uTargetScale + uTargetOffset.x,
    centerY * uTargetScale + uTargetOffset.y,
    uTargetOffset.z
  )
  const baseEuler = new THREE.Euler(PARTICLES_BASE_ROT_X, 0, 0)
  // R*C: rotated centroid in parent space. Child offset -R*C puts centroid at pivot origin for mouse tilt.
  // Pivot must be (0,6,10) + R*C — not (0,6,10) — because the old mesh *origin* was at (0,6,10), not the logo centroid.
  const rotCentroid = logoCentroidLocal.clone().applyEuler(baseEuler)
  points.position.copy(rotCentroid).negate()

  points.rotation.x = PARTICLES_BASE_ROT_X

  const tiltPivot = new THREE.Group()
  tiltPivot.position.set(0, 6, 10).add(rotCentroid)

  // Single orientation node: YXZ matches yaw-then-local-pitch (same as nested yaw×pitch).
  const tiltOrient = new THREE.Group()
  tiltPivot.add(tiltOrient)
  tiltOrient.add(points)

  scene.add(tiltPivot)

  return { points, tiltPivot, tiltOrient, material, geometry, centerX, centerY, maxRadius }
}
