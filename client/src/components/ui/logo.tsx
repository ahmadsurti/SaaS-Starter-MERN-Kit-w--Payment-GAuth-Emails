import { Zap } from 'lucide-react';

export interface LogoProps {
  className?: string;
}

// ponytail: placeholder icon — swap Zap for your real SVG brand mark when ready
export default function Logo({ className }: LogoProps) {
  return (
    <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-primary ${className ?? ''}`}>
      <Zap className="w-5 h-5 text-primary-foreground" />
    </div>
  );
}
