import * as THREE from 'three';
import {
  CAMPAIGN_MISSIONS,
  CAMPAIGN_SAVE_KEY,
  LEGACY_PROGRESS_KEY,
  UPGRADE_DEFINITIONS
} from './campaign.js';

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
  campaignHome: document.querySelector('#campaign-home'),
  campaignTimeline: document.querySelector('#campaign-timeline'),
  campaignHangar: document.querySelector('#campaign-hangar'),
  campaignBriefing: document.querySelector('#campaign-briefing'),
  campaignDebrief: document.querySelector('#campaign-debrief'),
  campaignContinueButton: document.querySelector('#campaign-continue-button'),
  campaignTimelineButton: document.querySelector('#campaign-timeline-button'),
  campaignHangarButton: document.querySelector('#campaign-hangar-button'),
  campaignOptionsButton: document.querySelector('#campaign-options-button'),
  timelineBackButton: document.querySelector('#timeline-back-button'),
  hangarBackButton: document.querySelector('#hangar-back-button'),
  briefingBackButton: document.querySelector('#briefing-back-button'),
  debriefContinueButton: document.querySelector('#debrief-continue-button'),
  debriefHangarButton: document.querySelector('#debrief-hangar-button'),
  debriefTimelineButton: document.querySelector('#debrief-timeline-button'),
  campaignSubtitle: document.querySelector('#campaign-subtitle'),
  campaignStatus: document.querySelector('#campaign-status'),
  hangarGrid: document.querySelector('#hangar-grid'),
  hangarSalvage: document.querySelector('#hangar-salvage'),
  briefingKicker: document.querySelector('#briefing-kicker'),
  briefingTitle: document.querySelector('#briefing-title'),
  briefingBody: document.querySelector('#briefing-body'),
  briefingObjective: document.querySelector('#briefing-objective'),
  briefingReward: document.querySelector('#briefing-reward'),
  debriefKicker: document.querySelector('#debrief-kicker'),
  debriefTitle: document.querySelector('#debrief-title'),
  debriefBody: document.querySelector('#debrief-body'),
  debriefStats: document.querySelector('#debrief-stats'),
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
const BASE_HULL = 100;
const SETTINGS_KEY = 'skybreak-settings-v2';
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
const campaign = loadCampaignState();
let waitingForBind = null;

const game = {
  active: false,
  paused: false,
  over: false,
  completed: false,
  score: 0,
  missionIndex: campaign.currentMission,
  unlockedMission: campaign.unlockedMission,
  hull: maxHull(),
  fireCooldown: 0,
  missionSpawnLeft: 0,
  missionSpawnTimer: 0,
  missionKills: 0,
  missionElapsed: 0,
  missionBreak: 0,
  lastDebrief: null,
  messageTimer: 0,
  shake: 0,
  radioFired: new Set()
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
const objectives = [];
let worldGroup = new THREE.Group();
let objectiveState = {};
let audioContext = null;

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
  objectiveCore: new THREE.MeshStandardMaterial({ color: 0xfff0a8, emissive: 0xf3bd55, emissiveIntensity: 1.4, roughness: 0.2, flatShading: true }),
  objectiveActive: new THREE.MeshStandardMaterial({ color: 0x9ffff0, emissive: 0x7de0c5, emissiveIntensity: 1.6, roughness: 0.25, flatShading: true }),
  objectiveDark: new THREE.MeshStandardMaterial({ color: 0x405054, metalness: 0.18, roughness: 0.7, flatShading: true }),
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
renderCampaignHome();
renderHangar();
resize();
showCampaignView('home');
window.__skybreakDebug = {
  getState: () => ({
    active: game.active,
    paused: game.paused,
    over: game.over,
    completed: game.completed,
    score: game.score,
    missionIndex: game.missionIndex,
    missionTitle: currentMission().title,
    missionCount: CAMPAIGN_MISSIONS.length,
    worldSize: missionWorldSize(currentMission()),
    campaign: {
      currentMission: campaign.currentMission,
      unlockedMission: campaign.unlockedMission,
      completed: { ...campaign.completed },
      medals: { ...campaign.medals },
      salvage: campaign.salvage,
      upgrades: { ...campaign.upgrades }
    },
    objectives: {
      type: objectiveState.type,
      returned: objectiveState.returned,
      activated: objectiveState.activated?.filter(Boolean).length ?? 0,
      pylonsDisabled: objectiveState.pylonsDisabled,
      bossSpawned: objectiveState.bossSpawned,
      bossDestroyed: objectiveState.bossDestroyed
    },
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
  }),
  grantSalvage: (amount = 500) => {
    campaign.salvage += Math.max(0, Math.floor(amount));
    saveCampaignState();
    renderCampaignHome();
    renderHangar();
  },
  unlockAll: () => {
    campaign.unlockedMission = CAMPAIGN_MISSIONS.length - 1;
    saveCampaignState();
    renderCampaignHome();
    renderLevelPicker();
  },
  selectMission,
  resetCampaign,
  satisfyObjective: () => {
    const mission = currentMission();
    const script = mission.objectiveScript ?? {};
    game.missionKills = Math.max(game.missionKills, mission.destroyTarget ?? 0);
    game.missionElapsed = Math.max(game.missionElapsed, mission.survivalTime ?? 0);
    if (mission.objectiveType === 'collect') objectiveState.returned = script.total ?? 0;
    if (mission.objectiveType === 'activate') objectiveState.activated = Array(script.nodes ?? 0).fill(true);
    if (mission.objectiveType === 'boss') {
      objectiveState.pylonsDisabled = script.pylons ?? 0;
      objectiveState.bossSpawned = true;
      objectiveState.bossDestroyed = true;
    }
    if (mission.objectiveType === 'protect') {
      for (const tower of towers) tower.health = Math.max(tower.health, 25);
    }
  },
  forceComplete: () => {
    if (!game.active) beginMission(currentMission());
    completeMission();
  }
};
requestAnimationFrame(tick);

function currentMission() {
  const index = THREE.MathUtils.clamp(game.missionIndex, 0, CAMPAIGN_MISSIONS.length - 1);
  return CAMPAIGN_MISSIONS[index];
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

function upgradeTierData(id) {
  const upgrade = UPGRADE_DEFINITIONS.find((item) => item.id === id);
  const tier = THREE.MathUtils.clamp(campaign.upgrades[id] ?? 0, 0, upgrade?.tiers.length ?? 0);
  return tier > 0 ? upgrade.tiers[tier - 1] : {};
}

function upgradeStats() {
  const armor = upgradeTierData('armor');
  const capacitor = upgradeTierData('capacitor');
  const guidance = upgradeTierData('guidance');
  const fieldRepair = upgradeTierData('fieldRepair');
  return {
    maxHullBonus: armor.maxHullBonus ?? 0,
    fireDelayMultiplier: capacitor.fireDelayMultiplier ?? 1,
    guidanceBonus: guidance.guidanceBonus ?? 0,
    hitAssistBonus: guidance.hitAssistBonus ?? 0,
    repairBonus: fieldRepair.repairBonus ?? 0
  };
}

function maxHull() {
  return BASE_HULL + upgradeStats().maxHullBonus;
}

function missionFireDelay(mission) {
  return mission.fireDelay * upgradeStats().fireDelayMultiplier;
}

function missionHitAssist(mission) {
  return mission.hitAssist + upgradeStats().hitAssistBonus;
}

function shellGuidanceStrength(base) {
  return base + upgradeStats().guidanceBonus;
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
  objectives.length = 0;

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
  if (mission.extras === 'glass') buildGlassMap();
  if (mission.extras === 'decoy') buildDecoyMap();
  if (mission.extras === 'mesa') buildMesaMap();
  if (mission.extras === 'eclipse') buildEclipseMap();
  if (mission.extras === 'command') buildCommandMap();
  if (mission.extras === 'gate') buildGateMap();
  buildObjectiveProps(mission);
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

function buildGlassMap() {
  buildStormMap();
  const half = halfWorld();
  for (let i = 0; i < 12; i += 1) {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(random(0.35, 0.85), 0), materials.objectiveCore);
    shard.position.set(random(-half * 0.62, half * 0.62), random(0.45, 1.3), random(-half * 0.62, half * 0.62));
    if (shard.position.length() < 14) shard.position.normalize().multiplyScalar(random(18, 28));
    shard.rotation.set(random(0, Math.PI), random(0, Math.PI), random(0, Math.PI));
    shard.castShadow = true;
    worldGroup.add(shard);
  }
}

function buildDecoyMap() {
  const half = halfWorld();
  const bunker = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(9, 1.2, 7), materials.darkerSand);
  base.position.y = 0.6;
  base.castShadow = true;
  base.receiveShadow = true;
  bunker.add(base);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 8.6, 6), materials.tower);
  mast.position.y = 5;
  mast.castShadow = true;
  bunker.add(mast);
  const dish = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.12, 6, 16), materials.towerLit);
  dish.position.y = 9.4;
  dish.rotation.x = Math.PI / 2;
  bunker.add(dish);
  const lamp = new THREE.PointLight(0xff9a58, 1.8, 24);
  lamp.position.y = 9.4;
  bunker.add(lamp);
  bunker.position.set(0, 0, -12);
  worldGroup.add(bunker);

  for (let i = 0; i < 5; i += 1) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(random(7, 13), random(1.4, 2.4), random(1.5, 2.6)), materials.mountain);
    const angle = (i / 5) * Math.PI * 2 + 0.25;
    wall.position.set(Math.sin(angle) * half * 0.48, wall.geometry.parameters.height * 0.5, Math.cos(angle) * half * 0.48);
    wall.rotation.y = -angle + random(-0.25, 0.25);
    wall.castShadow = true;
    wall.receiveShadow = true;
    worldGroup.add(wall);
  }
}

