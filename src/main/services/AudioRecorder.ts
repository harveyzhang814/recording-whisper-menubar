import { EventEmitter } from 'events';
import { 
  AudioRecorder as IAudioRecorder,
  RecordingOptions, 
  RecordingState, 
  AudioDevice, 
  AudioFile,
  AudioFileInfo,
  AppError,
  LogCategory,
  LogLevel
} from '../../shared/types';
import { LogManager } from './LogManager';
import { FileManager } from './FileManager';
import { TaskManager } from './TaskManager';
import { ConfigManager } from './ConfigManager';
import * as fs from 'fs';
import * as path from 'path';

// 录音相关错误类型
export class RecordingError extends AppError {
  constructor(message: string, metadata?: any) {
    super(message, 'RECORDING_ERROR', 'RECORDING', metadata);
    this.name = 'RecordingError';
  }
}

// 录音数据块类型
interface AudioChunk {
  data: Blob;
  timestamp: number;
}

// 音量分析器配置
interface VolumeAnalyzerConfig {
  fftSize: number;
  smoothingTimeConstant: number;
  minDecibels: number;
  maxDecibels: number;
}

export class AudioRecorderImpl implements IAudioRecorder {
  private logManager: LogManager;
  private fileManager: FileManager;
  private taskManager: TaskManager;
  private configManager: ConfigManager;
  private eventEmitter: EventEmitter;

