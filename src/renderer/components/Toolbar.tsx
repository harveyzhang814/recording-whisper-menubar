import React from 'react';
import { Button } from './Button';
import { Mic, Settings, X, Minimize2, List, MicOff } from 'lucide-react';

interface ToolbarProps {
  currentPage: 'tasks' | 'recording';
  onPageChange: (page: 'tasks' | 'recording') => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ currentPage, onPageChange }) => {
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
        {/* 左侧：页面切换 */}
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => onPageChange('recording')}
            className={`${currentPage === 'recording' ? 'btn-primary' : 'btn-secondary'}`}
            icon={<Mic className="w-4 h-4" />}
          >
            录音
          </Button>
          <Button
            onClick={() => onPageChange('tasks')}
            className={`${currentPage === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
            icon={<List className="w-4 h-4" />}
          >
            任务列表
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