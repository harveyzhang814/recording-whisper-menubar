import React, { useState, useEffect } from 'react';
import { Button } from '../Button';
import { VolumeMeter } from './VolumeMeter';
import { DeviceSelector } from './DeviceSelector';
import { RecordingState, AudioDevice } from '../../../shared/types';

interface RecordingControlProps {
  onRecordingStart?: () => void;
  onRecordingStop?: (audioFile: any) => void;
  onRecordingCancel?: () => void;
  className?: string;
}

export const RecordingControl: React.FC<RecordingControlProps> = ({
  onRecordingStart,
  onRecordingStop,
  onRecordingCancel,
  className = ''
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    volumeLevel: 0,
    deviceId: '',
    startTime: new Date()
  });

  const [availableDevices, setAvailableDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // 获取录音状态
  const updateRecordingState = async () => {
    try {
      const state = await window.electronAPI.recording.getRecordingState();
      setRecordingState(state);
    } catch (error) {
      console.error('获取录音状态失败:', error);
    }
  };

  // 获取可用设备
  const loadAvailableDevices = async () => {
    try {
      const devices = await window.electronAPI.recording.getAvailableDevices();
      setAvailableDevices(devices);
      
      // 设置默认设备
      if (devices.length > 0 && !selectedDevice) {
        setSelectedDevice(devices[0].deviceId);
      }
    } catch (error) {
      console.error('获取录音设备失败:', error);
    }
  };

  // 开始录音
  const handleStartRecording = async () => {
    try {
      setIsLoading(true);
      
      const options = selectedDevice ? { deviceId: selectedDevice } : undefined;
      await window.electronAPI.recording.startRecording(options);
      
      onRecordingStart?.();
    } catch (error) {
      console.error('开始录音失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 停止录音
  const handleStopRecording = async () => {
    try {
      setIsLoading(true);
      
      const audioFile = await window.electronAPI.recording.stopRecording();
      
      onRecordingStop?.(audioFile);
    } catch (error) {
      console.error('停止录音失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 取消录音
  const handleCancelRecording = async () => {
    try {
      setIsLoading(true);
      
      await window.electronAPI.recording.cancelRecording();
      
      onRecordingCancel?.();
    } catch (error) {
      console.error('取消录音失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 暂停录音
  const handlePauseRecording = async () => {
    try {
      await window.electronAPI.recording.pauseRecording();
    } catch (error) {
      console.error('暂停录音失败:', error);
    }
  };

  // 恢复录音
  const handleResumeRecording = async () => {
    try {
      await window.electronAPI.recording.resumeRecording();
    } catch (error) {
      console.error('恢复录音失败:', error);
    }
  };

  // 设备切换
  const handleDeviceChange = async (deviceId: string) => {
    try {
      await window.electronAPI.recording.setRecordingDevice(deviceId);
      setSelectedDevice(deviceId);
    } catch (error) {
      console.error('切换录音设备失败:', error);
    }
  };

  // 格式化时长显示
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 监听录音状态变化
  useEffect(() => {
    const updateInterval = setInterval(updateRecordingState, 1000);
    return () => clearInterval(updateInterval);
  }, []);

  // 监听音量变化
  useEffect(() => {
    const volumeInterval = setInterval(async () => {
      if (recordingState.isRecording && !recordingState.isPaused) {
        try {
          const volumeLevel = await window.electronAPI.recording.getVolumeLevel();
          setRecordingState(prev => ({ ...prev, volumeLevel }));
        } catch (error) {
          console.error('获取音量失败:', error);
        }
      }
    }, 100);

    return () => clearInterval(volumeInterval);
  }, [recordingState.isRecording, recordingState.isPaused]);

  // 初始化加载设备
  useEffect(() => {
    loadAvailableDevices();
  }, []);

  return (
    <div className={`recording-control ${className}`}>
      {/* 设备选择器 */}
      <div className="mb-4">
        <DeviceSelector
          devices={availableDevices}
          selectedDevice={selectedDevice}
          onDeviceChange={handleDeviceChange}
          disabled={recordingState.isRecording}
        />
      </div>

      {/* 录音状态显示 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            录音状态
          </div>
          <div className="text-sm font-medium">
            {recordingState.isRecording ? (
              <span className="text-red-500 flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                录音中
              </span>
            ) : (
              <span className="text-gray-500">待机</span>
            )}
          </div>
        </div>

        {/* 录音时长 */}
        {recordingState.isRecording && (
          <div className="text-2xl font-mono text-center mb-4">
            {formatDuration(recordingState.duration)}
          </div>
        )}

        {/* 音量显示 */}
        {recordingState.isRecording && (
          <div className="mb-4">
            <VolumeMeter volumeLevel={recordingState.volumeLevel} />
          </div>
        )}
      </div>

      {/* 录音控制按钮 */}
      <div className="flex items-center justify-center space-x-4">
        {!recordingState.isRecording ? (
          // 开始录音按钮
          <Button
            onClick={handleStartRecording}
            disabled={isLoading || availableDevices.length === 0}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                准备中...
              </div>
            ) : (
              <div className="flex items-center">
                <div className="w-4 h-4 bg-white rounded-full mr-2"></div>
                开始录音
              </div>
            )}
          </Button>
        ) : (
          // 录音进行中的按钮组
          <div className="flex items-center space-x-3">
            {/* 暂停/恢复按钮 */}
            {recordingState.isPaused ? (
              <Button
                onClick={handleResumeRecording}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                恢复
              </Button>
            ) : (
              <Button
                onClick={handlePauseRecording}
                disabled={isLoading}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
              >
                暂停
              </Button>
            )}

            {/* 停止录音按钮 */}
            <Button
              onClick={handleStopRecording}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
            >
              停止
            </Button>

            {/* 取消录音按钮 */}
            <Button
              onClick={handleCancelRecording}
              disabled={isLoading}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              取消
            </Button>
          </div>
        )}
      </div>

      {/* 录音提示 */}
      {!recordingState.isRecording && availableDevices.length === 0 && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          未检测到录音设备，请检查麦克风权限
        </div>
      )}

      {recordingState.isRecording && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          录音进行中，请确保麦克风正常工作
        </div>
      )}
    </div>
  );
}; 