import { Simulation, Creature, Genome } from './simulation/engine.js';

// Global Simulation State
let sim = new Simulation(1200, 800);
let isSimulating = false;
let simSpeed = 1;
let animationFrameId = null;

// UI Elements
const currentTickEl = document.getElementById('current-tick');
const totalPopulationEl = document.getElementById('total-population');
const btnToggleSim = document.getElementById('btn-toggle-sim');
const btnResetSim = document.getElementById('btn-reset-sim');
const btnRunHeadless = document.getElementById('btn-run-headless');
const speedSlider = document.getElementById('speed-slider');
const speedValEl = document.getElementById('speed-val');

// Event buttons
const btnMeteor = document.getElementById('btn-event-meteor');
const btnIce = document.getElementById('btn-event-ice');
const btnVolcano = document.getElementById('btn-event-volcano');

// Organism Injector
const designerDiet = document.getElementById('designer-diet');
const designerSpeed = document.getElementById('designer-speed');
const designerColor = document.getElementById('designer-color');
const btnSpawnCustom = document.getElementById('btn-spawn-custom');

// Canvas Elements
const worldCanvas = document.getElementById('world-canvas');
const worldCtx = worldCanvas.getContext('2d');
const migrationCanvas = document.getElementById('migration-canvas');
const migrationCtx = migrationCanvas.getContext('2d');

// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
let activeTab = 'world';

// Charts Canvases
const popChartCanvas = document.getElementById('pop-chart');
const popCtx = popChartCanvas.getContext('2d');
const traitsChartCanvas = document.getElementById('traits-chart');
const traitsCtx = traitsChartCanvas.getContext('2d');
const extinctionList = document.getElementById('extinction-list');

// Resize handlers
function resizeCanvases() {
  const wrapper = worldCanvas.parentElement;
  worldCanvas.width = wrapper.clientWidth;
  worldCanvas.height = wrapper.clientHeight;
  migrationCanvas.width = wrapper.clientWidth;
  migrationCanvas.height = wrapper.clientHeight;
}

window.addEventListener('resize', resizeCanvases);

// Initialize tab switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));
    
    btn.classList.add('active');
    activeTab = btn.getAttribute('data-tab');
    document.getElementById(`tab-${activeTab}`).classList.add('active');

    if (activeTab === 'tree') {
      renderAncestryTree();
    } else if (activeTab === 'history') {
      renderCharts();
    } else if (activeTab === 'migration') {
      renderMigrationHeatmap();
    }
  });
});

// Load state from local storage or server JSON
async function initEcosystem() {
  resizeCanvases();
  
  // Try loading from data/state.json (committed in git)
  try {
    const response = await fetch('/data/state.json');
    if (response.ok) {
      const data = await response.json();
      sim.loadState(data);
      console.log('Successfully loaded simulation state from Git history!');
    } else {
      console.log('No state.json found, generating fresh ecosystem');
      sim.init(40);
    }
  } catch (err) {
    console.log('Failed to fetch state.json, fallback to fresh generation:', err);
    sim.init(40);
  }

  updateStats();
  drawWorld();
}

// Update UI metrics
function updateStats() {
  currentTickEl.textContent = sim.ticks;
  totalPopulationEl.textContent = sim.creatures.length;
}

// Toggle Live Simulation
btnToggleSim.addEventListener('click', () => {
  if (isSimulating) {
    isSimulating = false;
    btnToggleSim.textContent = 'Start Live Simulation';
    btnToggleSim.classList.remove('btn-danger');
    btnToggleSim.classList.add('btn-primary');
    cancelAnimationFrame(animationFrameId);
  } else {
    isSimulating = true;
    btnToggleSim.textContent = 'Pause Simulation';
    btnToggleSim.classList.remove('btn-primary');
    btnToggleSim.classList.add('btn-danger');
    simLoop();
  }
});

// Speed slider
speedSlider.addEventListener('input', (e) => {
  simSpeed = parseInt(e.target.value);
  speedValEl.textContent = `${simSpeed}x`;
});

// Reset simulation
btnResetSim.addEventListener('click', () => {
  const confirmReset = confirm('Are you sure you want to re-seed Aetheria with new life?');
  if (confirmReset) {
    sim.init(40);
    updateStats();
    drawWorld();
    if (activeTab === 'tree') renderAncestryTree();
    if (activeTab === 'history') renderCharts();
  }
});

