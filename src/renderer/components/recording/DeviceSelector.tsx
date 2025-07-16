import React, { useState } from 'react';
import { AudioDevice } from '../../../shared/types';

interface DeviceSelectorProps {
  devices: AudioDevice[];
  selectedDevice: string;
  onDeviceChange: (deviceId: string) => void;
  disabled?: boolean;
  className?: string;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  selectedDevice,
  onDeviceChange,
  disabled = false,
  className = ''
}) => {
  const [isTesting, setIsTesting] = useState(false);

  // 测试设备
  const handleTestDevice = async (deviceId: string) => {
    try {
      setIsTesting(true);
      
      // 这里应该调用测试设备的API
      // 暂时模拟测试过程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`测试设备: ${deviceId}`);
    } catch (error) {
      console.error('设备测试失败:', error);
    } finally {
      setIsTesting(false);
    }
  };

  // 刷新设备列表
  const handleRefreshDevices = async () => {
    try {
      // 这里应该调用刷新设备的API
      console.log('刷新设备列表');
    } catch (error) {
      console.error('刷新设备失败:', error);
    }
  };

  return (
    <div className={`device-selector ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          录音设备
        </label>
        <button
          onClick={handleRefreshDevices}
          disabled={disabled}
          className="text-xs text-blue-500 hover:text-blue-600 disabled:text-gray-400"
        >
          刷新
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          未检测到录音设备
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((device) => (
            <div
              key={device.deviceId}
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedDevice === device.deviceId
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && onDeviceChange(device.deviceId)}
            >
              <div className="flex items-center space-x-3">
                {/* 设备图标 */}
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-gray-600 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </div>

                {/* 设备信息 */}
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {device.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {device.kind === 'audioinput' ? '麦克风' : device.kind}
                  </div>
                </div>
              </div>

              {/* 选择指示器和测试按钮 */}
              <div className="flex items-center space-x-2">
                {/* 测试按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTestDevice(device.deviceId);
                  }}
                  disabled={disabled || isTesting}
                  className="text-xs px-2 py-1 text-gray-500 hover:text-blue-500 disabled:text-gray-400"
                >
                  {isTesting ? '测试中...' : '测试'}
                </button>

                {/* 选择指示器 */}
                {selectedDevice === device.deviceId && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-2 h-2 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 设备状态提示 */}
      {devices.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          已检测到 {devices.length} 个录音设备
        </div>
      )}
    </div>
  );
}; 