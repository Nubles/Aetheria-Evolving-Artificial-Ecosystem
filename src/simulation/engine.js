// Neural Network implementation for Creature Intelligence
export class NeuralNetwork {
  constructor(inputSize, hiddenSize, outputSize, weights = null, biases = null) {
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.outputSize = outputSize;

    if (weights) {
      this.weightsIH = weights.ih;
      this.weightsHO = weights.ho;
      this.biasH = biases.h;
      this.biasO = biases.o;
    } else {
      this.weightsIH = this.randomMatrix(hiddenSize, inputSize);
      this.weightsHO = this.randomMatrix(outputSize, hiddenSize);
      this.biasH = this.randomArray(hiddenSize);
      this.biasO = this.randomArray(outputSize);
    }
  }

  randomMatrix(rows, cols) {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => Math.random() * 2 - 1)
    );
  }

  randomArray(length) {
    return Array.from({ length }, () => Math.random() * 2 - 1);
  }

  feedForward(inputs) {
    // Input to Hidden
    const hidden = [];
    for (let i = 0; i < this.hiddenSize; i++) {
      let sum = this.biasH[i];
      for (let j = 0; j < this.inputSize; j++) {
        sum += inputs[j] * this.weightsIH[i][j];
      }
      hidden.push(this.tanh(sum));
    }

    // Hidden to Output
    const outputs = [];
    for (let i = 0; i < this.outputSize; i++) {
      let sum = this.biasO[i];
      for (let j = 0; j < this.hiddenSize; j++) {
        sum += hidden[j] * this.weightsHO[i][j];
      }
      outputs.push(this.tanh(sum));
    }

    return outputs;
  }

  tanh(x) {
    return Math.tanh(x);
  }

  mutate(rate) {
    const mutateVal = (val) => {
      if (Math.random() < rate) {
        // Normal-ish mutation distribution
        return val + (Math.random() * 2 - 1) * 0.2;
      }
      return val;
    };

    const newWeightsIH = this.weightsIH.map(row => row.map(mutateVal));
    const newWeightsHO = this.weightsHO.map(row => row.map(mutateVal));
    const newBiasH = this.biasH.map(mutateVal);
    const newBiasO = this.biasO.map(mutateVal);

    return new NeuralNetwork(
      this.inputSize,
      this.hiddenSize,
      this.outputSize,
      { ih: newWeightsIH, ho: newWeightsHO },
      { h: newBiasH, o: newBiasO }
    );
  }

  serialize() {
    return {
      weights: { ih: this.weightsIH, ho: this.weightsHO },
      biases: { h: this.biasH, o: this.biasO }
    };
  }
}

// Genome Helper
export class Genome {
  static createRandom() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    
    // Select diet
    const diets = ['herbivore', 'carnivore', 'photosynthetic'];
    const diet = diets[Math.floor(Math.random() * diets.length)];

