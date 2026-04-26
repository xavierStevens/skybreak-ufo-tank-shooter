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
  levelPicker: document.querySelector('#level-picker'),
  pausePanel: document.querySelector('#pause-panel'),
  pauseMain: document.querySelector('#pause-main'),
  optionsMain: document.querySelector('#options-main'),
  resumeButton: document.querySelector('#resume-button'),
  optionsButton: document.querySelector('#options-button'),
  levelSelectButton: document.querySelector('#level-select-button'),
  restartButton: document.querySelector('#restart-button'),
  optionsBackButton: document.querySelector('#options-back-button'),
  bindGrid: document.querySelector('#bind-grid'),
  difficultySelect: document.querySelector('#difficulty-select'),
  assistSelect: document.querySelector('#assist-select'),
  accentSelect: document.querySelector('#accent-select'),
  panelKicker: document.querySelector('#start-panel .panel-kicker'),
  panelTitle: document.querySelector('.start-panel h1'),
  panelBody: document.querySelector('.start-panel p')
};

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 420);
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

const DEFAULT_WORLD_SIZE = 92;
const SETTINGS_KEY = 'skybreak-settings-v2';
const PROGRESS_KEY = 'skybreak-progress-v2';
const CONTROL_ACTIONS = [
  { id: 'forward', label: 'Forward' },
  { id: 'backward', label: 'Reverse' },
  { id: 'left', label: 'Turn left' },
  { id: 'right', label: 'Turn right' },
  { id: 'fire', label: 'Fire' }
];
const DEFAULT_BINDINGS = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  fire: 'Space'
};
const DEFAULT_SETTINGS = {
  difficulty: 'standard',
  assist: 'high',
  accent: 'amber',
  bindings: DEFAULT_BINDINGS
};
const DIFFICULTY_PROFILES = {
  casual: { label: 'Casual', speed: 0.9, damage: 0.78, activeBonus: 0, score: 0.9 },
  standard: { label: 'Standard', speed: 1, damage: 1, activeBonus: 0, score: 1 },
  veteran: { label: 'Veteran', speed: 1.15, damage: 1.2, activeBonus: 1, score: 1.18 }
};
const ASSIST_PROFILES = {
  high: { label: 'High', radius: 1.22, cone: 1.18, shell: 1.06 },
  normal: { label: 'Normal', radius: 1, cone: 1, shell: 1 },
  low: { label: 'Low', radius: 0.78, cone: 0.82, shell: 0.97 }
};
const ACCENT_PROFILES = {
  amber: { hex: 0xf3bd55, css: '#f3bd55' },
  mint: { hex: 0x7de0c5, css: '#7de0c5' },
  cobalt: { hex: 0x8fb6ff, css: '#8fb6ff' }
};
const UFO_TYPES = {
  scout: { label: 'Scout', speed: 0.92, hit: 1.16, hpBonus: 0, value: 1, beam: 0.8, wobble: 1.8 },
  raider: { label: 'Raider', speed: 1.02, hit: 1.04, hpBonus: 0, value: 1.12, beam: 1, wobble: 2.2 },
  zigzag: { label: 'Skimmer', speed: 1.12, hit: 1.02, hpBonus: 0, value: 1.22, beam: 0.92, wobble: 3.35, lateral: 3.3 },
  bomber: { label: 'Bomber', speed: 0.78, hit: 1.22, hpBonus: 1, value: 1.42, beam: 1.36, wobble: 1.35, radiusBonus: 0.28 },
  shield: { label: 'Shielded', speed: 0.94, hit: 0.94, hpBonus: 1, value: 1.56, beam: 1.08, wobble: 2.05 },
  carrier: { label: 'Carrier', speed: 0.68, hit: 1.28, hpBonus: 4, value: 2.7, beam: 1.55, wobble: 1.1, radiusBonus: 0.7 }
};
const settings = loadSettings();
let waitingForBind = null;

