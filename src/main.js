import * as THREE from 'three';

const canvas = document.querySelector('#game-canvas');
const ui = {
  score: document.querySelector('#score'),
  wave: document.querySelector('#wave'),
  hull: document.querySelector('#hull-meter'),
  charge: document.querySelector('#charge-meter'),
  messageTitle: document.querySelector('#message-title'),
  messageBody: document.querySelector('#message-body'),
  startPanel: document.querySelector('#start-panel'),
  startButton: document.querySelector('#start-button'),
  panelKicker: document.querySelector('.panel-kicker'),
  panelTitle: document.querySelector('.start-panel h1'),
  panelBody: document.querySelector('.start-panel p')
};

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 260);
camera.position.set(0, 23, 30);

const timer = new THREE.Timer();
timer.connect(document);
const raycaster = new THREE.Raycaster();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const pointer = new THREE.Vector2(0, 0);
const aimPoint = new THREE.Vector3(0, 0, 8);
const tmpVec = new THREE.Vector3();
const tmpVecTwo = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);

const WORLD_SIZE = 92;
const HALF_WORLD = WORLD_SIZE / 2;
const UFO_LIMIT = 52;

const MISSIONS = [
  {
    id: 'training-range',
    title: 'Level 1: Training Range',
    mapName: 'Amber Range',
    objective: 'Destroy 4 scout UFOs.',
    intro: 'Four slow scouts. Bigger flak radius. Learn the lead and keep the hull clean.',
    success: 'Range clear. Radar crew has opened the salt-flat relay road.',
    sky: 0x1b2630,
    fog: 0x9b8060,
    fogDensity: 0.011,
    ground: 0xb98b4f,
    groundDark: 0x8e6b42,
    scrub: 0x4a6a54,
    ridge: 0x6e5547,
    accent: 0xf3bd55,
    rocks: 38,
    cactus: 14,
    ridges: 14,
    extras: 'runway',
    objectiveType: 'destroy',
    destroyTarget: 4,
    ufoTotal: 4,
    maxActive: 1,
    spawnDelay: [1.2, 1.9],
    firstSpawn: 0.45,
    speed: [4.2, 5.6],
    altitude: [9.8, 15.5],
    drift: 0.8,
    hitAssist: 3.6,
    shellSpeed: 36,
    fireDelay: 0.22,
    beamDamage: 2.4,
    escapeDamage: 3,
    score: 150,
    maxUfoHp: 1
  },
  {
    id: 'relay-defense',
    title: 'Level 2: Relay Defense',
    mapName: 'Salt Relay',
    objective: 'Destroy 6 UFOs while at least one relay tower survives.',
    intro: 'The saucers will try to burn down the relay towers. Break their attack runs.',
    success: 'Relay held. The ridge network is back online.',
    sky: 0x182830,
    fog: 0x8fa7a0,
    fogDensity: 0.012,
    ground: 0xa4a58f,
    groundDark: 0x6f7f79,
    scrub: 0x3e6c64,
    ridge: 0x596765,
    accent: 0x7de0c5,
    rocks: 42,
    cactus: 8,
    ridges: 16,
    extras: 'relays',
    objectiveType: 'protect',
    destroyTarget: 6,
    ufoTotal: 7,
    maxActive: 2,
    spawnDelay: [1.7, 2.4],
    firstSpawn: 0.7,
    speed: [5.4, 7.4],
    altitude: [10.5, 17.5],
    drift: 1.2,
    hitAssist: 3.1,
    shellSpeed: 38,
    fireDelay: 0.24,
    beamDamage: 3.4,
    towerDamage: 9,
    escapeDamage: 4,
    score: 190,
    maxUfoHp: 1
  },
  {
    id: 'night-canyon',
    title: 'Level 3: Night Canyon',
    mapName: 'Cobalt Canyon',
    objective: 'Survive 65 seconds and destroy 8 raiders.',
    intro: 'Night raid. More movement, more pressure, but your flak still has assisted bursts.',
    success: 'Canyon sky is clear. Final score locked.',
    sky: 0x101923,
    fog: 0x27324a,
    fogDensity: 0.016,
    ground: 0x5d5e6a,
    groundDark: 0x3d4253,
    scrub: 0x315c61,
    ridge: 0x282d3d,
    accent: 0x9fc7ff,
    rocks: 54,
    cactus: 5,
    ridges: 24,
    extras: 'beacons',
    objectiveType: 'survive',
    destroyTarget: 8,
    survivalTime: 65,
    ufoTotal: 10,
    maxActive: 2,
    spawnDelay: [1.45, 2.1],
    firstSpawn: 0.7,
    speed: [6.5, 8.9],
    altitude: [12, 20],
    drift: 1.6,
    hitAssist: 2.8,
    shellSpeed: 40,
    fireDelay: 0.23,
    beamDamage: 3.8,
    escapeDamage: 5,
    score: 230,
    maxUfoHp: 2
  }
];

