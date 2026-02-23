import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

interface BlackHole {
  x: number;
  y: number;
  level: number;
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const blackHoleRef = useRef<BlackHole | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const initParticles = () => {
      particlesRef.current = Array.from({ length: 450 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 1.5 + 0.5
      }));
    };
    initParticles();

    const animate = () => {
      // Estela para ver la trayectoria lineal
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const bh = blackHoleRef.current;

      if (bh) {
        // Visual del núcleo (un brillo que indica el área de influencia)
        const coreRadius = 10 + bh.level;
        const grad = ctx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, coreRadius * 2);
        grad.addColorStop(0, 'rgba(68, 136, 255, 0.3)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, coreRadius * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      particlesRef.current.forEach(p => {
        if (bh) {
          const dx = bh.x - p.x;
          const dy = bh.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          // 1. LÓGICA DE ATRAVESAR:
          // Si la partícula está fuera de un radio muy pequeño (el "centro del centro"), la atraemos.
          // Si está justo en el centro, dejamos que su inercia la lleve al otro lado.
          const deadZone = 5; 

          if (dist > deadZone) {
            // Atracción lineal pura
            // Aumentamos la fuerza para que el "honda" sea más dramático
            const force = (bh.level * 2) / (dist * 0.1);
            
            // Aplicamos aceleración hacia el centro
            p.vx += (dx / dist) * force * 0.05;
            p.vy += (dy / dist) * force * 0.05;
          }

          // 2. AMORTIGUACIÓN DE VELOCIDAD EXTREMA
          // Para que no salgan volando infinitamente después de cruzar
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          const terminalVelocity = 15 + bh.level * 0.5;
          if (speed > terminalVelocity) {
            p.vx *= 0.95;
            p.vy *= 0.95;
          }
        }

        // Fricción constante para mantener el flujo orgánico
        p.vx *= 0.99;
        p.vy *= 0.99;

        p.x += p.vx;
        p.y += p.vy;

        // Teletransporte en bordes
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Dibujo de la partícula (cambia de color según la velocidad)
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        ctx.fillStyle = speed > 10 ? '#ffffff' : '#4488ff';
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (blackHoleRef.current) {
        const dx = x - blackHoleRef.current.x;
        const dy = y - blackHoleRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) < 100) {
          isDraggingRef.current = true;
          blackHoleRef.current.level = Math.min(blackHoleRef.current.level + 5, 60);
          return;
        }
      }
      
      blackHoleRef.current = { x, y, level: 15 };
      isDraggingRef.current = true;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current && blackHoleRef.current) {
        const rect = canvas.getBoundingClientRect();
        blackHoleRef.current.x = e.clientX - rect.left;
        blackHoleRef.current.y = e.clientY - rect.top;
      }
    };

    const handleMouseUp = () => { isDraggingRef.current = false; };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full bg-black cursor-crosshair"
      style={{ touchAction: 'none' }}
    />
  );
}