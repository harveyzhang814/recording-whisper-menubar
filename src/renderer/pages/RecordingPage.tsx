import React, { useState } from 'react';
import { RecordingControl } from '../components/recording/RecordingControl';
import { Card } from '../components/Card';
import { AudioFile } from '../../shared/types';

export const RecordingPage: React.FC = () => {
  const [lastRecording, setLastRecording] = useState<AudioFile | null>(null);

  const handleRecordingStart = () => {
    console.log('录音开始');
  };

  const handleRecordingStop = (audioFile: AudioFile) => {
    console.log('录音停止', audioFile);
    setLastRecording(audioFile);
  };

  const handleRecordingCancel = () => {
    console.log('录音取消');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          录音功能
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          使用麦克风录制音频，支持实时音量显示和设备选择
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 录音控制区域 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            录音控制
          </h2>
          <RecordingControl
            onRecordingStart={handleRecordingStart}
            onRecordingStop={handleRecordingStop}
            onRecordingCancel={handleRecordingCancel}
          />
        </Card>

        {/* 录音信息区域 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            录音信息
          </h2>
          
          {lastRecording ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    录音完成
                  </span>
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  文件已保存到本地
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    文件名
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {lastRecording.fileName}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    文件大小
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {(lastRecording.fileSize / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    格式
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {lastRecording.format.toUpperCase()}
                  </div>
                </div>

                {lastRecording.duration && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      时长
                    </label>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {Math.floor(lastRecording.duration / 60)}:{(lastRecording.duration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    采样率
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {lastRecording.sampleRate} Hz
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    声道数
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {lastRecording.channels} 声道
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors">
                  播放
                </button>
                <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors">
                  开始转录
                </button>
                <button className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors">
                  导出
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
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
              <p className="text-gray-500 dark:text-gray-400">
                暂无录音文件
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                点击左侧开始录音
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* 使用说明 */}
      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          使用说明
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">录音功能</h3>
            <ul className="space-y-1">
              <li>• 选择录音设备（麦克风）</li>
              <li>• 点击开始录音按钮</li>
              <li>• 支持暂停/恢复录音</li>
              <li>• 实时显示音量和时长</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">注意事项</h3>
            <ul className="space-y-1">
              <li>• 确保麦克风权限已开启</li>
              <li>• 录音文件自动保存到本地</li>
              <li>• 支持WAV格式录音</li>
              <li>• 录音完成后可进行转录</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}; 