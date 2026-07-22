import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';

// ─── Vertex shader ────────────────────────────────────────────────────────────
const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

// ─── Fragment shader ──────────────────────────────────────────────────────────
// Changes vs. original:
//   • precision mediump  (vs highp)  — faster on mobile GPUs, imperceptible here
//   • NUM_LAYER 4 → 3               — removes one 3×3 star pass per fragment
//   • uAutoRotMat uniform            — rotation matrix computed on CPU once per
//                                      frame instead of per fragment (no cos/sin
//                                      in the shader hot-path)
const fragmentShader = `
precision mediump float;

uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform mat2 uAutoRotMat;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform bool uTransparent;

varying vec2 vUv;

#define NUM_LAYER 3.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlowIntensity;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uGlowIntensity;
  m *= smoothstep(1.0, 0.2, d);
  return m;
}

vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0);
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + offset;
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float grn = min(red, blu) * seed;
      vec3 base = vec3(red, grn, blu);

      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
      hue = fract(hue + uHueShift / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));

      vec2 pad = vec2(
        tris(seed * 34.0 + uTime * uSpeed / 10.0),
        tris(seed * 38.0 + uTime * uSpeed / 30.0)
      ) - 0.5;

      float star = Star(gv - offset - pad, flareSize);
      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      star *= twinkle;

      col += star * size * base;
    }
  }
  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution.xy;
  vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;

  vec2 mouseNorm = uMouse - vec2(0.5);

  if (uAutoCenterRepulsion > 0.0) {
    float centerDist = length(uv);
    vec2 repulsion = normalize(uv) * (uAutoCenterRepulsion / (centerDist + 0.1));
    uv += repulsion * 0.05;
  } else if (uMouseRepulsion) {
    vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
    float mouseDist = length(uv - mousePosUV);
    vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
    uv += repulsion * 0.05 * uMouseActiveFactor;
  } else {
    uv += mouseNorm * 0.1 * uMouseActiveFactor;
  }

  // CPU-precomputed matrix — no cos/sin per fragment
  uv = uAutoRotMat * uv;
  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

  vec3 col = vec3(0.0);
  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    col += StarLayer(uv * scale + i * 453.32) * fade;
  }

  if (uTransparent) {
    float alpha = min(smoothstep(0.0, 0.3, length(col)), 1.0);
    gl_FragColor = vec4(col, alpha);
  } else {
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface GalaxyProps {
  focal?: [number, number];
  rotation?: [number, number];
  starSpeed?: number;
  density?: number;
  hueShift?: number;
  disableAnimation?: boolean;
  speed?: number;
  mouseInteraction?: boolean;
  glowIntensity?: number;
  saturation?: number;
  mouseRepulsion?: boolean;
  twinkleIntensity?: number;
  rotationSpeed?: number;
  repulsionStrength?: number;
  autoCenterRepulsion?: number;
  transparent?: boolean;
}

// Detect mobile/low-power devices to throttle frame rate
const isMobile =
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

// Target ms between frames: ~60fps desktop, ~30fps mobile
const FRAME_BUDGET = isMobile ? 1000 / 30 : 1000 / 60;

// ─── Component ────────────────────────────────────────────────────────────────
export default function Galaxy({
  focal = [0.5, 0.5],
  rotation = [1.0, 0.0],
  starSpeed = 0.5,
  density = 1,
  hueShift = 140,
  disableAnimation = false,
  speed = 1.0,
  mouseInteraction = true,
  glowIntensity = 0.3,
  saturation = 0.0,
  mouseRepulsion = true,
  repulsionStrength = 2,
  twinkleIntensity = 0.3,
  rotationSpeed = 0.1,
  autoCenterRepulsion = 0,
  transparent = true,
  ...rest
}: GalaxyProps) {
  const ctnDom = useRef<HTMLDivElement>(null);
  const targetMousePos = useRef({ x: 0.5, y: 0.5 });
  const smoothMousePos = useRef({ x: 0.5, y: 0.5 });
  const targetMouseActive = useRef(0.0);
  const smoothMouseActive = useRef(0.0);

  // All props read through a ref so the effect never needs to re-run.
  // Without this, array literal props (focal, rotation) produce new references
  // on every parent render, tearing down and recreating the entire WebGL context.
  const propsRef = useRef({
    focal, rotation, starSpeed, density, hueShift, disableAnimation,
    speed, mouseInteraction, glowIntensity, saturation, mouseRepulsion,
    repulsionStrength, twinkleIntensity, rotationSpeed, autoCenterRepulsion, transparent,
  });
  propsRef.current = {
    focal, rotation, starSpeed, density, hueShift, disableAnimation,
    speed, mouseInteraction, glowIntensity, saturation, mouseRepulsion,
    repulsionStrength, twinkleIntensity, rotationSpeed, autoCenterRepulsion, transparent,
  };

  useEffect(() => {
    if (!ctnDom.current) return;
    const ctn = ctnDom.current;
    const p = propsRef.current;

    // dpr=1 matches original behaviour (no retina upscaling).
    // Pass dpr explicitly so OGL doesn't silently read window.devicePixelRatio.
    const renderer = new Renderer({ alpha: p.transparent, premultipliedAlpha: false, dpr: 1 });
    const gl = renderer.gl;

    if (p.transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
    } else {
      gl.clearColor(0, 0, 0, 1);
    }

    // ── Mobile fix: canvas is display:inline by default. ──────────────────────
    // That causes the parent container to shrink to 0 height on mobile because
    // inline elements don't contribute to block layout the same way. We also
    // pin it with position:absolute so it fills the container even if OGL's
    // setSize overwrites width/height style values with pixel strings.
    Object.assign(gl.canvas.style, {
      display: 'block',
      position: 'absolute',
      top: '0',
      left: '0',
    });

    let program: Program;

    function applySize() {
      const w = ctn.offsetWidth;
      const h = ctn.offsetHeight;
      if (w === 0 || h === 0) return; // guard against zero-size on first paint
      renderer.setSize(w, h);
      // Re-assert 100% fill — OGL's setSize writes pixel strings which could
      // override our absolute positioning intent on subsequent resizes.
      Object.assign(gl.canvas.style, { width: '100%', height: '100%' });
      if (program) {
        program.uniforms.uResolution.value = new Color(
          gl.canvas.width,
          gl.canvas.height,
          gl.canvas.width / gl.canvas.height
        );
      }
    }

    const ro = new ResizeObserver(applySize);
    ro.observe(ctn);
    applySize();

    const geometry = new Triangle(gl);
    program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height),
        },
        uFocal: { value: new Float32Array(p.focal) },
        uRotation: { value: new Float32Array(p.rotation) },
        uStarSpeed: { value: p.starSpeed },
        uDensity: { value: p.density },
        uHueShift: { value: p.hueShift },
        uSpeed: { value: p.speed },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uGlowIntensity: { value: p.glowIntensity },
        uSaturation: { value: p.saturation },
        uMouseRepulsion: { value: p.mouseRepulsion },
        uTwinkleIntensity: { value: p.twinkleIntensity },
        // CPU-side rotation matrix uploaded as a uniform (avoids cos/sin per-fragment)
        uAutoRotMat: { value: new Float32Array([1, 0, 0, 1]) },
        uRepulsionStrength: { value: p.repulsionStrength },
        uMouseActiveFactor: { value: 0.0 },
        uAutoCenterRepulsion: { value: p.autoCenterRepulsion },
        uTransparent: { value: p.transparent },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    let animateId: number;
    let lastFrameTime = 0;

    // ── Pause when scrolled off-screen ────────────────────────────────────────
    let isVisible = false;
    const io = new IntersectionObserver(
      (entries) => { isVisible = entries[0].isIntersecting; },
      { threshold: 0 }
    );
    io.observe(ctn);

    // ── Pause when the browser tab is hidden ──────────────────────────────────
    function onVisibilityChange() {
      if (!document.hidden && animateId === -1) {
        lastFrameTime = 0;
        animateId = requestAnimationFrame(update);
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    function update(t: number) {
      animateId = requestAnimationFrame(update);

      // Skip frame entirely when off-screen or tab is hidden
      if (!isVisible || document.hidden) return;

      // ── Mobile FPS throttle ───────────────────────────────────────────────
      if (t - lastFrameTime < FRAME_BUDGET) return;
      lastFrameTime = t;

      const cp = propsRef.current;

      if (!cp.disableAnimation) {
        const sec = t * 0.001;
        program.uniforms.uTime.value = sec;
        program.uniforms.uStarSpeed.value = (sec * cp.starSpeed) / 10.0;

        // Precompute rotation matrix on CPU — avoids cos/sin in every fragment
        const angle = sec * cp.rotationSpeed;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const rm = program.uniforms.uAutoRotMat.value as Float32Array;
        rm[0] = c; rm[1] = -s; rm[2] = s; rm[3] = c;
      }

      // Only lerp mouse when interaction is enabled
      if (cp.mouseInteraction) {
        const lf = 0.05;
        smoothMousePos.current.x += (targetMousePos.current.x - smoothMousePos.current.x) * lf;
        smoothMousePos.current.y += (targetMousePos.current.y - smoothMousePos.current.y) * lf;
        smoothMouseActive.current += (targetMouseActive.current - smoothMouseActive.current) * lf;

        const mv = program.uniforms.uMouse.value as Float32Array;
        mv[0] = smoothMousePos.current.x;
        mv[1] = smoothMousePos.current.y;
        program.uniforms.uMouseActiveFactor.value = smoothMouseActive.current;
      }

      renderer.render({ scene: mesh });
    }

    ctn.appendChild(gl.canvas);
    animateId = requestAnimationFrame(update);

    // ── Pointer events ────────────────────────────────────────────────────────
    function handleMouseMove(e: MouseEvent) {
      const rect = ctn.getBoundingClientRect();
      targetMousePos.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: 1.0 - (e.clientY - rect.top) / rect.height,
      };
      targetMouseActive.current = 1.0;
    }
    function handleMouseLeave() {
      targetMouseActive.current = 0.0;
    }

    if (p.mouseInteraction) {
      ctn.addEventListener('mousemove', handleMouseMove);
      ctn.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      cancelAnimationFrame(animateId);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (p.mouseInteraction) {
        ctn.removeEventListener('mousemove', handleMouseMove);
        ctn.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (gl.canvas.parentNode === ctn) ctn.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — prop reads go through propsRef

  return <div ref={ctnDom} className="w-full h-full relative" {...rest} />;
}