// Mock headless run or notify
btnRunHeadless.addEventListener('click', () => {
  alert('To execute a Headless Evolution generation and record it permanently in Git, run the following command in your terminal:\n\nnpm run simulate');
});

// Environmental events
btnMeteor.addEventListener('click', () => {
  sim.triggerMassExtinction('Meteor Impact');
  flashScreen('#ff3333');
  updateStats();
  drawWorld();
});

btnIce.addEventListener('click', () => {
  sim.triggerMassExtinction('Ice Age');
  flashScreen('#33a6ff');
  updateStats();
  drawWorld();
});

btnVolcano.addEventListener('click', () => {
  sim.triggerMassExtinction('Volcanic Winter');
  flashScreen('#ffa633');
  updateStats();
  drawWorld();
});

// Flash screen animation helper
function flashScreen(color) {
  const canvasWrapper = worldCanvas.parentElement;
  canvasWrapper.style.outline = `10px solid ${color}`;
  canvasWrapper.style.transition = 'outline 0.1s ease';
  setTimeout(() => {
    canvasWrapper.style.outline = 'none';
  }, 300);
}

// Spawn custom organism
btnSpawnCustom.addEventListener('click', () => {
  const hex = designerColor.value;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const customGenome = Genome.createRandom();
  customGenome.diet = designerDiet.value;
  customGenome.movement.maxSpeed = parseFloat(designerSpeed.value);
  customGenome.appearance.color = [r, g, b];
  customGenome.appearance.size = designerDiet.value === 'photosynthetic' ? 6 : 9;
  
  // Spawn 5 of them in the center of the world
  for (let i = 0; i < 5; i++) {
    const x = sim.width / 2 + (Math.random() * 80 - 40);
    const y = sim.height / 2 + (Math.random() * 80 - 40);
    const creature = new Creature(x, y, customGenome, [], sim.generationCount);
    creature.energy = 150;
    sim.creatures.push(creature);
    
    // Log ancestry
    sim.ancestryLog.push({
      id: creature.id,
      name: creature.genome.name,
      parents: [],
      born: sim.ticks,
      generation: creature.generation,
      genome: {
        diet: creature.genome.diet,
        color: creature.genome.appearance.color,
        size: creature.genome.appearance.size,
        speed: creature.genome.movement.maxSpeed
      }
    });
  }
  
  updateStats();
  drawWorld();
  alert(`Successfully introduced 5 members of the new species "${customGenome.name}" to the ecosystem!`);
});

// Simulation loop
function simLoop() {
  if (!isSimulating) return;

  for (let s = 0; s < simSpeed; s++) {
    sim.update();
  }

  updateStats();
  drawWorld();

  animationFrameId = requestAnimationFrame(simLoop);
}