    return {
      name: Genome.generateName(),
      appearance: {
        color: [r, g, b],
        size: 5 + Math.random() * 7, // 5 to 12
        shape: ['circle', 'triangle', 'square'][Math.floor(Math.random() * 3)]
      },
      diet: diet, // herbivore, carnivore, photosynthetic
      movement: {
        maxSpeed: 1.0 + Math.random() * 3.0,
        turnRate: 0.1 + Math.random() * 0.4,
        wanderFactor: Math.random(),
        groupTendency: Math.random() // Flocking multiplier
      },
      reproduction: {
        type: Math.random() > 0.3 ? 'sexual' : 'asexual',
        minEnergy: 80 + Math.random() * 100,
        gestation: 50 + Math.floor(Math.random() * 150),
        mutationRate: 0.05 + Math.random() * 0.2,
        clutchSize: 1 + Math.floor(Math.random() * 2)
      },
      aggression: {
        predationWillingness: Math.random(),
        defense: Math.random()
      },
      social: {
        shareFood: Math.random(),
        alarmFactor: Math.random()
      },
      envPreferences: {
        idealTemp: Math.random(), // 0 to 1
        idealMoisture: Math.random()
      },
      brain: new NeuralNetwork(8, 6, 3).serialize() // inputs: 8, hidden: 6, outputs: 3
    };
  }

  static mutate(parentGenome) {
    const rate = parentGenome.reproduction.mutationRate;
    
    const mutateColor = (c) => Math.max(0, Math.min(255, Math.round(c + (Math.random() * 40 - 20))));
    const mutateVal = (val, min, max, step = 0.1) => {
      if (Math.random() < rate) {
        return Math.max(min, Math.min(max, val + (Math.random() * 2 - 1) * step));
      }
      return val;
    };

    // Brain mutation
    const parentBrain = new NeuralNetwork(
      8, 6, 3,
      parentGenome.brain.weights,
      parentGenome.brain.biases
    );
    const mutatedBrain = parentBrain.mutate(rate).serialize();

    const newColor = parentGenome.appearance.color.map(mutateColor);
    
    // Possibly change diet
    let newDiet = parentGenome.diet;
    if (Math.random() < rate * 0.1) {
      const diets = ['herbivore', 'carnivore', 'photosynthetic'];
      newDiet = diets[Math.floor(Math.random() * diets.length)];
    }

    return {
      name: Genome.generateMutatedName(parentGenome.name),
      appearance: {
        color: newColor,
        size: mutateVal(parentGenome.appearance.size, 4, 15, 1.0),
        shape: Math.random() < rate * 0.1 ? ['circle', 'triangle', 'square'][Math.floor(Math.random() * 3)] : parentGenome.appearance.shape
      },
      diet: newDiet,
      movement: {
        maxSpeed: mutateVal(parentGenome.movement.maxSpeed, 0.5, 6.0, 0.5),
        turnRate: mutateVal(parentGenome.movement.turnRate, 0.05, 1.0, 0.1),
        wanderFactor: mutateVal(parentGenome.movement.wanderFactor, 0.0, 1.0, 0.1),
        groupTendency: mutateVal(parentGenome.movement.groupTendency, 0.0, 1.0, 0.1)
      },
      reproduction: {
        type: Math.random() < rate * 0.05 ? (parentGenome.reproduction.type === 'sexual' ? 'asexual' : 'sexual') : parentGenome.reproduction.type,
        minEnergy: mutateVal(parentGenome.reproduction.minEnergy, 50, 300, 20),
        gestation: Math.round(mutateVal(parentGenome.reproduction.gestation, 30, 400, 20)),
        mutationRate: mutateVal(parentGenome.reproduction.mutationRate, 0.01, 0.5, 0.02),
        clutchSize: Math.round(mutateVal(parentGenome.reproduction.clutchSize, 1, 4, 1))
      },
      aggression: {
        predationWillingness: mutateVal(parentGenome.aggression.predationWillingness, 0.0, 1.0, 0.1),
        defense: mutateVal(parentGenome.aggression.defense, 0.0, 1.0, 0.1)
      },
      social: {
        shareFood: mutateVal(parentGenome.social.shareFood, 0.0, 1.0, 0.1),
        alarmFactor: mutateVal(parentGenome.social.alarmFactor, 0.0, 1.0, 0.1)
      },
      envPreferences: {
        idealTemp: mutateVal(parentGenome.envPreferences.idealTemp, 0.0, 1.0, 0.1),
        idealMoisture: mutateVal(parentGenome.envPreferences.idealMoisture, 0.0, 1.0, 0.1)
      },
      brain: mutatedBrain
    };
  }

  static generateName() {
    const syllables = ['ba', 'co', 'da', 'fe', 'go', 'ha', 'ji', 'ki', 'lo', 'mu', 'na', 'pe', 'ra', 'so', 'tu', 'vi', 'zo', 'xur', 'gla', 'kro', 'phy'];
    const length = 2 + Math.floor(Math.random() * 2);
    let name = '';
    for (let i = 0; i < length; i++) {
      name += syllables[Math.floor(Math.random() * syllables.length)];
    }
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  static generateMutatedName(parentName) {
    // Keep part of parent name and append/modify a syllable
    const syllables = ['us', 'ix', 'on', 'ax', 'ya', 'or', 'eth', 'is', 'an', 'en', 'um', 'ia'];
    const suffix = syllables[Math.floor(Math.random() * syllables.length)];
    
    if (parentName.length > 7) {
      return parentName.slice(0, 5) + suffix;
    }
    return parentName + suffix;
  }
}

