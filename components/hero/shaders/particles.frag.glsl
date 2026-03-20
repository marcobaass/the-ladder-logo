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
  float t = pow(smoothstep(0.0, 1.0, vBump), 0.4);

  vec3 baseColor = vec3(1.0, 0.3, 0.15);
  vec3 warmColor = vec3(1.0, 0.5, 0.2);

  vec3 color = baseColor;
  color = mix(color, warmColor, smoothstep(0.85, 0.975, t));
  color = mix(color, vec3(1.0, 0.9, 0.8), smoothstep(0.95, 1.0, t));

  gl_FragColor = vec4(color, alpha * vAlpha);
}
