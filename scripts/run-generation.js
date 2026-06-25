import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { Simulation } from '../src/simulation/engine.js';

const DATA_DIR = path.resolve('data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const sim = new Simulation(1200, 800);

if (fs.existsSync(STATE_FILE)) {
  console.log('Loading existing ecosystem state...');
  try {
    const rawData = fs.readFileSync(STATE_FILE, 'utf8');
    const data = JSON.parse(rawData);
    sim.loadState(data);
    console.log(`Loaded state at tick ${sim.ticks}. Current population: ${sim.creatures.length}`);
  } catch (err) {
    console.error('Error loading state file, initializing fresh simulation:', err.message);
    sim.init(50);
  }
} else {
  console.log('No existing state found. Initializing fresh artificial ecosystem...');
  sim.init(50);
}

// Run the simulation for 500 ticks
const RUN_TICKS = 500;
console.log(`Simulating ${RUN_TICKS} ticks of evolution...`);

// Check if population is dead. If so, re-seed.
if (sim.creatures.length === 0) {
  console.log('Ecosystem is extinct. Re-seeding with new organisms!');
  sim.init(40);
}

// Trigger random environmental changes / events occasionally
let eventTriggered = null;
if (Math.random() < 0.15 && sim.ticks > 500) {
  const events = ['Meteor Impact', 'Ice Age', 'Volcanic Winter'];
  eventTriggered = events[Math.floor(Math.random() * events.length)];
  console.log(`🚨 MASS EXTINCTION EVENT: Triggering ${eventTriggered}!`);
  sim.triggerMassExtinction(eventTriggered);
}

for (let i = 0; i < RUN_TICKS; i++) {
  sim.update();
  
  // Dynamic resource check
  if (sim.creatures.length < 10) {
    // If population is critically low, inject new species to prevent total freeze
    console.log('Population critically low. Spawning a new pioneer species...');
    sim.init(20);
  }
}

// Log generation summary
const totalPop = sim.creatures.length;
const herbivores = sim.creatures.filter(c => c.genome.diet === 'herbivore').length;
const carnivores = sim.creatures.filter(c => c.genome.diet === 'carnivore').length;
const photosynth = sim.creatures.filter(c => c.genome.diet === 'photosynthetic').length;

console.log(`\n--- Generation Run Complete ---`);
console.log(`Current Tick: ${sim.ticks}`);
console.log(`Total Population: ${totalPop} (H: ${herbivores}, C: ${carnivores}, P: ${photosynth})`);
console.log(`Total Ancestry Logged: ${sim.ancestryLog.length} species/individuals`);
console.log(`Total Extinctions Logged: ${sim.extinctions.length}`);

// Save state
const stateData = sim.saveState();
fs.writeFileSync(STATE_FILE, JSON.stringify(stateData, null, 2), 'utf8');
console.log(`Ecosystem state saved to data/state.json`);

// Commit changes to Git
try {
  // Check if we are inside a git repository
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
  
  // Stage data directory
  execSync('git add data/', { stdio: 'inherit' });
  
  // Create commit message
  let commitMsg = `Evolution Step: Tick ${sim.ticks} | Pop: ${totalPop} (H:${herbivores} C:${carnivores} P:${photosynth})`;
  if (eventTriggered) {
    commitMsg += ` | Event: ${eventTriggered}!`;
  }
  
  console.log(`Committing changes to Git: "${commitMsg}"`);
  execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
  console.log('Successfully recorded evolution snapshot in Git ancestry.');
} catch (gitErr) {
  console.log('Git commit skipped (not a git repo or no changes to commit).');
}