function buildMesaMap() {
  const half = halfWorld();
  for (let i = 0; i < 7; i += 1) {
    const mesa = new THREE.Mesh(new THREE.CylinderGeometry(random(5, 10), random(7, 13), random(2.2, 5.4), 6), materials.mountain);
    const angle = (i / 7) * Math.PI * 2 + random(-0.12, 0.12);
    const radius = random(half * 0.22, half * 0.68);
    mesa.position.set(Math.sin(angle) * radius, mesa.geometry.parameters.height * 0.48, Math.cos(angle) * radius);
    mesa.rotation.y = random(0, Math.PI);
    mesa.scale.y = random(0.75, 1.35);
    mesa.castShadow = true;
    mesa.receiveShadow = true;
    worldGroup.add(mesa);
  }
}

function buildEclipseMap() {
  buildBeaconMap();
  const half = halfWorld();
  for (let i = 0; i < 4; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(random(5.5, 8.5), 0.16, 6, 18), materials.objectiveDark);
    const angle = Math.PI / 4 + (i / 4) * Math.PI * 2;
    ring.position.set(Math.sin(angle) * half * 0.42, 0.16, Math.cos(angle) * half * 0.42);
    ring.rotation.x = Math.PI / 2;
    ring.receiveShadow = true;
    worldGroup.add(ring);
  }
}

function buildCommandMap() {
  [
    new THREE.Vector3(-20, 0, -18),
    new THREE.Vector3(21, 0, -14),
    new THREE.Vector3(-12, 0, 22),
    new THREE.Vector3(18, 0, 18)
  ].forEach((position, index) => {
    const tower = createRelayTower(index);
    tower.group.position.copy(position);
    tower.health = 125;
    worldGroup.add(tower.group);
    towers.push(tower);
  });

  for (let i = 0; i < 5; i += 1) {
    const bunker = new THREE.Mesh(new THREE.BoxGeometry(6, 1.1, 4.5), materials.darkerSand);
    bunker.position.set(random(-26, 26), 0.55, random(-26, 26));
    if (bunker.position.length() < 10) bunker.position.normalize().multiplyScalar(14);
    bunker.rotation.y = random(0, Math.PI);
    bunker.castShadow = true;
    bunker.receiveShadow = true;
    worldGroup.add(bunker);
  }
}

