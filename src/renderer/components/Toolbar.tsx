import React from 'react';
import { Button } from './Button';
import { Mic, Settings, X, Minimize2 } from 'lucide-react';

export const Toolbar: React.FC = () => {
  const handleMinimize = () => {
    // TODO: 实现最小化功能
    console.log('Minimize window');
  };

  const handleClose = () => {
    // TODO: 实现关闭功能
    console.log('Close window');
  };

  const handleStartRecording = () => {
    // TODO: 实现开始录音功能
    console.log('Start recording');
  };

  const handleOpenSettings = () => {
    // TODO: 实现打开设置功能
    console.log('Open settings');
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* 左侧：录音控制 */}
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleStartRecording}
            className="btn-primary"
            icon={<Mic className="w-4 h-4" />}
          >
            开始录音
          </Button>
        </div>

        {/* 中间：应用标题 */}
        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            WhisperElectron
          </h1>
        </div>

        {/* 右侧：窗口控制 */}
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleOpenSettings}
            className="btn-secondary"
            icon={<Settings className="w-4 h-4" />}
          />
          <Button
            onClick={handleMinimize}
            className="btn-secondary"
            icon={<Minimize2 className="w-4 h-4" />}
          />
          <Button
            onClick={handleClose}
            className="btn-secondary"
            icon={<X className="w-4 h-4" />}
          />
        </div>
      </div>
    </div>
  );
}; 