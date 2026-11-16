declare module 'lucide-react' {
  import type { FC, SVGProps } from 'react';

  type IconProps = SVGProps<SVGSVGElement> & {
    size?: number | string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
    color?: string;
  };

  export const Award: FC<IconProps>;
  export const BookOpen: FC<IconProps>;
  export const Compass: FC<IconProps>;
  export const Film: FC<IconProps>;
  export const Layers: FC<IconProps>;
  export const Map: FC<IconProps>;
  export const Maximize2: FC<IconProps>;
  export const Minimize2: FC<IconProps>;
  export const Navigation: FC<IconProps>;
  export const Pause: FC<IconProps>;
  export const Play: FC<IconProps>;
  export const RotateCcw: FC<IconProps>;
  export const Sparkles: FC<IconProps>;
  export const Trophy: FC<IconProps>;
  export const Upload: FC<IconProps>;
  export const UserCheck: FC<IconProps>;
  export const Users: FC<IconProps>;
  export const Volume2: FC<IconProps>;
  export const VolumeX: FC<IconProps>;
  export const X: FC<IconProps>;
}
