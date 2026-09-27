import React, { useEffect, useRef } from 'react';

/**
 * FooterParticleCanvas (adapted from SAHNIRMAAN for SWATVA)
 * Replicates the exact typography sizing, quadratic dispersion physics, 
 * stippled pointillism particle engine, and dissolve scattering on scroll-to-top.
 */
export default function FooterParticles({ text = 'SWATVA', darkMode = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let particles = [];
    let animationFrameId = null;
    let isVisible = false;
    const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      radius: 130,
      isHovering: false,
      hoverIntensity: 0
    };

    let width = 0;
    let height = 0;

    const resize = () => {
      if (!canvas) return;
      const parent = canvas.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : { width: window.innerWidth, height: 200 };

      width = Math.floor(rect.width) || window.innerWidth;
      height = Math.max(120, Math.min(260, Math.floor(width * 0.18)));
      if (width < 600) {
        height = Math.max(130, Math.min(180, Math.floor(width * 0.28)));
      }

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      ctx.scale(dpr, dpr);
      mouse.radius = Math.max(80, Math.min(140, width * 0.11));
      generateParticles();
    };

    const generateParticles = () => {
      const offscreen = document.createElement('canvas');
      const offCtx = offscreen.getContext('2d', { willReadFrequently: true });

      offscreen.width = width;
      offscreen.height = height;

      let fontSize = Math.floor(width / (text.length * 0.58));
      fontSize = Math.max(28, Math.min(fontSize, 110));

      offCtx.font = '900 ' + fontSize + 'px "Space Grotesk", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.fillStyle = '#ffffff';

      const textMetrics = offCtx.measureText(text);
      if (textMetrics.width > width * 0.92) {
        const scale = (width * 0.92) / textMetrics.width;
        fontSize = Math.floor(fontSize * scale);
        offCtx.font = '900 ' + fontSize + 'px "Space Grotesk", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      }

      const centerX = width / 2;
      const centerY = height / 2;
      offCtx.fillText(text, centerX, centerY);

      const imgData = offCtx.getImageData(0, 0, width, height).data;
      const newTargets = [];
      const step = width < 600 ? 3 : (width < 1100 ? 4 : 4);

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const index = (y * width + x) * 4;
          const alpha = imgData[index + 3];

          if (alpha > 120) {
            const jitterX = (Math.random() - 0.5) * (step * 0.9);
            const jitterY = (Math.random() - 0.5) * (step * 0.9);

            const originX = x + jitterX;
            const originY = y + jitterY;

            const sizeRand = Math.random();
            let size = 1.2;
            if (sizeRand > 0.85) {
              size = 2.2 + Math.random() * 0.8;
            } else if (sizeRand > 0.5) {
              size = 1.5 + Math.random() * 0.6;
            } else {
              size = 0.9 + Math.random() * 0.5;
            }

            const baseAlpha = 0.4 + (alpha / 255) * 0.55 * (0.6 + Math.random() * 0.4);

            newTargets.push({
              originX,
              originY,
              size,
              baseAlpha
            });
          }
        }
      }

      const updatedParticles = [];
      for (let i = 0; i < newTargets.length; i++) {
        const target = newTargets[i];
        if (particles[i]) {
          const p = particles[i];
          p.originX = target.originX;
          p.originY = target.originY;
          p.size = target.size;
          p.baseAlpha = target.baseAlpha;
          p.alpha = target.baseAlpha;
          p.isDissolving = false;
          updatedParticles.push(p);
        } else {
          const spawnAngle = Math.random() * Math.PI * 2;
          const spawnDist = Math.random() * 40 + 10;
          updatedParticles.push({
            x: target.originX + Math.cos(spawnAngle) * spawnDist,
            y: target.originY + Math.sin(spawnAngle) * spawnDist,
            originX: target.originX,
            originY: target.originY,
            vx: 0,
            vy: 0,
            size: target.size,
            baseAlpha: target.baseAlpha,
            alpha: target.baseAlpha,
            spring: 0.035 + Math.random() * 0.015,
            friction: 0.865 + Math.random() * 0.025,
            disperseForce: 6.2 + Math.random() * 3.2,
            isDissolving: false,
            dissolveDelay: 0,
            dissolveTimer: 0,
            dissolveRate: 0.03,
            ashVx: 0,
            ashVy: 0
          });
        }
      }
      particles = updatedParticles;
    };

    const resetParticles = () => {
      if (!particles || !particles.length) return;
      particles.forEach((p) => {
        p.isDissolving = false;
        p.alpha = p.baseAlpha;
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnDist = Math.random() * 25 + 5;
        p.x = p.originX + Math.cos(spawnAngle) * spawnDist;
        p.y = p.originY + Math.sin(spawnAngle) * spawnDist;
        p.vx = 0;
        p.vy = 0;
      });
    };

    let autoResetTimer = null;
    const triggerParticleDissolve = () => {
      if (!particles.length) return;
      particles.forEach((p) => {
        p.isDissolving = true;
        p.dissolveTimer = 0;
        p.dissolveDelay = Math.random() * 12;
        p.dissolveRate = 0.025 + Math.random() * 0.045;
        const blastAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
        const blastSpeed = Math.random() * 9 + 4;
        p.ashVx = Math.cos(blastAngle) * blastSpeed;
        p.ashVy = Math.sin(blastAngle) * blastSpeed - (Math.random() * 3 + 2);
        p.vx = p.ashVx;
        p.vy = p.ashVy;
      });
      // Automatically reset particles after dissolve animation finishes so they return on next view
      if (autoResetTimer) clearTimeout(autoResetTimer);
      autoResetTimer = setTimeout(() => {
        resetParticles();
      }, 1800);
    };

    window.addEventListener('sahnirmaan-trigger-particle-dissolve', triggerParticleDissolve);
    window.addEventListener('swatva-trigger-particle-dissolve', triggerParticleDissolve);
    window.addEventListener('sahnirmaan-reset-particles', resetParticles);
    window.addEventListener('swatva-reset-particles', resetParticles);

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.isHovering = true;
    };

    const onMouseLeave = () => {
      mouse.isHovering = false;
      mouse.targetX = -9999;
      mouse.targetY = -9999;
    };

    canvas.addEventListener('mousemove', onMouseMove, { passive: true });
    canvas.addEventListener('mouseleave', onMouseLeave, { passive: true });

    let lastTime = performance.now();
    const render = (now) => {
      animationFrameId = requestAnimationFrame(render);
      if (!isVisible) return;

      const dt = Math.min((now - lastTime) / 16.667, 2.5);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      mouse.x += (mouse.targetX - mouse.x) * 0.22 * dt;
      mouse.y += (mouse.targetY - mouse.y) * 0.22 * dt;

      if (mouse.isHovering) {
        mouse.hoverIntensity += (1 - mouse.hoverIntensity) * 0.12 * dt;
      } else {
        mouse.hoverIntensity += (0 - mouse.hoverIntensity) * 0.08 * dt;
      }

      const activeColor = darkMode ? 'rgba(255, 255, 255, ' : 'rgba(15, 23, 42, ';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (p.isDissolving) {
          p.dissolveTimer += dt;
          if (p.dissolveTimer >= p.dissolveDelay) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy -= 0.15 * dt;
            p.vx += (Math.random() - 0.5) * 0.4 * dt;
            p.alpha -= p.dissolveRate * dt;
            if (p.alpha <= 0) {
              p.alpha = 0;
              continue;
            }
          }
        } else if (!isReducedMotion) {
          const dxMouse = p.x - mouse.x;
          const dyMouse = p.y - mouse.y;
          const distSq = dxMouse * dxMouse + dyMouse * dyMouse;
          const rSq = mouse.radius * mouse.radius;

          if (distSq < rSq && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const normDist = dist / mouse.radius;
            const force = (1 - normDist) * (1 - normDist) * p.disperseForce * mouse.hoverIntensity;
            const angle = Math.atan2(dyMouse, dxMouse);
            p.vx += Math.cos(angle) * force * dt;
            p.vy += Math.sin(angle) * force * dt;
          }

          const dxOrigin = p.originX - p.x;
          const dyOrigin = p.originY - p.y;
          p.vx += dxOrigin * p.spring * dt;
          p.vy += dyOrigin * p.spring * dt;
          p.vx *= Math.pow(p.friction, dt);
          p.vy *= Math.pow(p.friction, dt);

          p.x += p.vx * dt;
          p.y += p.vy * dt;
        } else {
          p.x = p.originX;
          p.y = p.originY;
        }

        ctx.fillStyle = activeColor + (Math.max(0, Math.min(1, p.alpha))).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) {
        // When coming back into view, ensure particles are reset if they were dissolved
        if (particles.some(p => p.isDissolving || p.alpha <= 0)) {
          resetParticles();
        }
        lastTime = performance.now();
      }
    }, { threshold: 0.05 });

    observer.observe(canvas);
    resize();
    window.addEventListener('resize', resize);
    animationFrameId = requestAnimationFrame(render);

    return () => {
      if (autoResetTimer) clearTimeout(autoResetTimer);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('sahnirmaan-trigger-particle-dissolve', triggerParticleDissolve);
      window.removeEventListener('swatva-trigger-particle-dissolve', triggerParticleDissolve);
      window.removeEventListener('sahnirmaan-reset-particles', resetParticles);
      window.removeEventListener('swatva-reset-particles', resetParticles);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [text, darkMode]);

  return (
    <div className="w-full flex items-center justify-center relative overflow-hidden select-none cursor-default py-6">
      <canvas 
        ref={canvasRef} 
        className="block mx-auto max-w-full touch-none"
        aria-label={text}
      />
    </div>
  );
}
