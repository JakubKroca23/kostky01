import { useEffect, useRef, useState, useMemo } from 'react';
import Matter from 'matter-js';

export function useDicePhysics(diceCount, isRolling, arenaWidth = 400, arenaHeight = 300) {
  const engine = useRef(Matter.Engine.create({ gravity: { x: 0, y: 0 } }));
  const [positions, setPositions] = useState([]);
  const bodies = useRef([]);
  const requestRef = useRef();

  // Initialize engine and walls
  useEffect(() => {
    const world = engine.current.world;
    
    // Walls (bit thicker to prevent tunneling)
    const wallThickness = 100;
    const walls = [
      Matter.Bodies.rectangle(arenaWidth / 2, -wallThickness / 2, arenaWidth, wallThickness, { isStatic: true }), // top
      Matter.Bodies.rectangle(arenaWidth / 2, arenaHeight + wallThickness / 2, arenaWidth, wallThickness, { isStatic: true }), // bottom
      Matter.Bodies.rectangle(-wallThickness / 2, arenaHeight / 2, wallThickness, arenaHeight, { isStatic: true }), // left
      Matter.Bodies.rectangle(arenaWidth + wallThickness / 2, arenaHeight / 2, wallThickness, arenaHeight, { isStatic: true }), // right
    ];
    
    Matter.Composite.add(world, walls);

    const update = () => {
      Matter.Engine.update(engine.current, 16.666);
      
      const newPositions = bodies.current.map(body => ({
        x: body.position.x - arenaWidth / 2,
        y: body.position.y - arenaHeight / 2,
        angle: body.angle
      }));
      
      setPositions(newPositions);
      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(requestRef.current);
      Matter.World.clear(world);
      Matter.Engine.clear(engine.current);
    };
  }, [arenaWidth, arenaHeight]);

  // Sync bodies with diceCount
  useEffect(() => {
    const world = engine.current.world;
    
    // Remove old bodies
    if (bodies.current.length > 0) {
      Matter.Composite.remove(world, bodies.current);
    }

    // Create new square bodies for dice (approx 70x70)
    const newBodies = Array.from({ length: diceCount }, (_, i) => {
      return Matter.Bodies.rectangle(
        arenaWidth / 2 + (Math.random() - 0.5) * 20, 
        arenaHeight / 2 + (Math.random() - 0.5) * 20, 
        70, 70, 
        { 
          restitution: 0.7, // Bounciness
          friction: 0.05,
          frictionAir: 0.04, // Air resistance for gradual stopping
          chamfer: { radius: 10 } // Rounded corners
        }
      );
    });

    bodies.current = newBodies;
    Matter.Composite.add(world, newBodies);
  }, [diceCount, arenaWidth, arenaHeight]);

  // Handle Roll "Explosion"
  useEffect(() => {
    if (isRolling) {
      bodies.current.forEach(body => {
        // Move to center "cup"
        Matter.Body.setPosition(body, { 
          x: arenaWidth / 2 + (Math.random() - 0.5) * 10, 
          y: arenaHeight / 2 + (Math.random() - 0.5) * 10 
        });
        
        // Random massive force
        const forceMagnitude = 0.5 + Math.random() * 0.5;
        const angle = Math.random() * Math.PI * 2;
        
        Matter.Body.applyForce(body, body.position, {
          x: Math.cos(angle) * forceMagnitude,
          y: Math.sin(angle) * forceMagnitude
        });
        
        // Random spin
        Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 1);
      });
    }
  }, [isRolling, arenaWidth, arenaHeight]);

  return positions;
}