const game = {
  active: false,
  over: false,
  completed: false,
  score: 0,
  missionIndex: 0,
  hull: 100,
  fireCooldown: 0,
  missionSpawnLeft: 0,
  missionSpawnTimer: 0,
  missionKills: 0,
  missionElapsed: 0,
  missionBreak: 0,
  messageTimer: 0,
  shake: 0
};

const input = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  fire: false,
  pointerActive: false
};

const ufos = [];
const shells = [];
const sparks = [];
const towers = [];
let worldGroup = new THREE.Group();

const materials = {
  sand: new THREE.MeshStandardMaterial({ color: 0xb98b4f, roughness: 0.9, flatShading: true }),
  darkerSand: new THREE.MeshStandardMaterial({ color: 0x8e6b42, roughness: 0.95, flatShading: true }),
  scrub: new THREE.MeshStandardMaterial({ color: 0x4a6a54, roughness: 0.85, flatShading: true }),
  mountain: new THREE.MeshStandardMaterial({ color: 0x6e5547, roughness: 0.92, flatShading: true }),
  tankBody: new THREE.MeshStandardMaterial({ color: 0x536f60, metalness: 0.12, roughness: 0.7, flatShading: true }),
  tankDark: new THREE.MeshStandardMaterial({ color: 0x263832, metalness: 0.08, roughness: 0.82, flatShading: true }),
  tankTrim: new THREE.MeshStandardMaterial({ color: 0xb7aa72, metalness: 0.16, roughness: 0.62, flatShading: true }),
  shell: new THREE.MeshStandardMaterial({ color: 0xffe6a1, emissive: 0xf3bd55, emissiveIntensity: 2.5, roughness: 0.38 }),
  ufoHull: new THREE.MeshStandardMaterial({ color: 0xa9b3a9, metalness: 0.65, roughness: 0.3, flatShading: true }),
  ufoDark: new THREE.MeshStandardMaterial({ color: 0x3c4748, metalness: 0.55, roughness: 0.42, flatShading: true }),
  ufoGlass: new THREE.MeshStandardMaterial({
    color: 0x9fe8d1,
    emissive: 0x2bc8aa,
    emissiveIntensity: 0.8,
    metalness: 0.1,
    roughness: 0.12,
    flatShading: true
  }),
  tower: new THREE.MeshStandardMaterial({ color: 0x728d85, metalness: 0.18, roughness: 0.58, flatShading: true }),
  towerLit: new THREE.MeshStandardMaterial({ color: 0xb6fff0, emissive: 0x65e1c8, emissiveIntensity: 1.2, roughness: 0.3 }),
  beam: new THREE.MeshBasicMaterial({
    color: 0x8fffe2,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }),
  spark: new THREE.MeshBasicMaterial({ color: 0xffde84, transparent: true, opacity: 1 })
};

setupLights();
scene.add(worldGroup);
buildWorld(currentMission());
const tank = createTank();
scene.add(tank.group);
bindInput();
resize();
setMissionPanel(false);
window.__skybreakDebug = {
  getState: () => ({
    active: game.active,
    over: game.over,
    completed: game.completed,
    score: game.score,
    missionIndex: game.missionIndex,
    missionTitle: currentMission().title,
    hull: game.hull,
    kills: game.missionKills,
    spawnLeft: game.missionSpawnLeft,
    tank: {
      x: Number(tank.group.position.x.toFixed(2)),
      z: Number(tank.group.position.z.toFixed(2)),
      yaw: Number(tank.group.rotation.y.toFixed(2))
    },
    ufos: ufos.length,
    targets: ufos.map((ufo) => {
      const projected = ufo.group.position.clone().project(camera);
      return {
        x: (projected.x * 0.5 + 0.5) * window.innerWidth,
        y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
        hp: ufo.hp
      };
    }),
    shells: shells.length,
    sparks: sparks.length,
    towers: towers.map((tower) => Math.round(tower.health))
  })
};
requestAnimationFrame(tick);

function currentMission() {
  return MISSIONS[game.missionIndex];
}

function setupLights() {
  const hemi = new THREE.HemisphereLight(0xb7e6ff, 0xd4a561, 1.65);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffdaa0, 2.35);
  sun.position.set(-28, 46, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 110;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x7de0c5, 1.2);
  rim.position.set(32, 20, -30);
  scene.add(rim);
}

function applyMissionPalette(mission) {
  scene.background = new THREE.Color(mission.sky);
  scene.fog = new THREE.FogExp2(mission.fog, mission.fogDensity);
  materials.sand.color.setHex(mission.ground);
  materials.darkerSand.color.setHex(mission.groundDark);
  materials.scrub.color.setHex(mission.scrub);
  materials.mountain.color.setHex(mission.ridge);
  materials.shell.emissive.setHex(mission.accent);
}

