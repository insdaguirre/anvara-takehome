import type { CSSProperties, JSX, ReactNode } from 'react';

type GlassSurfaceProps = {
  children?: ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  borderWidth?: number;
  brightness?: number;
  opacity?: number;
  blur?: number;
  displace?: number;
  backgroundOpacity?: number;
  saturation?: number;
  distortionScale?: number;
  redOffset?: number;
  greenOffset?: number;
  blueOffset?: number;
  xChannel?: 'R' | 'G' | 'B' | 'A';
  yChannel?: 'R' | 'G' | 'B' | 'A';
  mixBlendMode?: CSSProperties['mixBlendMode'];
  className?: string;
  style?: CSSProperties;
};

declare function GlassSurface(props: GlassSurfaceProps): JSX.Element;

export default GlassSurface;
