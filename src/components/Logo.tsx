import React from 'react';

interface LogoProps {
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  theme?: 'dark' | 'light';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ variant = 'full', size = 'md', theme = 'dark', className = '' }) => {
  const sizes = {
    sm: { img: 32, text: 'text-lg', subtitle: 'text-[8px]' },
    md: { img: 40, text: 'text-xl', subtitle: 'text-[9px]' },
    lg: { img: 64, text: 'text-3xl', subtitle: 'text-xs' },
  };

  const s = sizes[size];
  const goldColor = '#D4A843';
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

  const LogoImg = () => (
    <div
      className="flex-shrink-0 rounded-lg overflow-hidden bg-white"
      style={{ width: s.img, height: s.img, padding: 2 }}
    >
      <img
        src="/image.png"
        alt="Magic Decoration Logo"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );

  if (variant === 'icon') {
    return (
      <div className={className}>
        <LogoImg />
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
      <LogoImg />
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
