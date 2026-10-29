import * as THREE from "three";

/**
 * Riti, the CeritaProject mascot, built from simple 3D shapes: a fluffy pink bear with a bow,
 * a little sprout on her head and a white heart in her arms. Browser only (loaded lazily).
 */

const COLORS = {
  fur: "#f3a6b5",
  furLight: "#f8c4cf",
  muzzle: "#fde6e1",
  innerEar: "#e8899c",
  dark: "#2b1912",
  pad: "#b9706a",
  blush: "#f47e98",
  heart: "#fff7f3",
  bow: "#f5e1cb",
  leaf: "#8eab62",
  tongue: "#f06d8a",
};

export type RitiOptions = { wave?: boolean };
export type RitiHandle = { tap: () => void; dispose: () => void };

/** Grainy texture so the fur looks soft instead of plastic. */
function furBump() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.random() * 145;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.35, -0.6, -0.1, -0.6, 0.18);
  s.bezierCurveTo(-0.6, 0.45, -0.35, 0.58, -0.18, 0.55);
  s.bezierCurveTo(-0.07, 0.53, 0, 0.45, 0, 0.36);
  s.bezierCurveTo(0, 0.45, 0.07, 0.53, 0.18, 0.55);
  s.bezierCurveTo(0.35, 0.58, 0.6, 0.45, 0.6, 0.18);
  s.bezierCurveTo(0.6, -0.1, 0.15, -0.35, 0, -0.5);
  return s;
}