function buildObjectiveProps(mission) {
  const script = mission.objectiveScript ?? {};
  if (mission.objectiveType === 'collect') {
    objectivePositions(script.total ?? 3, halfWorld(mission) * 0.44, -0.35).forEach((position, index) => {
      const marker = createObjectiveMarker('core', index);
      marker.position.copy(position);
      worldGroup.add(marker);
      objectives.push({ type: 'core', index, group: marker, active: true });
    });
  }

  if (mission.objectiveType === 'activate') {
    const radius = (script.nodes ?? 1) === 1 ? 13 : halfWorld(mission) * 0.4;
    objectivePositions(script.nodes ?? 1, radius, 0.1).forEach((position, index) => {
      const marker = createObjectiveMarker('beacon', index);
      marker.position.copy(position);
      worldGroup.add(marker);
      objectives.push({ type: 'beacon', index, group: marker, active: false });
    });
  }

  if (mission.objectiveType === 'boss' && script.pylons) {
    objectivePositions(script.pylons, halfWorld(mission) * 0.38, Math.PI).forEach((position, index) => {
      const marker = createObjectiveMarker('pylon', index);
      marker.position.copy(position);
      worldGroup.add(marker);
      objectives.push({ type: 'pylon', index, group: marker, active: true });
    });
  }
}

function objectivePositions(count, radius, offset = 0) {
  if (count === 1) return [new THREE.Vector3(0, 0, -radius)];
  return Array.from({ length: count }, (_, index) => {
    const angle = offset + (index / count) * Math.PI * 2;
    return new THREE.Vector3(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
  });
}

function createObjectiveMarker(kind, index) {
  const group = new THREE.Group();
  const baseRadius = kind === 'pylon' ? 2.4 : 2.9;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(baseRadius, baseRadius * 1.14, 0.34, 8), materials.objectiveDark);
  base.position.y = 0.17;
  base.receiveShadow = true;
  group.add(base);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(baseRadius * 1.18, 0.08, 6, 18), materials.objectiveActive);
  ring.position.y = 0.42;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const coreGeometry = kind === 'pylon'
    ? new THREE.ConeGeometry(0.8, 5.8, 5)
    : new THREE.OctahedronGeometry(kind === 'core' ? 1.1 : 0.72, 0);
  const core = new THREE.Mesh(coreGeometry, kind === 'core' ? materials.objectiveCore : materials.objectiveActive);
  core.position.y = kind === 'pylon' ? 3.2 : 1.55;
  core.castShadow = true;
  group.add(core);

  const light = new THREE.PointLight(kind === 'core' ? 0xf3bd55 : 0x7de0c5, kind === 'pylon' ? 1.9 : 1.35, kind === 'pylon' ? 20 : 15);
  light.position.y = kind === 'pylon' ? 4.6 : 1.8;
  group.add(light);

  group.userData = { kind, index, base, ring, core, light };
  return group;
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

