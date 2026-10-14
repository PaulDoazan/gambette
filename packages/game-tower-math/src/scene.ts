import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { Layer, SliceCut } from './engine';
import { stepBounce } from './motion';
import { createCalcTexture, createLabelCache } from './calcTexture';

// Constantes portées de threejs-tower-slice.
const BOX_HEIGHT = 1;
// Vitesse du pavé mobile, en unités monde / seconde. Déplacement basé sur le
// temps écoulé (cf. stepBounce) → vitesse constante quel que soit le framerate
// de l'appareil. Relevée à 9 u/s (×1,5 vs l'ancien 6) pour un jeu plus
// nerveux. Pour régler la difficulté partout, ajuster uniquement cette valeur.
const SPEED = 7.5;
// Borne du pas de temps (s) : évite un saut du pavé après un onglet resté en
// arrière-plan (requestAnimationFrame suspendu → premier dt énorme).
const MAX_DT = 1 / 20;
const BOUND = 7.5; // bord caméra (largeur ortho 15)
const CAMERA_WIDTH = 15;
const CAMERA_RISE_OFFSET = 6; // montée caméra : y < BOX_HEIGHT*(stack-2)+6
const BODY_MASS = 5; // l'original donne mass 5 à tous les pavés (falls=true constant)
const PRUNE_Y = -30; // sous ce niveau, chute/fantôme libéré (mémoire bornée, spec §5)
const MIN_OVERHANG = 1e-4; // découpe parfaite → pas de chute dégénérée

// Faces d'un BoxGeometry : [+x, -x, +y, -y, +z, -z] → calcul sur la face du dessus (+y).
const LABEL_FACES = [2];

// Palette de marque (thème Vuetify apps/web) : fond Oxford Blue, cubes en
// Coral Reef / Violets Are Blue / Cheerful Yellow alternés par étage.
const BACKGROUND_COLOR = '#00274B'; // Oxford Blue
const BOX_COLORS = ['#FF7D6D', '#9566FF', '#FFCC5C'];

// Le panneau quiz (calcul + boutons) occupe la droite de l'écran : on décale la
// fenêtre de la caméra vers la droite pour que la tour apparaisse à gauche.
const FRUSTUM_SHIFT = 2.5;

interface SceneBox {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshLambertMaterial[]>;
  body: CANNON.Body;
  direction: 'x' | 'z';
}

export interface TowerScene {
  reset(foundation: Layer, first: Layer): void;
  currentPositionOnAxis(): number; // position live du pavé mobile sur son axe
  texturePlacedTop(label: string): void; // calcul résolu sur le dessus du dernier pavé posé
  applyCut(cut: SliceCut): void; // scale + recentrage + chute physique + pavé suivant
  dropCurrent(): void; // raté / mauvais bouton : le pavé courant chute
  tick(): void; // déplacement, montée caméra, physique, rendu
  resize(width: number, height: number): void;
  dispose(): void;
}