function buildWorld(mission) {
  applyMissionPalette(mission);
  scene.remove(worldGroup);
  disposeGroup(worldGroup);
  worldGroup = new THREE.Group();
  scene.add(worldGroup);
  towers.length = 0;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 12, 12), materials.sand);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  worldGroup.add(ground);

  const grid = new THREE.GridHelper(WORLD_SIZE, 18, 0x6c5a3d, 0x8c724d);
  grid.position.y = 0.025;
  grid.material.transparent = true;
  grid.material.opacity = 0.12;
  worldGroup.add(grid);

  for (let i = 0; i < mission.rocks; i += 1) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(random(0.22, 1.22), 0),
      Math.random() > 0.55 ? materials.darkerSand : materials.mountain
    );
    rock.position.set(random(-HALF_WORLD, HALF_WORLD), random(0.08, 0.28), random(-HALF_WORLD, HALF_WORLD));
    if (rock.position.length() < 9) rock.position.multiplyScalar(2.5);
    rock.rotation.set(random(0, Math.PI), random(0, Math.PI), random(0, Math.PI));
    rock.scale.y = random(0.45, 1.1);
    rock.castShadow = true;
    rock.receiveShadow = true;
    worldGroup.add(rock);
  }

  for (let i = 0; i < mission.cactus; i += 1) {
    const cactus = createCactus(random(0.75, 1.55));
    cactus.position.set(random(-HALF_WORLD, HALF_WORLD), 0, random(-HALF_WORLD, HALF_WORLD));
    if (cactus.position.length() < 12) cactus.position.normalize().multiplyScalar(random(14, 26));
    cactus.rotation.y = random(0, Math.PI * 2);
    worldGroup.add(cactus);
  }

  for (let i = 0; i < mission.ridges; i += 1) {
    const ridge = new THREE.Mesh(
      new THREE.ConeGeometry(random(5, 12), random(8, 22), 5),
      materials.mountain
    );
    const angle = (i / mission.ridges) * Math.PI * 2 + random(-0.08, 0.08);
    const radius = random(58, 86);
    ridge.position.set(Math.sin(angle) * radius, ridge.geometry.parameters.height * 0.38 - 1.5, Math.cos(angle) * radius);
    ridge.rotation.y = random(0, Math.PI);
    ridge.scale.x = random(0.8, 1.9);
    ridge.scale.z = random(0.7, 1.6);
    ridge.receiveShadow = true;
    worldGroup.add(ridge);
  }

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(8.4, 9.2, 0.32, 8), materials.darkerSand);
  pad.position.y = 0.16;
  pad.receiveShadow = true;
  worldGroup.add(pad);

  if (mission.extras === 'runway') buildRunway();
  if (mission.extras === 'relays') buildRelayMap();
  if (mission.extras === 'beacons') buildBeaconMap();
}

function buildRunway() {
  const strip = new THREE.Mesh(new THREE.BoxGeometry(5, 0.08, 32), materials.darkerSand);
  strip.position.set(-18, 0.05, 8);
  strip.rotation.y = -0.5;
  strip.receiveShadow = true;
  worldGroup.add(strip);

  for (let i = 0; i < 5; i += 1) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.45), materials.tankTrim);
    marker.position.set(-18 + i * 2.4, 0.11, -5 + i * 4.2);
    marker.rotation.y = -0.5;
    worldGroup.add(marker);
  }
}

function buildRelayMap() {
  [
    new THREE.Vector3(-15, 0, -14),
    new THREE.Vector3(17, 0, -10),
    new THREE.Vector3(2, 0, 18)
  ].forEach((position, index) => {
    const tower = createRelayTower(index);
    tower.group.position.copy(position);
    worldGroup.add(tower.group);
    towers.push(tower);
  });
}

function buildBeaconMap() {
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    const beacon = new THREE.Group();
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 3.4, 6), materials.tower);
    mast.position.y = 1.7;
    mast.castShadow = true;
    beacon.add(mast);

    const light = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), materials.towerLit);
    light.position.y = 3.65;
    beacon.add(light);

    const lamp = new THREE.PointLight(0x9fc7ff, 1.1, 14);
    lamp.position.y = 3.7;
    beacon.add(lamp);

    beacon.position.set(Math.sin(angle) * 25, 0, Math.cos(angle) * 25);
    worldGroup.add(beacon);
  }
}

function createRelayTower(index) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.45, 0.35, 8), materials.darkerSand);
  base.position.y = 0.18;
  base.receiveShadow = true;
  group.add(base);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 5.2, 6), materials.tower);
  mast.position.y = 2.8;
  mast.castShadow = true;
  group.add(mast);

  const dish = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.45, 10), materials.towerLit);
  dish.position.set(0, 5.5, 0);
  dish.rotation.x = Math.PI / 2.8;
  dish.castShadow = true;
  group.add(dish);

  const light = new THREE.PointLight(0x7de0c5, 1.4, 16);
  light.position.y = 5.5;
  group.add(light);

  return {
    group,
    health: 100,
    index
  };
}

