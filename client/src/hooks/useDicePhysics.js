import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

const DIE_SIZE = 70;

export function useDicePhysics(diceCount, isRolling, arenaWidth = 460, arenaHeight = 340) {
  const engineRef = useRef(null);
  const bodiesRef = useRef([]);
  const wallsRef = useRef([]);
  const rafRef = useRef(null);
  const [positions, setPositions] = useState([]);

  // Vytvoření enginu jednou
  useEffect(() => {
    engineRef.current = Matter.Engine.create({ gravity: { x: 0, y: 0 } });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      Matter.Engine.clear(engineRef.current);
    };
  }, []);

  // Vytvoření stěn při změně rozměrů arény
  useEffect(() => {
    if (!engineRef.current) return;
    const world = engineRef.current.world;

    // Odstraň staré stěny
    wallsRef.current.forEach(w => Matter.Composite.remove(world, w));

    const t = 50; // tloušťka stěny
    const walls = [
      Matter.Bodies.rectangle(arenaWidth / 2, -t / 2, arenaWidth + t * 2, t, { isStatic: true, label: 'wall' }),
      Matter.Bodies.rectangle(arenaWidth / 2, arenaHeight + t / 2, arenaWidth + t * 2, t, { isStatic: true, label: 'wall' }),
      Matter.Bodies.rectangle(-t / 2, arenaHeight / 2, t, arenaHeight + t * 2, { isStatic: true, label: 'wall' }),
      Matter.Bodies.rectangle(arenaWidth + t / 2, arenaHeight / 2, t, arenaHeight + t * 2, { isStatic: true, label: 'wall' }),
    ];

    Matter.Composite.add(world, walls);
    wallsRef.current = walls;
  }, [arenaWidth, arenaHeight]);

  // Vytvoření těles kostek
  useEffect(() => {
    if (!engineRef.current) return;
    const world = engineRef.current.world;

    // Odstraň staré kostky
    bodiesRef.current.forEach(b => Matter.Composite.remove(world, b));

    if (diceCount === 0) {
      bodiesRef.current = [];
      setPositions([]);
      return;
    }

    // Rozmistitit kostky uprostřed arény v mřížce
    const newBodies = Array.from({ length: diceCount }, (_, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const startX = arenaWidth / 2 - DIE_SIZE + col * (DIE_SIZE + 5);
      const startY = arenaHeight / 2 - DIE_SIZE / 2 + row * (DIE_SIZE + 5);

      return Matter.Bodies.rectangle(startX, startY, DIE_SIZE, DIE_SIZE, {
        restitution: 0.6,      // Odrazivost od stěn a od sebe
        friction: 0.1,
        frictionAir: 0.05,     // Vzdušný odpor - plynulé zpomalení
        label: 'die',
      });
    });

    Matter.Composite.add(world, newBodies);
    bodiesRef.current = newBodies;
  }, [diceCount, arenaWidth, arenaHeight]);

  // Výstřel kostek při hodu
  useEffect(() => {
    if (!isRolling || !engineRef.current || bodiesRef.current.length === 0) return;

    bodiesRef.current.forEach(body => {
      // Reset pozice do středu
      const cx = arenaWidth / 2 + (Math.random() - 0.5) * 20;
      const cy = arenaHeight / 2 + (Math.random() - 0.5) * 20;
      Matter.Body.setPosition(body, { x: cx, y: cy });
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(body, 0);

      // Náhodný prudký výstřel
      const angle = Math.random() * Math.PI * 2;
      const speed = 18 + Math.random() * 12; // dost velká rychlost, aby prošla celou arénou
      Matter.Body.setVelocity(body, {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4);
    });
  }, [isRolling, arenaWidth, arenaHeight]);

  // Animační smyčka
  useEffect(() => {
    if (!engineRef.current) return;

    let lastTime = null;

    const loop = (time) => {
      if (lastTime !== null) {
        const delta = time - lastTime;
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

  return positions;
}