export function createScene(canvas: HTMLCanvasElement): TowerScene {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;

  // Physique (port : gravité -10, NaiveBroadphase, 40 itérations).
  const world = new CANNON.World();
  world.gravity.set(0, -10, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  (world.solver as CANNON.GSSolver).iterations = 40;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND_COLOR);

  // Lumières d'origine (0.6/0.6) × π : three ≥ r155 est en éclairage physique.
  scene.add(new THREE.AmbientLight(0xffffff, 0.6 * Math.PI));
  const dir = new THREE.DirectionalLight(0xffffff, 0.6 * Math.PI);
  dir.position.set(15, 30, 0);
  scene.add(dir);

  // Caméra orthographique d'origine, fenêtre décalée à droite (tour à gauche).
  const camHeight = CAMERA_WIDTH * (height / width);
  const camera = new THREE.OrthographicCamera(
    -CAMERA_WIDTH / 2 + FRUSTUM_SHIFT,
    CAMERA_WIDTH / 2 + FRUSTUM_SHIFT,
    camHeight / 2,
    -camHeight / 2,
    1,
    1000,
  );
  camera.position.set(6, 6, 6);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height, false);

  // Textures des calculs résolus, partagées entre étages (même calcul → même texture).
  const textures = createLabelCache(createCalcTexture);

  const stack: SceneBox[] = []; // fondation + étages posés + pavé mobile (dernier)
  const overhangs: SceneBox[] = []; // chutes visibles synchronisées depuis la physique
  const ghosts: CANNON.Body[] = []; // bodies des étages posés (port : ils chutent invisiblement)
  let moving = false;
  let forwardX = 1;
  let forwardZ = 1;
  let disposed = false;
  let lastTime = 0; // horodatage (ms) de la frame précédente ; 0 = pas encore initialisé

  function makeBox(
    layer: { x: number; z: number; width: number; depth: number },
    y: number,
    colorIndex: number,
    direction: 'x' | 'z',
  ): SceneBox {
    const geometry = new THREE.BoxGeometry(layer.width, BOX_HEIGHT, layer.depth);
    const color = new THREE.Color(BOX_COLORS[colorIndex % BOX_COLORS.length]);
    const materials = Array.from({ length: 6 }, () => new THREE.MeshLambertMaterial({ color }));
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.position.set(layer.x, y, layer.z);
    scene.add(mesh);

    const shape = new CANNON.Box(new CANNON.Vec3(layer.width / 2, BOX_HEIGHT / 2, layer.depth / 2));
    const body = new CANNON.Body({ mass: BODY_MASS, shape });
    body.position.set(layer.x, y, layer.z);
    world.addBody(body);

    return { mesh, body, direction };
  }

  function disposeBox(box: SceneBox): void {
    scene.remove(box.mesh);
    box.mesh.geometry.dispose();
    box.mesh.material.forEach((m) => m.dispose());
    // Les textures appartiennent au cache (partagées entre étages) : libérées
    // une seule fois dans dispose(), pas par pavé.
    world.removeBody(box.body);
  }

  function top(): SceneBox {
    return stack[stack.length - 1] as SceneBox; // appelé seulement après reset()
  }

  return {
    reset(foundation: Layer, first: Layer): void {
      [...stack, ...overhangs].forEach(disposeBox);
      stack.length = 0;
      overhangs.length = 0;
      ghosts.forEach((b) => world.removeBody(b));
      ghosts.length = 0;
      stack.push(makeBox(foundation, 0, foundation.index, foundation.direction));
      stack.push(makeBox(first, BOX_HEIGHT * first.index, first.index, first.direction));
      camera.position.set(6, 6, 6);
      camera.lookAt(0, 0, 0);
      forwardX = 1;
      forwardZ = 1;
      moving = true;
    },

    currentPositionOnAxis(): number {
      const t = top();
      return t.direction === 'x' ? t.mesh.position.x : t.mesh.position.z;
    },

    texturePlacedTop(label: string): void {
      if (disposed) return;
      // Cible le dernier pavé POSÉ (sous le pavé mobile) : le calcul résolu vient
      // « tamponner » l'étage qu'on vient d'empiler. La couleur du pavé est gardée
      // (multipliée par le fond blanc de la texture).
      const placed = stack[stack.length - 2];
      if (!placed) return;
      const tex = textures.get(label);
      LABEL_FACES.forEach((i) => {
        const material = placed.mesh.material[i];
        if (!material) return;
        material.map = tex;
        material.needsUpdate = true;
      });
    },

    applyCut(cut: SliceCut): void {
      const t = top();
      const axis = t.direction;
      // Port de cutBox : scale du mesh + recentrage mesh/body.
      const fullSize =
        axis === 'x' ? t.mesh.geometry.parameters.width : t.mesh.geometry.parameters.depth;
      const newSize = axis === 'x' ? cut.newWidth : cut.newDepth;
      if (axis === 'x') {
        t.mesh.scale.x = newSize / fullSize;
        t.mesh.position.x += cut.shift;
        t.body.position.x += cut.shift;
      } else {
        t.mesh.scale.z = newSize / fullSize;
        t.mesh.position.z += cut.shift;
        t.body.position.z += cut.shift;
      }
      t.body.shapes = [];
      t.body.addShape(
        new CANNON.Box(new CANNON.Vec3(cut.newWidth / 2, BOX_HEIGHT / 2, cut.newDepth / 2)),
      );

      // L'étage posé garde son mesh ; son body devient un fantôme (port : jamais resynchronisé).
      ghosts.push(t.body);

      // Chute physique au niveau de l'étage tranché.
      const overhangY = t.mesh.position.y;
      if (cut.overhang.width > MIN_OVERHANG && cut.overhang.depth > MIN_OVERHANG) {
        overhangs.push(makeBox(cut.overhang, overhangY, cut.next.index - 1, axis));
      }

      // Pavé mobile suivant (axe alterné), forward réinitialisés (port).
      stack.push(
        makeBox(cut.next, BOX_HEIGHT * cut.next.index, cut.next.index, cut.next.direction),
      );
      forwardX = 1;
      forwardZ = 1;
    },

    dropCurrent(): void {
      const t = stack.pop();
      if (!t) return;
      // Téléporte le body (fantôme dérivé) sur le mesh, puis laisse la physique le faire chuter.
      // Divergence délibérée vs original (chute neutre) : le calcul reste sur le pavé qui tombe.
      t.body.position.set(t.mesh.position.x, t.mesh.position.y, t.mesh.position.z);
      t.body.velocity.setZero();
      t.body.angularVelocity.setZero();
      t.body.quaternion.set(0, 0, 0, 1);
      overhangs.push(t);
      moving = false;
    },

    tick(): void {
      if (disposed) return;
      // dt en secondes, borné ; première frame → pas nominal à 60 fps.
      const now = performance.now();
      const dt = lastTime === 0 ? 1 / 60 : Math.min((now - lastTime) / 1000, MAX_DT);
      lastTime = now;

      if (moving && stack.length >= 2) {
        const t = top();
        // Port de animation() : aller-retour entre les bords, montée caméra.
        // Déplacement basé sur dt → vitesse constante quel que soit le framerate.
        if (t.direction === 'x') {
          const s = stepBounce(t.mesh.position.x, forwardX, SPEED, BOUND, dt);
          forwardX = s.forward;
          t.mesh.position.x = s.pos;
          t.body.position.x = s.pos;
        } else {
          const s = stepBounce(t.mesh.position.z, forwardZ, SPEED, BOUND, dt);
          forwardZ = s.forward;
          t.mesh.position.z = s.pos;
          t.body.position.z = s.pos;
        }
        if (camera.position.y < BOX_HEIGHT * (stack.length - 2) + CAMERA_RISE_OFFSET) {
          camera.position.y += SPEED * dt;
        }
      }

      // Port de updatePhysics() : step + synchro mesh ← body des chutes.
      world.step(1 / 60);
      overhangs.forEach((o) => {
        o.mesh.position.set(o.body.position.x, o.body.position.y, o.body.position.z);
        o.mesh.quaternion.set(
          o.body.quaternion.x,
          o.body.quaternion.y,
          o.body.quaternion.z,
          o.body.quaternion.w,
        );
      });

      // Pruning mémoire (spec §5) : chutes et fantômes sous PRUNE_Y libérés.
      for (let i = overhangs.length - 1; i >= 0; i--) {
        const overhang = overhangs[i];
        if (overhang && overhang.body.position.y < PRUNE_Y) {
          disposeBox(overhang);
          overhangs.splice(i, 1);
        }
      }
      for (let i = ghosts.length - 1; i >= 0; i--) {
        const ghost = ghosts[i];
        if (ghost && ghost.position.y < PRUNE_Y) {
          world.removeBody(ghost);
          ghosts.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    },

    resize(w: number, h: number): void {
      const ch = CAMERA_WIDTH * (h / w);
      camera.left = -CAMERA_WIDTH / 2 + FRUSTUM_SHIFT;
      camera.right = CAMERA_WIDTH / 2 + FRUSTUM_SHIFT;
      camera.top = ch / 2;
      camera.bottom = -ch / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    },

    dispose(): void {
      disposed = true;
      [...stack, ...overhangs].forEach(disposeBox);
      stack.length = 0;
      overhangs.length = 0;
      ghosts.forEach((b) => world.removeBody(b));
      ghosts.length = 0;
      textures.dispose();
      // dispose() seul ne rend pas le contexte GL : sans ça, chaque partie en
      // laisse un actif jusqu'au GC (limite ~16 contextes, Safari mobile serré).
      renderer.forceContextLoss();
      renderer.dispose();
    },
  };
}
