import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

const DIE_SIZE = 74;

export function useDicePhysics(diceCount, isRolling, arenaWidth = 460, arenaHeight = 340) {
  const engineRef = useRef(null);
  const bodiesRef = useRef([]);
  const wallsRef = useRef([]);
  const rafRef = useRef(null);
  const [positions, setPositions] = useState([]);

  // Vytvoření enginu jednou
  useEffect(() => {
    engineRef.current = Matter.Engine.create({
      gravity: { x: 0, y: 0 },
      // Rychlejší simulace pro responzivnější pocit
      positionIterations: 10,
      velocityIterations: 10,
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      Matter.Engine.clear(engineRef.current);
    };
  }, []);

  // Animační smyčka – 60fps
  useEffect(() => {
    if (!engineRef.current) return;

    let lastTime = null;

    const loop = (time) => {
      if (lastTime !== null) {
        const delta = Math.min(time - lastTime, 32); // max 32ms krok - zabrání tunelování
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

  // Stěny arény – přebuildují se při změně rozměrů
  useEffect(() => {
    if (!engineRef.current) return;
    const world = engineRef.current.world;

    wallsRef.current.forEach(w => Matter.Composite.remove(world, w));

    const t = 60;
    // Stěny s restitution=1 = perfektní odraz bez ztráty energie
    const wallOpts = { isStatic: true, restitution: 1.0, friction: 0, frictionStatic: 0 };

    const walls = [
      Matter.Bodies.rectangle(arenaWidth / 2, -t / 2,           arenaWidth + t * 2, t, wallOpts),
      Matter.Bodies.rectangle(arenaWidth / 2, arenaHeight + t/2, arenaWidth + t * 2, t, wallOpts),
      Matter.Bodies.rectangle(-t / 2,         arenaHeight / 2,   t, arenaHeight + t * 2, wallOpts),
      Matter.Bodies.rectangle(arenaWidth + t/2, arenaHeight / 2, t, arenaHeight + t * 2, wallOpts),
    ];

    Matter.Composite.add(world, walls);
    wallsRef.current = walls;
  }, [arenaWidth, arenaHeight]);

  // Těla kostek – přebuildují se při změně počtu
  useEffect(() => {
    if (!engineRef.current) return;
    const world = engineRef.current.world;

    bodiesRef.current.forEach(b => Matter.Composite.remove(world, b));

    if (diceCount === 0) {
      bodiesRef.current = [];
      setPositions([]);
      return;
    }

    // Kostky začínají rozptýlené uprostřed arény
    const newBodies = Array.from({ length: diceCount }, (_, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = arenaWidth / 2 - DIE_SIZE + col * (DIE_SIZE + 8);
      const y = arenaHeight / 2 - DIE_SIZE / 2 + row * (DIE_SIZE + 8);

      return Matter.Bodies.rectangle(x, y, DIE_SIZE, DIE_SIZE, {
        restitution: 0.85,    // Vysoká odrazivost – kostky se opravdu odrazí
        friction: 0.02,       // Velmi nízké tření – plynulé klouzání
        frictionAir: 0.025,   // Vzdušný odpor – postupné zpomalení
        frictionStatic: 0,
        density: 0.003,       // Lehká kostka = rychlý pohyb
      });
    });

    Matter.Composite.add(world, newBodies);
    bodiesRef.current = newBodies;
  }, [diceCount, arenaWidth, arenaHeight]);

  // Výstřel při hodu – agresivní rychlost, bez applyForce (nespolehlivé)
  useEffect(() => {
    if (!isRolling || !engineRef.current || bodiesRef.current.length === 0) return;

    bodiesRef.current.forEach((body, i) => {
      // Reset na střed (kelímek)
      const cx = arenaWidth / 2 + (Math.random() - 0.5) * 30;
      const cy = arenaHeight / 2 + (Math.random() - 0.5) * 30;
      Matter.Body.setPosition(body, { x: cx, y: cy });

      // Nulování předchozí rychlosti
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(body, 0);

      // Náhodná explozivní rychlost – rovnoměrně do všech směrů
      const angle = (i / bodiesRef.current.length) * Math.PI * 2 + (Math.random() - 0.5) * 1.5;
      const speed = 22 + Math.random() * 18; // 22-40 px/frame – opravdu rychle!

      Matter.Body.setVelocity(body, {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      });

      // Spin – každá kostka jinak
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.6);
    });
  }, [isRolling, arenaWidth, arenaHeight]);

  return positions;
}