const MISSIONS = [
  {
    id: 'training-range',
    title: 'Level 1: Training Range',
    mapName: 'Amber Range',
    objective: 'Destroy 4 scout UFOs.',
    intro: 'Four slow scouts, generous aim assist, and only one target overhead at a time.',
    success: 'Range clear. Radar crew has opened the salt-flat relay road.',
    worldSize: 92,
    ufoLimit: 52,
    cameraHeight: 24,
    cameraDistance: 32,
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
    spawnDelay: [1.6, 2.35],
    firstSpawn: 0.45,
    speed: [3.8, 5.1],
    altitude: [9.8, 15.5],
    drift: 0.55,
    hitAssist: 4.9,
    shellSpeed: 42,
    fireDelay: 0.2,
    beamDamage: 1.9,
    escapeDamage: 2.5,
    score: 150,
    maxUfoHp: 1,
    ufoMix: [{ type: 'scout', weight: 1 }]
  },
  {
    id: 'relay-defense',
    title: 'Level 2: Relay Defense',
    mapName: 'Salt Relay',
    objective: 'Destroy 7 UFOs while at least one relay tower survives.',
    intro: 'The saucers will try to burn down the relay towers. Break their attack runs.',
    success: 'Relay held. The ridge network is back online.',
    worldSize: 110,
    ufoLimit: 63,
    cameraHeight: 25,
    cameraDistance: 35,
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
    destroyTarget: 7,
    ufoTotal: 8,
    maxActive: 2,
    spawnDelay: [1.75, 2.65],
    firstSpawn: 0.7,
    speed: [4.8, 6.9],
    altitude: [10.5, 17.5],
    drift: 1.2,
    hitAssist: 3.8,
    shellSpeed: 41,
    fireDelay: 0.24,
    beamDamage: 2.9,
    towerDamage: 7.2,
    escapeDamage: 4,
    score: 190,
    maxUfoHp: 1,
    ufoMix: [
      { type: 'scout', weight: 3 },
      { type: 'raider', weight: 2 },
      { type: 'bomber', weight: 1 }
    ]
  },
  {
    id: 'night-canyon',
    title: 'Level 3: Night Canyon',
    mapName: 'Cobalt Canyon',
    objective: 'Survive 75 seconds and destroy 9 raiders.',
    intro: 'A longer canyon push with skimmers that weave across your aim line.',
    success: 'Canyon sky is clear. Storm front coordinates received.',
    worldSize: 126,
    ufoLimit: 72,
    cameraHeight: 27,
    cameraDistance: 38,
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
    destroyTarget: 9,
    survivalTime: 75,
    ufoTotal: 12,
    maxActive: 2,
    spawnDelay: [1.55, 2.25],
    firstSpawn: 0.7,
    speed: [5.9, 8.1],
    altitude: [12, 20],
    drift: 1.6,
    hitAssist: 3.4,
    shellSpeed: 42,
    fireDelay: 0.23,
    beamDamage: 3.25,
    escapeDamage: 5,
    score: 230,
    maxUfoHp: 2,
    ufoMix: [
      { type: 'raider', weight: 3 },
      { type: 'zigzag', weight: 3 },
      { type: 'shield', weight: 1 }
    ]
  },
  {
    id: 'storm-atoll',
    title: 'Level 4: Storm Atoll',
    mapName: 'Storm Atoll',
    objective: 'Destroy 11 UFOs before the storm corridor closes.',
    intro: 'Wide open map. Skimmers swing laterally and bombers make slow, dangerous beam runs.',
    success: 'Atoll corridor is open. Mothership gate is exposed.',
    worldSize: 144,
    ufoLimit: 84,
    cameraHeight: 29,
    cameraDistance: 42,
    sky: 0x17232f,
    fog: 0x547b86,
    fogDensity: 0.013,
    ground: 0x7b8063,
    groundDark: 0x53635c,
    scrub: 0x2f6f62,
    ridge: 0x3f565b,
    accent: 0x7de0c5,
    rocks: 58,
    cactus: 4,
    ridges: 22,
    extras: 'storm',
    objectiveType: 'destroy',
    destroyTarget: 11,
    ufoTotal: 13,
    maxActive: 3,
    spawnDelay: [1.4, 2.1],
    firstSpawn: 0.75,
    speed: [6.2, 8.4],
    altitude: [12.5, 22],
    drift: 1.95,
    hitAssist: 3.1,
    shellSpeed: 43,
    fireDelay: 0.22,
    beamDamage: 3.45,
    escapeDamage: 5.2,
    score: 275,
    maxUfoHp: 2,
    timeLimit: 115,
    ufoMix: [
      { type: 'zigzag', weight: 4 },
      { type: 'raider', weight: 3 },
      { type: 'bomber', weight: 2 },
      { type: 'shield', weight: 1 }
    ]
  },
  {
    id: 'mothership-gate',
    title: 'Level 5: Mothership Gate',
    mapName: 'Mothership Gate',
    objective: 'Survive 100 seconds and destroy 14 UFOs, including heavy carriers.',
    intro: 'The final map is long, dense, and vertical. Carriers take several hits but score big.',
    success: 'Mothership gate collapsed. Skybreak is secure.',
    worldSize: 164,
    ufoLimit: 94,
    cameraHeight: 31,
    cameraDistance: 46,
    sky: 0x0e141e,
    fog: 0x202544,
    fogDensity: 0.014,
    ground: 0x4f535c,
    groundDark: 0x303846,
    scrub: 0x315565,
    ridge: 0x20283a,
    accent: 0x9fc7ff,
    rocks: 70,
    cactus: 0,
    ridges: 28,
    extras: 'gate',
    objectiveType: 'survive',
    destroyTarget: 14,
    survivalTime: 100,
    ufoTotal: 17,
    maxActive: 3,
    spawnDelay: [1.25, 1.95],
    firstSpawn: 0.7,
    speed: [6.6, 9.4],
    altitude: [14, 24],
    drift: 2.25,
    hitAssist: 2.8,
    shellSpeed: 44,
    fireDelay: 0.21,
    beamDamage: 3.8,
    escapeDamage: 6,
    score: 330,
    maxUfoHp: 2,
    ufoMix: [
      { type: 'raider', weight: 3 },
      { type: 'zigzag', weight: 3 },
      { type: 'shield', weight: 2 },
      { type: 'bomber', weight: 2 },
      { type: 'carrier', weight: 1 }
    ]
  }
];