// Creature Representation
export class Creature {
  constructor(x, y, genome, parentIds = [], generation = 0) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.x = x;
    this.y = y;
    this.genome = genome;
    this.parentIds = parentIds;
    this.generation = generation;
    
    this.energy = 100;
    this.health = 100;
    this.age = 0;
    this.angle = Math.random() * Math.PI * 2;
    this.gestationTime = 0;
    this.isPregnant = false;
    this.partnerId = null;
    this.score = 0; // Fitness tracking
    this.dead = false;
    
    // Brain instantiation
    this.brain = new NeuralNetwork(
      8, 6, 3,
      genome.brain.weights,
      genome.brain.biases
    );
  }

  update(width, height, environment, nearestEntities) {
    if (this.dead) return;
    this.age++;

    // Base metabolic energy tax (depends on size, speed, and defense)
    const metabolism = 0.1 + (this.genome.appearance.size * 0.02) + (this.genome.movement.maxSpeed * 0.05) + (this.genome.aggression.defense * 0.03);
    this.energy -= metabolism;

    // Environmental preference check
    const localTemp = environment.getTemperatureAt(this.x, this.y);
    const localMoisture = environment.getMoistureAt(this.x, this.y);
    
    const tempDiff = Math.abs(localTemp - this.genome.envPreferences.idealTemp);
    const moistureDiff = Math.abs(localMoisture - this.genome.envPreferences.idealMoisture);
    
    if (tempDiff > 0.2) this.health -= tempDiff * 0.5;
    if (moistureDiff > 0.2) this.health -= moistureDiff * 0.5;

    // Run Brain inputs
    // 1. Closest Food (Herbivore/Omnivore eats vegetation; Carnivore eats other creatures)
    const food = nearestEntities.food;
    const foodDist = food ? food.dist / width : 1.0;
    const foodAngle = food ? food.angle : 0.0;

    // 2. Closest Predator
    const pred = nearestEntities.predator;
    const predDist = pred ? pred.dist / width : 1.0;
    const predAngle = pred ? pred.angle : 0.0;

    // 3. Closest Mate
    const mate = nearestEntities.mate;
    const mateDist = mate ? mate.dist / width : 1.0;
    const mateAngle = mate ? mate.angle : 0.0;

    const brainInputs = [
      foodDist,
      foodAngle / Math.PI,
      predDist,
      predAngle / Math.PI,
      mateDist,
      mateAngle / Math.PI,
      this.energy / 200.0,
      localTemp
    ];

    const brainOutputs = this.brain.feedForward(brainInputs);

    // Apply movement outputs
    const speedOutput = (brainOutputs[0] + 1) / 2; // 0 to 1
    const angleOutput = brainOutputs[1]; // -1 to 1

    const actualSpeed = speedOutput * this.genome.movement.maxSpeed;
    this.angle += angleOutput * this.genome.movement.turnRate;
    
    // Random wandering factor
    this.angle += (Math.random() - 0.5) * this.genome.movement.wanderFactor * 0.5;

    // Update position
    this.x += Math.cos(this.angle) * actualSpeed;
    this.y += Math.sin(this.angle) * actualSpeed;

    // Toroidal space boundary wrap-around
    if (this.x < 0) this.x += width;
    if (this.x > width) this.x -= width;
    if (this.y < 0) this.y += height;
    if (this.y > height) this.y -= height;

    // Health/Energy decay
    if (this.energy <= 0) {
      this.energy = 0;
      this.health -= 2.0; // Starving
    } else if (this.energy > 200) {
      this.energy = 200; // Cap energy
    }

    if (this.health <= 0) {
      this.dead = true;
    }
  }
}