function createUfo(mission, options = {}) {
  const group = new THREE.Group();
  const type = options.type ?? pickUfoType(mission);
  const profile = UFO_TYPES[type] ?? UFO_TYPES.scout;
  const difficulty = difficultyProfile();
  const bossScale = options.isBoss ? 1.22 : 1;
  const radius = random(1.55 + (profile.radiusBonus ?? 0), 2.1 + (profile.radiusBonus ?? 0)) * bossScale;
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
  const speed = random(mission.speed[0], mission.speed[1]) * profile.speed * difficulty.speed * (options.isBoss ? 0.68 : 1);
  const limit = ufoLimit(mission);
  const span = Math.max(26, halfWorld(mission) - 10);
  const pos = new THREE.Vector3();
  const vel = new THREE.Vector3();

  if (options.isBoss) {
    pos.set(random(-span * 0.28, span * 0.28), altitude + 2.2, -limit + 6);
    vel.set(random(-0.7, 0.7), random(-0.08, 0.08), Math.max(2.8, speed));
  } else if (side === 0) {
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
  if (options.isBoss) group.scale.setScalar(1.08);
  scene.add(group);

  const hp = options.isBoss
    ? options.hp ?? 8
    : Math.max(1, (mission.maxUfoHp > 1 && Math.random() > 0.55 ? 2 : 1) + profile.hpBonus);

  return {
    group,
    beam,
    shield,
    velocity: vel,
    radius: radius * 1.55,
    hitRadius: radius * profile.hit + missionHitAssist(mission) * assistProfile().radius,
    hp,
    maxHp: hp,
    isBoss: Boolean(options.isBoss),
    phaseTriggered: false,
    type,
    profile,
    lateralForce: profile.lateral ?? 0,
    beamPower: profile.beam,
    wobble: random(0, Math.PI * 2),
    wobbleSpeed: profile.wobble,
    value: Math.round(mission.score * profile.value * difficulty.score * (options.isBoss ? 2.4 : 1))
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
    unlockAudio();
    playSfx('ui');
    if (game.over || game.completed) {
      game.score = 0;
      game.hull = maxHull();
      game.over = false;
      game.completed = false;
    }
    startMission();
  });

  ui.campaignContinueButton.addEventListener('click', () => {
    unlockAudio();
    playSfx('ui');
    if (campaign.currentMission >= CAMPAIGN_MISSIONS.length) showCampaignView('timeline');
    else selectMission(campaign.currentMission);
  });
  ui.campaignTimelineButton.addEventListener('click', () => {
    playSfx('ui');
    showCampaignView('timeline');
  });
  ui.campaignHangarButton.addEventListener('click', () => {
    playSfx('ui');
    showCampaignView('hangar');
  });
  ui.campaignOptionsButton.addEventListener('click', () => {
    playSfx('ui');
    ui.pausePanel.classList.remove('is-hidden');
    showOptions(true);
  });
  ui.timelineBackButton.addEventListener('click', () => showCampaignView('home'));
  ui.hangarBackButton.addEventListener('click', () => showCampaignView('home'));
  ui.briefingBackButton.addEventListener('click', () => showCampaignView('timeline'));
  ui.debriefContinueButton.addEventListener('click', () => {
    if (game.lastDebrief && !game.lastDebrief.success) {
      const retryIndex = CAMPAIGN_MISSIONS.findIndex((mission) => mission.id === game.lastDebrief.missionId);
      selectMission(Math.max(0, retryIndex));
      return;
    }
    if (campaign.currentMission >= CAMPAIGN_MISSIONS.length) showCampaignView('timeline');
    else selectMission(campaign.currentMission);
  });
  ui.debriefHangarButton.addEventListener('click', () => showCampaignView('hangar'));
  ui.debriefTimelineButton.addEventListener('click', () => showCampaignView('timeline'));

  ui.resumeButton.addEventListener('click', () => setPaused(false));
  ui.optionsButton.addEventListener('click', () => showOptions(true));
  ui.optionsBackButton.addEventListener('click', () => showOptions(false));
  ui.restartButton.addEventListener('click', () => {
    setPaused(false);
    game.score = 0;
    game.hull = maxHull();
    game.over = false;
    game.completed = false;
    beginMission(currentMission());
  });
  ui.levelSelectButton.addEventListener('click', () => {
    setPaused(false);
    game.active = false;
    game.over = false;
    resetMissionState();
    buildWorld(currentMission());
    showCampaignView('timeline');
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
  CAMPAIGN_MISSIONS.forEach((mission, index) => {
    const locked = index > campaign.unlockedMission;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = locked ? 'level-card is-locked' : 'level-card';
    button.dataset.levelIndex = String(index);
    if (index === game.missionIndex) button.classList.add('is-selected');
    button.disabled = locked;

    const title = document.createElement('strong');
    title.textContent = mission.title.replace(': ', ' - ');
    const map = document.createElement('span');
    map.textContent = mission.mapName + ' / ' + missionWorldSize(mission) + 'm map';
    const objective = document.createElement('span');
    objective.textContent = mission.objective;
    const progress = document.createElement('span');
    progress.className = 'level-progress';
    progress.textContent = campaign.completed[mission.id]
      ? 'Complete / ' + (campaign.medals[mission.id] ?? 'bronze').toUpperCase()
      : locked
        ? 'Locked'
        : index === campaign.currentMission
          ? 'Next sortie'
          : 'Unlocked';
    button.append(title, map, objective, progress);
    button.addEventListener('click', () => selectMission(index));
    ui.levelPicker.append(button);
  });
}

function showCampaignView(view) {
  const panels = {
    home: ui.campaignHome,
    timeline: ui.campaignTimeline,
    hangar: ui.campaignHangar,
    briefing: ui.campaignBriefing,
    debrief: ui.campaignDebrief
  };

  for (const [name, panel] of Object.entries(panels)) {
    panel.classList.toggle('is-hidden', name !== view);
  }

  renderCampaignHome();
  renderLevelPicker();
  renderHangar();
  ui.startPanel.classList.remove('is-hidden');
  ui.panelKicker.textContent = view === 'home' ? 'Operation Skybreak' : currentMission().act;
  ui.panelTitle.textContent = view === 'home' ? 'Operation Skybreak' : 'Campaign';
  ui.panelBody.textContent = view === 'home'
    ? 'A ten-mission pulpy sci-fi campaign of briefings, radio chatter, salvage upgrades, and bigger saucers.'
    : 'Choose the next sortie, tune the tank, or launch from the briefing room.';
}

function renderCampaignHome() {
  const mission = CAMPAIGN_MISSIONS[Math.min(campaign.currentMission, CAMPAIGN_MISSIONS.length - 1)];
  const completedCount = Object.keys(campaign.completed).length;
  ui.campaignStatus.innerHTML = '';

  const status = document.createElement('div');
  status.className = 'campaign-status-line';
  status.innerHTML = '<strong>' + completedCount + '/' + CAMPAIGN_MISSIONS.length + '</strong><span>missions complete</span>';

  const next = document.createElement('div');
  next.className = 'campaign-status-line';
  next.innerHTML = '<strong>' + mission.title + '</strong><span>' + (campaign.currentMission >= CAMPAIGN_MISSIONS.length ? 'Campaign complete' : mission.objective) + '</span>';

  const bank = document.createElement('div');
  bank.className = 'campaign-status-line';
  bank.innerHTML = '<strong>' + campaign.salvage + '</strong><span>salvage available</span>';

  ui.campaignStatus.append(status, next, bank);
  ui.campaignContinueButton.textContent = campaign.currentMission >= CAMPAIGN_MISSIONS.length ? 'Review Timeline' : 'Continue Campaign';
}

function showBriefing() {
  const mission = currentMission();
  ui.briefingKicker.textContent = mission.act;
  ui.briefingTitle.textContent = mission.title;
  ui.briefingBody.textContent = mission.briefing.body;
  ui.briefingObjective.textContent = mission.objective;
  ui.briefingReward.textContent = 'Reward: ' + mission.rewards.salvage + ' salvage';
  showCampaignView('briefing');
}

function renderHangar() {
  ui.hangarSalvage.textContent = 'Salvage: ' + campaign.salvage;
  ui.hangarGrid.replaceChildren();

  for (const upgrade of UPGRADE_DEFINITIONS) {
    const tier = campaign.upgrades[upgrade.id] ?? 0;
    const nextTier = upgrade.tiers[tier];
    const card = document.createElement('article');
    card.className = 'upgrade-card';

    const title = document.createElement('strong');
    title.textContent = upgrade.title;
    const body = document.createElement('span');
    body.textContent = upgrade.body;
    const level = document.createElement('span');
    level.textContent = 'Tier ' + tier + '/3';

    const button = document.createElement('button');
    button.type = 'button';
    if (nextTier) {
      button.textContent = 'Upgrade / ' + nextTier.cost + ' salvage';
      button.disabled = campaign.salvage < nextTier.cost;
      button.addEventListener('click', () => purchaseUpgrade(upgrade.id));
    } else {
      button.textContent = 'Maxed';
      button.disabled = true;
    }

    card.append(title, body, level, button);
    ui.hangarGrid.append(card);
  }
}

function purchaseUpgrade(id) {
  const upgrade = UPGRADE_DEFINITIONS.find((item) => item.id === id);
  const tier = campaign.upgrades[id] ?? 0;
  const nextTier = upgrade?.tiers[tier];
  if (!upgrade || !nextTier || campaign.salvage < nextTier.cost) {
    playSfx('warning');
    return;
  }

  campaign.salvage -= nextTier.cost;
  campaign.upgrades[id] = tier + 1;
  game.hull = Math.min(game.hull + 8, maxHull());
  saveCampaignState();
  renderCampaignHome();
  renderHangar();
  playSfx('upgrade');
  showMessage('Hangar upgrade', upgrade.title + ' upgraded to tier ' + (tier + 1) + '.');
}

function renderDebrief(result) {
  const mission = CAMPAIGN_MISSIONS.find((item) => item.id === result.missionId) ?? currentMission();
  ui.debriefKicker.textContent = result.success ? 'Mission complete' : 'Mission failed';
  ui.debriefTitle.textContent = result.success ? mission.title + ' secured' : mission.title + ' failed';
  ui.debriefBody.textContent = result.success ? mission.debrief.success : mission.debrief.failure;
  ui.debriefStats.textContent = result.success
    ? result.medal.toUpperCase() + ' medal / +' + result.salvageEarned + ' salvage / hull ' + Math.round(game.hull) + '/' + maxHull()
    : 'Final score: ' + Math.floor(game.score) + ' / hull ' + Math.round(game.hull) + '/' + maxHull();
  ui.debriefContinueButton.textContent = result.success
    ? (campaign.currentMission >= CAMPAIGN_MISSIONS.length ? 'Review Timeline' : 'Next Briefing')
    : 'Retry Briefing';
  showCampaignView('debrief');
}

function completeCampaignMission(mission) {
  const medal = medalForMission(mission);
  const medalBonus = medal === 'gold' ? 80 : medal === 'silver' ? 40 : 15;
  const salvageEarned = mission.rewards.salvage + medalBonus;
  campaign.completed[mission.id] = true;
  campaign.medals[mission.id] = bestMedal(campaign.medals[mission.id], medal);
  campaign.salvage += salvageEarned;
  campaign.unlockedMission = Math.max(campaign.unlockedMission, Math.min(CAMPAIGN_MISSIONS.length - 1, game.missionIndex + 1));
  campaign.currentMission = Math.max(campaign.currentMission, Math.min(CAMPAIGN_MISSIONS.length, game.missionIndex + 1));
  game.unlockedMission = campaign.unlockedMission;
  saveCampaignState();
  return { success: true, medal, salvageEarned, missionId: mission.id };
}

function medalForMission(mission) {
  const hullRatio = game.hull / maxHull();
  const fast = !mission.survivalTime || game.missionElapsed <= mission.survivalTime + 18;
  if (hullRatio >= 0.78 && fast) return 'gold';
  if (hullRatio >= 0.48) return 'silver';
  return 'bronze';
}

function bestMedal(existing, next) {
  const rank = { bronze: 1, silver: 2, gold: 3 };
  if (!existing) return next;
  return rank[next] > rank[existing] ? next : existing;
}

function selectMission(index) {
  const nextIndex = THREE.MathUtils.clamp(index, 0, CAMPAIGN_MISSIONS.length - 1);
  if (nextIndex > campaign.unlockedMission) {
    playSfx('warning');
    showMessage('Mission locked', 'Complete the current campaign sortie to open this route.');
    return;
  }
  game.missionIndex = nextIndex;
  if (!campaign.completed[CAMPAIGN_MISSIONS[nextIndex].id] || nextIndex >= campaign.currentMission) {
    campaign.currentMission = nextIndex;
  }
  saveCampaignState();
  game.score = 0;
  game.hull = maxHull();
  game.over = false;
  game.completed = false;
  game.paused = false;
  game.lastDebrief = null;
  ui.pausePanel.classList.add('is-hidden');
  resetMissionState();
  buildWorld(currentMission());
  showBriefing();
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
  if (!show && !game.paused) {
    ui.pausePanel.classList.add('is-hidden');
  }
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
  unlockAudio();
  game.active = true;
  game.paused = false;
  game.over = false;
  game.completed = false;
  ui.pausePanel.classList.add('is-hidden');
  ui.startPanel.classList.add('is-hidden');
  playSfx('start');
  showMessage(mission.title, mission.intro);
  beginMission(mission);
}

function resetCampaign() {
  resetCampaignState();
  game.score = 0;
  game.missionIndex = campaign.currentMission;
  game.hull = maxHull();
  game.completed = false;
  game.over = false;
  game.paused = false;
  ui.startButton.textContent = 'Start Mission';
  resetMissionState();
  buildWorld(currentMission());
  showCampaignView('home');
}

function resetMissionState() {
  game.fireCooldown = 0;
  game.missionSpawnLeft = 0;
  game.missionSpawnTimer = 0;
  game.missionKills = 0;
  game.missionElapsed = 0;
  game.missionBreak = 0;
  game.radioFired = new Set();
  game.messageTimer = 0;
  game.shake = 0;
  objectiveState = {};

  [...ufos, ...shells, ...sparks, ...objectives].forEach((entity) => {
    scene.remove(entity.group ?? entity.mesh);
  });
  ufos.length = 0;
  shells.length = 0;
  sparks.length = 0;
  objectives.length = 0;

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
  initObjectiveState(mission);
  game.active = true;
  game.paused = false;
  ui.pausePanel.classList.add('is-hidden');
  game.missionSpawnLeft = mission.ufoTotal;
  game.missionSpawnTimer = mission.firstSpawn;
  showMessage(mission.title, mission.objective);
  fireRadioEvent(mission.radioEvents.find((event) => event.trigger === 'start'));
  updateHud();
}

function completeMission() {
  const mission = currentMission();
  game.active = false;
  game.paused = false;
  game.completed = true;
  game.missionBreak = 0;
  clearThreats();
  showMessage('Objective complete', mission.success);
  game.lastDebrief = completeCampaignMission(mission);
  game.hull = Math.min(maxHull(), game.hull + 20 + upgradeStats().repairBonus);
  game.missionIndex = Math.min(campaign.currentMission, CAMPAIGN_MISSIONS.length - 1);
  buildWorld(currentMission());
  playSfx('complete');
  renderDebrief(game.lastDebrief);
}

function clearThreats() {
  [...ufos, ...shells].forEach((entity) => scene.remove(entity.group ?? entity.mesh));
  ufos.length = 0;
  shells.length = 0;
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
    assistStrength: assistedTarget ? shellGuidanceStrength(game.missionIndex === 0 ? 0.13 : 0.075) : 0
  });

  game.fireCooldown = missionFireDelay(mission);
  game.shake = Math.max(game.shake, 0.09);
  spawnSparks(origin, new THREE.Color(0xffe2a0), 7, 0.42);
  playSfx('fire');
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

  updateObjectives(dt, mission);
  triggerRadioEvents(mission);

  if (isMissionComplete(mission)) {
    completeMission();
    return;
  } else if (mission.timeLimit && game.missionElapsed >= mission.timeLimit) {
    endGame('Storm corridor closed', 'The mission timer expired before the UFO objective was complete.');
  } else if (shouldFailForEmptySky(mission)) {
    endGame('Objective failed', 'Too many UFOs escaped before the mission target was complete.');
  }
}

