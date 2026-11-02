import React, { useEffect, useRef } from 'react';
import styles from './style.less';

// GLSL ES 1.00（WebGL1 / WebGL2 上下文均兼容，常量循环、无扩展依赖）
const VERT_SRC = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * 视觉意象：API 数据流网络。
 * - 12 个接口节点通过曲线链路连接，请求包沿链路流动
 * - 外圈是测试调度环，刻度 / 扫掠光点暗示定时任务与测试轮次
 * - 极淡的点阵与数据雾提供纵深，卡片正后方压暗保证表单可读性
 */
const FRAG_SRC = `
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;

const float PI = 3.14159265359;
const vec3 JADE = vec3(0.46, 0.92, 0.78);
const vec3 AMBER = vec3(1.00, 0.68, 0.36);
const vec3 IVORY = vec3(0.88, 0.98, 0.92);

float hash21(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
  float n = hash21(p);
  return vec2(n, hash21(p + n * 41.7 + 3.1));
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

const mat2 ROT = mat2(0.80, 0.60, -0.60, 0.80);

// 3 阶 FBM（手工展开，兼容 WebGL1 常量循环限制）
float fbm(vec2 p) {
  float f = 0.0;
  f += 0.550 * vnoise(p); p = ROT * p * 2.03;
  f += 0.300 * vnoise(p); p = ROT * p * 2.01;
  f += 0.150 * vnoise(p);
  return f;
}

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return length(pa - ba * h);
}

vec2 qbez(vec2 a, vec2 b, vec2 c, float t) {
  float u = 1.0 - t;
  return u * u * a + 2.0 * u * t * b + t * t * c;
}

// 5 段折线逼近二次曲线距离，比逐像素采样便宜很多
float qbezDist(vec2 p, vec2 a, vec2 b, vec2 c) {
  float d = 1e5;
  vec2 prev = a;
  for (int i = 1; i <= 5; i++) {
    float t = float(i) / 5.0;
    vec2 cur = qbez(a, b, c, t);
    d = min(d, segDist(p, prev, cur));
    prev = cur;
  }
  return d;
}

// 接口链路：细线 + 柔和辉光 + 一个带拖尾的请求包
vec3 drawEdge(vec2 p, vec2 a, vec2 b, vec2 bend, float depth, float seed, float t, vec3 tint) {
  vec2 ctrl = mix(a, b, 0.5) + bend
    + vec2(sin(t * 0.17 + seed * 6.28), cos(t * 0.13 + seed * 6.28)) * 0.006;

  float d = qbezDist(p, a, ctrl, b);

  float aa = 0.0011 + 0.0005 * depth;
  float core = smoothstep(aa, 0.0, d);
  float glow = exp(-d * 120.0) * 0.105 + exp(-d * 26.0) * 0.018;
  float vis = 0.30 + 0.70 * depth;

  vec3 col = tint * (core * 0.17 + glow) * vis;

  float speed = 0.045 + 0.045 * hash21(vec2(seed, seed + 3.0));
  float travel = fract(t * speed + seed * 0.73);
  float fade = smoothstep(0.0, 0.10, travel) * smoothstep(1.0, 0.90, travel);

  for (int j = 0; j < 3; j++) {
    float tj = travel - float(j) * 0.020;
    if (tj > 0.0 && tj < 1.0) {
      vec2 pp = qbez(a, ctrl, b, tj);
      vec2 dd = p - pp;
      float w = 54000.0 - float(j) * 15000.0;
      float trail = 1.0 - float(j) * 0.30;
      col += mix(IVORY, tint, 0.40) * exp(-dot(dd, dd) * w) * trail * fade * vis * 0.95;
    }
  }

  return col;
}

// 接口节点：亮核 + 细环 + 缓慢扩散的脉冲环
vec3 drawNode(vec2 p, vec2 n, float t, float seed, vec3 tint, float size) {
  n += vec2(sin(t * 0.33 + seed * 6.28), cos(t * 0.29 + seed * 4.71)) * 0.0022;

  float d = length(p - n);
  float breathe = 0.55 + 0.45 * sin(t * 1.25 + seed * 6.28);

  float core = exp(-d * d * 34000.0) * (0.85 + 0.15 * breathe);
  float halo = exp(-d * 55.0) * 0.042;
  float ring = smoothstep(0.0012, 0.0002, abs(d - 0.0095 * size)) * (0.40 + 0.60 * breathe);

  float ph = fract(t * 0.16 + seed * 0.83);
  float ripple = exp(-abs(d - (0.010 + ph * 0.045)) * 720.0) * (1.0 - ph) * 0.15;

  return mix(IVORY, tint, 0.55) * core * 1.05
    + tint * (halo + ring * 0.34 + ripple);
}

// 测试调度环：断续主环 + 外侧刻度 + 缓慢扫掠光点
vec3 drawOrbit(vec2 p, vec2 c, float t) {
  vec2 q = p - c;
  q.x *= 0.94;

  float r = length(q);
  float ang = atan(q.y, q.x);

  float R = 0.385;

  float dash = smoothstep(-0.10, 0.65, sin(ang * 3.0 + t * 0.035 + 1.2));
  float ring = exp(-abs(r - R) * 520.0) * (0.12 + 0.88 * dash);
  float glow = exp(-abs(r - R) * 26.0) * 0.022;

  float tp = fract(ang / (2.0 * PI) * 90.0);
  float tickMask = smoothstep(0.0, 0.12, tp) * smoothstep(0.42, 0.30, tp);
  float ticks = exp(-abs(r - 0.432) * 820.0) * tickMask * 0.085;

  float sweepAng = mod(t * 0.20, 2.0 * PI) - PI;
  float da = atan(sin(ang - sweepAng), cos(ang - sweepAng));
  float sweep = exp(-da * da * 3.0) * exp(-abs(r - R) * 12.0) * 0.22;

  float dash2 = smoothstep(0.40, 0.92, sin(ang * 9.0 - t * 0.07));
  float inner = exp(-abs(r - 0.462) * 700.0) * dash2 * 0.028;

  return JADE * (ring * 0.40 + glow + ticks + sweep + inner);
}

// 极淡点阵，像测试用例矩阵
vec3 dotMatrix(vec2 sp) {
  vec2 g = fract(sp * 36.0) - 0.5;
  float d = length(g);
  return vec3(0.48, 0.82, 0.72) * smoothstep(0.055, 0.0, d) * 0.013;
}

// 数据尘：两层不同尺度，逐粒闪烁
vec3 dustLayer(vec2 sp, float t, float scale, float density, float size) {
  vec2 gp = sp * scale;
  vec2 id = floor(gp);
  vec2 gv = fract(gp) - 0.5;

  float h = hash21(id);
  vec2 off = (hash22(id) - 0.5) * 0.70;
  float d = length(gv - off);
  float tw = 0.5 + 0.5 * sin(t * (0.4 + h * 1.8) + h * 30.0);
  float m = smoothstep(size, 0.0, d) * step(density, h) * (0.35 + 0.65 * tw);

  vec3 tint = mix(vec3(0.50, 0.86, 0.74), vec3(0.96, 0.82, 0.62), hash21(id + 7.7));
  return tint * m;
}

vec3 background(vec2 p, float aspect, float t) {
  vec3 col = mix(
    vec3(0.004, 0.007, 0.008),
    vec3(0.013, 0.021, 0.022),
    smoothstep(0.0, 1.0, p.y)
  );

  vec2 sp = vec2(p.x * aspect, p.y);

  // 低对比数据雾
  float n = fbm(sp * vec2(2.0, 2.6) + vec2(t * 0.008, -t * 0.005));
  vec3 aur = mix(vec3(0.020, 0.115, 0.095), vec3(0.130, 0.070, 0.030), smoothstep(0.42, 0.84, n));
  col += aur * pow(smoothstep(0.30, 1.0, n), 1.5) * 0.55;

  // 两团大范围辉光：青玉主光 + 暖琥珀副光
  vec2 g1 = (p - vec2(0.46, 0.50)) * vec2(aspect * 0.90, 1.0);
  col += vec3(0.020, 0.086, 0.068) * exp(-dot(g1, g1) * 3.0);

  vec2 g2 = (p - vec2(0.86, 0.82)) * vec2(aspect * 0.70, 1.0);
  col += vec3(0.072, 0.038, 0.013) * exp(-dot(g2, g2) * 4.0);

  col += dotMatrix(sp);

  // 缓慢上移的扫描带
  float sy = fract(t * 0.030);
  float band = exp(-pow((p.y - sy) * 9.0, 2.0));
  col += vec3(0.040, 0.115, 0.100) * band * 0.12;

  return col;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 p = fragCoord / iResolution.xy;
  float aspect = iResolution.x / iResolution.y;
  float t = iTime;

  // 指针视差（归一化，未移动时居中）
  vec2 mouse = iMouse - 0.5;

  vec3 col = background(p - mouse * 0.006, aspect, t);

  vec2 sp = vec2(p.x * aspect, p.y);
  col += dustLayer(sp, t, 22.0, 0.74, 0.055) * 0.26;
  col += dustLayer(sp + 4.7, t, 9.0, 0.52, 0.040) * 0.38;

  vec2 ctr = vec2(0.5, 0.46);

  col += drawOrbit(p - mouse * 0.012, ctr, t);

  // 节点布局：左右两簇 + 顶部 / 底部桥接；窄屏压缩横向偏移
  float sx = clamp(aspect / 1.62, 0.42, 1.0);

  vec2 N0  = ctr + vec2(-0.330 * sx,  0.350);
  vec2 N1  = ctr + vec2(-0.415 * sx,  0.115);
  vec2 N2  = ctr + vec2(-0.265 * sx, -0.095);
  vec2 N3  = ctr + vec2(-0.400 * sx, -0.295);
  vec2 N4  = ctr + vec2(-0.160 * sx, -0.405);
  vec2 N5  = ctr + vec2( 0.320 * sx,  0.355);
  vec2 N6  = ctr + vec2( 0.420 * sx,  0.105);
  vec2 N7  = ctr + vec2( 0.245 * sx, -0.115);
  vec2 N8  = ctr + vec2( 0.405 * sx, -0.305);
  vec2 N9  = ctr + vec2( 0.150 * sx, -0.410);
  vec2 N10 = ctr + vec2(-0.050 * sx,  0.420);
  vec2 N11 = ctr + vec2( 0.005 * sx, -0.440);

  vec2 pg = p - mouse * 0.020;
  vec3 graph = vec3(0.0);

  // 左簇
  graph += drawEdge(pg, N0, N1, vec2(0.035, 0.012), 0.80, 0.11, t, JADE);
  graph += drawEdge(pg, N0, N2, vec2(-0.020, 0.030), 0.62, 0.23, t, JADE);
  graph += drawEdge(pg, N1, N2, vec2(-0.018, -0.010), 0.92, 0.34, t, JADE);
  graph += drawEdge(pg, N1, N3, vec2(0.030, -0.012), 0.55, 0.47, t, JADE);
  graph += drawEdge(pg, N2, N4, vec2(-0.030, 0.014), 0.44, 0.58, t, JADE);
  graph += drawEdge(pg, N3, N4, vec2(-0.024, -0.016), 0.72, 0.69, t, JADE);

  // 右簇（含一条琥珀色异常链路）
  graph += drawEdge(pg, N5, N6, vec2(0.026, 0.010), 0.86, 0.72, t, JADE);
  graph += drawEdge(pg, N5, N7, vec2(-0.034, 0.016), 0.58, 0.81, t, JADE);
  graph += drawEdge(pg, N6, N7, vec2(0.020, -0.014), 0.46, 0.18, t, mix(JADE, AMBER, 0.70));
  graph += drawEdge(pg, N7, N8, vec2(0.032, 0.018), 0.66, 0.29, t, JADE);
  graph += drawEdge(pg, N7, N9, vec2(-0.020, -0.012), 0.90, 0.41, t, JADE);
  graph += drawEdge(pg, N8, N9, vec2(0.024, -0.010), 0.52, 0.53, t, JADE);

  // 顶部桥接 + 底部回路
  graph += drawEdge(pg, N0, N10, vec2(0.014, 0.040), 0.70, 0.63, t, JADE);
  graph += drawEdge(pg, N10, N5, vec2(0.000, 0.052), 0.48, 0.75, t, JADE);
  graph += drawEdge(pg, N4, N11, vec2(-0.014, -0.030), 0.60, 0.86, t, JADE);
  graph += drawEdge(pg, N11, N9, vec2(0.010, -0.034), 0.42, 0.95, t, JADE);

  col += graph;

  // 节点：大部分青玉，两个暖色作为异常 / 重试标记
  col += drawNode(pg, N0,  t, 0.12, JADE, 1.05);
  col += drawNode(pg, N1,  t, 0.28, JADE, 0.90);
  col += drawNode(pg, N2,  t, 0.44, JADE, 1.10);
  col += drawNode(pg, N3,  t, 0.57, JADE, 0.85);
  col += drawNode(pg, N4,  t, 0.71, JADE, 1.00);
  col += drawNode(pg, N5,  t, 0.83, JADE, 1.08);
  col += drawNode(pg, N6,  t, 0.20, AMBER, 0.95);
  col += drawNode(pg, N7,  t, 0.36, JADE, 1.12);
  col += drawNode(pg, N8,  t, 0.49, JADE, 0.88);
  col += drawNode(pg, N9,  t, 0.65, AMBER, 0.92);
  col += drawNode(pg, N10, t, 0.78, JADE, 0.86);
  col += drawNode(pg, N11, t, 0.91, JADE, 1.02);

  // 卡片区域压暗，保证表单对比度
  vec2 sh = (p - vec2(0.5, 0.46)) * vec2(aspect * 1.10, 1.0);
  float shade = exp(-dot(sh, sh) * 7.0);
  col *= 1.0 - shade * 0.38;

  // 暗角
  float vig = pow(clamp(16.0 * p.x * p.y * (1.0 - p.x) * (1.0 - p.y), 0.0, 1.0), 0.28);
  col *= mix(0.58, 1.0, vig);

  // 轻微胶片颗粒
  col += (hash21(fragCoord + fract(t) * 113.0) - 0.5) * 0.013;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

function compileShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.error('[ShaderBackground]', gl.getShaderInfoLog(shader));
        }
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

/**
 * 登录页 WebGL 背景：API 数据流网络。
 * WebGL 不可用时隐藏 canvas，露出容器的 CSS 渐变降级背景（.shaderHost）。
 */
const ShaderBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return undefined;
        }

        let gl = null;
        try {
            gl =
                canvas.getContext('webgl2', {
                    antialias: false,
                    alpha: false,
                    powerPreference: 'high-performance',
                }) ||
                canvas.getContext('webgl', {
                    antialias: false,
                    alpha: false,
                    powerPreference: 'high-performance',
                }) ||
                canvas.getContext('experimental-webgl', { antialias: false, alpha: false });
        } catch (e) {
            gl = null;
        }
        if (!gl) {
            canvas.style.display = 'none';
            return undefined;
        }

        const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
        const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
        if (!vert || !frag) {
            canvas.style.display = 'none';
            return undefined;
        }

        const program = gl.createProgram();
        gl.attachShader(program, vert);
        gl.attachShader(program, frag);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.error('[ShaderBackground]', gl.getProgramInfoLog(program));
            }
            canvas.style.display = 'none';
            return undefined;
        }
        gl.useProgram(program);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 3, -1, -1, 3]), // 全屏大三角形
            gl.STATIC_DRAW,
        );
        const aPosition = gl.getAttribLocation(program, 'aPosition');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        const uResolution = gl.getUniformLocation(program, 'iResolution');
        const uTime = gl.getUniformLocation(program, 'iTime');
        const uMouse = gl.getUniformLocation(program, 'iMouse');

        const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        const MAX_DPR = coarsePointer ? 1.0 : 1.25; // 内网办公机 GPU 性能保守预算
        const MAX_FPS = coarsePointer ? 24 : 30;

        let width = 0;
        let height = 0;
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
            const rect = canvas.getBoundingClientRect();
            const w = Math.max(1, Math.round(rect.width * dpr));
            const h = Math.max(1, Math.round(rect.height * dpr));
            if (w === width && h === height) return;
            width = w;
            height = h;
            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
        };

        // 指针视差：目标值 + 缓动，避免跟随生硬
        const pointer = { x: 0.5, y: 0.5 };
        const pointerTarget = { x: 0.5, y: 0.5 };
        let pointerActive = false;
        const onMouseMove = (e) => {
            pointerTarget.x = e.clientX / Math.max(window.innerWidth, 1);
            pointerTarget.y = 1 - e.clientY / Math.max(window.innerHeight, 1); // gl_FragCoord y 轴向上
            pointerActive = true;
        };

        const reducedMotion =
            window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let rafId = 0;
        let lastFrame = 0;
        const start = performance.now();

        const draw = (now) => {
            resize();
            if (pointerActive) {
                pointer.x += (pointerTarget.x - pointer.x) * 0.06;
                pointer.y += (pointerTarget.y - pointer.y) * 0.06;
            }
            gl.uniform2f(uResolution, width, height);
            gl.uniform1f(uTime, (now - start) / 1000);
            gl.uniform2f(uMouse, pointer.x, pointer.y);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        };

        const loop = (now) => {
            rafId = window.requestAnimationFrame(loop);
            if (now - lastFrame < 1000 / MAX_FPS) return;
            lastFrame = now;
            draw(now);
        };

        const onVisibility = () => {
            if (document.hidden) {
                window.cancelAnimationFrame(rafId);
                rafId = 0;
            } else if (!reducedMotion && !rafId) {
                rafId = window.requestAnimationFrame(loop);
            }
        };

        resize();
        window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', onVisibility);
        if (!coarsePointer) {
            window.addEventListener('mousemove', onMouseMove, { passive: true });
        }

        let drawStatic = null;
        const dispose = () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resize);
            if (drawStatic) window.removeEventListener('resize', drawStatic);
            if (!coarsePointer) {
                window.removeEventListener('mousemove', onMouseMove);
            }
            document.removeEventListener('visibilitychange', onVisibility);
            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);
            gl.deleteShader(vert);
            gl.deleteShader(frag);
            const ext = gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
        };

        if (reducedMotion) {
            // 静态呈现一帧；首帧布局未就绪或窗口变化时补绘，避免 1x1 拉伸黑屏
            drawStatic = () => draw(start + 12000);
            drawStatic();
            window.requestAnimationFrame(drawStatic);
            window.addEventListener('resize', drawStatic);
            return dispose;
        }

        rafId = window.requestAnimationFrame(loop);
        return dispose;
    }, []);

    return (
        <div className={styles.shaderHost} aria-hidden="true">
            <canvas ref={canvasRef} className={styles.shaderCanvas} />
        </div>
    );
};

export default React.memo(ShaderBackground);
