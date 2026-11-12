declare module 'lucide-react' {
  import type { FC, SVGProps } from 'react';

  type IconProps = SVGProps<SVGSVGElement> & {
    size?: number | string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
    color?: string;
  };

  export const Map: FC<IconProps>;
  export const Pause: FC<IconProps>;
  export const Volume2: FC<IconProps>;
  export const VolumeX: FC<IconProps>;
}