function initObjectiveState(mission) {
  const script = mission.objectiveScript ?? {};
  objectiveState = {
    type: mission.objectiveType,
    radioKeys: new Set(),
    carrying: null,
    returned: 0,
    collected: Array(script.total ?? 0).fill(false),
    progress: Array(script.nodes ?? 0).fill(0),
    activated: Array(script.nodes ?? 0).fill(false),
    pylons: Array(script.pylons ?? 0).fill(false),
    pylonsDisabled: 0,
    bossSpawned: false,
    bossDestroyed: false,
    bossPhase: 0
  };
}

function updateObjectives(dt, mission) {
  if (mission.objectiveType === 'collect') updateCollectObjective(mission);
  if (mission.objectiveType === 'activate') updateActivateObjective(dt, mission);
  if (mission.objectiveType === 'boss') updateBossObjective(dt, mission);
  animateObjectiveProps(dt);
}

function updateCollectObjective(mission) {
  const script = mission.objectiveScript ?? {};
  const pickupRadius = script.pickupRadius ?? 4.2;
  const returnRadius = script.returnRadius ?? 8;

  if (objectiveState.carrying === null) {
    for (const objective of objectives.filter((item) => item.type === 'core')) {
      if (objectiveState.collected[objective.index]) continue;
      if (distanceXZ(tank.group.position, objective.group.position) <= pickupRadius) {
        objectiveState.carrying = objective.index;
        objectiveState.collected[objective.index] = true;
        objective.active = false;
        objective.group.visible = false;
        setObjectiveRadio('collectOne');
        showMessage('Core aboard', 'Return to the central pad to bank the alien core.');
        playSfx('upgrade');
        break;
      }
    }
  } else if (distanceXZ(tank.group.position, new THREE.Vector3(0, 0, 0)) <= returnRadius) {
    objectiveState.returned += 1;
    objectiveState.carrying = null;
    showMessage('Core recovered', objectiveState.returned + '/' + (script.total ?? 3) + ' alien cores banked.');
    playSfx('complete');
    if (objectiveState.returned >= (script.total ?? 3)) setObjectiveRadio('collectAll');
  }
}