function createCactus(scale) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 2.3, 6), materials.scrub);
  trunk.position.y = 1.15;
  trunk.castShadow = true;
  group.add(trunk);

  const armGeo = new THREE.CylinderGeometry(0.14, 0.17, 0.95, 6);
  const left = new THREE.Mesh(armGeo, materials.scrub);
  left.position.set(-0.38, 1.35, 0);
  left.rotation.z = Math.PI / 2.8;
  left.castShadow = true;
  group.add(left);

  const right = new THREE.Mesh(armGeo, materials.scrub);
  right.position.set(0.42, 1.75, 0);
  right.rotation.z = -Math.PI / 2.7;
  right.castShadow = true;
  group.add(right);

  group.scale.setScalar(scale);
  return group;
}

function createTank() {
  const group = new THREE.Group();
  group.position.set(0, 0.34, 0);

  const trackGeo = new THREE.BoxGeometry(1.2, 0.52, 2.5);
  const leftTrack = new THREE.Mesh(trackGeo, materials.tankDark);
  leftTrack.position.set(-0.8, 0.3, 0);
  leftTrack.castShadow = true;
  leftTrack.receiveShadow = true;
  group.add(leftTrack);

  const rightTrack = leftTrack.clone();
  rightTrack.position.x = 0.8;
  group.add(rightTrack);

  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.82, 2.72), materials.tankBody);
  hull.position.y = 0.72;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.18, 1.5, 4), materials.tankTrim);
  nose.position.set(0, 0.78, 1.33);
  nose.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  nose.scale.y = 0.46;
  nose.castShadow = true;
  group.add(nose);

  const turret = new THREE.Group();
  turret.position.y = 1.22;
  group.add(turret);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.92, 0.5, 8), materials.tankBody);
  cap.castShadow = true;
  cap.receiveShadow = true;
  turret.add(cap);

  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 2.65), materials.tankTrim);
  barrel.position.set(0, 0.15, 1.62);
  barrel.rotation.x = -0.18;
  barrel.castShadow = true;
  turret.add(barrel);

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.34, 8), materials.tankDark);
  muzzle.position.set(0, 0.34, 2.92);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.castShadow = true;
  turret.add(muzzle);

  const light = new THREE.PointLight(0xf3bd55, 0.7, 8);
  light.position.set(0, 0.55, 2.75);
  turret.add(light);

  return { group, turret, muzzle };
}

function createUfo(mission) {
  const group = new THREE.Group();
  const radius = random(1.55, 2.1);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.02, radius * 1.45, 0.42, 12), materials.ufoHull);
  body.castShadow = true;
  group.add(body);

  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.36, radius * 0.92, 0.28, 12), materials.ufoDark);
  skirt.position.y = -0.22;
  skirt.castShadow = true;
  group.add(skirt);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.58, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), materials.ufoGlass);
  dome.position.y = 0.22;
  dome.castShadow = true;
  group.add(dome);

  const glow = new THREE.PointLight(0x7de0c5, 1.7, 12);
  glow.position.y = -0.3;
  group.add(glow);

  const beam = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.7, 9, 10, 1, true), materials.beam.clone());
  beam.position.y = -4.7;
  beam.rotation.x = Math.PI;
  beam.visible = false;
  group.add(beam);

  const side = Math.floor(random(0, 4));
  const altitude = random(mission.altitude[0], mission.altitude[1]);
  const speed = random(mission.speed[0], mission.speed[1]);
  const pos = new THREE.Vector3();
  const vel = new THREE.Vector3();

  if (side === 0) {
    pos.set(-UFO_LIMIT, altitude, random(-30, 30));
    vel.set(speed, random(-0.16, 0.16), random(-mission.drift, mission.drift));
  } else if (side === 1) {
    pos.set(UFO_LIMIT, altitude, random(-30, 30));
    vel.set(-speed, random(-0.16, 0.16), random(-mission.drift, mission.drift));
  } else if (side === 2) {
    pos.set(random(-30, 30), altitude, -UFO_LIMIT);
    vel.set(random(-mission.drift, mission.drift), random(-0.16, 0.16), speed);
  } else {
    pos.set(random(-30, 30), altitude, UFO_LIMIT);
    vel.set(random(-mission.drift, mission.drift), random(-0.16, 0.16), -speed);
  }

  group.position.copy(pos);
  scene.add(group);

  return {
    group,
    beam,
    velocity: vel,
    radius: radius * 1.55,
    hitRadius: radius * 1.55 + mission.hitAssist,
    hp: mission.maxUfoHp > 1 && Math.random() > 0.55 ? 2 : 1,
    wobble: random(0, Math.PI * 2),
    value: mission.score
  };
}

