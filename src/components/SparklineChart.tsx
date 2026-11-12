import React from 'react';

interface SparklineChartProps {
  data: number[];
  isPositive: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  isPositive,
  width = 140,
  height = 38,
  className = '',
}) => {
  // If data is insufficient, render a subtle flat guideline
  if (!data || data.length < 2) {
    return (
      <div
        dir="ltr"
        className={`flex items-center justify-center text-[10px] text-slate-400 font-mono ${className}`}
        style={{ width, height }}
      >
        <svg width={width} height={height} className="overflow-visible">
          <line
            x1="0"
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke="#CBD5E1"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        </svg>
      </div>
    );
  }

  // Find min and max for scaling with padding
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const paddingY = 4;
  const usableHeight = height - paddingY * 2;

  // Calculate coordinates (dir="ltr" so index 0 is left, last index is right)
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - paddingY - ((val - min) / range) * usableHeight;
    return { x, y };
  });

  const strokeColor = isPositive ? '#059669' : '#DC2626'; // Emerald vs Crimson
  const gradientId = `spark-grad-${Math.random().toString(36).substring(2, 9)}`;

  // Construct SVG path string
  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    // Smooth line curve
    const prev = points[i - 1];
    const cpx1 = prev.x + (pt.x - prev.x) / 2;
    const cpy1 = prev.y;
    const cpx2 = prev.x + (pt.x - prev.x) / 2;
    const cpy2 = pt.y;
    return `${acc} C ${cpx1.toFixed(1)} ${cpy1.toFixed(1)}, ${cpx2.toFixed(1)} ${cpy2.toFixed(1)}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, '');

  // Fill path closing at bottom
  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  const lastPoint = points[points.length - 1];

  return (
    <div dir="ltr" className={`relative inline-block ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible block"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stopColor={strokeColor}
              stopOpacity={isPositive ? 0.22 : 0.18}
            />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Gradient Area Fill */}
        <path d={fillD} fill={`url(#${gradientId})`} />

        {/* Sparkline Curve */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current price marker dot */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="3.5"
          fill={strokeColor}
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
};
