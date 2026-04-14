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

  // Logo Edge Glow
  vec2 logoDelta = aTargetPosition.xy - uModelCenter;
  float rLinear = length(logoDelta) / uEdgeRadius;
  rLinear = clamp(rLinear, 0.0, 1.0);
  float theta = atan(logoDelta.y, logoDelta.x);
  // Center glow: breathe + gentle angular wobble (per particle, logo space)
  float breathe = 0.25 * sin(uTime * 0.5);
  
  float wobble =
      0.45 * sin(theta * 2.0 + uTime * 1.05)
    + 0.28 * sin(theta * -2.0 + uTime * 0.88)
    + 0.18 * sin(theta * 3.0 + uTime * 1.4);
  float rWarped = rLinear * (1.0 + breathe + wobble);
  rWarped = clamp(rWarped, 0.0, 1.0);
  float edgeFactor = pow(rWarped, 2.0);

  // targetPos.x += sin(uTime * 2.0 + targetPos.y * 4.0) * 0.06 * edgeFactor;

  // 4. Blend between wave and target
  vec3 pos = mix(wavePos, targetPos, particleProgress);

  // Spiral progress
  float spiralProgress = smoothstep(0.9, 1.0, particleProgress);
  float spiralEnvelope = sin(spiralProgress * 3.14159);
  // Add per-particle variation so the swirl does not collapse into rows/lines.
  float spiralTurns = mix(0.85, 1.25, aRandom);
  float spiralPhase = (aRandom - 0.5) * 1.8;
  float spiralAngle = spiralProgress * 6.28 * spiralTurns + spiralPhase;
  float spiralRadius = mix(0.75, 1.15, aRandom) * spiralEnvelope;
  pos.x += cos(spiralAngle) * spiralRadius;
  pos.z += sin(spiralAngle) * spiralRadius;




  // 
  // Logo Wave
  //

  // progress gate
  float logoMask = smoothstep(0.85, 1.0, particleProgress); 


  // transforming to screen coordinates
  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;

  // Varyings
  vEdgeFactor = edgeFactor;
  vProgress = particleProgress;

  // Striplight
  vec2 screenPos = gl_Position.xy / gl_Position.w;
  vec2 lightDelta = screenPos - uLightPosition;
  lightDelta.x *= uResolution.x / uResolution.y;

  // rotate light space
  float degrees = 145.0;
  float angle = degrees * 3.14159265 / 180.0;
  float c = cos(angle);
  float s = sin(angle);
  vec2 rotatedDelta = vec2(
    c * lightDelta.x - s * lightDelta.y,
    s * lightDelta.x + c * lightDelta.y
  );

  // shrinking pixels on progress (initalsize, shrinkvalue, particleprogress)
  float sizeFactor = mix(1.0, 0.6, particleProgress);
  gl_PointSize = uSize * sizeFactor * (1.0 / -viewPosition.z);

  // fading out overhang of pixels
  float fadeProgress = smoothstep(0.0, 0.5, uProgress);
  float fadeOut = aIndex > uKeepRatio ? fadeProgress : 0.0;
  vAlpha = 1.0 - fadeOut;
}