function bindInput() {
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', (event) => {
    if (isGameKey(event.code)) event.preventDefault();
    setKey(event.code, true);
  });
  window.addEventListener('keyup', (event) => {
    if (isGameKey(event.code)) event.preventDefault();
    setKey(event.code, false);
  });

  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerdown', (event) => {
    updatePointer(event);
    input.pointerActive = true;
    input.fire = true;
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  canvas.addEventListener('pointerup', (event) => {
    input.fire = false;
    event.preventDefault();
  });
  canvas.addEventListener('pointercancel', () => {
    input.fire = false;
    input.pointerActive = false;
  });
  canvas.addEventListener('lostpointercapture', () => {
    input.fire = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  document.querySelectorAll('[data-hold]').forEach((button) => {
    const control = button.dataset.hold;
    const release = () => {
      input[control] = false;
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      input[control] = true;
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });

  const fireButton = document.querySelector('[data-fire]');
  const stopFire = () => {
    input.fire = false;
  };
  fireButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    input.fire = true;
    fireButton.setPointerCapture(event.pointerId);
  });
  fireButton.addEventListener('pointerup', stopFire);
  fireButton.addEventListener('pointercancel', stopFire);
  fireButton.addEventListener('lostpointercapture', stopFire);

  ui.startButton.addEventListener('click', () => {
    if (game.over || game.completed) resetCampaign();
    startMission();
  });
}

function isGameKey(code) {
  return ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'Enter'].includes(code);
}

function setKey(code, value) {
  if (code === 'KeyW' || code === 'ArrowUp') input.forward = value;
  if (code === 'KeyS' || code === 'ArrowDown') input.backward = value;
  if (code === 'KeyA' || code === 'ArrowLeft') input.left = value;
  if (code === 'KeyD' || code === 'ArrowRight') input.right = value;
  if (code === 'Space' || code === 'Enter') input.fire = value;
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  input.pointerActive = true;
}

function startMission() {
  const mission = currentMission();
  game.active = true;
  game.over = false;
  game.completed = false;
  ui.startPanel.classList.add('is-hidden');
  showMessage(mission.title, mission.intro);
  beginMission(mission);
}

function resetCampaign() {
  game.score = 0;
  game.missionIndex = 0;
  game.hull = 100;
  game.completed = false;
  game.over = false;
  ui.startButton.textContent = 'Start Mission';
  resetMissionState();
  buildWorld(currentMission());
  setMissionPanel(false);
}

function resetMissionState() {
  game.fireCooldown = 0;
  game.missionSpawnLeft = 0;
  game.missionSpawnTimer = 0;
  game.missionKills = 0;
  game.missionElapsed = 0;
  game.missionBreak = 0;
  game.messageTimer = 0;
  game.shake = 0;

  [...ufos, ...shells, ...sparks].forEach((entity) => {
    scene.remove(entity.group ?? entity.mesh);
  });
  ufos.length = 0;
  shells.length = 0;
  sparks.length = 0;

  tank.group.position.set(0, 0.34, 0);
  tank.group.rotation.set(0, 0, 0);
  tank.turret.rotation.set(0, 0, 0);
  input.fire = false;
  input.forward = false;
  input.backward = false;
  input.left = false;
  input.right = false;
  updateHud();
}

function beginMission(mission) {
  resetMissionState();
  buildWorld(mission);
  game.active = true;
  game.missionSpawnLeft = mission.ufoTotal;
  game.missionSpawnTimer = mission.firstSpawn;
  showMessage(mission.title, mission.objective);
  updateHud();
}

function completeMission() {
  const mission = currentMission();
  game.active = false;
  game.missionBreak = 0;
  clearThreats();
  showMessage('Objective complete', mission.success);

  if (game.missionIndex < MISSIONS.length - 1) {
    game.missionIndex += 1;
    game.hull = Math.min(100, game.hull + 20);
    buildWorld(currentMission());
    setMissionPanel(true);
  } else {
    game.completed = true;
    ui.startButton.textContent = 'Restart Campaign';
    ui.panelKicker.textContent = 'Campaign complete';
    ui.panelTitle.textContent = 'Skybreak Secured';
    ui.panelBody.textContent = 'Final score: ' + game.score + '. All mission maps are clear.';
    ui.startPanel.classList.remove('is-hidden');
  }
}

function clearThreats() {
  [...ufos, ...shells].forEach((entity) => scene.remove(entity.group ?? entity.mesh));
  ufos.length = 0;
  shells.length = 0;
}

function setMissionPanel(isNextMission) {
  const mission = currentMission();
  ui.panelKicker.textContent = isNextMission ? 'Next mission' : mission.mapName;
  ui.panelTitle.textContent = mission.title;
  ui.panelBody.textContent = mission.objective + ' ' + mission.intro;
  ui.startButton.textContent = isNextMission ? 'Launch ' + mission.title.replace('Level ', 'L') : 'Start Mission';
  ui.startPanel.classList.remove('is-hidden');
}

