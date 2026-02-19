'use client';

import Grainient from '@/app/components/Grainient';

export function GrainientPageBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0" style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Grainient
          color1="#6366f1"
          color2="#c4caff"
          color3="#bda8ff"
          timeSpeed={0.25}
          colorBalance={0}
          warpStrength={1}
          warpFrequency={5}
          warpSpeed={2}
          warpAmplitude={50}
          blendAngle={0}
          blendSoftness={0.05}
          rotationAmount={500}
          noiseScale={2}
          grainAmount={0.1}
          grainScale={2}
          grainAnimated={false}
          contrast={1.5}
          gamma={1}
          saturation={1}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />
      </div>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgb(var(--marketplace-overlay-rgb) / 0.5)' }}
      />
    </div>
  );
}
