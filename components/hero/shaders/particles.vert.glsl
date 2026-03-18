uniform float uTime;
uniform float uProgress;
uniform float uSize;
uniform float uTargetScale;
uniform vec3 uTargetOffset;
uniform float uKeepRatio;
uniform float uEdgeRadius;
uniform vec2 uModelCenter;

attribute vec3 aStartPosition;
attribute vec3 aTargetPosition;
attribute float aRandom;
attribute float aIndex;

varying float vAlpha;
varying float vEdgeFactor;
varying float vProgress;
varying float vLightDist;

void main() {
  // 1. Calculate staggered progress for THIS particle
  float stagger = 0.6;
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

  targetPos.x += sin(uTime * 2.0 + targetPos.y * 4.0) * 0.06 * edgeFactor;

  // 4. Blend between wave and target
  vec3 pos = mix(wavePos, targetPos, particleProgress);

  // 6. Transform to screen coordinates
  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;

  // Varyings
  vEdgeFactor = edgeFactor;
  vProgress = particleProgress;
  vLightDist = length(aTargetPosition.xy - uModelCenter) / uEdgeRadius;

  // shrinking pixels on progress (initalsize, shrinkvalue, particleprogress)
  float sizeFactor = mix(1.0, 0.6, particleProgress);
  gl_PointSize = uSize * sizeFactor * (1.0 / -viewPosition.z);

  // fading out overhang of pixels
  float fadeProgress = smoothstep(0.0, 0.5, uProgress);
  float fadeOut = aIndex > uKeepRatio ? fadeProgress : 0.0;
  vAlpha = 1.0 - fadeOut;
}
