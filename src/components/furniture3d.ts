import * as THREE from 'three';

/* ===========================================================================
 * Dựng NỘI THẤT 3D cho từng món trong catalog (khớp id với lib/furniture.ts).
 * Mỗi món là một THREE.Group TỰ CHỨA (geometry + material riêng) để xoá là dispose sạch.
 * Gốc (origin) đặt ở TÂM ĐÁY (y=0) → map toạ độ sàn chuẩn hoá sang world dễ & chuẩn.
 * =========================================================================== */

export interface Pal3 { leaf: number[]; wood: number; lamp: number; rug: number; rugRim: number }

const std = (color: number, rough = 0.85, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
const emis = (color: number, e: number, inten = 0.55) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, emissive: e, emissiveIntensity: inten });
const B = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
  const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me;
};
const C = (rt: number, rb: number, h: number, seg: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
  const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me;
};
const S = (r: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
  const me = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); me.position.set(x, y, z); me.castShadow = true; return me;
};

function plant(pal: Pal3): THREE.Group {
  const g = new THREE.Group();
  const pot = std(0xCE7A50, 0.8);
  g.add(C(0.3, 0.22, 0.5, 24, pot, 0, 0.25, 0));
  g.add(C(0.36, 0.32, 0.1, 24, pot, 0, 0.5, 0));
  const blobs: [number, number, number, number, number][] = [
    [0, 0.82, 0, 0.3, 0], [-0.28, 0.64, 0.06, 0.26, 1], [0.28, 0.68, -0.05, 0.25, 1],
    [0.04, 1.04, 0.02, 0.3, 0], [-0.18, 0.92, -0.15, 0.22, 2], [0.2, 0.94, 0.14, 0.2, 2],
  ];
  for (const [x, y, z, r, ci] of blobs) { const leaf = S(r, std(pal.leaf[ci] ?? 0x5CB56B, 0.72), x, y, z); leaf.scale.y = 1.1; g.add(leaf); }
  return g;
}

function lamp(pal: Pal3): THREE.Group {
  const g = new THREE.Group();
  g.add(C(0.22, 0.26, 0.06, 20, std(0x8B5E3C, 0.5, 0.2), 0, 0.03, 0));
  g.add(C(0.04, 0.05, 1.3, 12, std(0xC9A24B, 0.35, 0.7), 0, 0.68, 0));
  g.add(C(0.3, 0.42, 0.42, 28, emis(0xFFE9BE, pal.lamp), 0, 1.45, 0));
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.3, 28), new THREE.MeshBasicMaterial({ color: 0xFFF3D6 }));
  cap.rotation.x = -Math.PI / 2; cap.position.y = 1.66; g.add(cap);
  return g;
}

function rug(pal: Pal3): THREE.Group {
  const g = new THREE.Group();
  const rim = C(1.15, 1.15, 0.04, 48, std(pal.rugRim, 1), 0, 0.02, 0); rim.castShadow = false; g.add(rim);
  const top = C(1.0, 1.0, 0.05, 48, std(pal.rug, 1), 0, 0.035, 0); top.castShadow = false; g.add(top);
  return g;
}

function cabinet(): THREE.Group {
  const g = new THREE.Group();
  g.add(B(0.9, 0.9, 0.5, std(0xE8C9A6, 0.7), 0, 0.45, 0));
  g.add(B(0.76, 0.76, 0.04, std(0xF5E0C6, 0.7), 0, 0.45, 0.26));
  g.add(S(0.04, std(0x9C6B4A, 0.4), 0.3, 0.45, 0.29));
  return g;
}

function counter(): THREE.Group {
  const g = new THREE.Group();
  g.add(B(2.2, 0.9, 0.6, std(0xCE9E6E, 0.7), 0, 0.45, 0));
  g.add(B(2.3, 0.08, 0.68, std(0xEAD9C2, 0.4, 0.1), 0, 0.92, 0));
  return g;
}

function fridge(): THREE.Group {
  const g = new THREE.Group();
  g.add(B(0.9, 1.9, 0.7, std(0xEDEFF2, 0.4, 0.3), 0, 0.95, 0));
  g.add(B(0.92, 0.04, 0.72, std(0xCDD3DA, 0.5), 0, 1.0, 0));
  g.add(B(0.06, 0.5, 0.06, std(0xB7C0C8, 0.4, 0.6), 0.36, 1.4, 0.36));
  g.add(B(0.06, 0.5, 0.06, std(0xB7C0C8, 0.4, 0.6), 0.36, 0.7, 0.36));
  return g;
}

