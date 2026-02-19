'use client';

import { useEffect, useState } from 'react';
import LightPillar from './LightPillar';

export function LandingBackground() {
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);

  useEffect(() => {
    let ticking = false;

    const updateOpacity = () => {
      const hero = document.querySelector('section[aria-label="Hero"]');
      const heroHeight = hero?.clientHeight || window.innerHeight;
      const progress = Math.min(window.scrollY / heroHeight, 1);
      const nextOpacity = 0.4 + progress * 0.4;
      setOverlayOpacity(nextOpacity);
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateOpacity);
    };

    updateOpacity();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <LightPillar
          topColor="#5227FF"
          bottomColor="#FF9FFC"
          intensity={1}
          rotationSpeed={0.3}
          glowAmount={0.002}
          pillarWidth={3}
          pillarHeight={0.4}
          noiseIntensity={0.5}
          pillarRotation={25}
          interactive={false}
          mixBlendMode="screen"
          quality="high"
        />
        <div
          className="absolute inset-0"
          style={{ backgroundColor: 'rgb(var(--landing-overlay-rgb))', opacity: overlayOpacity }}
        />
      </div>
    </div>
  );
}