// Environmental parameters
export class Environment {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    // Simple environment grid: temperature & moisture
    this.tempBase = 0.5;
    this.tempVolatility = 0.05;
    this.ticks = 0;
  }

  update() {
    this.ticks++;
    // Temperature oscillates with season cycle (every 1000 ticks)
    this.tempBase = 0.5 + Math.sin(this.ticks * 2 * Math.PI / 1000) * 0.15;
  }

  getTemperatureAt(x, y) {
    // North is colder, South is warmer + temporal base
    const latitudeFactor = y / this.height; // 0 to 1
    return Math.max(0, Math.min(1, this.tempBase * 0.7 + latitudeFactor * 0.4));
  }

  getMoistureAt(x, y) {
    // East-West moisture gradient
    const longitudeFactor = x / this.width;
    return Math.max(0, Math.min(1, 0.3 + Math.sin(longitudeFactor * Math.PI) * 0.5));
  }
}

// Full Simulation Manager
export class Simulation {
  constructor(width = 1200, height = 800) {
    this.width = width;
    this.height = height;
    this.creatures = [];
    this.environment = new Environment(width, height);
    this.vegetation = []; // {x, y, energy}
    this.maxVegetation = 150;
    this.historyLog = [];
    this.ancestryLog = [];
    this.ticks = 0;
    this.generationCount = 0;
    this.extinctions = [];
    this.massExtinctionEvents = [];
  }

  init(initialCreaturesCount = 40) {
    this.creatures = [];
    this.vegetation = [];
    this.ticks = 0;
    this.generationCount = 0;
    this.historyLog = [];
    this.ancestryLog = [];
    this.extinctions = [];

    // Spawn initial creatures
    for (let i = 0; i < initialCreaturesCount; i++) {
      const g = Genome.createRandom();
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const c = new Creature(x, y, g);
      c.energy = 120;
      this.creatures.push(c);
      
      this.ancestryLog.push({
        id: c.id,
        name: c.genome.name,
        parents: [],
        born: 0,
        generation: 0,
        genome: {
          diet: c.genome.diet,
          color: c.genome.appearance.color,
          size: c.genome.appearance.size,
          speed: c.genome.movement.maxSpeed
        }
      });
    }

    // Spawn initial vegetation
    for (let i = 0; i < this.maxVegetation; i++) {
      this.spawnVegetation();
    }
  }

  spawnVegetation() {
    this.vegetation.push({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      energy: 35 + Math.random() * 25
    });
  }

  triggerMassExtinction(cause = 'Meteor Impact') {
    const originalCount = this.creatures.length;
    let mortalityRate = 0.75;
    
    if (cause === 'Meteor Impact') {
      mortalityRate = 0.8;
      // Kill 80% randomly, but prefer large and low-defense ones
      this.creatures.forEach(c => {
        const surviveProb = 1 - (mortalityRate * (c.genome.appearance.size / 15));
        if (Math.random() > surviveProb) {
          c.dead = true;
        }
      });
    } else if (cause === 'Ice Age') {
      mortalityRate = 0.7;
      // Prefer cold-adapted creatures
      this.creatures.forEach(c => {
        const tempPref = c.genome.envPreferences.idealTemp; // 0 (cold) to 1 (hot)
        const surviveProb = 1 - (mortalityRate * tempPref);
        if (Math.random() > surviveProb) {
          c.dead = true;
        }
      });
    } else if (cause === 'Volcanic Winter') {
      mortalityRate = 0.75;
      // Kills plants and photosynthesizers
      this.vegetation = this.vegetation.slice(0, Math.floor(this.vegetation.length * 0.1));
      this.creatures.forEach(c => {
        if (c.genome.diet === 'photosynthetic' || Math.random() < 0.6) {
          c.dead = true;
        }
      });
    }

    // Clean up
    const survivors = this.creatures.filter(c => !c.dead);
    const deaths = originalCount - survivors.length;

    this.massExtinctionEvents.push({
      tick: this.ticks,
      cause: cause,
      prePopulation: originalCount,
      postPopulation: survivors.length,
      deaths: deaths
    });

    this.creatures = survivors;
  }