  // 录音状态
  private recordingState: RecordingState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    volumeLevel: 0,
    deviceId: '',
    startTime: new Date()
  };

  // Web Audio API 相关
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  // 录音数据
  private audioChunks: AudioChunk[] = [];
  private recordingStartTime: number = 0;
  private volumeUpdateInterval: NodeJS.Timeout | null = null;
  private durationUpdateInterval: NodeJS.Timeout | null = null;

  // 默认配置
  private defaultOptions: RecordingOptions = {
    format: 'audio/wav',
    sampleRate: 44100,
    channels: 1,
    bitRate: 128000
  };

  constructor(
    logManager: LogManager,
    fileManager: FileManager,
    taskManager: TaskManager,
    configManager: ConfigManager
  ) {
    this.logManager = logManager;
    this.fileManager = fileManager;
    this.taskManager = taskManager;
    this.configManager = configManager;
    this.eventEmitter = new EventEmitter();
  }

  /**
   * 初始化录音管理器
   */
  async initialize(): Promise<void> {
    try {
      this.logManager.audio('初始化录音管理器');
      
      // 加载录音配置
      const audioConfig = this.configManager.getConfig('audio');
      if (audioConfig) {
        this.defaultOptions = { ...this.defaultOptions, ...audioConfig };
      }

      // 初始化Web Audio API上下文
      if (typeof window !== 'undefined') {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      this.logManager.audio('录音管理器初始化完成');
    } catch (error) {
      this.logManager.error(LogCategory.AUDIO, '录音管理器初始化失败', error as Error);
      throw new RecordingError('录音管理器初始化失败', { error });
    }
  }

  /**
   * 开始录音
   */
  async startRecording(options?: RecordingOptions): Promise<void> {
    try {
      if (this.recordingState.isRecording) {
        throw new RecordingError('录音已在进行中');
      }

      this.logManager.audio('开始录音', { options });

      // 合并配置选项
      const recordingOptions = { ...this.defaultOptions, ...options };

      // 获取用户媒体流
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: recordingOptions.deviceId ? { exact: recordingOptions.deviceId } : undefined,
          sampleRate: recordingOptions.sampleRate,
          channelCount: recordingOptions.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // 创建音频上下文和分析器
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      // 创建音频源节点
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      // 创建MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: recordingOptions.format || 'audio/wav'
      });

      // 设置录音数据收集
      this.audioChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push({
            data: event.data,
            timestamp: Date.now()
          });
        }
      };

      // 开始录音
      this.mediaRecorder.start(1000); // 每秒收集一次数据
      this.recordingStartTime = Date.now();

      // 更新录音状态
      this.recordingState = {
        isRecording: true,
        isPaused: false,
        duration: 0,
        volumeLevel: 0,
        deviceId: recordingOptions.deviceId || '',
        startTime: new Date()
      };

      // 启动实时更新
      this.startRealTimeUpdates();

      // 触发事件
      this.eventEmitter.emit('recordingStarted', this.recordingState);

      this.logManager.audio('录音开始成功');
    } catch (error) {
      this.logManager.error(LogCategory.AUDIO, '开始录音失败', error as Error);
      throw new RecordingError('开始录音失败', { error });
    }
  }

  /**
   * 停止录音
   */
  async stopRecording(): Promise<AudioFile> {
    try {
      if (!this.recordingState.isRecording || !this.mediaRecorder) {
        throw new RecordingError('没有正在进行的录音');
      }

      this.logManager.audio('停止录音');

      // 停止MediaRecorder
      this.mediaRecorder.stop();
      
      // 停止实时更新
      this.stopRealTimeUpdates();

      // 等待录音数据收集完成
      const audioFile = await new Promise<AudioFile>((resolve, reject) => {
        if (!this.mediaRecorder) {
          reject(new RecordingError('MediaRecorder未初始化'));
          return;
        }

        this.mediaRecorder.onstop = async () => {
          try {
            // 合并音频数据
            const audioBlob = new Blob(this.audioChunks.map(chunk => chunk.data), {
              type: this.mediaRecorder?.mimeType || 'audio/wav'
            });

            // 生成文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `recording_${timestamp}.wav`;

            // 保存音频文件
            const audioBuffer = await audioBlob.arrayBuffer();
            const filePath = await this.saveAudioFile(audioBuffer, fileName);

            // 获取音频文件信息
            const audioInfo = await this.getAudioFileInfo(filePath);

            // 创建音频文件记录
            const audioFile: AudioFile = {
              fileID: this.generateFileId(),
              taskID: '', // 将在创建任务时设置
              fileName: fileName,
              filePath: filePath,
              fileSize: audioInfo.fileSize,
              duration: audioInfo.duration,
              format: audioInfo.format,
              sampleRate: audioInfo.sampleRate,
              channels: audioInfo.channels,
              bitRate: audioInfo.bitRate,
              createdAt: new Date(),
              updatedAt: new Date()
            };

            // 更新录音状态
            this.recordingState = {
              isRecording: false,
              isPaused: false,
              duration: 0,
              volumeLevel: 0,
              deviceId: '',
              startTime: new Date()
            };

            // 清理资源
            this.cleanup();

            // 触发事件
            this.eventEmitter.emit('recordingStopped', audioFile);

            resolve(audioFile);
          } catch (error) {
            reject(new RecordingError('保存录音文件失败', { error }));
          }
        };
      });

      this.logManager.audio('录音停止成功', { audioFile });
      return audioFile;
    } catch (error) {
      this.logManager.error(LogCategory.AUDIO, '停止录音失败', error as Error);
      throw new RecordingError('停止录音失败', { error });
    }
  }

  /**
   * 暂停录音
   */
  async pauseRecording(): Promise<void> {
    try {
      if (!this.recordingState.isRecording || this.recordingState.isPaused) {
        throw new RecordingError('录音未在进行中或已暂停');
      }

      if (!this.mediaRecorder) {
        throw new RecordingError('MediaRecorder未初始化');
      }

      this.logManager.log(LogCategory.AUDIO, '暂停录音');

      this.mediaRecorder.pause();
      this.recordingState.isPaused = true;

      // 触发事件
      this.eventEmitter.emit('recordingPaused', this.recordingState);

      this.logManager.log(LogCategory.AUDIO, '录音暂停成功');
    } catch (error) {
      this.logManager.error(LogCategory.AUDIO, '暂停录音失败', error);
      throw new RecordingError('暂停录音失败', { error });
    }
  }

  /**
   * 恢复录音
   */
  async resumeRecording(): Promise<void> {
    try {
      if (!this.recordingState.isRecording || !this.recordingState.isPaused) {
        throw new RecordingError('录音未在进行中或未暂停');
      }

      if (!this.mediaRecorder) {
        throw new RecordingError('MediaRecorder未初始化');
      }

      this.logManager.log(LogCategory.AUDIO, '恢复录音');

      this.mediaRecorder.resume();
      this.recordingState.isPaused = false;

      // 触发事件
      this.eventEmitter.emit('recordingResumed', this.recordingState);

      this.logManager.log(LogCategory.AUDIO, '录音恢复成功');
    } catch (error) {
      this.logManager.error(LogCategory.AUDIO, '恢复录音失败', error);
      throw new RecordingError('恢复录音失败', { error });
    }
  }

  /**
   * 取消录音
   */
  async cancelRecording(): Promise<void> {
    try {
      if (!this.recordingState.isRecording) {
        throw new RecordingError('没有正在进行的录音');
      }

      this.logManager.log(LogCategory.AUDIO, '取消录音');

      // 停止MediaRecorder
      if (this.mediaRecorder) {
        this.mediaRecorder.stop();
      }

      // 停止实时更新
      this.stopRealTimeUpdates();

      // 清理录音数据
      this.audioChunks = [];

      // 更新录音状态
      this.recordingState = {
        isRecording: false,
        isPaused: false,
        duration: 0,
        volumeLevel: 0,
        deviceId: '',
        startTime: new Date()
      };

      // 清理资源
      this.cleanup();

      // 触发事件
      this.eventEmitter.emit('recordingCancelled');

      this.logManager.log(LogCategory.AUDIO, '录音取消成功');
    } catch (error) {
      this.logManager.error(LogCategory.AUDIO, '取消录音失败', error);
      throw new RecordingError('取消录音失败', { error });
    }
  }

  /**
   * 获取录音状态
   */
  getRecordingState(): RecordingState {
    return { ...this.recordingState };
  }

  /**
   * 获取实时音量
   */
  getVolumeLevel(): number {
    if (!this.analyser || !this.recordingState.isRecording) {
      return 0;
    }

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // 计算平均音量
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    return Math.round((average / 255) * 100);
  }

  /**
   * 获取录音时长
   */
  getRecordingDuration(): number {
    if (!this.recordingState.isRecording) {
      return 0;
    }

    return Math.floor((Date.now() - this.recordingStartTime) / 1000);
  }

  /**
   * 设置录音设备
   */
  async setRecordingDevice(deviceId: string): Promise<void> {
    try {
      this.logManager.log(LogCategory.AUDIO, '设置录音设备', { deviceId });

      // 验证设备ID
      const devices = await this.getAvailableDevices();
      const device = devices.find(d => d.deviceId === deviceId);
      if (!device) {
        throw new RecordingError('指定的录音设备不存在');
      }

      // 如果正在录音，需要先停止
      if (this.recordingState.isRecording) {
        await this.stopRecording();
      }

      // 更新设备ID
      this.recordingState.deviceId = deviceId;

      // 更新配置
      await this.configManager.setConfig('audio', 'deviceId', deviceId);

      this.logManager.log(LogCategory.AUDIO, '录音设备设置成功');
    } catch (error) {
      this.logManager.error(LogCategory.AUDIO, '设置录音设备失败', error);
      throw new RecordingError('设置录音设备失败', { error });
    }
  }

  /**
   * 获取可用录音设备
   */
  async getAvailableDevices(): Promise<AudioDevice[]> {
    try {
      // 请求权限以获取设备列表
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // 过滤音频输入设备
      const audioDevices: AudioDevice[] = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `麦克风 ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId,
          kind: device.kind
        }));

      this.logManager.log(LogCategory.AUDIO, '获取可用录音设备', { count: audioDevices.length });
      return audioDevices;
    } catch (error) {
      this.logManager.error(LogCategory.AUDIO, '获取录音设备失败', error);
      throw new RecordingError('获取录音设备失败', { error });
    }
  }

  /**
   * 监听录音事件
   */
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * 销毁录音管理器
   */
  destroy(): void {
    try {
      this.logManager.log(LogCategory.AUDIO, '销毁录音管理器');

      // 停止录音
      if (this.recordingState.isRecording) {
        this.cancelRecording();
      }

      // 清理资源
      this.cleanup();

      // 移除所有事件监听器
      this.eventEmitter.removeAllListeners();

      this.logManager.log(LogCategory.AUDIO, '录音管理器销毁完成');
    } catch (error) {
      this.logManager.error(LogCategory.AUDIO, '销毁录音管理器失败', error);
    }
  }

  // 私有方法

  /**
   * 启动实时更新
   */
  private startRealTimeUpdates(): void {
    // 音量更新
    this.volumeUpdateInterval = setInterval(() => {
      if (this.recordingState.isRecording && !this.recordingState.isPaused) {
        const volumeLevel = this.getVolumeLevel();
        this.recordingState.volumeLevel = volumeLevel;
        this.eventEmitter.emit('volumeChanged', volumeLevel);
      }
    }, 100);

    // 时长更新
    this.durationUpdateInterval = setInterval(() => {
      if (this.recordingState.isRecording && !this.recordingState.isPaused) {
        const duration = this.getRecordingDuration();
        this.recordingState.duration = duration;
        this.eventEmitter.emit('durationChanged', duration);
      }
    }, 1000);
  }

  /**
   * 停止实时更新
   */
  private stopRealTimeUpdates(): void {
    if (this.volumeUpdateInterval) {
      clearInterval(this.volumeUpdateInterval);
      this.volumeUpdateInterval = null;
    }

    if (this.durationUpdateInterval) {
      clearInterval(this.durationUpdateInterval);
      this.durationUpdateInterval = null;
    }
  }

  /**
   * 保存音频文件
   */
  private async saveAudioFile(audioBuffer: ArrayBuffer, fileName: string): Promise<string> {
    try {
      // 获取应用目录
      const appDir = this.configManager.getConfig('system', 'appDir') || process.cwd();
      const audioDir = path.join(appDir, 'audio');

      // 确保目录存在
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }

      const filePath = path.join(audioDir, fileName);

      // 写入文件
      const buffer = Buffer.from(audioBuffer);
      fs.writeFileSync(filePath, buffer);

      return filePath;
    } catch (error) {
      throw new RecordingError('保存音频文件失败', { error });
    }
  }

  /**
   * 获取音频文件信息
   */
  private async getAudioFileInfo(filePath: string): Promise<AudioFileInfo> {
    try {
      // 这里应该使用音频处理库来获取详细信息
      // 暂时返回基本信息
      const stats = fs.statSync(filePath);
      
      return {
        duration: 0, // 需要音频处理库计算
        format: 'wav',
        sampleRate: 44100,
        channels: 1,
        bitRate: 128000,
        fileSize: stats.size
      };
    } catch (error) {
      throw new RecordingError('获取音频文件信息失败', { error });
    }
  }

  /**
   * 生成文件ID
   */
  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    // 停止音频流
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // 断开音频节点
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    // 清理MediaRecorder
    this.mediaRecorder = null;
    this.analyser = null;

    // 清理音频上下文
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// 导出接口和实现类
export { IAudioRecorder as AudioRecorder };
export { AudioRecorderImpl }; 