function shelf(pal: Pal3): THREE.Group {
  const g = new THREE.Group();
  g.add(B(1.4, 0.1, 0.4, std(0xB78A5A, 0.6), 0, 0.9, 0));
  g.add(B(1.4, 0.1, 0.4, std(0xB78A5A, 0.6), 0, 0.5, 0));
  g.add(B(0.08, 0.9, 0.4, std(0x8A6A47, 0.6), -0.66, 0.45, 0));
  g.add(B(0.08, 0.9, 0.4, std(0x8A6A47, 0.6), 0.66, 0.45, 0));
  g.add(B(0.2, 0.26, 0.2, std(0xB23556, 0.6), -0.3, 1.05, 0));
  const leaf = S(0.14, std(pal.leaf[0] ?? 0x5FA870, 0.7), 0.3, 1.05, 0); leaf.scale.y = 1.2; g.add(leaf);
  return g;
}

function bistroTable(): THREE.Group {
  const g = new THREE.Group();
  g.add(C(0.05, 0.08, 0.7, 12, std(0x9C6B4A, 0.5), 0, 0.35, 0));
  g.add(C(0.4, 0.4, 0.06, 28, std(0xEAD9C2, 0.4), 0, 0.72, 0));
  return g;
}

function railing(): THREE.Group {
  const g = new THREE.Group();
  const w = std(0xD8A15E, 0.8);
  for (let x = -1.4; x <= 1.4001; x += 0.35) g.add(B(0.07, 1.0, 0.07, w, x, 0.5, 0));
  g.add(B(3.0, 0.12, 0.14, std(0xC98545, 0.8), 0, 1.02, 0));
  g.add(B(3.0, 0.1, 0.12, std(0xB4835A, 0.8), 0, 0.06, 0));
  return g;
}

function clock(): THREE.Group {
  const g = new THREE.Group();
  g.add(B(0.3, 1.4, 0.2, std(0x6E4B2E, 0.6), 0, 0.7, 0));
  const face = C(0.18, 0.18, 0.04, 28, std(0xFBF4EA, 0.8), 0, 1.15, 0.11); face.rotation.x = Math.PI / 2; g.add(face);
  const h1 = B(0.02, 0.12, 0.01, std(0x2A211A, 0.5), 0, 1.18, 0.14);
  const h2 = B(0.015, 0.09, 0.01, std(0xB3261E, 0.5), 0.05, 1.13, 0.14);
  g.add(h1); g.add(h2);
  return g;
}

function portrait(): THREE.Group {
  const g = new THREE.Group();
  g.add(B(0.9, 1.1, 0.06, std(0xE7A86A, 0.5), 0, 1.0, 0));
  g.add(B(0.74, 0.94, 0.02, std(0xFFE1B8, 0.8), 0, 1.0, 0.04));
  g.add(S(0.18, std(0xC9C9CF, 0.6), 0, 1.05, 0.05));
  g.add(B(0.06, 1.5, 0.06, std(0x8A6A47, 0.6), -0.3, 0.75, -0.2));
  g.add(B(0.06, 1.5, 0.06, std(0x8A6A47, 0.6), 0.3, 0.75, -0.2));
  g.add(B(0.06, 1.3, 0.06, std(0x8A6A47, 0.6), 0, 0.65, 0.25));
  return g;
}

function heartframe(): THREE.Group {
  const g = new THREE.Group();
  g.add(C(0.04, 0.05, 0.8, 10, std(0x9C6B4A, 0.5), 0, 0.4, 0));
  g.add(B(0.5, 0.5, 0.05, std(0xD98C50, 0.5), 0, 0.95, 0));
  g.add(B(0.38, 0.38, 0.03, std(0xFFF0E0, 0.8), 0, 0.95, 0.03));
  g.add(S(0.1, std(0xEDA9BB, 0.6), 0, 0.95, 0.06));
  return g;
}

function garland(): THREE.Group {
  const g = new THREE.Group();
  g.add(C(0.04, 0.04, 1.6, 8, std(0x9C6B4A, 0.5), -1.2, 0.8, 0));
  g.add(C(0.04, 0.04, 1.6, 8, std(0x9C6B4A, 0.5), 1.2, 0.8, 0));
  const cols = [0xFFD7E6, 0xC9ECFF, 0xD8F5D0, 0xFFF0C2, 0xE7DCFF];
  for (let i = 0; i < 9; i++) {
    const t = i / 8, x = -1.0 + t * 2.0, y = 1.5 - Math.sin(t * Math.PI) * 0.2;
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 3), std(cols[i % cols.length]!, 0.7));
    flag.position.set(x, y, 0); flag.rotation.x = Math.PI; g.add(flag);
  }
  return g;
}

/** id (khớp FURNITURE) → builder 3D. 'window' là KIẾN TRÚC trong 3D nên không có ở đây. */
export const FURNITURE_3D: Record<string, (pal: Pal3) => THREE.Group> = {
  plant, lamp, rug, cabinet, counter, fridge, shelf, bistroTable, railing, clock, portrait, heartframe, garland,
};

/** Giải phóng toàn bộ geometry + material của một món khi gỡ khỏi phòng. */
export function disposeDecor(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const m = mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(m)) m.forEach((x) => x.dispose()); else m?.dispose();
    }
  });
}
