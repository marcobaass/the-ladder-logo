precision mediump float;

uniform float uLightIntensity;

varying float vAlpha;
varying float vEdgeFactor;
varying float vProgress;
varying float vLightDist;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float alpha = smoothstep(0.5, 0.4, d);

  // lightsource behind logo
  float brightness = 4.0 * uLightIntensity;
  float lightRadius = 0.8;
  float light = 1.0 + brightness * smoothstep(lightRadius, 0.0, vLightDist);
  light = mix(1.0, light, vProgress);
  vec3 color = vec3(1.0, 0.3, 0.15) * light;

  gl_FragColor = vec4(color, alpha * vAlpha);
}
