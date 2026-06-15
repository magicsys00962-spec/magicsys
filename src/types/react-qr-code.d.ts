declare module 'react-qr-code' {
  import React from 'react';
  interface QRCodeProps {
    value: string;
    size?: number;
    bgColor?: string;
    fgColor?: string;
    level?: 'L' | 'M' | 'Q' | 'H';
    className?: string;
  }
  interface QRCodeType extends React.FC<QRCodeProps> {
    renderAsString: (value: string, options?: { size?: number; bgColor?: string; fgColor?: string; level?: 'L' | 'M' | 'Q' | 'H' }) => string;
  }
  const QRCode: QRCodeType;
  export default QRCode;
}