function shootShell() {
  const mission = currentMission();
  if (game.fireCooldown > 0 || !game.active || game.over) return;

  const worldYaw = tank.group.rotation.y + tank.turret.rotation.y;
  const origin = new THREE.Vector3(0, 0.28, 3.08);
  tank.muzzle.localToWorld(origin);
  const assistedTarget = findAssistedTarget(origin, worldYaw, mission);

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.31, 8, 6), materials.shell);
  mesh.position.copy(origin);
  mesh.castShadow = true;
  scene.add(mesh);

  let direction;
  if (assistedTarget) {
    const lead = assistedTarget.group.position.clone().addScaledVector(assistedTarget.velocity, 0.42);
    lead.y += 0.45;
    direction = lead.sub(origin).normalize();
  } else {
    direction = new THREE.Vector3(Math.sin(worldYaw) * 0.72, 0.68, Math.cos(worldYaw) * 0.72).normalize();
  }

  shells.push({
    mesh,
    velocity: direction.multiplyScalar(mission.shellSpeed),
    life: 2.25,
    radius: 0.55,
    target: assistedTarget
  });

  game.fireCooldown = mission.fireDelay;
  game.shake = Math.max(game.shake, 0.09);
  spawnSparks(origin, new THREE.Color(0xffe2a0), 7, 0.42);
}

function findAssistedTarget(origin, worldYaw, mission) {
  const aimDirection = new THREE.Vector3(Math.sin(worldYaw), 0, Math.cos(worldYaw));
  let best = null;
  let bestScore = Infinity;
  for (const ufo of ufos) {
    const toUfo = ufo.group.position.clone().sub(origin);
    const flat = new THREE.Vector3(toUfo.x, 0, toUfo.z);
    if (flat.lengthSq() < 0.001) continue;
    flat.normalize();
    const angle = Math.acos(THREE.MathUtils.clamp(aimDirection.dot(flat), -1, 1));
    const distance = toUfo.length();
    const allowance = game.missionIndex === 0 ? 0.75 : 0.56;
    if (angle < allowance && distance < 74) {
      const score = angle * 36 + distance * 0.22;
      if (score < bestScore) {
        best = ufo;
        bestScore = score;
      }
    }
  }
  return best;
}

function tick(timestamp) {
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), 0.033);
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function update(dt) {
  updateAimPoint();
  if (game.active && !game.over) {
    game.missionElapsed += dt;
    updateTank(dt);
    updateMission(dt);
    if (input.fire && game.fireCooldown <= 0) shootShell();
  } else {
    updateTurretIdle(dt);
  }

  game.fireCooldown = Math.max(0, game.fireCooldown - dt);
  game.messageTimer = Math.max(0, game.messageTimer - dt);
  game.shake = Math.max(0, game.shake - dt * 0.9);

  updateShells(dt);
  updateUfos(dt);
  updateSparks(dt);
  updateCamera(dt);
  updateHud();
}

function updateAimPoint() {
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.ray.intersectPlane(aimPlane, tmpVec);
  if (hit) aimPoint.copy(hit);
}

function updateTank(dt) {
  const turn = (Number(input.left) - Number(input.right)) * 2.65 * dt;
  tank.group.rotation.y += turn;

  const drive = Number(input.forward) - Number(input.backward);
  const forward = tmpVec.set(Math.sin(tank.group.rotation.y), 0, Math.cos(tank.group.rotation.y));
  const speed = drive > 0 ? 15 : 9.5;
  tank.group.position.addScaledVector(forward, drive * speed * dt);
  tank.group.position.x = THREE.MathUtils.clamp(tank.group.position.x, -HALF_WORLD + 4, HALF_WORLD - 4);
  tank.group.position.z = THREE.MathUtils.clamp(tank.group.position.z, -HALF_WORLD + 4, HALF_WORLD - 4);

  const dx = aimPoint.x - tank.group.position.x;
  const dz = aimPoint.z - tank.group.position.z;
  const desiredWorldYaw = Math.atan2(dx, dz);
  const localYaw = angleDelta(tank.group.rotation.y, desiredWorldYaw);
  tank.turret.rotation.y = dampAngle(tank.turret.rotation.y, localYaw, 13, dt);
  tank.group.position.y = 0.34 + Math.sin(timer.getElapsed() * 8 + tank.group.position.length() * 0.2) * Math.abs(drive) * 0.025;
}

function updateTurretIdle(dt) {
  tank.turret.rotation.y = dampAngle(tank.turret.rotation.y, Math.sin(timer.getElapsed() * 0.4) * 0.28, 4, dt);
}

function updateMission(dt) {
  const mission = currentMission();
  if (game.missionSpawnLeft > 0 && ufos.length < mission.maxActive) {
    game.missionSpawnTimer -= dt;
    if (game.missionSpawnTimer <= 0) {
      ufos.push(createUfo(mission));
      game.missionSpawnLeft -= 1;
      game.missionSpawnTimer = random(mission.spawnDelay[0], mission.spawnDelay[1]);
    }
  }

  const killComplete = game.missionKills >= mission.destroyTarget;
  const survivalComplete = mission.objectiveType === 'survive' && game.missionElapsed >= mission.survivalTime && game.missionKills >= mission.destroyTarget;
  if ((mission.objectiveType !== 'survive' && killComplete) || survivalComplete) {
    completeMission();
  } else if (game.missionSpawnLeft <= 0 && ufos.length === 0 && game.missionKills < mission.destroyTarget) {
    endGame('Objective failed', 'Too many UFOs escaped before the mission target was complete.');
  }
}