const game = {
  active: false,
  paused: false,
  over: false,
  completed: false,
  score: 0,
  missionIndex: 0,
  unlockedMission: loadProgress(),
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
  water: new THREE.MeshStandardMaterial({
    color: 0x254e5d,
    emissive: 0x0a2b32,
    emissiveIntensity: 0.45,
    roughness: 0.42,
    flatShading: true
  }),
  gateStone: new THREE.MeshStandardMaterial({ color: 0x2f3b4c, metalness: 0.06, roughness: 0.8, flatShading: true }),
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
applySettings();
syncOptionControls();
renderBindings();
renderLevelPicker();
resize();
setMissionPanel(false);
window.__skybreakDebug = {
  getState: () => ({
    active: game.active,
    paused: game.paused,
    over: game.over,
    completed: game.completed,
    score: game.score,
    missionIndex: game.missionIndex,
    missionTitle: currentMission().title,
    missionCount: MISSIONS.length,
    worldSize: missionWorldSize(currentMission()),
    settings: {
      difficulty: settings.difficulty,
      assist: settings.assist,
      accent: settings.accent,
      bindings: { ...settings.bindings }
    },
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

function missionWorldSize(mission = currentMission()) {
  return mission.worldSize ?? DEFAULT_WORLD_SIZE;
}

function halfWorld(mission = currentMission()) {
  return missionWorldSize(mission) / 2;
}

function ufoLimit(mission = currentMission()) {
  return mission.ufoLimit ?? halfWorld(mission) + 8;
}

function difficultyProfile() {
  return DIFFICULTY_PROFILES[settings.difficulty] ?? DIFFICULTY_PROFILES.standard;
}

function assistProfile() {
  return ASSIST_PROFILES[settings.assist] ?? ASSIST_PROFILES.high;
}

function missionMaxActive(mission) {
  return Math.max(1, mission.maxActive + difficultyProfile().activeBonus);
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

  const size = missionWorldSize(mission);
  const half = halfWorld(mission);
  const groundSegments = Math.max(12, Math.round(size / 8));

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size, groundSegments, groundSegments), materials.sand);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  worldGroup.add(ground);

  const grid = new THREE.GridHelper(size, Math.max(18, Math.round(size / 5)), 0x6c5a3d, 0x8c724d);
  grid.position.y = 0.025;
  grid.material.transparent = true;
  grid.material.opacity = 0.12;
  worldGroup.add(grid);

  for (let i = 0; i < mission.rocks; i += 1) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(random(0.22, 1.22), 0),
      Math.random() > 0.55 ? materials.darkerSand : materials.mountain
    );
    rock.position.set(random(-half, half), random(0.08, 0.28), random(-half, half));
    if (rock.position.length() < 9) rock.position.multiplyScalar(2.5);
    rock.rotation.set(random(0, Math.PI), random(0, Math.PI), random(0, Math.PI));
    rock.scale.y = random(0.45, 1.1);
    rock.castShadow = true;
    rock.receiveShadow = true;
    worldGroup.add(rock);
  }

  for (let i = 0; i < mission.cactus; i += 1) {
    const cactus = createCactus(random(0.75, 1.55));
    cactus.position.set(random(-half, half), 0, random(-half, half));
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
    const radius = random(size * 0.63, size * 0.9);
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
  if (mission.extras === 'storm') buildStormMap();
  if (mission.extras === 'gate') buildGateMap();
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

function buildStormMap() {
  const half = halfWorld();
  for (let i = 0; i < 5; i += 1) {
    const pool = new THREE.Mesh(
      new THREE.CylinderGeometry(random(5.5, 10), random(6.5, 11), 0.08, 9),
      materials.water
    );
    const angle = (i / 5) * Math.PI * 2 + 0.34;
    const radius = random(half * 0.34, half * 0.72);
    pool.position.set(Math.sin(angle) * radius, 0.035, Math.cos(angle) * radius);
    pool.scale.x = random(0.7, 1.7);
    pool.scale.z = random(0.8, 1.35);
    pool.rotation.y = random(0, Math.PI);
    pool.receiveShadow = true;
    worldGroup.add(pool);
  }

  for (let i = 0; i < 4; i += 1) {
    const mast = new THREE.Group();
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.48, 6.4, 5), materials.tower);
    spike.position.y = 3.2;
    spike.castShadow = true;
    mast.add(spike);

    const coil = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.08, 6, 14), materials.towerLit);
    coil.position.y = 5.6;
    coil.rotation.x = Math.PI / 2;
    mast.add(coil);

    const light = new THREE.PointLight(0x7de0c5, 1.35, 18);
    light.position.y = 5.65;
    mast.add(light);

    const angle = Math.PI / 4 + (i / 4) * Math.PI * 2;
    mast.position.set(Math.sin(angle) * half * 0.48, 0, Math.cos(angle) * half * 0.48);
    worldGroup.add(mast);
  }
}

