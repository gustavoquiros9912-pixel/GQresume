/*
  gradient.js: an animated shader gradient, in plain WebGL (no React, no three.js).
  Inspired by the "ShaderGradient" idea: domain-warped simplex noise blended between brand colours,
  finished with film grain. Any <canvas data-gradient> gets one. Pauses off-screen and when motion is reduced.
*/
(() => {
  const canvases = [...document.querySelectorAll('canvas[data-gradient]')];
  if (!canvases.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

  const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  const FS = `precision highp float;
    uniform vec2 res; uniform float t; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; uniform vec3 c4; uniform float grain;
    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;} vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 perm(vec4 x){return mod289(((x*34.0)+1.0)*x);} vec4 tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy; i=mod289(i);
      vec4 p=perm(perm(perm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.0*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_); vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw); vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = gl_FragCoord.xy / res; vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
      float k = t * 0.09;
      vec2 w = p + 0.55 * vec2(snoise(vec3(p * 0.9, k)), snoise(vec3(p * 0.9 + 4.0, k * 1.1)));
      float a = snoise(vec3(w * 1.25, k * 1.3)) * 0.5 + 0.5;
      float b = snoise(vec3(w * 2.1 + 9.0, k * 1.7)) * 0.5 + 0.5;
      float c = snoise(vec3(w * 0.7 - 3.0, k)) * 0.5 + 0.5;
      vec3 col = mix(c1, c2, smoothstep(0.15, 0.75, a));
      col = mix(col, c3, smoothstep(0.45, 0.95, b) * 0.9);
      col = mix(col, c4, smoothstep(0.7, 1.0, c * b) * 0.65);
      float vig = 1.0 - smoothstep(0.2, 1.15, length(p * vec2(0.8, 1.0)));
      col = mix(c1, col, vig);
      col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * grain;
      gl_FragColor = vec4(col, 1.0);
    }`;

  canvases.forEach((canvas) => {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) { canvas.hidden = true; return; }
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram(); gl.attachShader(prog, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.hidden = true; return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n) => gl.getUniformLocation(prog, n);
    const cols = (canvas.dataset.colors || '#141414,#3a0f1c,#ea4e65,#ff9a8b').split(',').map(hex);
    gl.uniform3fv(u('c1'), cols[0]); gl.uniform3fv(u('c2'), cols[1]); gl.uniform3fv(u('c3'), cols[2]); gl.uniform3fv(u('c4'), cols[3]);
    gl.uniform1f(u('grain'), parseFloat(canvas.dataset.grain || '0.05'));
    const scale = parseFloat(canvas.dataset.scale || '0.5'); // render at a fraction of CSS pixels: it is a soft gradient
    let visible = true, t0 = performance.now();
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
    const draw = (now) => {
      const w = Math.max(2, Math.round(canvas.clientWidth * scale)), h = Math.max(2, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h); gl.uniform2f(u('res'), w, h);
      gl.uniform1f(u('t'), reduce ? 6.0 : (now - t0) / 1000 + 6.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    draw(performance.now());
    if (reduce) return;
    const loop = (now) => { if (visible) draw(now); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
})();