function updateActivateObjective(dt, mission) {
  const script = mission.objectiveScript ?? {};
  const nodes = script.nodes ?? 1;
  const radius = script.radius ?? 6;
  const holdTime = script.holdTime ?? 2.2;
  const requireContinuous = script.requireContinuous ?? true;

  for (const objective of objectives.filter((item) => item.type === 'beacon')) {
    const index = objective.index;
    if (objectiveState.activated[index]) continue;
    const near = distanceXZ(tank.group.position, objective.group.position) <= radius;
    if (near) {
      objectiveState.progress[index] = Math.min(holdTime, objectiveState.progress[index] + dt);
      if (objectiveState.progress[index] >= holdTime) {
        objectiveState.activated[index] = true;
        objective.active = true;
        objective.group.userData.light.intensity = 2.4;
        showMessage('Beacon locked', activatedCount() + '/' + nodes + ' nodes linked.');
        playSfx('complete');
      }
    } else if (requireContinuous) {
      objectiveState.progress[index] = Math.max(0, objectiveState.progress[index] - dt * 0.7);
    }
  }

  if (activatedCount() >= Math.ceil(nodes / 2)) setObjectiveRadio('activateHalf');
}

function updateBossObjective(dt, mission) {
  const script = mission.objectiveScript ?? {};
  const bossDelay = script.bossSpawnDelay ?? 6;
  const escortKills = script.escortKills ?? 0;
  const pylonsDone = !script.pylons || objectiveState.pylonsDisabled >= script.pylons;
  const escortsDone = game.missionKills >= escortKills;

  if (!objectiveState.bossSpawned && pylonsDone && escortsDone && game.missionElapsed >= bossDelay) {
    const boss = createUfo(mission, {
      type: script.bossType ?? 'carrier',
      hp: script.bossHp ?? 8,
      isBoss: true
    });
    ufos.push(boss);
    objectiveState.bossSpawned = true;
    showMessage('Boss contact', 'Carrier-class UFO entering the battle space.');
    playSfx('warning');
  }
}

function animateObjectiveProps(dt) {
  for (const objective of objectives) {
    const { group } = objective;
    group.rotation.y += dt * (objective.type === 'pylon' ? 0.4 : 0.8);
    if (objective.type === 'beacon') {
      const progress = objectiveState.progress?.[objective.index] ?? 0;
      const holdTime = currentMission().objectiveScript?.holdTime ?? 1;
      group.userData.ring.scale.setScalar(1 + Math.min(0.42, progress / holdTime * 0.42));
    }
    if (objective.type === 'core') {
      group.userData.core.position.y = 1.55 + Math.sin(timer.getElapsed() * 2.4 + objective.index) * 0.22;
    }
  }
}

function hitObjectiveWithShell(shell) {
  if (currentMission().objectiveType !== 'boss') return false;
  for (const objective of objectives.filter((item) => item.type === 'pylon')) {
    if (!objective.active) continue;
    if (shell.mesh.position.distanceTo(objective.group.position.clone().setY(shell.mesh.position.y)) < 3.2) {
      disablePylon(objective.index, shell.mesh.position);
      return true;
    }
  }
  return false;
}

function disablePylon(index, position) {
  if (objectiveState.pylons?.[index]) return;
  objectiveState.pylons[index] = true;
  objectiveState.pylonsDisabled += 1;
  const objective = objectives.find((item) => item.type === 'pylon' && item.index === index);
  if (objective) {
    objective.active = false;
    objective.group.userData.light.intensity = 0.2;
    objective.group.userData.core.material = materials.objectiveDark;
    objective.group.scale.y = 0.45;
  }
  spawnSparks(position, new THREE.Color(0x9ffff0), 26, 1.8);
  game.score += 75;
  showMessage('Pylon shattered', objectiveState.pylonsDisabled + '/' + objectiveState.pylons.length + ' gate pylons down.');
  playSfx('explosion');
  if (objectiveState.pylonsDisabled >= objectiveState.pylons.length) setObjectiveRadio('collectAll');
}