function updateShells(dt) {
  for (let i = shells.length - 1; i >= 0; i -= 1) {
    const shell = shells[i];
    shell.life -= dt;

    if (shell.target && ufos.includes(shell.target)) {
      const desired = shell.target.group.position.clone().addScaledVector(shell.target.velocity, 0.18).sub(shell.mesh.position).normalize();
      shell.velocity.lerp(desired.multiplyScalar(shell.velocity.length()), 0.035);
    }

    shell.velocity.y -= 1.15 * dt;
    shell.mesh.position.addScaledVector(shell.velocity, dt);
    shell.mesh.scale.setScalar(1 + Math.sin(timer.getElapsed() * 28) * 0.08);

    let hitIndex = -1;
    for (let u = 0; u < ufos.length; u += 1) {
      const ufo = ufos[u];
      if (shell.mesh.position.distanceTo(ufo.group.position) < ufo.hitRadius + shell.radius) {
        hitIndex = u;
        break;
      }
    }

    if (hitIndex >= 0) {
      const ufo = ufos[hitIndex];
      ufo.hp -= 1;
      spawnSparks(shell.mesh.position, new THREE.Color(0xffe6a1), 18, 1.35);
      scene.remove(shell.mesh);
      shells.splice(i, 1);

      if (ufo.hp <= 0) {
        destroyUfo(hitIndex);
      } else {
        ufo.group.scale.multiplyScalar(0.92);
        ufo.velocity.multiplyScalar(1.08);
      }
    } else if (shell.life <= 0 || shell.mesh.position.y > 48 || shell.mesh.position.length() > 105) {
      scene.remove(shell.mesh);
      shells.splice(i, 1);
    }
  }
}

function updateUfos(dt) {
  const mission = currentMission();
  for (let i = ufos.length - 1; i >= 0; i -= 1) {
    const ufo = ufos[i];
    ufo.group.position.addScaledVector(ufo.velocity, dt);
    ufo.group.position.y += Math.sin(timer.getElapsed() * 2.2 + ufo.wobble) * dt * 0.48;
    ufo.group.rotation.y += dt * 1.85;
    ufo.group.rotation.z = Math.sin(timer.getElapsed() * 2 + ufo.wobble) * 0.08;

    const towerTarget = nearestLiveTower(ufo.group.position);
    const towerDistance = towerTarget ? distanceXZ(ufo.group.position, towerTarget.group.position) : Infinity;
    const tankDistance = distanceXZ(ufo.group.position, tank.group.position);
    const attackingTower = mission.objectiveType === 'protect' && towerTarget && towerDistance < 8.4;
    const attackingTank = tankDistance < 8.5 && ufo.group.position.y < 22.5 && !attackingTower;
    ufo.beam.visible = attackingTank || attackingTower;

    if (attackingTower) {
      pulseBeam(ufo);
      towerTarget.health -= mission.towerDamage * dt;
      towerTarget.group.scale.y = THREE.MathUtils.lerp(0.82, 1, Math.max(0, towerTarget.health / 100));
      if (Math.random() < dt * 8) {
        spawnSparks(towerTarget.group.position.clone().add(new THREE.Vector3(random(-0.6, 0.6), 3.3, random(-0.6, 0.6))), new THREE.Color(0x7de0c5), 2, 0.55);
      }
      if (allTowersDestroyed()) endGame('Relay lost', 'All relay towers were burned down. Restart and intercept saucers earlier.');
    } else if (attackingTank) {
      pulseBeam(ufo);
      game.hull -= mission.beamDamage * dt;
      game.shake = Math.max(game.shake, 0.18);
      if (Math.random() < dt * 10) {
        spawnSparks(tank.group.position.clone().add(new THREE.Vector3(random(-1.5, 1.5), 0.6, random(-1.5, 1.5))), new THREE.Color(0x7de0c5), 2, 0.55);
      }
      if (game.hull <= 0) endGame('Tank disabled', 'The hull failed under beam fire. Restart the campaign when ready.');
    }

    if (Math.abs(ufo.group.position.x) > UFO_LIMIT + 14 || Math.abs(ufo.group.position.z) > UFO_LIMIT + 14) {
      scene.remove(ufo.group);
      ufos.splice(i, 1);
      damageHull(mission.escapeDamage);
      showMessage('Saucer escaped', 'No disaster, but escaped targets chip away at the base defense rating.');
    }
  }
}

function pulseBeam(ufo) {
  const pulse = 0.18 + Math.sin(timer.getElapsed() * 8 + ufo.wobble) * 0.05;
  ufo.beam.material.opacity = pulse;
  game.shake = Math.max(game.shake, 0.14);
}