export function mountRiti(container: HTMLElement, opts: RitiOptions = {}): RitiHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.touchAction = "pan-y";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.15, 7.6);
  camera.lookAt(0, 0.05, 0);

  scene.add(new THREE.HemisphereLight("#fff3ec", "#d79aa3", 1.5));
  const key = new THREE.DirectionalLight("#fff0e0", 2.2);
  key.position.set(2.5, 3.5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight("#ffd6e0", 0.7);
  fill.position.set(-3, 1, 2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight("#ffffff", 0.8);
  rim.position.set(0, 2, -4);
  scene.add(rim);

  const bump = furBump();
  const fur = (color: string) =>
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.9,
      sheen: 1,
      sheenColor: new THREE.Color("#ffe6ee"),
      sheenRoughness: 0.55,
      bumpMap: bump,
      bumpScale: 0.6,
    });
  const matte = (color: string, extra: THREE.MeshPhysicalMaterialParameters = {}) =>
    new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, ...extra });

  const M = {
    fur: fur(COLORS.fur),
    furLight: fur(COLORS.furLight),
    muzzle: fur(COLORS.muzzle),
    innerEar: fur(COLORS.innerEar),
    eye: matte(COLORS.dark, { roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }),
    shine: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
    nose: matte(COLORS.dark, { roughness: 0.25, clearcoat: 1 }),
    pad: matte(COLORS.pad, { roughness: 0.7 }),
    blush: new THREE.MeshBasicMaterial({
      color: COLORS.blush,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
    heart: fur(COLORS.heart),
    bow: matte(COLORS.bow, { roughness: 0.75, sheen: 0.6, sheenColor: new THREE.Color("#ffffff") }),
    leaf: matte(COLORS.leaf, { roughness: 0.55 }),
    tongue: matte(COLORS.tongue, { roughness: 0.4 }),
    shadow: new THREE.MeshBasicMaterial({
      color: "#5a2a2a",
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
    }),
  };

  const sphere = (r: number, seg = 48) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75));
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D) => {
    const m = new THREE.Mesh(geo, mat);
    parent.add(m);
    return m;
  };

  const bear = new THREE.Group();
  scene.add(bear);

  // Body
  const body = mesh(sphere(0.78), M.fur, bear);
  body.position.set(0, -0.6, 0);
  body.scale.set(1, 0.95, 0.85);

  // Head (big, chibi style) with everything on its surface
  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.05);
  bear.add(head);
  const R = new THREE.Vector3(0.9, 0.8, 0.8);
  mesh(sphere(1), M.fur, head).scale.copy(R);

  /** Puts `obj` on the head surface in direction (x, y, z), facing outwards. */
  const onHead = (obj: THREE.Object3D, x: number, y: number, z: number, lift = 0) => {
    const d = new THREE.Vector3(x, y, z).normalize();
    const t = 1 / Math.sqrt((d.x / R.x) ** 2 + (d.y / R.y) ** 2 + (d.z / R.z) ** 2);
    const p = d.clone().multiplyScalar(t);
    const n = new THREE.Vector3(p.x / R.x ** 2, p.y / R.y ** 2, p.z / R.z ** 2).normalize();
    obj.position.copy(p.add(n.clone().multiplyScalar(lift)));
    obj.lookAt(obj.position.clone().add(n));
    head.add(obj);
    return obj;
  };

  // Ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    onHead(ear, side * 0.72, 0.72, -0.05, -0.05);
    const outer = mesh(sphere(0.3), M.fur, ear);
    outer.scale.set(1, 1, 0.62);
    const inner = mesh(sphere(0.19), M.innerEar, ear);
    inner.position.z = 0.11;
    inner.scale.set(1, 1, 0.45);
  }

  // Muzzle, nose, smile, tongue
  const muzzle = mesh(sphere(0.3), M.muzzle, new THREE.Group());
  muzzle.scale.set(1.2, 0.85, 0.6);
  onHead(muzzle.parent!, 0, -0.22, 1, -0.08);
  const nose = mesh(sphere(0.085), M.nose, new THREE.Group());
  nose.scale.set(1.35, 0.95, 0.8);
  onHead(nose.parent!, 0, -0.08, 1, 0.07);
  const smile = new THREE.Group();
  onHead(smile, 0, -0.3, 1, 0.08);
  const mouth = mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 24, Math.PI), M.nose, smile);
  mouth.rotation.z = Math.PI;
  const tongue = mesh(sphere(0.04, 16), M.tongue, smile);
  tongue.position.set(0.02, -0.07, -0.01);
  tongue.scale.set(1, 0.8, 0.6);

  // Eyes with a little shine, and blush
  const eyes: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    onHead(eye, side * 0.36, 0.12, 0.92, -0.02);
    const ball = mesh(sphere(0.135, 32), M.eye, eye);
    ball.scale.set(0.9, 1.05, 0.5);
    const shine = mesh(sphere(0.045, 12), M.shine, eye);
    shine.position.set(0.04, 0.055, 0.06);
    const shine2 = mesh(sphere(0.02, 8), M.shine, eye);
    shine2.position.set(-0.04, -0.05, 0.06);
    eyes.push(eye);
    const blush = mesh(new THREE.CircleGeometry(0.12, 24), M.blush, new THREE.Group());
    blush.scale.set(1.3, 0.8, 1);
    onHead(blush.parent!, side * 0.62, -0.18, 0.75, 0.01);
  }

  // Bow on her right ear, sprout on top
  const bow = new THREE.Group();
  onHead(bow, -0.62, 0.66, 0.42, 0.07);
  bow.scale.setScalar(1.25);
  for (const side of [-1, 1]) {
    const loop = mesh(sphere(0.16, 24), M.bow, bow);
    loop.position.x = side * 0.17;
    loop.rotation.z = side * -0.35;
    loop.scale.set(1.5, 0.85, 0.5);
    const tail = mesh(new THREE.ConeGeometry(0.06, 0.28, 12), M.bow, bow);
    tail.position.set(side * 0.07, -0.17, 0);
    tail.rotation.z = side * 0.35 + Math.PI;
  }
  mesh(sphere(0.075, 16), M.bow, bow).scale.set(1, 1, 0.8);
  bow.rotation.z += 0.3;

  const sprout = new THREE.Group();
  sprout.position.set(0.05, R.y - 0.03, 0);
  head.add(sprout);
  const stem = mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.28, 8), M.leaf, sprout);
  stem.position.y = 0.13;
  for (const side of [-1, 1]) {
    const leaf = mesh(sphere(0.15, 24), M.leaf, sprout);
    leaf.position.set(side * 0.15, 0.3, 0);
    leaf.rotation.z = side * -0.5;
    leaf.scale.set(1.5, 0.45, 0.85);
  }

  // Heart in her arms
  const heart = mesh(
    new THREE.ExtrudeGeometry(heartShape(), {
      depth: 0.25,
      bevelEnabled: true,
      bevelSize: 0.12,
      bevelThickness: 0.12,
      bevelSegments: 6,
      curveSegments: 24,
    }),
    M.heart,
    bear,
  );
  heart.geometry.center();
  heart.position.set(0, -0.55, 0.72);
  heart.rotation.set(-0.1, 0, 0.12);
  heart.scale.setScalar(0.55);

  // Arms: a pivot at the shoulder so an arm can wave
  // Hugging: the paws rest on the sides of the heart. Waving: the arm points up and out.
  const DOWN = new THREE.Vector3(0, -1, 0);
  const hugQ = (side: number) =>
    new THREE.Quaternion().setFromUnitVectors(DOWN, new THREE.Vector3(side * -0.3, -0.55, 0.78).normalize());
  const waveQ = new THREE.Quaternion().setFromUnitVectors(DOWN, new THREE.Vector3(0.75, 0.62, 0.25).normalize());
  const arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.66, -0.12, 0.22);
    bear.add(pivot);
    const arm = mesh(new THREE.CapsuleGeometry(0.2, 0.42, 8, 24), M.fur, pivot);
    arm.position.y = -0.36;
    const paw = mesh(sphere(0.07, 12), M.pad, pivot);
    paw.position.set(0, -0.72, 0.1);
    paw.scale.set(1.2, 0.8, 0.5);
    pivot.quaternion.copy(hugQ(side));
    arms.push(pivot);
  }
  let waveMix = 0;

  // Legs with paw pads
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.45, -1.18, 0.32);
    leg.rotation.y = side * 0.25;
    bear.add(leg);
    const foot = mesh(sphere(0.32), M.fur, leg);
    foot.scale.set(0.95, 0.85, 1.15);
    const pad = mesh(
      new THREE.ExtrudeGeometry(heartShape(), {
        depth: 0.02,
        bevelEnabled: true,
        bevelSize: 0.03,
        bevelThickness: 0.02,
        bevelSegments: 3,
      }),
      M.pad,
      leg,
    );
    pad.geometry.center();
    pad.scale.setScalar(0.28);
    pad.position.set(0, -0.04, 0.37);
    pad.rotation.z = Math.PI;
    for (let i = -1; i <= 1; i++) {
      const bean = mesh(sphere(0.045, 12), M.pad, leg);
      bean.position.set(i * 0.1, 0.13 - Math.abs(i) * 0.03, 0.33);
      bean.scale.set(1, 1.1, 0.5);
    }
  }

  const shadow = mesh(new THREE.CircleGeometry(1.25, 48), M.shadow, scene);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.5;
  shadow.scale.set(1, 0.6, 1);

  // Sizing
  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // Interaction: drag to turn her around, tap to make her jump
  let spin = 0;
  let spinVel = 0;
  let dragging = false;
  let lastX = 0;
  let downX = 0;
  let jumpT = -1;
  const el = renderer.domElement;
  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = downX = e.clientX;
    el.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    spin += dx * 0.012;
    spinVel = dx * 0.012;
  };
  const onUp = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(e.clientX - downX) < 6) tap();
  };
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const clock = new THREE.Clock();
  let visible = true;
  let frame = 0;
  let nextBlink = 2.5;
  let lastT = 0;

  function tap() {
    jumpT = 0;
  }

  const render = () => {
    frame = requestAnimationFrame(render);
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(t - lastT, 0.05);
    lastT = t;

    if (!dragging) {
      spin += spinVel;
      spinVel *= 0.93;
      spin *= 0.97; // turn back to the front
    }
    const idle = reduced ? 0 : 1;
    bear.rotation.y = spin + idle * Math.sin(t * 0.6) * 0.22;
    bear.position.y = idle * Math.sin(t * 2) * 0.035;
    head.rotation.z = idle * Math.sin(t * 1.2) * 0.06;
    head.rotation.x = idle * Math.sin(t * 0.9) * 0.03;
    sprout.rotation.z = idle * Math.sin(t * 2.4) * 0.12;

    // Blink every few seconds
    if (!reduced && t > nextBlink) {
      const k = (t - nextBlink) / 0.14;
      const s = k < 1 ? 1 - Math.sin(k * Math.PI) * 0.9 : 1;
      for (const e of eyes) e.scale.y = s;
      if (k >= 1) nextBlink = t + 2.5 + Math.random() * 3;
    }

    // Wave with her left arm (the heart stays in the other arm)
    const waveArm = arms[1]!;
    if (opts.wave && !reduced) {
      const on = Math.sin(t * 0.8) > -0.3; // wave, pause, wave
      waveMix += ((on ? 1 : 0) - waveMix) * 0.12;
      waveArm.quaternion.slerpQuaternions(hugQ(1), waveQ, waveMix);
      waveArm.rotateZ(Math.sin(t * 9) * 0.35 * waveMix);
    }

    // Happy jump with a little squash
    if (jumpT >= 0) {
      jumpT += dt;
      const k = jumpT / 0.6;
      if (k >= 1) {
        jumpT = -1;
        bear.scale.set(1, 1, 1);
      } else {
        bear.position.y += Math.sin(k * Math.PI) * 0.5;
        const squash = 1 + Math.sin(k * Math.PI * 2) * 0.06;
        bear.scale.set(1 / squash, squash, 1 / squash);
        bear.rotation.y += k * Math.PI * 2;
      }
    }
    shadow.scale.setScalar(1 - bear.position.y * 0.4);
    shadow.scale.y *= 0.6;
    renderer.render(scene, camera);
  };
  const io = new IntersectionObserver(([entry]) => (visible = !!entry?.isIntersecting));
  io.observe(container);
  render();

  return {
    tap,
    dispose() {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      Object.values(M).forEach((m) => m.dispose());
      bump.dispose();
      renderer.dispose();
      el.remove();
    },
  };
}
