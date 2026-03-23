uniform float uTime;
uniform float uProgress;
uniform float uSize;
uniform float uTargetScale;
uniform vec3 uTargetOffset;
uniform float uKeepRatio;
uniform float uEdgeRadius;
uniform vec2 uModelCenter;
uniform vec2 uLightPosition;
uniform float uLightIntensity;
uniform vec2 uResolution;
uniform float uLogoPulse;

attribute vec3 aStartPosition;
attribute vec3 aTargetPosition;
attribute float aRandom;
attribute float aIndex;

varying float vAlpha;
varying float vEdgeFactor;
varying float vProgress;
varying float vLightDist;
varying float vBump;

// Noise
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f); // smooth interpolation
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise2(p);
    p = p * 2.0 + vec2(37.0, 17.0);
    a *= 0.5;
  }
  return v; // 0..1
}



void main() {
  // 1. Calculate staggered progress for THIS particle
  float stagger = 0.3;
  float particleProgress = smoothstep(
    aIndex * stagger,
    aIndex * stagger + (1.0 - stagger),
    uProgress
  );

  // 2. Get wave position with animation
  vec3 wavePos = aStartPosition;
  float wave = (sin(wavePos.x * 0.4 + uTime * 0.8) * cos(wavePos.z * 0.3 + uTime * 0.6) * 1.5
             + sin(wavePos.x * 0.2 + wavePos.z * 0.15 + uTime * 0.5) * 1.0
             + cos(wavePos.z * 0.5 + uTime * 0.7) * 0.5);
  wavePos.y += wave * 0.2;
  wavePos.y += sin(uTime * 0.3 + aRandom * 6.28) * 0.015;

  // 3. Get target position
  vec3 targetPos = aTargetPosition * uTargetScale + uTargetOffset;

  float edgeFactor = length(aTargetPosition.xy - uModelCenter) / uEdgeRadius;
  edgeFactor = clamp(edgeFactor, 0.0, 1.0);
  edgeFactor = pow(edgeFactor, 3.0);

  // targetPos.x += sin(uTime * 2.0 + targetPos.y * 4.0) * 0.06 * edgeFactor;

  // 4. Blend between wave and target
  vec3 pos = mix(wavePos, targetPos, particleProgress);

  // Spiral progress
  float spiralProgress = smoothstep(0.9, 1.0, particleProgress);
  float spiralEnvelope = sin(spiralProgress * 3.14159);
  float spiralAngle = spiralProgress * 6.28 * 1.0;
  float spiralRadius = 1.0 * spiralEnvelope;
  pos.x += cos(spiralAngle) * spiralRadius;
  pos.z += sin(spiralAngle) * spiralRadius;

  // Noise-driven logo breathing (independent of light source)
  float logoMask = particleProgress * uLogoPulse;

  // 4-6s breathing cycle: omega ~ 1.0..1.6 rad/s
  float breath = 0.5 + 0.5 * sin(uTime * 1.2); // ~5.2s period

  // Low spatial frequency + slow drift
  vec2 nUv = aTargetPosition.xy * 0.45 + vec2(uTime * 0.08, -uTime * 0.06);
  float n = fbm(nUv);                  // 0..1
  float nCentered = (n - 0.5) * 2.0;   // -1..1

  // Low amplitude
  float bump = nCentered * 0.22 * breath * logoMask;
  pos.z += bump * 3.0; // mutiplier for strength

  // transforming to screen coordinates
  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;

  // Varyings
  vEdgeFactor = edgeFactor;
  vProgress = particleProgress;
  vec2 screenPos = gl_Position.xy / gl_Position.w;
  vec2 lightDelta = screenPos - uLightPosition;
  lightDelta.x *= uResolution.x / uResolution.y; // aspect correction
  vLightDist = length(lightDelta) / 0.5;
  vBump = clamp(0.5 + 0.5 * nCentered * breath, 0.0, 1.0) * logoMask;

  // shrinking pixels on progress (initalsize, shrinkvalue, particleprogress)
  float sizeFactor = mix(1.0, 0.6, particleProgress);
  gl_PointSize = uSize * sizeFactor * (1.0 / -viewPosition.z);

  // fading out overhang of pixels
  float fadeProgress = smoothstep(0.0, 0.5, uProgress);
  float fadeOut = aIndex > uKeepRatio ? fadeProgress : 0.0;
  vAlpha = 1.0 - fadeOut;
}