function nearestLiveTower(position) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const tower of towers) {
    if (tower.health <= 0) continue;
    const distance = distanceXZ(position, tower.group.position);
    if (distance < nearestDistance) {
      nearest = tower;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function allTowersDestroyed() {
  return towers.length > 0 && towers.every((tower) => tower.health <= 0);
}

function destroyUfo(index) {
  const mission = currentMission();
  const ufo = ufos[index];
  const position = ufo.group.position.clone();
  spawnSparks(position, new THREE.Color(0x8fffe2), 34, 2.35);
  spawnSparks(position, new THREE.Color(0xffbf5c), 18, 1.8);
  scene.remove(ufo.group);
  ufos.splice(index, 1);
  game.missionKills += 1;
  game.score += ufo.value;
  game.hull = Math.min(100, game.hull + 2);
  game.shake = Math.max(game.shake, 0.2);
  showMessage('Target down', game.missionKills + '/' + mission.destroyTarget + ' objective kills. +' + ufo.value + ' points.');
}

function damageHull(amount) {
  game.hull -= amount;
  game.shake = Math.max(game.shake, 0.18);
  if (game.hull <= 0) endGame('Base overrun', 'Too many saucers escaped the defense grid.');
}

function endGame(title, body) {
  game.hull = Math.max(0, game.hull);
  game.over = true;
  game.active = false;
  clearThreats();
  ui.startButton.textContent = 'Restart Campaign';
  ui.panelKicker.textContent = 'Mission failed';
  ui.panelTitle.textContent = title;
  ui.panelBody.textContent = body + ' Final score: ' + game.score + '.';
  ui.startPanel.classList.remove('is-hidden');
  showMessage(title, body);
}

function spawnSparks(position, color, count, force) {
  for (let i = 0; i < count; i += 1) {
    const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(random(0.05, 0.16), 0), materials.spark.clone());
    mesh.material.color.copy(color);
    mesh.position.copy(position);
    scene.add(mesh);

    const velocity = new THREE.Vector3(random(-1, 1), random(-0.1, 1.2), random(-1, 1))
      .normalize()
      .multiplyScalar(random(force * 1.4, force * 5.2));

    sparks.push({
      mesh,
      velocity,
      life: random(0.35, 0.92),
      maxLife: 0.92
    });
  }
}

function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i -= 1) {
    const spark = sparks[i];
    spark.life -= dt;
    spark.velocity.y -= 7.5 * dt;
    spark.mesh.position.addScaledVector(spark.velocity, dt);
    spark.mesh.rotation.x += dt * 8;
    spark.mesh.rotation.y += dt * 11;
    const fade = Math.max(0, spark.life / spark.maxLife);
    spark.mesh.material.opacity = fade;
    spark.mesh.scale.setScalar(THREE.MathUtils.lerp(0.15, 1, fade));
    if (spark.life <= 0) {
      scene.remove(spark.mesh);
      sparks.splice(i, 1);
    }
  }
}

function updateCamera(dt) {
  const followOffset = tmpVec.set(0, 24, 32).applyAxisAngle(upAxis, tank.group.rotation.y * 0.18);
  const targetPosition = tmpVecTwo.copy(tank.group.position).add(followOffset);
  if (game.shake > 0) {
    targetPosition.x += random(-1, 1) * game.shake;
    targetPosition.y += random(-0.6, 0.6) * game.shake;
  }
  camera.position.lerp(targetPosition, 1 - Math.exp(-dt * 3.5));
  camera.lookAt(tank.group.position.x, 6.8, tank.group.position.z + 1);
}

function updateHud() {
  const mission = currentMission();
  ui.score.textContent = String(Math.floor(game.score));
  ui.wave.textContent = String(game.missionIndex + 1);
  ui.hull.style.transform = 'scaleX(' + THREE.MathUtils.clamp(game.hull / 100, 0, 1) + ')';
  ui.charge.style.transform = 'scaleX(' + (1 - THREE.MathUtils.clamp(game.fireCooldown / mission.fireDelay, 0, 1)) + ')';
  if (game.messageTimer <= 0 && game.active && !game.over) {
    ui.messageTitle.textContent = mission.mapName;
    ui.messageBody.textContent = objectiveStatusText(mission);
  }
}

function objectiveStatusText(mission) {
  if (mission.objectiveType === 'protect') {
    const live = towers.filter((tower) => tower.health > 0).length;
    return game.missionKills + '/' + mission.destroyTarget + ' UFOs down. Relay towers standing: ' + live + '/' + towers.length + '.';
  }
  if (mission.objectiveType === 'survive') {
    const remaining = Math.max(0, Math.ceil(mission.survivalTime - game.missionElapsed));
    return game.missionKills + '/' + mission.destroyTarget + ' raiders down. Survive ' + remaining + 's more.';
  }
  return game.missionKills + '/' + mission.destroyTarget + ' UFOs down. ' + game.missionSpawnLeft + ' still incoming.';
}

function showMessage(title, body) {
  ui.messageTitle.textContent = title;
  ui.messageBody.textContent = body;
  game.messageTimer = 3.3;
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function disposeGroup(group) {
  group.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material && !Object.values(materials).includes(child.material)) {
      if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
      else child.material.dispose();
    }
  });
}

function angleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function dampAngle(current, target, lambda, dt) {
  const delta = angleDelta(current, target);
  return current + delta * (1 - Math.exp(-lambda * dt));
}

function distanceXZ(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}