// Draw world surface
function drawWorld() {
  const ctx = worldCtx;
  const cw = worldCanvas.width;
  const ch = worldCanvas.height;
  
  ctx.clearRect(0, 0, cw, ch);

  // Draw Biomes / Climate Grid
  const gridX = 16;
  const gridY = 16;
  const cellW = cw / gridX;
  const cellH = ch / gridY;

  for (let i = 0; i < gridX; i++) {
    for (let j = 0; j < gridY; j++) {
      const worldX = (i + 0.5) * (sim.width / gridX);
      const worldY = (j + 0.5) * (sim.height / gridY);
      
      const temp = sim.environment.getTemperatureAt(worldX, worldY);
      const moisture = sim.environment.getMoistureAt(worldX, worldY);
      
      // Interpolate colors: Temp (Red/Blue), Moisture (Green/Brown)
      const r = Math.floor(temp * 120 + 20);
      const g = Math.floor(moisture * 100 + 15);
      const b = Math.floor((1 - temp) * 120 + 30);
      
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(i * cellW, j * cellH, cellW + 1, cellH + 1);
    }
  }

  // Draw Vegetation (Plants)
  sim.vegetation.forEach(v => {
    const screenX = (v.x / sim.width) * cw;
    const screenY = (v.y / sim.height) * ch;
    
    ctx.beginPath();
    ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#5d4037';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(screenX, screenY, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = '#8bc34a';
    ctx.fill();
  });

  // Draw Creatures
  sim.creatures.forEach(c => {
    const screenX = (c.x / sim.width) * cw;
    const screenY = (c.y / sim.height) * ch;
    const size = (c.genome.appearance.size / 15) * 12 + 4;
    const [r, g, b] = c.genome.appearance.color;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(c.angle);

    // Set creature colors based on energy/health
    const opacity = c.health / 100;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;

    // Draw Shape
    ctx.beginPath();
    if (c.genome.appearance.shape === 'triangle') {
      ctx.moveTo(size, 0);
      ctx.lineTo(-size / 2, -size / 1.5);
      ctx.lineTo(-size / 2, size / 1.5);
    } else if (c.genome.appearance.shape === 'square') {
      ctx.rect(-size / 2, -size / 2, size, size);
    } else {
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sensory range / field-of-view pointer
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size + 4, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.stroke();

    ctx.restore();
  });
}

// Draw Migration Heatmap
function renderMigrationHeatmap() {
  const ctx = migrationCtx;
  const cw = migrationCanvas.width;
  const ch = migrationCanvas.height;

  ctx.fillStyle = '#0b0d11';
  ctx.fillRect(0, 0, cw, ch);

  // Divide canvas into grids and count creature density
  const grid = 24;
  const cellW = cw / grid;
  const cellH = ch / grid;
  const counts = Array.from({ length: grid }, () => Array(grid).fill(0));
  let maxCount = 1;

  sim.creatures.forEach(c => {
    const gx = Math.floor((c.x / sim.width) * grid);
    const gy = Math.floor((c.y / sim.height) * grid);
    if (gx >= 0 && gx < grid && gy >= 0 && gy < grid) {
      counts[gx][gy]++;
      if (counts[gx][gy] > maxCount) {
        maxCount = counts[gx][gy];
      }
    }
  });

  // Draw Heatmap Cells
  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      const density = counts[i][j] / maxCount;
      if (density > 0) {
        // Cyan to Magenta gradient representation
        ctx.fillStyle = `rgba(${Math.floor(density * 213)}, ${Math.floor((1 - density) * 229)}, 255, ${0.1 + density * 0.7})`;
        ctx.fillRect(i * cellW, j * cellH, cellW, cellH);
      }
    }
  }
}

// Draw Custom Canvas Charts
function renderCharts() {
  // Chart 1: Population History
  drawPopulationHistory();
  // Chart 2: Trait history
  drawTraitHistory();
  // List Mass Extinctions
  renderExtinctionsList();
}