  getDistance(c1, c2) {
    let dx = Math.abs(c1.x - c2.x);
    let dy = Math.abs(c1.y - c2.y);
    // Wrap around coordinates
    if (dx > this.width / 2) dx = this.width - dx;
    if (dy > this.height / 2) dy = this.height - dy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  update() {
    this.ticks++;
    this.environment.update();

    // Spawn plant resources periodically
    if (this.vegetation.length < this.maxVegetation && Math.random() < 0.3) {
      this.spawnVegetation();
    }

    // Photosynthesis bonus
    this.creatures.forEach(c => {
      if (c.genome.diet === 'photosynthetic') {
        const localMoisture = this.environment.getMoistureAt(c.x, c.y);
        // Gain energy from sun (light) and moisture
        c.energy += (0.15 + localMoisture * 0.1);
      }
    });

    // Update creatures
    const activeCount = this.creatures.length;
    const canReproduce = activeCount < 120; // Population cap for performance & stability

    for (let i = 0; i < activeCount; i++) {
      const c = this.creatures[i];
      if (!c || c.dead) continue;

      // Find nearest entities
      const nearest = { food: null, predator: null, mate: null };
      let minDistFood = Infinity;
      let minDistPred = Infinity;
      let minDistMate = Infinity;

      // Scan plants
      if (c.genome.diet === 'herbivore' || c.genome.diet === 'omnivore') {
        this.vegetation.forEach(v => {
          const dx = v.x - c.x;
          const dy = v.y - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDistFood) {
            minDistFood = dist;
            nearest.food = { dist, angle: Math.atan2(dy, dx) - c.angle };
          }
        });
      }

      // Scan other creatures
      for (let j = 0; j < activeCount; j++) {
        if (i === j) continue;
        const other = this.creatures[j];
        if (!other || other.dead) continue;

        const dist = this.getDistance(c, other);
        const dx = other.x - c.x;
        const dy = other.y - c.y;
        const angle = Math.atan2(dy, dx) - c.angle;

        // Threat (Carnivores/Aggressive)
        if (other.genome.diet === 'carnivore' && other.genome.aggression.predationWillingness > 0.4) {
          if (dist < minDistPred) {
            minDistPred = dist;
            nearest.predator = { dist, angle };
          }
        }

        // Mate (Same diet, compatible reproduction, low distance)
        if (c.genome.reproduction.type === 'sexual' && 
            other.genome.reproduction.type === 'sexual' && 
            c.genome.diet === other.genome.diet) {
          if (dist < minDistMate) {
            minDistMate = dist;
            nearest.mate = { dist, angle };
          }
        }

        // Carnivore predation target
        if ((c.genome.diet === 'carnivore' || c.genome.diet === 'omnivore') && 
            c.genome.aggression.predationWillingness > 0.3) {
          // Exclude self species/mate if energy is high
          if (other.genome.diet !== 'carnivore' || c.energy < 60) {
            if (dist < minDistFood) {
              minDistFood = dist;
              nearest.food = { dist, angle };
            }
          }
        }
      }

      c.update(this.width, this.height, this.environment, nearest);

      // Perform interactions (collisions)
      if (!c.dead) {
        // Eating vegetation
        if (c.genome.diet === 'herbivore' || c.genome.diet === 'omnivore') {
          for (let k = this.vegetation.length - 1; k >= 0; k--) {
            const v = this.vegetation[k];
            const dist = Math.sqrt((v.x - c.x) ** 2 + (v.y - c.y) ** 2);
            if (dist < c.genome.appearance.size + 4) {
              c.energy += v.energy;
              c.score += 5;
              this.vegetation.splice(k, 1);
            }
          }
        }

        // Carnivore Hunting
        if (c.genome.diet === 'carnivore' || c.genome.diet === 'omnivore') {
          for (let j = 0; j < activeCount; j++) {
            if (i === j) continue;
            const other = this.creatures[j];
            if (!other || other.dead) continue;

            const dist = this.getDistance(c, other);
            if (dist < c.genome.appearance.size + other.genome.appearance.size) {
              // Try to attack
              const damage = (c.genome.appearance.size * c.genome.aggression.predationWillingness * 4.0) - (other.genome.aggression.defense * 2.0);
              if (damage > 0) {
                other.health -= damage;
                if (other.health <= 0 || other.dead) {
                  other.dead = true;
                  c.energy += (other.genome.appearance.size * 10);
                  c.score += 20;
                }
              }
            }
          }
        }

        // Reproduction Check
        if (canReproduce && c.energy >= c.genome.reproduction.minEnergy) {
          if (c.genome.reproduction.type === 'asexual') {
            this.reproduceAsexual(c);
          } else {
            // Find nearby mate
            for (let j = 0; j < activeCount; j++) {
              if (i === j) continue;
              const other = this.creatures[j];
              if (!other || other.dead || other.genome.reproduction.type !== 'sexual') continue;

              const dist = this.getDistance(c, other);
              if (dist < (c.genome.appearance.size + other.genome.appearance.size + 15) && 
                  other.energy >= other.genome.reproduction.minEnergy) {
                this.reproduceSexual(c, other);
                break;
              }
            }
          }
        }
      }
    }

    // Handle deaths and record extinctions
    const living = [];
    this.creatures.forEach(c => {
      if (c.dead) {
        this.extinctions.push({
          id: c.id,
          name: c.genome.name,
          diet: c.genome.diet,
          age: c.age,
          diedAt: this.ticks
        });
      } else {
        living.push(c);
      }
    });

    this.creatures = living;

    // Logging snapshots every 100 ticks
    if (this.ticks % 100 === 0) {
      this.logSnapshot();
    }
  }

