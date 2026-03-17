precision mediump float;

varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float alpha = smoothstep(0.5, 0.4, d);

  gl_FragColor = vec4(1.0, 0.3, 0.15, alpha * vAlpha);
}