function buildGateMap() {
  const half = halfWorld();
  for (let i = 0; i < 3; i += 1) {
    const gate = new THREE.Group();
    const left = new THREE.Mesh(new THREE.BoxGeometry(1.8, 10.5, 2.2), materials.gateStone);
    const right = left.clone();
    left.position.set(-3.4, 5.25, 0);
    right.position.set(3.4, 5.25, 0);
    left.castShadow = true;
    right.castShadow = true;
    gate.add(left, right);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(8.8, 1.4, 2.2), materials.gateStone);
    lintel.position.set(0, 10.2, 0);
    lintel.castShadow = true;
    gate.add(lintel);

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), materials.towerLit);
    core.position.set(0, 7.2, 0);
    gate.add(core);

    const glow = new THREE.PointLight(0x9fc7ff, 2.1, 28);
    glow.position.set(0, 7.2, 0);
    gate.add(glow);

    gate.position.set(-half * 0.42 + i * half * 0.42, 0, -half * 0.42);
    gate.rotation.y = random(-0.18, 0.18);
    worldGroup.add(gate);
  }

  for (let i = 0; i < 7; i += 1) {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(random(0.7, 1.35), 0), materials.towerLit);
    shard.position.set(random(-half * 0.65, half * 0.65), random(4.5, 9.5), random(-half * 0.68, -half * 0.22));
    shard.castShadow = true;
    worldGroup.add(shard);
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
  const type = pickUfoType(mission);
  const profile = UFO_TYPES[type] ?? UFO_TYPES.scout;
  const difficulty = difficultyProfile();
  const radius = random(1.55 + (profile.radiusBonus ?? 0), 2.1 + (profile.radiusBonus ?? 0));
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

  if (type === 'bomber' || type === 'carrier') {
    for (let i = -1; i <= 1; i += 2) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.18, radius * 0.23, radius * 1.2, 6), materials.ufoDark);
      pod.position.set(i * radius * 0.9, -0.34, 0);
      pod.rotation.z = Math.PI / 2;
      pod.castShadow = true;
      group.add(pod);
    }
  }

  let shield = null;
  if (type === 'shield' || type === 'carrier') {
    shield = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.72, 0.08, 6, 18),
      materials.ufoGlass.clone()
    );
    shield.material.transparent = true;
    shield.material.opacity = type === 'carrier' ? 0.62 : 0.48;
    shield.position.y = 0.03;
    shield.rotation.x = Math.PI / 2;
    group.add(shield);
  }

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
  const speed = random(mission.speed[0], mission.speed[1]) * profile.speed * difficulty.speed;
  const limit = ufoLimit(mission);
  const span = Math.max(26, halfWorld(mission) - 10);
  const pos = new THREE.Vector3();
  const vel = new THREE.Vector3();

  if (side === 0) {
    pos.set(-limit, altitude, random(-span, span));
    vel.set(speed, random(-0.16, 0.16), random(-mission.drift, mission.drift));
  } else if (side === 1) {
    pos.set(limit, altitude, random(-span, span));
    vel.set(-speed, random(-0.16, 0.16), random(-mission.drift, mission.drift));
  } else if (side === 2) {
    pos.set(random(-span, span), altitude, -limit);
    vel.set(random(-mission.drift, mission.drift), random(-0.16, 0.16), speed);
  } else {
    pos.set(random(-span, span), altitude, limit);
    vel.set(random(-mission.drift, mission.drift), random(-0.16, 0.16), -speed);
  }

  group.position.copy(pos);
  scene.add(group);

  return {
    group,
    beam,
    shield,
    velocity: vel,
    radius: radius * 1.55,
    hitRadius: radius * profile.hit + mission.hitAssist * assistProfile().radius,
    hp: Math.max(1, (mission.maxUfoHp > 1 && Math.random() > 0.55 ? 2 : 1) + profile.hpBonus),
    type,
    profile,
    lateralForce: profile.lateral ?? 0,
    beamPower: profile.beam,
    wobble: random(0, Math.PI * 2),
    wobbleSpeed: profile.wobble,
    value: Math.round(mission.score * profile.value * difficulty.score)
  };
}

