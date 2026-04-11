import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

const DIE_SIZE = 62;

// Simple seeded PRNG
function createSeededRandom(seedString) {
  let seed = 0;
  for (let i = 0; i < seedString.length; i++) {
    seed = (seed << 5) - seed + seedString.charCodeAt(i);
    seed |= 0;
  }
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export function useDicePhysics(diceCount, isRolling, seed = '', arenaWidth = 460, arenaHeight = 340, indicesToIgnore = []) {
  const engineRef = useRef(null);
  const bodiesRef = useRef([]);
  const wallsRef = useRef([]);
  const rafRef = useRef(null);
  const [positions, setPositions] = useState([]);

  // Seeding randomness per roll
  const getRand = useRef(createSeededRandom(seed));
  useEffect(() => {
     getRand.current = createSeededRandom(seed);
  }, [seed]);

  useEffect(() => {
    engineRef.current = Matter.Engine.create({
      gravity: { x: 0, y: 0 },
      positionIterations: 10,
      velocityIterations: 10,
    });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      Matter.Engine.clear(engineRef.current);
    };
  }, []);

  useEffect(() => {
    if (!engineRef.current) return;
    let lastTime = null;
    const loop = (time) => {
      if (lastTime !== null) {
        const delta = Math.min(time - lastTime, 32); 
        Matter.Engine.update(engineRef.current, delta);
      }
      lastTime = time;
      const pos = bodiesRef.current.map(body => ({
        x: body.position.x - arenaWidth / 2,
        y: body.position.y - arenaHeight / 2,
        angle: body.angle,
      }));
      setPositions([...pos]);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [arenaWidth, arenaHeight]);

  useEffect(() => {
    if (!engineRef.current) return;
    const world = engineRef.current.world;
    wallsRef.current.forEach(w => Matter.Composite.remove(world, w));
    const t = 1000; // Massive walls to prevent tunneling
    const pad = DIE_SIZE / 2;
    const wallOpts = { isStatic: true, restitution: 0.1, friction: 0.1 };

    const walls = [
      Matter.Bodies.rectangle(arenaWidth / 2, -t / 2 + pad, arenaWidth + t, t, wallOpts),
      Matter.Bodies.rectangle(arenaWidth / 2, arenaHeight + t / 2 - pad, arenaWidth + t, t, wallOpts),
      Matter.Bodies.rectangle(-t / 2 + pad, arenaHeight / 2, t, arenaHeight + t, wallOpts),
      Matter.Bodies.rectangle(arenaWidth + t / 2 - pad, arenaHeight / 2, t, arenaHeight + t, wallOpts),
    ];
    Matter.Composite.add(world, walls);
    wallsRef.current = walls;
  }, [arenaWidth, arenaHeight]);

  useEffect(() => {
    if (!engineRef.current) return;
    const world = engineRef.current.world;
    
    // Only remove and recreate bodies if the count changed OR it's a completely new turn.
    // If indicesToIgnore is active, we definitely want to preserve existing bodies.
    if (diceCount === 0) {
      bodiesRef.current.forEach(b => Matter.Composite.remove(world, b));
      bodiesRef.current = [];
      setPositions([]);
      return;
    }

    const shouldRecreate = bodiesRef.current.length !== diceCount || (indicesToIgnore.length === 0);

    if (shouldRecreate) {
      bodiesRef.current.forEach(b => Matter.Composite.remove(world, b));
      const newBodies = Array.from({ length: diceCount }, (_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = arenaWidth / 2 - DIE_SIZE + col * (DIE_SIZE + 10);
        const y = arenaHeight / 2 - DIE_SIZE / 2 + row * (DIE_SIZE + 10);

        return Matter.Bodies.rectangle(x, y, DIE_SIZE, DIE_SIZE, {
          restitution: 0.7,
          friction: 0.1,
          frictionAir: 0.04,
          density: 0.005,
        });
      });
      Matter.Composite.add(world, newBodies);
      bodiesRef.current = newBodies;
    }
  }, [diceCount, arenaWidth, arenaHeight, seed, indicesToIgnore.length === 0]);

  useEffect(() => {
    if (!isRolling || !engineRef.current || bodiesRef.current.length === 0) return;

    const rand = createSeededRandom(seed + "roll");
    
    // DETERMINISTIC START: Reset all bodies to a fixed starting grid before the roll
    bodiesRef.current.forEach((body, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const startX = arenaWidth / 2 - DIE_SIZE + col * (DIE_SIZE + 5);
      const startY = arenaHeight / 2 - DIE_SIZE + row * (DIE_SIZE + 5);
      
      Matter.Body.setPosition(body, { x: startX, y: startY });
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(body, 0);
      Matter.Body.setAngle(body, rand() * Math.PI * 2);

      const forceMagnitude = 1.0 + rand() * 1.5;
      const forceAngle = rand() * Math.PI * 2;
      
      Matter.Body.applyForce(body, body.position, {
        x: Math.cos(forceAngle) * forceMagnitude,
        y: Math.sin(forceAngle) * forceMagnitude
      });
      
      Matter.Body.setAngularVelocity(body, (rand() - 0.5) * 0.5);
    });

  }, [isRolling, arenaWidth, arenaHeight, seed]);

  return positions;
}