function drawPopulationHistory() {
  const ctx = popCtx;
  const w = popChartCanvas.width = popChartCanvas.parentElement.clientWidth;
  const h = popChartCanvas.height = 200;

  ctx.clearRect(0, 0, w, h);
  
  const logs = sim.historyLog;
  if (logs.length < 2) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px sans-serif';
    ctx.fillText('Waiting for historical simulation ticks...', w/2 - 90, h/2);
    return;
  }

  // Draw Lines
  const maxVal = Math.max(...logs.map(l => l.population.total), 50);
  const getX = (index) => (index / (logs.length - 1)) * (w - 40) + 20;
  const getY = (val) => h - 30 - ((val / maxVal) * (h - 50));

  // Draw backgrounds
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const yVal = (maxVal / 4) * i;
    ctx.beginPath();
    ctx.moveTo(20, getY(yVal));
    ctx.lineTo(w - 20, getY(yVal));
    ctx.stroke();
  }

  // Helper to draw dataset path
  const drawPath = (selectorFn, strokeColor) => {
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    logs.forEach((l, idx) => {
      const x = getX(idx);
      const y = getY(selectorFn(l));
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

  drawPath(l => l.population.total, '#00e5ff');
  drawPath(l => l.population.herbivore, '#69f0ae');
  drawPath(l => l.population.carnivore, '#d500f9');
  drawPath(l => l.population.photosynthetic, '#ffea00');
}

function drawTraitHistory() {
  const ctx = traitsCtx;
  const w = traitsChartCanvas.width = traitsChartCanvas.parentElement.clientWidth;
  const h = traitsChartCanvas.height = 200;

  ctx.clearRect(0, 0, w, h);

  const logs = sim.historyLog;
  if (logs.length < 2) return;

  const maxSpeed = Math.max(...logs.map(l => l.averages.speed), 5);
  const maxIntel = Math.max(...logs.map(l => l.averages.intelligence), 2);
  const maxVal = Math.max(maxSpeed, maxIntel);

  const getX = (index) => (index / (logs.length - 1)) * (w - 40) + 20;
  const getY = (val) => h - 30 - ((val / maxVal) * (h - 50));

  // Average Speed Line (Green)
  ctx.beginPath();
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = 2;
  logs.forEach((l, idx) => {
    const x = getX(idx);
    const y = getY(l.averages.speed);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Average Intelligence Line (Purple/Pink)
  ctx.beginPath();
  ctx.strokeStyle = '#ff007f';
  ctx.lineWidth = 2;
  logs.forEach((l, idx) => {
    const x = getX(idx);
    const y = getY(l.averages.intelligence * 2.5); // Scaled for visibility
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function renderExtinctionsList() {
  extinctionList.innerHTML = '';

  if (sim.massExtinctionEvents.length === 0 && sim.extinctions.length === 0) {
    extinctionList.innerHTML = '<p class="placeholder-text">No extinctions logged yet.</p>';
    return;
  }

  // Display Mass Extinctions
  sim.massExtinctionEvents.forEach(evt => {
    const div = document.createElement('div');
    div.className = 'extinction-item event-item';
    div.innerHTML = `
      <span>⚡ <strong>${evt.cause}</strong> (Tick ${evt.tick})</span>
      <span>${evt.deaths} deaths | ${evt.postPopulation} survived</span>
    `;
    extinctionList.appendChild(div);
  });

  // Display last 10 species extinctions
  const recentExtinctions = sim.extinctions.slice(-10).reverse();
  recentExtinctions.forEach(ext => {
    const div = document.createElement('div');
    div.className = 'extinction-item';
    div.innerHTML = `
      <span>💀 Species <strong>${ext.name}</strong> (${ext.diet})</span>
      <span>Died at tick ${ext.diedAt} (Age: ${ext.age})</span>
    `;
    extinctionList.appendChild(div);
  });
}

// Species Family Tree Visualization (SVG-based)
const btnRefreshTree = document.getElementById('btn-refresh-tree');
if (btnRefreshTree) {
  btnRefreshTree.addEventListener('click', renderAncestryTree);
}

function renderAncestryTree() {
  const svg = document.getElementById('ancestry-svg');
  svg.innerHTML = '';
  
  const nodes = sim.ancestryLog;
  if (nodes.length === 0) {
    svg.innerHTML = `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af">No ancestry tree logged yet.</text>`;
    return;
  }

  // Filter or slice top nodes to prevent UI clutter if ancestry is huge
  const visibleNodes = nodes.slice(-30);
  const containerW = svg.parentElement.clientWidth;
  const containerH = Math.max(500, visibleNodes.length * 40);
  svg.style.height = `${containerH}px`;

  // Plot coordinates
  const nodeMap = {};
  const depthCount = {};

  visibleNodes.forEach((node, idx) => {
    // generation-based X position
    const gen = node.generation;
    if (!depthCount[gen]) depthCount[gen] = 0;
    depthCount[gen]++;

    nodeMap[node.id] = {
      ...node,
      x: 50 + gen * 180,
      y: 40 + (depthCount[gen] * 50)
    };
  });

  // Draw connections (bezier curves)
  visibleNodes.forEach(node => {
    const child = nodeMap[node.id];
    if (!child) return;

    node.parents.forEach(parentId => {
      const parent = nodeMap[parentId];
      if (parent) {
        // Draw bezier path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${parent.x} ${parent.y} C ${(parent.x + child.x) / 2} ${parent.y}, ${(parent.x + child.x) / 2} ${child.y}, ${child.x} ${child.y}`;
        path.setAttribute('d', d);
        path.setAttribute('stroke', 'rgba(0, 229, 255, 0.25)');
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);
      }
    });
  });

  // Draw nodes
  Object.values(nodeMap).forEach(node => {
    // Circle Node
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', node.x);
    circle.setAttribute('cy', node.y);
    circle.setAttribute('r', '7');
    const [r, g, b] = node.genome.color;
    circle.setAttribute('fill', `rgb(${r}, ${g}, ${b})`);
    circle.setAttribute('stroke', '#ffffff');
    circle.setAttribute('stroke-width', '1.5');
    svg.appendChild(circle);

    // Text Label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', node.x + 12);
    text.setAttribute('y', node.y + 4);
    text.setAttribute('fill', '#f3f4f6');
    text.setAttribute('font-size', '10px');
    text.setAttribute('font-family', 'Plus Jakarta Sans');
    text.textContent = `${node.name} (G${node.generation})`;
    svg.appendChild(text);
  });
}

// Start app
initEcosystem();