function activatedCount() {
  return objectiveState.activated?.filter(Boolean).length ?? 0;
}

function setObjectiveRadio(key) {
  objectiveState.radioKeys?.add(key);
}

function isMissionComplete(mission) {
  if (mission.objectiveType === 'destroy') return game.missionKills >= mission.destroyTarget;
  if (mission.objectiveType === 'protect') return game.missionKills >= mission.destroyTarget && !allTowersDestroyed();
  if (mission.objectiveType === 'survive') {
    return game.missionElapsed >= mission.survivalTime && game.missionKills >= mission.destroyTarget;
  }
  if (mission.objectiveType === 'collect') {
    const total = mission.objectiveScript?.total ?? 0;
    return objectiveState.returned >= total && game.missionKills >= mission.destroyTarget;
  }
  if (mission.objectiveType === 'activate') {
    const nodes = mission.objectiveScript?.nodes ?? 0;
    return activatedCount() >= nodes && game.missionKills >= mission.destroyTarget;
  }
  if (mission.objectiveType === 'boss') {
    const pylons = mission.objectiveScript?.pylons ?? 0;
    return objectiveState.bossDestroyed && objectiveState.pylonsDisabled >= pylons;
  }
  return false;
}

function shouldFailForEmptySky(mission) {
  if (game.missionSpawnLeft > 0 || ufos.length > 0) return false;
  if (mission.objectiveType === 'boss') {
    const escortKills = mission.objectiveScript?.escortKills ?? 0;
    return !objectiveState.bossSpawned && game.missionKills < escortKills;
  }
  if (mission.objectiveType === 'collect' || mission.objectiveType === 'activate') {
    return game.missionKills < mission.destroyTarget;
  }
  return game.missionKills < mission.destroyTarget;
}

function triggerRadioEvents(mission) {
  for (const event of mission.radioEvents ?? []) {
    if (event.trigger === 'start') continue;
    if (event.trigger === 'time' && game.missionElapsed >= event.at) fireRadioEvent(event);
    if (event.trigger === 'kills' && game.missionKills >= event.count) fireRadioEvent(event);
    if (event.trigger === 'hull' && game.hull <= maxHull() * ((event.below ?? 50) / 100)) fireRadioEvent(event);
    if (event.trigger === 'objective' && objectiveState.radioKeys?.has(event.key)) fireRadioEvent(event);
    if (event.trigger === 'bossPhase' && (objectiveState.bossPhase ?? 0) >= event.phase) fireRadioEvent(event);
  }
}

function fireRadioEvent(event) {
  if (!event || game.radioFired.has(event.id)) return;
  game.radioFired.add(event.id);
  showMessage(event.speaker + ' / ' + event.title, event.body);
  playSfx('radio');
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
      playSfx('hit');

      if (ufo.hp <= 0) {
        destroyUfo(hitIndex);
      } else {
        if (ufo.isBoss && !ufo.phaseTriggered && ufo.hp <= ufo.maxHp * 0.5) {
          ufo.phaseTriggered = true;
          objectiveState.bossPhase = Math.max(objectiveState.bossPhase ?? 0, 1);
        }
        ufo.group.scale.multiplyScalar(0.92);
        ufo.velocity.multiplyScalar(1.08);
      }
    } else if (hitObjectiveWithShell(shell)) {
      scene.remove(shell.mesh);
      shells.splice(i, 1);
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
      if (towerTarget.health < 62) setObjectiveRadio('towerDamaged');
      towerTarget.group.scale.y = THREE.MathUtils.lerp(0.82, 1, Math.max(0, towerTarget.health / 100));
      if (Math.random() < dt * 8) {
        spawnSparks(towerTarget.group.position.clone().add(new THREE.Vector3(random(-0.6, 0.6), 3.3, random(-0.6, 0.6))), new THREE.Color(0x7de0c5), 2, 0.55);
      }
      if (allTowersDestroyed()) endGame('Relay lost', 'All relay towers were burned down. Restart and intercept saucers earlier.');
    } else if (attackingTank) {
      pulseBeam(ufo);
      game.hull -= mission.beamDamage * damageMultiplier * dt;
      if (game.hull < maxHull() * 0.28 && Math.random() < dt * 1.8) playSfx('warning');
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
  game.hull = Math.min(maxHull(), game.hull + 2);
  game.shake = Math.max(game.shake, 0.2);
  if (ufo.isBoss) {
    objectiveState.bossDestroyed = true;
    objectiveState.bossPhase = Math.max(objectiveState.bossPhase ?? 0, 2);
    showMessage('Carrier down', 'Boss craft destroyed. +' + ufo.value + ' points.');
    playSfx('explosion');
  } else {
    showMessage('Target down', game.missionKills + '/' + mission.destroyTarget + ' objective kills. +' + ufo.value + ' points.');
    playSfx('explosion');
  }
}

function damageHull(amount) {
  game.hull -= amount;
  game.shake = Math.max(game.shake, 0.18);
  if (game.hull < maxHull() * 0.32) playSfx('warning');
  if (game.hull <= 0) endGame('Base overrun', 'Too many saucers escaped the defense grid.');
}

