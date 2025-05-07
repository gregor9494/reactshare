import React from 'react';

// Custom TikTok icon component that mimics lucide-react's icon API
export const TikTok = React.forwardRef<
  SVGSVGElement, 
  React.SVGProps<SVGSVGElement>
>(({ className, ...props }, ref) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      ref={ref}
      {...props}
    >
      {/* Simple TikTok logo representation */}
      <path d="M9 12a4 4 0 1 0 4 4V9.5a5.5 5.5 0 0 0 5.5 5.5" />
      <path d="M9.5 8a5.5 5.5 0 0 0 5.5 5.5V9.5a5.5 5.5 0 0 0-5.5-5.5" />
      <path d="M14 3a4 4 0 0 0 4 4h1v4h-1a7.9 7.9 0 0 1-5-2" />
    </svg>
  );
});

TikTok.displayName = 'TikTok';

export default TikTok;