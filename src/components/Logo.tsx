import React from 'react';

interface LogoProps {
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  theme?: 'dark' | 'light';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ variant = 'full', size = 'md', theme = 'dark', className = '' }) => {
  const sizes = {
    sm: { icon: 32, text: 'text-lg', subtitle: 'text-[8px]' },
    md: { icon: 40, text: 'text-xl', subtitle: 'text-[9px]' },
    lg: { icon: 64, text: 'text-3xl', subtitle: 'text-xs' },
  };

  const s = sizes[size];
  const goldColor = '#D4A843';
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

  const IconSVG = () => (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <rect width="64" height="64" rx="14" fill={goldColor} />
      <text
        x="32"
        y="42"
        textAnchor="middle"
        fontFamily="serif"
        fontWeight="bold"
        fontSize="32"
        fill="#1a1a2e"
      >
        MD
      </text>
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={className}>
        <IconSVG />
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`flex flex-col ${className}`}>
        <span className={`${s.text} font-bold tracking-wider`} style={{ color: goldColor }}>
          MAGIC
        </span>
        <span className={`${s.subtitle} tracking-widest uppercase opacity-70 ${textColor}`}>
          Materials & Decoration
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <IconSVG />
      <div className="flex flex-col">
        <span className={`${s.text} font-bold tracking-wider`} style={{ color: goldColor }}>
          MAGIC
        </span>
        <span className={`${s.subtitle} tracking-widest uppercase opacity-70 ${textColor}`}>
          Materials & Decoration
        </span>
      </div>
    </div>
  );
};

export default Logo;
