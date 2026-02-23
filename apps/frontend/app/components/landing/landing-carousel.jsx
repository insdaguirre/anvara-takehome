'use client';

import LogoLoop from './LogoLoop';

const logoFiles = [
  'BeReal._id7XmxNflL_1.svg',
  'Delta_Logo_0.svg',
  'Gopuff_ido7X9sT2X_0.svg',
  'Huel_idqSj1uu--_0.svg',
  'Legendz_idmwXjA3p9_1.svg',
  'Micro1_idakHGKdW4_1.svg',
  'Publicis Media_idKIBClWhH_1.svg',
  'Sephora_idLps5jNeU_0.svg',
  'Snap Inc._idPFAiKIiX_0.svg',
  'Squarespace_idfj-H9l5P_1.svg',
  'bp-logo.svg',
];

function toTitleCase(value) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function deriveAltFromFilename(filename) {
  const basename = filename.replace(/\.[^/.]+$/, '');
  const withoutGeneratedSuffix = basename.replace(/_id[^_]+(?:_[0-9]+)?$/i, '');
  const normalized = withoutGeneratedSuffix.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return 'Partner Logo';
  }

  return toTitleCase(normalized);
}

const logos = logoFiles.map((file) => ({
  src: `/anvara-carousel-images/${encodeURIComponent(file)}`,
  alt: deriveAltFromFilename(file),
}));

export function LandingCarousel() {
  return (
    <section aria-label="Partner logos" className="py-8 md:py-10 lg:-mt-8 xl:-mt-12">
      <div className="mx-auto max-w-6xl px-4">
        <p className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-[rgb(var(--landing-feature-label-rgb))]">
          Trusted by teams at
        </p>
        <div className="relative overflow-hidden">
          <LogoLoop
            logos={logos}
            speed={70}
            direction="left"
            logoHeight={34}
            gap={44}
            hoverSpeed={20}
            scaleOnHover
            fadeOut
            ariaLabel="Trusted partner logos"
          />
        </div>
      </div>
    </section>
  );
}