  reproduceAsexual(parent) {
    parent.energy -= (parent.genome.reproduction.minEnergy * 0.5);
    const numChildren = parent.genome.reproduction.clutchSize;

    for (let i = 0; i < numChildren; i++) {
      const childGenome = Genome.mutate(parent.genome);
      const offsetAngle = Math.random() * Math.PI * 2;
      const childX = parent.x + Math.cos(offsetAngle) * 20;
      const childY = parent.y + Math.sin(offsetAngle) * 20;

      const child = new Creature(childX, childY, childGenome, [parent.id], parent.generation + 1);
      child.energy = 60;
      this.creatures.push(child);

      this.ancestryLog.push({
        id: child.id,
        name: child.genome.name,
        parents: [parent.id],
        born: this.ticks,
        generation: child.generation,
        genome: {
          diet: child.genome.diet,
          color: child.genome.appearance.color,
          size: child.genome.appearance.size,
          speed: child.genome.movement.maxSpeed
        }
      });
    }
  }

  reproduceSexual(parentA, parentB) {
    parentA.energy -= (parentA.genome.reproduction.minEnergy * 0.4);
    parentB.energy -= (parentB.genome.reproduction.minEnergy * 0.4);

    const numChildren = Math.round((parentA.genome.reproduction.clutchSize + parentB.genome.reproduction.clutchSize) / 2);

    for (let i = 0; i < numChildren; i++) {
      // Genetic crossover
      const childGenome = {};
      const rate = (parentA.genome.reproduction.mutationRate + parentB.genome.reproduction.mutationRate) / 2;

      // Base combination
      childGenome.name = Genome.generateMutatedName(parentA.genome.name);
      childGenome.diet = Math.random() > 0.5 ? parentA.genome.diet : parentB.genome.diet;

      childGenome.appearance = {
        color: parentA.genome.appearance.color.map((c, idx) => Math.round((c + parentB.genome.appearance.color[idx]) / 2)),
        size: Math.random() > 0.5 ? parentA.genome.appearance.size : parentB.genome.appearance.size,
        shape: Math.random() > 0.5 ? parentA.genome.appearance.shape : parentB.genome.appearance.shape
      };

      childGenome.movement = {
        maxSpeed: Math.random() > 0.5 ? parentA.genome.movement.maxSpeed : parentB.genome.movement.maxSpeed,
        turnRate: Math.random() > 0.5 ? parentA.genome.movement.turnRate : parentB.genome.movement.turnRate,
        wanderFactor: Math.random() > 0.5 ? parentA.genome.movement.wanderFactor : parentB.genome.movement.wanderFactor,
        groupTendency: Math.random() > 0.5 ? parentA.genome.movement.groupTendency : parentB.genome.movement.groupTendency
      };

      childGenome.reproduction = {
        type: 'sexual',
        minEnergy: (parentA.genome.reproduction.minEnergy + parentB.genome.reproduction.minEnergy) / 2,
        gestation: Math.round((parentA.genome.reproduction.gestation + parentB.genome.reproduction.gestation) / 2),
        mutationRate: rate,
        clutchSize: numChildren
      };

      childGenome.aggression = {
        predationWillingness: Math.random() > 0.5 ? parentA.genome.aggression.predationWillingness : parentB.genome.aggression.predationWillingness,
        defense: Math.random() > 0.5 ? parentA.genome.aggression.defense : parentB.genome.aggression.defense
      };

      childGenome.social = {
        shareFood: Math.random() > 0.5 ? parentA.genome.social.shareFood : parentB.genome.social.shareFood,
        alarmFactor: Math.random() > 0.5 ? parentA.genome.social.alarmFactor : parentB.genome.social.alarmFactor
      };

      childGenome.envPreferences = {
        idealTemp: (parentA.genome.envPreferences.idealTemp + parentB.genome.envPreferences.idealTemp) / 2,
        idealMoisture: (parentA.genome.envPreferences.idealMoisture + parentB.genome.envPreferences.idealMoisture) / 2
      };

      // Mix brain weights/biases
      const mixedWeights = { ih: [], ho: [] };
      const mixedBiases = { h: [], o: [] };
      
      const brainA = parentA.genome.brain;
      const brainB = parentB.genome.brain;

      // Hidden layer weights crossover
      for (let r = 0; r < brainA.weights.ih.length; r++) {
        const row = [];
        for (let c = 0; c < brainA.weights.ih[r].length; c++) {
          row.push(Math.random() > 0.5 ? brainA.weights.ih[r][c] : brainB.weights.ih[r][c]);
        }
        mixedWeights.ih.push(row);
      }

      // Output layer weights crossover
      for (let r = 0; r < brainA.weights.ho.length; r++) {
        const row = [];
        for (let c = 0; c < brainA.weights.ho[r].length; c++) {
          row.push(Math.random() > 0.5 ? brainA.weights.ho[r][c] : brainB.weights.ho[r][c]);
        }
        mixedWeights.ho.push(row);
      }

      // Biases crossover
      mixedBiases.h = brainA.biases.h.map((bVal, idx) => Math.random() > 0.5 ? bVal : brainB.biases.h[idx]);
      mixedBiases.o = brainA.biases.o.map((bVal, idx) => Math.random() > 0.5 ? bVal : brainB.biases.o[idx]);

      childGenome.brain = { weights: mixedWeights, biases: mixedBiases };

      // Apply mutation
      const finalGenome = Genome.mutate(childGenome);

      const offsetAngle = Math.random() * Math.PI * 2;
      const childX = ((parentA.x + parentB.x) / 2) + Math.cos(offsetAngle) * 20;
      const childY = ((parentA.y + parentB.y) / 2) + Math.sin(offsetAngle) * 20;

      const child = new Creature(childX, childY, finalGenome, [parentA.id, parentB.id], Math.max(parentA.generation, parentB.generation) + 1);
      child.energy = 60;
      this.creatures.push(child);

      this.ancestryLog.push({
        id: child.id,
        name: child.genome.name,
        parents: [parentA.id, parentB.id],
        born: this.ticks,
        generation: child.generation,
        genome: {
          diet: child.genome.diet,
          color: child.genome.appearance.color,
          size: child.genome.appearance.size,
          speed: child.genome.movement.maxSpeed
        }
      });
    }
  }