function pickUfoType(mission) {
  const mix = mission.ufoMix ?? [{ type: 'scout', weight: 1 }];
  const total = mix.reduce((sum, item) => sum + item.weight, 0);
  let roll = random(0, total);
  for (const item of mix) {
    roll -= item.weight;
    if (roll <= 0) return item.type;
  }
  return mix[mix.length - 1].type;
}

function bindInput() {
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', (event) => {
    if (waitingForBind) {
      captureBinding(event);
      return;
    }
    if (event.code === 'Escape') {
      event.preventDefault();
      if (game.active || game.paused) setPaused(!game.paused);
      return;
    }
    if (isGameKey(event.code)) event.preventDefault();
    if (!game.paused) setKey(event.code, true);
  });
  window.addEventListener('keyup', (event) => {
    if (isGameKey(event.code)) event.preventDefault();
    setKey(event.code, false);
  });

  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerdown', (event) => {
    if (game.paused) return;
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
    if (game.over || game.completed) {
      game.score = 0;
      game.hull = 100;
      game.over = false;
      game.completed = false;
    }
    startMission();
  });

  ui.resumeButton.addEventListener('click', () => setPaused(false));
  ui.optionsButton.addEventListener('click', () => showOptions(true));
  ui.optionsBackButton.addEventListener('click', () => showOptions(false));
  ui.restartButton.addEventListener('click', () => {
    setPaused(false);
    beginMission(currentMission());
  });
  ui.levelSelectButton.addEventListener('click', () => {
    setPaused(false);
    game.active = false;
    game.over = false;
    resetMissionState();
    buildWorld(currentMission());
    setMissionPanel(false);
  });

  ui.bindGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-bind-action]');
    if (!button) return;
    waitingForBind = button.dataset.bindAction;
    renderBindings();
  });

  ui.difficultySelect.addEventListener('change', () => {
    settings.difficulty = ui.difficultySelect.value;
    saveSettings();
    renderLevelPicker();
  });
  ui.assistSelect.addEventListener('change', () => {
    settings.assist = ui.assistSelect.value;
    saveSettings();
    renderBindings();
  });
  ui.accentSelect.addEventListener('change', () => {
    settings.accent = ui.accentSelect.value;
    applySettings();
    saveSettings();
  });
}

function isGameKey(code) {
  return [
    ...Object.values(settings.bindings),
    'ArrowUp',
    'ArrowLeft',
    'ArrowDown',
    'ArrowRight',
    'Enter',
    'Escape'
  ].includes(code);
}

function setKey(code, value) {
  for (const action of CONTROL_ACTIONS) {
    if (settings.bindings[action.id] === code) input[action.id] = value;
  }

  if (code === 'ArrowUp') input.forward = value;
  if (code === 'ArrowDown') input.backward = value;
  if (code === 'ArrowLeft') input.left = value;
  if (code === 'ArrowRight') input.right = value;
  if (code === 'Enter') input.fire = value;
}

function captureBinding(event) {
  event.preventDefault();
  if (event.code === 'Escape') {
    waitingForBind = null;
    renderBindings();
    return;
  }
  if (!isBindableKey(event.code)) return;

  const actionId = waitingForBind;
  const previousCode = settings.bindings[actionId];
  for (const action of CONTROL_ACTIONS) {
    if (action.id !== actionId && settings.bindings[action.id] === event.code) {
      settings.bindings[action.id] = previousCode;
    }
  }
  settings.bindings[actionId] = event.code;
  waitingForBind = null;
  saveSettings();
  renderBindings();
}

