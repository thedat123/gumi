import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getQuality } from '../lib/quality';
import type { GumiState } from '../api/types';

/**
 * Mascot Gumi dạng 3D THẬT (Three.js). Tự nạp `public/models/gumi.glb` nếu có;
 * chưa có thì dựng Gumi 3D tạm bằng khối (mèo cam · VIỀN ĐEN kiểu sticker qua
 * inverted-hull outline · tai nhọn · mắt to · yếm bụng · đuôi cuộn) để 3D chạy liền.
 *
 * Tự xoay/nhún nhẹ khi rảnh; chạm (interactive) hoặc đổi `jumpKey` → nhảy mừng.
 * Hạ tải theo hạng máy (getQuality) để mượt trên mobile / máy yếu.
 */
export function GumiModel3D({ size = 240, state = 'bo_pho', interactive = false, jumpKey = 0, className }: {
  size?: number; state?: GumiState; interactive?: boolean; jumpKey?: number; className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const jump = useRef(0);           // xung nhảy hiện tại (0..1, tắt dần)
  const jumpKeyRef = useRef(jumpKey);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  // Đổi jumpKey (ăn / hồi sinh / tiến hoá) → kích hoạt nhảy.
  useEffect(() => { if (jumpKey !== jumpKeyRef.current) { jumpKeyRef.current = jumpKey; jump.current = 1; } }, [jumpKey]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const q = getQuality();
    let raf = 0; let disposed = false;

    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: q.antialias, alpha: true, powerPreference: q.tier === 'low' ? 'low-power' : 'high-performance' }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(q.pixelRatio, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = q.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.95, 3.65); camera.lookAt(0, 0.82, 0);

    // Ánh sáng ấm, dịu, phủ đều (không đốm).
    scene.add(new THREE.AmbientLight(0xfff2e2, 0.85));
    const hemi = new THREE.HemisphereLight(0xfff6ea, 0xd8b89a, 0.7); scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff0d8, 1.55); key.position.set(-2.2, 3.4, 3);
    key.castShadow = q.shadows;
    if (q.shadows) { key.shadow.mapSize.set(q.shadowMap, q.shadowMap); key.shadow.camera.near = 0.5; key.shadow.camera.far = 12; key.shadow.bias = -0.0005; key.shadow.radius = 4; const c = key.shadow.camera as THREE.OrthographicCamera; c.left = -2; c.right = 2; c.top = 2.4; c.bottom = -1; }
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(3, 2, 2.5); scene.add(fill);

    const disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
    const track = <T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(x: T): T => { disposables.push(x); return x; };

    // Bóng đổ mềm dưới chân (vệt tròn) — nhẹ, không cần shadow map.
    const shadowTex = (() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d')!;
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(40,26,20,0.42)'); gr.addColorStop(1, 'rgba(40,26,20,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const groundShadow = new THREE.Mesh(track(new THREE.PlaneGeometry(2.2, 2.2)), track(new THREE.MeshBasicMaterial({ map: track(shadowTex), transparent: true, depthWrite: false })));
    groundShadow.rotation.x = -Math.PI / 2; groundShadow.position.y = 0.01; scene.add(groundShadow);

    // Cụm mascot (được thay bằng model .glb nếu có).
    const rig = new THREE.Group(); scene.add(rig);

    const FUR = 0xF5A31C, INK = 0x26190F, BELLY = 0xF8DBCC, CHEEK = 0xF58C86, NOSE = 0xC9764E;
    const stdMat = (color: number, rough = 0.55) => track(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 }));
    const inkOutline = track(new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));

    // Thêm 1 mesh kèm viền đen (inverted hull) → nét viền sticker trong 3D.
    const part = (geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], scale: [number, number, number] = [1, 1, 1], ry = 0, rz = 0, outline = true) => {
      track(geo);
      const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.scale.set(...scale); m.rotation.y = ry; m.rotation.z = rz;
      m.castShadow = true; m.receiveShadow = true; rig.add(m);
      if (outline) { const o = new THREE.Mesh(geo, inkOutline); o.position.copy(m.position); o.rotation.copy(m.rotation); o.scale.copy(m.scale).multiplyScalar(1.055); rig.add(o); }
      return m;
    };

    const buildPrimitiveGumi = () => {
      const furMat = stdMat(FUR);
      // Thân + đầu
      part(new THREE.SphereGeometry(0.56, 40, 32), furMat, [0, 0.62, 0], [1, 1.02, 0.92]);
      part(new THREE.SphereGeometry(0.5, 40, 32), furMat, [0, 1.16, 0.02], [1.04, 1, 0.98]);
      // Tai nhọn
      part(new THREE.ConeGeometry(0.2, 0.44, 26), furMat, [-0.3, 1.6, -0.02], [1, 1, 0.7], 0, 0.18);
      part(new THREE.ConeGeometry(0.2, 0.44, 26), furMat, [0.3, 1.6, -0.02], [1, 1, 0.7], 0, -0.18);
      // Tay que + bàn tròn
      part(new THREE.CapsuleGeometry(0.09, 0.26, 6, 14), furMat, [-0.52, 0.72, 0.06], [1, 1, 1], 0, 0.95);
      part(new THREE.CapsuleGeometry(0.09, 0.26, 6, 14), furMat, [0.52, 0.72, 0.06], [1, 1, 1], 0, -0.95);
      // Chân que + bàn chân
      part(new THREE.CapsuleGeometry(0.11, 0.14, 6, 14), furMat, [-0.24, 0.14, 0.12], [1, 1, 1]);
      part(new THREE.CapsuleGeometry(0.11, 0.14, 6, 14), furMat, [0.24, 0.14, 0.12], [1, 1, 1]);
      // Đuôi cuộn (ống cong)
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.42, 0.5, -0.2), new THREE.Vector3(0.74, 0.62, -0.28), new THREE.Vector3(0.86, 0.92, -0.24),
        new THREE.Vector3(0.72, 1.12, -0.16), new THREE.Vector3(0.5, 1.06, -0.12), new THREE.Vector3(0.5, 0.9, -0.12),
      ]);
      part(new THREE.TubeGeometry(curve, 40, 0.1, 12, false), furMat, [0, 0, 0], [1, 1, 1]);
      // Yếm bụng hồng (không viền)
      part(new THREE.SphereGeometry(0.36, 32, 24), stdMat(BELLY, 0.6), [0, 0.55, 0.42], [1, 1.18, 0.42], 0, 0, false);
      // Má hồng
      const cheekMat = stdMat(CHEEK, 0.7);
      part(new THREE.SphereGeometry(0.1, 20, 16), cheekMat, [-0.3, 1.06, 0.4], [1.3, 0.8, 0.5], 0, 0, false);
      part(new THREE.SphereGeometry(0.1, 20, 16), cheekMat, [0.3, 1.06, 0.4], [1.3, 0.8, 0.5], 0, 0, false);
      // Mũi
      part(new THREE.ConeGeometry(0.05, 0.07, 4), stdMat(NOSE, 0.5), [0, 1.08, 0.49], [1, 1, 1], Math.PI / 4, Math.PI, false);
      // Mắt: nhãn cầu trắng + con ngươi đen to + bắt sáng
      const white = stdMat(0xffffff, 0.35), ink = track(new THREE.MeshStandardMaterial({ color: INK, roughness: 0.25 })), shine = track(new THREE.MeshBasicMaterial({ color: 0xffffff }));
      for (const ex of [-0.185, 0.185]) {
        part(new THREE.SphereGeometry(0.135, 26, 20), white, [ex, 1.2, 0.4], [1, 1.12, 0.7], 0, 0, false);
        part(new THREE.SphereGeometry(0.1, 24, 18), ink, [ex, 1.17, 0.48], [1, 1.05, 0.7], 0, 0, false);
        const s = new THREE.Mesh(track(new THREE.SphereGeometry(0.032, 12, 10)), shine); s.position.set(ex + 0.04, 1.24, 0.55); rig.add(s);
      }
      // Chân mày xị (hộp đen nghiêng) — nét "ngán đời" đặc trưng
      const browMat = track(new THREE.MeshStandardMaterial({ color: INK, roughness: 0.4 }));
      part(new THREE.BoxGeometry(0.17, 0.032, 0.03), browMat, [-0.2, 1.36, 0.46], [1, 1, 1], 0, -0.5, false);
      part(new THREE.BoxGeometry(0.17, 0.032, 0.03), browMat, [0.2, 1.36, 0.46], [1, 1, 1], 0, 0.5, false);
    };

    // Ưu tiên model .glb thật; lỗi/thiếu → dựng bằng khối.
    let usingGlb = false;
    new GLTFLoader().load(
      `${import.meta.env.BASE_URL}models/gumi.glb`,
      (g) => {
        if (disposed) return;
        usingGlb = true;
        const m = g.scene;
        const bbox = new THREE.Box3().setFromObject(m); const sz = new THREE.Vector3(); bbox.getSize(sz); const ctr = new THREE.Vector3(); bbox.getCenter(ctr);
        const s = 1.7 / (Math.max(sz.x, sz.y, sz.z) || 1);
        m.scale.setScalar(s);
        m.position.set(-ctr.x * s, -bbox.min.y * s, -ctr.z * s); // đáy về y=0, canh giữa
        m.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
        rig.add(m);
      },
      undefined,
      () => { if (!disposed && !usingGlb) buildPrimitiveGumi(); }, // chưa có gumi.glb → bản tạm
    );
    // Nếu load lỗi đồng bộ hiếm gặp, vẫn đảm bảo có bản tạm sau một nhịp.
    const fallbackT = window.setTimeout(() => { if (!disposed && !usingGlb && rig.children.length === 0) buildPrimitiveGumi(); }, 1200);

    const resize = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(el);

    // Chạm để nhảy
    const onDown = () => { if (interactive) jump.current = 1; };
    if (interactive) { renderer.domElement.style.cursor = 'pointer'; renderer.domElement.addEventListener('pointerdown', onDown); }

    const clock = new THREE.Clock();
    const frameMin = q.fpsCap > 0 ? 1 / q.fpsCap : 0; let acc = 0;
    const loop = () => {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      acc += clock.getDelta();
      if (frameMin && acc < frameMin) return;
      acc = 0;
      const t = clock.getElapsedTime();
      // Nhún thở + đung đưa nhẹ khi rảnh
      const evolve = stateRef.current === 'tien_hoa';
      rig.rotation.y = Math.sin(t * 0.5) * 0.28;
      rig.rotation.z = Math.sin(t * 0.9) * 0.015;
      let y = Math.sin(t * 1.6) * 0.02;
      const sB = 1 + Math.sin(t * 1.6) * 0.015; // thở
      // Xung nhảy (tắt dần)
      if (jump.current > 0.001) {
        const j = jump.current; y += Math.sin((1 - j) * Math.PI) * 0.28 * (evolve ? 1.25 : 1);
        jump.current = Math.max(0, j - (frameMin || 0.016) * 1.7);
      }
      rig.position.y = y; rig.scale.setScalar(sB);
      groundShadow.material.opacity = 0.5 - y * 0.9; // nhảy cao → bóng nhỏ & mờ
      groundShadow.scale.setScalar(1 - y * 1.2);
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect(); window.clearTimeout(fallbackT);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      inkOutline.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [interactive]);

  return <div ref={host} aria-hidden="true" className={className} style={{ width: size, height: Math.round(size * 1.15) }} />;
}