  logSnapshot() {
    const total = this.creatures.length;
    const herbi = this.creatures.filter(c => c.genome.diet === 'herbivore').length;
    const carni = this.creatures.filter(c => c.genome.diet === 'carnivore').length;
    const photo = this.creatures.filter(c => c.genome.diet === 'photosynthetic').length;

    // Calculate averages
    let avgSpeed = 0;
    let avgIntelligence = 0;
    let avgSize = 0;
    
    this.creatures.forEach(c => {
      avgSpeed += c.genome.movement.maxSpeed;
      avgSize += c.genome.appearance.size;
      
      // Measure intelligence by summing magnitude of brain weights (rough complexity indicator)
      let wSum = 0;
      let count = 0;
      c.genome.brain.weights.ih.forEach(row => row.forEach(w => { wSum += Math.abs(w); count++; }));
      c.genome.brain.weights.ho.forEach(row => row.forEach(w => { wSum += Math.abs(w); count++; }));
      avgIntelligence += (wSum / count);
    });

    if (total > 0) {
      avgSpeed /= total;
      avgIntelligence /= total;
      avgSize /= total;
    }

    this.historyLog.push({
      tick: this.ticks,
      population: { total, herbivore: herbi, carnivore: carni, photosynthetic: photo },
      averages: { speed: avgSpeed, intelligence: avgIntelligence, size: avgSize }
    });
  }