function isBindableKey(code) {
  return ![
    'AltLeft',
    'AltRight',
    'ControlLeft',
    'ControlRight',
    'MetaLeft',
    'MetaRight',
    'ShiftLeft',
    'ShiftRight',
    'Tab'
  ].includes(code);
}

function keyLabel(code) {
  const labels = {
    Space: 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Enter: 'Enter'
  };
  if (labels[code]) return labels[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code.replace(/(Left|Right)$/, ' $1');
}

function renderBindings() {
  ui.bindGrid.replaceChildren();
  for (const action of CONTROL_ACTIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bind-button';
    button.dataset.bindAction = action.id;
    button.setAttribute('aria-label', 'Change ' + action.label + ' control');

    const label = document.createElement('b');
    label.textContent = action.label;
    const key = document.createElement('span');
    key.textContent = waitingForBind === action.id ? 'Press key' : keyLabel(settings.bindings[action.id]);
    button.append(label, key);
    if (waitingForBind === action.id) button.classList.add('is-listening');
    ui.bindGrid.append(button);
  }
}

function renderLevelPicker() {
  ui.levelPicker.replaceChildren();
  MISSIONS.forEach((mission, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'level-card';
    button.dataset.levelIndex = String(index);
    if (index === game.missionIndex) button.classList.add('is-selected');

    const title = document.createElement('strong');
    title.textContent = mission.title.replace(': ', ' - ');
    const map = document.createElement('span');
    map.textContent = mission.mapName + ' / ' + missionWorldSize(mission) + 'm map';
    const objective = document.createElement('span');
    objective.textContent = mission.objective;
    const progress = document.createElement('span');
    progress.className = 'level-progress';
    progress.textContent = index <= game.unlockedMission ? 'Campaign route' : 'Free play preview';
    button.append(title, map, objective, progress);
    button.addEventListener('click', () => selectMission(index));
    ui.levelPicker.append(button);
  });
}

function selectMission(index) {
  game.missionIndex = THREE.MathUtils.clamp(index, 0, MISSIONS.length - 1);
  game.score = 0;
  game.hull = 100;
  game.over = false;
  game.completed = false;
  game.paused = false;
  ui.pausePanel.classList.add('is-hidden');
  resetMissionState();
  buildWorld(currentMission());
  setMissionPanel(false);
  showMessage(currentMission().title, currentMission().objective);
}

function syncOptionControls() {
  ui.difficultySelect.value = settings.difficulty;
  ui.assistSelect.value = settings.assist;
  ui.accentSelect.value = settings.accent;
}

function applySettings() {
  const accent = ACCENT_PROFILES[settings.accent] ?? ACCENT_PROFILES.amber;
  document.documentElement.style.setProperty('--amber', accent.css);
  materials.tankTrim.color.setHex(accent.hex);
  syncOptionControls();
}

function setPaused(paused) {
  if (paused && !game.active) return;
  game.paused = paused;
  ui.pausePanel.classList.toggle('is-hidden', !paused);
  if (paused) {
    input.fire = false;
    showOptions(false);
    showMessage('Paused', 'Resume from the menu or open options to tune controls.');
  } else {
    waitingForBind = null;
    renderBindings();
    showOptions(false);
    if (game.active && !game.over) showMessage(currentMission().mapName, objectiveStatusText(currentMission()));
  }
}

function showOptions(show) {
  ui.pauseMain.classList.toggle('is-hidden', show);
  ui.optionsMain.classList.toggle('is-hidden', !show);
  if (!show) {
    waitingForBind = null;
    renderBindings();
  }
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
  game.paused = false;
  game.over = false;
  game.completed = false;
  ui.pausePanel.classList.add('is-hidden');
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
  game.paused = false;
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
  game.paused = false;
  ui.pausePanel.classList.add('is-hidden');
  game.missionSpawnLeft = mission.ufoTotal;
  game.missionSpawnTimer = mission.firstSpawn;
  showMessage(mission.title, mission.objective);
  updateHud();
}

function completeMission() {
  const mission = currentMission();
  game.active = false;
  game.paused = false;
  game.missionBreak = 0;
  clearThreats();
  showMessage('Objective complete', mission.success);
  game.unlockedMission = Math.max(game.unlockedMission, Math.min(MISSIONS.length - 1, game.missionIndex + 1));
  saveProgress();

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
    renderLevelPicker();
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
  renderLevelPicker();
  ui.startPanel.classList.remove('is-hidden');
}

function shootShell() {
  const mission = currentMission();
  if (game.fireCooldown > 0 || !game.active || game.over || game.paused) return;

  const worldYaw = tank.group.rotation.y + tank.turret.rotation.y;
  const origin = new THREE.Vector3(0, 0.28, 3.08);
  tank.muzzle.localToWorld(origin);
  const assistedTarget = findAssistedTarget(origin, worldYaw, mission);
  const shellSpeed = mission.shellSpeed * assistProfile().shell;

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
    velocity: direction.multiplyScalar(shellSpeed),
    life: Math.max(2.25, ufoLimit(mission) / shellSpeed + 0.75),
    radius: 0.55,
    target: assistedTarget,
    assistStrength: assistedTarget ? (game.missionIndex === 0 ? 0.13 : 0.075) : 0
  });

  game.fireCooldown = mission.fireDelay;
  game.shake = Math.max(game.shake, 0.09);
  spawnSparks(origin, new THREE.Color(0xffe2a0), 7, 0.42);
}

