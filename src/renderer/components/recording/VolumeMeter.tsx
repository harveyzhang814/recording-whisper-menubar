import React, { useEffect, useRef } from 'react';

interface VolumeMeterProps {
  volumeLevel: number; // 0-100
  className?: string;
}

export const VolumeMeter: React.FC<VolumeMeterProps> = ({
  volumeLevel,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // 绘制音量波形
  const drawVolumeMeter = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // 设置渐变背景
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#10B981'); // 绿色
    gradient.addColorStop(0.5, '#F59E0B'); // 黄色
    gradient.addColorStop(1, '#EF4444'); // 红色

    // 计算音量条数量
    const barCount = 20;
    const barWidth = width / barCount;
    const maxBarHeight = height * 0.8;

    // 绘制音量条
    for (let i = 0; i < barCount; i++) {
      const barHeight = (volumeLevel / 100) * maxBarHeight * (0.3 + 0.7 * Math.random());
      const x = i * barWidth + barWidth * 0.1;
      const y = height - barHeight;

      // 根据音量级别设置颜色
      let barColor = '#10B981'; // 绿色
      if (volumeLevel > 70) {
        barColor = '#EF4444'; // 红色
      } else if (volumeLevel > 40) {
        barColor = '#F59E0B'; // 黄色
      }

      ctx.fillStyle = barColor;
      ctx.fillRect(x, y, barWidth * 0.8, barHeight);

      // 添加高光效果
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(x, y, barWidth * 0.8, barHeight * 0.3);
    }

    // 绘制音量数值
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${volumeLevel}%`, width / 2, height - 5);
  };

  // 动画循环
  const animate = () => {
    drawVolumeMeter();
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [volumeLevel]);

  return (
    <div className={`volume-meter ${className}`}>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
        音量级别
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={60}
        className="w-full h-15 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
      />
    </div>
  );
}; 