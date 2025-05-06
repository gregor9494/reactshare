declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';

  export type Icon = ComponentType<SVGProps<SVGSVGElement>>;

  // Add all icons used in the project
  export const AlertTriangle: Icon;
  export const BarChart3: Icon;
  export const Bell: Icon;
  export const Calendar: Icon;
  export const CalendarIcon: Icon;
  export const Camera: Icon;
  export const Check: Icon;
  export const Clock: Icon;
  export const Download: Icon;
  export const Edit: Icon;
  export const Facebook: Icon;
  export const Instagram: Icon;
  export const LayoutGrid: Icon;
  export const LayoutPanelTop: Icon;
  export const Maximize2: Icon;
  export const Minimize2: Icon;
  export const MoveHorizontal: Icon;
  export const Mic: Icon;
  export const Monitor: Icon;
  export const MoreHorizontal: Icon;
  export const Music: Icon;
  export const Palette: Icon;
  export const Play: Icon;
  export const Scissors: Icon;
  export const Settings: Icon;
  export const Share2: Icon;
  export const Smile: Icon;
  export const Square: Icon;
  export const Trash2: Icon;
  export const Twitch: Icon;
  export const Twitter: Icon;
  export const Type: Icon;
  export const User: Icon;
  export const Youtube: Icon;
}

declare module 'date-fns' {
  export function format(date: Date | number, formatStr: string): string;
}