function findAssistedTarget(origin, worldYaw, mission) {
  const aimDirection = new THREE.Vector3(Math.sin(worldYaw), 0, Math.cos(worldYaw));
  let best = null;
  let bestScore = Infinity;
  let nearest = null;
  let nearestDistance = Infinity;
  const assist = assistProfile();
  for (const ufo of ufos) {
    const toUfo = ufo.group.position.clone().sub(origin);
    const flat = new THREE.Vector3(toUfo.x, 0, toUfo.z);
    if (flat.lengthSq() < 0.001) continue;
    flat.normalize();
    const angle = Math.acos(THREE.MathUtils.clamp(aimDirection.dot(flat), -1, 1));
    const distance = toUfo.length();
    if (distance < nearestDistance) {
      nearest = ufo;
      nearestDistance = distance;
    }

    const allowance = (game.missionIndex === 0 ? 1.35 : 0.72) * assist.cone;
    if (angle < allowance && distance < ufoLimit(mission) + 46) {
      const score = angle * 36 + distance * 0.22;
      if (score < bestScore) {
        best = ufo;
        bestScore = score;
      }
    }
  }
  if (best) return best;
  if (game.missionIndex === 0 && settings.assist === 'high' && nearestDistance < ufoLimit(mission) + 58) return nearest;
  return null;
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
  if (game.paused) {
    updateCamera(dt);
    updateHud();
    return;
  }
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
  const half = halfWorld();
  tank.group.position.addScaledVector(forward, drive * speed * dt);
  tank.group.position.x = THREE.MathUtils.clamp(tank.group.position.x, -half + 4, half - 4);
  tank.group.position.z = THREE.MathUtils.clamp(tank.group.position.z, -half + 4, half - 4);

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
  if (game.missionSpawnLeft > 0 && ufos.length < missionMaxActive(mission)) {
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
  } else if (mission.timeLimit && game.missionElapsed >= mission.timeLimit) {
    endGame('Storm corridor closed', 'The mission timer expired before the UFO objective was complete.');
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
      shell.velocity.lerp(desired.multiplyScalar(shell.velocity.length()), shell.assistStrength || 0.035);
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
    } else if (shell.life <= 0 || shell.mesh.position.y > 54 || shell.mesh.position.length() > ufoLimit(currentMission()) + 44) {
      scene.remove(shell.mesh);
      shells.splice(i, 1);
    }
  }
}

