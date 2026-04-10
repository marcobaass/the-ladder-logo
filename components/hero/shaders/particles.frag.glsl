precision mediump float;

uniform float uLightIntensity;

varying float vAlpha;
varying float vEdgeFactor;
varying float vProgress;
varying float vLightDist;
varying float vBump;


void main() {
  float d = length(gl_PointCoord - 0.5);
  float alpha = smoothstep(0.5, 0.4, d);

  // lightsource behind logo
  float lightRadius = 2.4;
  float t = 1.0 - smoothstep(0.0, lightRadius, vLightDist);
  t *= uLightIntensity;
  t = smoothstep(0.0, 1.0, t);
  t = pow(t, 1.7);

  float lightGate = smoothstep(0.85, 1.0, vProgress);
  t *= lightGate;

  float radius = clamp(vEdgeFactor, 0.0, 1.0);
  radius = 1.0 -radius;

  vec3 c_cinnabar = vec3(0.9137, 0.3255, 0.2078); // #E95335
  vec3 c_deepMid  = vec3(0.7529, 0.2235, 0.1686); // #C0392B
  vec3 c_deepDark = vec3(0.5451, 0.1451, 0.0000); // #8B2500
  vec3 c_orange   = vec3(1.0000, 0.5490, 0.0000); // #FF8C00
  vec3 c_gold     = vec3(1.0000, 0.8431, 0.0000); // #FFD700
  vec3 c_pale     = vec3(1.0000, 0.9608, 0.8784); // #FFF5E0

 
  float circleColor = smoothstep(0.85, 1.0, radius);
  // Compose on dark base
  vec3 color = c_deepDark;

  // middle value color of circle
  color = mix(color, c_orange, circleColor);

  // wave color
  vec3 waveColor = c_cinnabar;
  color = mix(waveColor, color, vProgress);

  gl_FragColor = vec4(color, alpha * vAlpha);
}