function endGame(title, body) {
  const mission = currentMission();
  game.hull = Math.max(0, game.hull);
  game.over = true;
  game.active = false;
  game.paused = false;
  game.completed = false;
  ui.pausePanel.classList.add('is-hidden');
  clearThreats();
  game.lastDebrief = { success: false, missionId: mission.id };
  showMessage(title, body);
  renderDebrief(game.lastDebrief);
  playSfx('warning');
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
  ui.hull.style.transform = 'scaleX(' + THREE.MathUtils.clamp(game.hull / maxHull(), 0, 1) + ')';
  ui.charge.style.transform = 'scaleX(' + (1 - THREE.MathUtils.clamp(game.fireCooldown / missionFireDelay(mission), 0, 1)) + ')';
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
  if (mission.objectiveType === 'collect') {
    const total = mission.objectiveScript?.total ?? 0;
    const cargo = objectiveState.carrying === null ? 'No core loaded' : 'Core loaded: return to pad';
    return objectiveState.returned + '/' + total + ' cores recovered. ' + game.missionKills + '/' + mission.destroyTarget + ' UFOs down. ' + cargo + '.';
  }
  if (mission.objectiveType === 'activate') {
    const nodes = mission.objectiveScript?.nodes ?? 0;
    return activatedCount() + '/' + nodes + ' beacons locked. ' + game.missionKills + '/' + mission.destroyTarget + ' UFOs down.';
  }
  if (mission.objectiveType === 'boss') {
    const pylons = mission.objectiveScript?.pylons ?? 0;
    const escortTarget = mission.objectiveScript?.escortKills ?? mission.destroyTarget;
    if (pylons > 0 && objectiveState.pylonsDisabled < pylons) {
      return objectiveState.pylonsDisabled + '/' + pylons + ' pylons down. Shoot the glowing gate pylons.';
    }
    if (!objectiveState.bossSpawned) return game.missionKills + '/' + escortTarget + ' escorts down. Carrier inbound.';
    return objectiveState.bossDestroyed ? 'Carrier destroyed. Stand by for debrief.' : 'Carrier engaged. Keep shells on the shielded hull.';
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

function defaultCampaignState() {
  return {
    currentMission: 0,
    unlockedMission: 0,
    completed: {},
    medals: {},
    salvage: 0,
    upgrades: Object.fromEntries(UPGRADE_DEFINITIONS.map((upgrade) => [upgrade.id, 0]))
  };
}

function loadCampaignState() {
  const fallback = defaultCampaignState();
  if (typeof localStorage === 'undefined') return fallback;

  try {
    const stored = JSON.parse(localStorage.getItem(CAMPAIGN_SAVE_KEY) ?? 'null');
    if (stored) return normalizeCampaignState({ ...fallback, ...stored });
  } catch {
    return fallback;
  }

  const legacyUnlocked = Number(localStorage.getItem(LEGACY_PROGRESS_KEY));
  if (Number.isFinite(legacyUnlocked) && legacyUnlocked > 0) {
    const migrated = defaultCampaignState();
    migrated.unlockedMission = THREE.MathUtils.clamp(Math.floor(legacyUnlocked), 0, CAMPAIGN_MISSIONS.length - 1);
    migrated.currentMission = migrated.unlockedMission;
    for (let index = 0; index < migrated.unlockedMission; index += 1) {
      const mission = CAMPAIGN_MISSIONS[index];
      migrated.completed[mission.id] = true;
      migrated.medals[mission.id] = 'bronze';
    }
    localStorage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(migrated));
    return migrated;
  }

  return fallback;
}

function normalizeCampaignState(state) {
  const normalized = defaultCampaignState();
  normalized.currentMission = THREE.MathUtils.clamp(Math.floor(Number(state.currentMission) || 0), 0, CAMPAIGN_MISSIONS.length);
  normalized.unlockedMission = THREE.MathUtils.clamp(Math.floor(Number(state.unlockedMission) || 0), 0, CAMPAIGN_MISSIONS.length - 1);
  normalized.salvage = Math.max(0, Math.floor(Number(state.salvage) || 0));

  const validIds = new Set(CAMPAIGN_MISSIONS.map((mission) => mission.id));
  for (const [id, completed] of Object.entries(state.completed ?? {})) {
    if (validIds.has(id) && completed) normalized.completed[id] = true;
  }
  for (const [id, medal] of Object.entries(state.medals ?? {})) {
    if (validIds.has(id) && ['bronze', 'silver', 'gold'].includes(medal)) normalized.medals[id] = medal;
  }
  for (const upgrade of UPGRADE_DEFINITIONS) {
    normalized.upgrades[upgrade.id] = THREE.MathUtils.clamp(Math.floor(Number(state.upgrades?.[upgrade.id]) || 0), 0, upgrade.tiers.length);
  }

  return normalized;
}

function saveCampaignState() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(campaign));
}

function resetCampaignState() {
  const fresh = defaultCampaignState();
  for (const key of Object.keys(campaign)) delete campaign[key];
  Object.assign(campaign, fresh);
  saveCampaignState();
}

function unlockAudio() {
  if (typeof window === 'undefined') return;
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audioContext = new AudioCtor();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
}

function playSfx(type) {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const output = audioContext.createGain();
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(0.08, now + 0.012);
  output.gain.exponentialRampToValueAtTime(0.0001, now + sfxLength(type));
  output.connect(audioContext.destination);

  const osc = audioContext.createOscillator();
  osc.type = type === 'explosion' ? 'sawtooth' : type === 'radio' ? 'square' : 'triangle';
  const [start, end] = sfxFrequencies(type);
  osc.frequency.setValueAtTime(start, now);
  osc.frequency.exponentialRampToValueAtTime(end, now + Math.max(0.04, sfxLength(type) * 0.82));
  osc.connect(output);
  osc.start(now);
  osc.stop(now + sfxLength(type));

  if (type === 'explosion' || type === 'fire') {
    const second = audioContext.createOscillator();
    second.type = 'square';
    second.frequency.setValueAtTime(type === 'fire' ? 92 : 52, now);
    second.frequency.exponentialRampToValueAtTime(type === 'fire' ? 46 : 28, now + sfxLength(type));
    second.connect(output);
    second.start(now);
    second.stop(now + sfxLength(type));
  }
}

function sfxLength(type) {
  return {
    ui: 0.08,
    start: 0.22,
    fire: 0.13,
    hit: 0.12,
    explosion: 0.34,
    warning: 0.18,
    upgrade: 0.24,
    complete: 0.28,
    radio: 0.16
  }[type] ?? 0.1;
}

function sfxFrequencies(type) {
  return {
    ui: [640, 980],
    start: [180, 620],
    fire: [220, 92],
    hit: [740, 310],
    explosion: [130, 46],
    warning: [320, 210],
    upgrade: [420, 1100],
    complete: [360, 880],
    radio: [900, 520]
  }[type] ?? [440, 660];
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