function updateUfos(dt) {
  const mission = currentMission();
  const difficulty = difficultyProfile();
  const limit = ufoLimit(mission);
  for (let i = ufos.length - 1; i >= 0; i -= 1) {
    const ufo = ufos[i];
    const liveTower = nearestLiveTower(ufo.group.position);
    const preferredTarget = mission.objectiveType === 'protect' && liveTower ? liveTower.group.position : tank.group.position;

    if (ufo.type === 'bomber' || ufo.type === 'carrier') {
      const desired = tmpVec.copy(preferredTarget).sub(ufo.group.position);
      desired.y = 0;
      if (desired.lengthSq() > 0.01) {
        desired.normalize().multiplyScalar(Math.max(1, ufo.velocity.length()));
        ufo.velocity.lerp(desired, dt * (ufo.type === 'carrier' ? 0.08 : 0.15));
      }
    }

    ufo.group.position.addScaledVector(ufo.velocity, dt);
    if (ufo.lateralForce > 0) {
      const lateral = tmpVecTwo.set(-ufo.velocity.z, 0, ufo.velocity.x);
      if (lateral.lengthSq() > 0.01) {
        lateral.normalize();
        ufo.group.position.addScaledVector(lateral, Math.sin(timer.getElapsed() * ufo.wobbleSpeed + ufo.wobble) * ufo.lateralForce * dt);
      }
    }
    ufo.group.position.y += Math.sin(timer.getElapsed() * 2.2 + ufo.wobble) * dt * 0.48;
    ufo.group.rotation.y += dt * (ufo.type === 'carrier' ? 1.05 : 1.85);
    ufo.group.rotation.z = Math.sin(timer.getElapsed() * ufo.wobbleSpeed + ufo.wobble) * (ufo.type === 'zigzag' ? 0.16 : 0.08);
    if (ufo.shield) {
      ufo.shield.rotation.z += dt * 1.9;
      ufo.shield.scale.setScalar(1 + Math.sin(timer.getElapsed() * 5 + ufo.wobble) * 0.035);
    }

    const towerTarget = nearestLiveTower(ufo.group.position);
    const towerDistance = towerTarget ? distanceXZ(ufo.group.position, towerTarget.group.position) : Infinity;
    const tankDistance = distanceXZ(ufo.group.position, tank.group.position);
    const attackRadius = ufo.type === 'bomber' || ufo.type === 'carrier' ? 10.8 : 8.7;
    const attackCeiling = ufo.type === 'carrier' ? 26 : 22.5;
    const damageMultiplier = difficulty.damage * (ufo.beamPower ?? 1);
    const attackingTower = mission.objectiveType === 'protect' && towerTarget && towerDistance < attackRadius;
    const attackingTank = tankDistance < attackRadius && ufo.group.position.y < attackCeiling && !attackingTower;
    ufo.beam.visible = attackingTank || attackingTower;

    if (attackingTower) {
      pulseBeam(ufo);
      towerTarget.health -= mission.towerDamage * damageMultiplier * dt;
      towerTarget.group.scale.y = THREE.MathUtils.lerp(0.82, 1, Math.max(0, towerTarget.health / 100));
      if (Math.random() < dt * 8) {
        spawnSparks(towerTarget.group.position.clone().add(new THREE.Vector3(random(-0.6, 0.6), 3.3, random(-0.6, 0.6))), new THREE.Color(0x7de0c5), 2, 0.55);
      }
      if (allTowersDestroyed()) endGame('Relay lost', 'All relay towers were burned down. Restart and intercept saucers earlier.');
    } else if (attackingTank) {
      pulseBeam(ufo);
      game.hull -= mission.beamDamage * damageMultiplier * dt;
      game.shake = Math.max(game.shake, 0.18);
      if (Math.random() < dt * 10) {
        spawnSparks(tank.group.position.clone().add(new THREE.Vector3(random(-1.5, 1.5), 0.6, random(-1.5, 1.5))), new THREE.Color(0x7de0c5), 2, 0.55);
      }
      if (game.hull <= 0) endGame('Tank disabled', 'The hull failed under beam fire. Restart the campaign when ready.');
    }

    if (Math.abs(ufo.group.position.x) > limit + 16 || Math.abs(ufo.group.position.z) > limit + 16) {
      scene.remove(ufo.group);
      ufos.splice(i, 1);
      damageHull(mission.escapeDamage * difficulty.damage);
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
  game.paused = false;
  ui.pausePanel.classList.add('is-hidden');
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
  const mission = currentMission();
  const followOffset = tmpVec
    .set(0, mission.cameraHeight ?? 24, mission.cameraDistance ?? 32)
    .applyAxisAngle(upAxis, tank.group.rotation.y * 0.18);
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
  if (mission.timeLimit) {
    const remaining = Math.max(0, Math.ceil(mission.timeLimit - game.missionElapsed));
    return game.missionKills + '/' + mission.destroyTarget + ' UFOs down. Corridor closes in ' + remaining + 's.';
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

function loadSettings() {
  const fallback = {
    ...DEFAULT_SETTINGS,
    bindings: { ...DEFAULT_BINDINGS }
  };
  if (typeof localStorage === 'undefined') return fallback;

  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    const merged = {
      ...fallback,
      ...stored,
      bindings: {
        ...DEFAULT_BINDINGS,
        ...(stored.bindings ?? {})
      }
    };
    if (!DIFFICULTY_PROFILES[merged.difficulty]) merged.difficulty = fallback.difficulty;
    if (!ASSIST_PROFILES[merged.assist]) merged.assist = fallback.assist;
    if (!ACCENT_PROFILES[merged.accent]) merged.accent = fallback.accent;
    return merged;
  } catch {
    return fallback;
  }
}

function saveSettings() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadProgress() {
  if (typeof localStorage === 'undefined') return 0;
  const stored = Number(localStorage.getItem(PROGRESS_KEY));
  return Number.isFinite(stored) ? THREE.MathUtils.clamp(stored, 0, MISSIONS.length - 1) : 0;
}

function saveProgress() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PROGRESS_KEY, String(game.unlockedMission));
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