  // Load from structured JSON
  loadState(data) {
    this.ticks = data.ticks || 0;
    this.generationCount = data.generationCount || 0;
    this.vegetation = data.vegetation || [];
    this.historyLog = data.historyLog || [];
    this.ancestryLog = data.ancestryLog || [];
    this.extinctions = data.extinctions || [];
    this.massExtinctionEvents = data.massExtinctionEvents || [];
    
    this.creatures = (data.creatures || []).map(d => {
      const c = new Creature(d.x, d.y, d.genome, d.parentIds, d.generation);
      c.id = d.id;
      c.energy = d.energy;
      c.health = d.health;
      c.age = d.age;
      c.angle = d.angle;
      return c;
    });
  }

  // Save to structured JSON
  saveState() {
    return {
      ticks: this.ticks,
      generationCount: this.generationCount,
      vegetation: this.vegetation,
      historyLog: this.historyLog,
      ancestryLog: this.ancestryLog,
      extinctions: this.extinctions,
      massExtinctionEvents: this.massExtinctionEvents,
      creatures: this.creatures.map(c => ({
        id: c.id,
        x: c.x,
        y: c.y,
        energy: c.energy,
        health: c.health,
        age: c.age,
        angle: c.angle,
        generation: c.generation,
        parentIds: c.parentIds,
        genome: c.genome
      }))
    };
  }
}
