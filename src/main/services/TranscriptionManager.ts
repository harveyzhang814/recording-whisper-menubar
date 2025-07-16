import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { 
  TranscriptionResult, 
  TranscriptionOptions, 
  TranscriptionStatus, 
  ExportFormat, 
  TaskState,
  LogLevel,
  LogCategory
} from '../../shared/types';
import { TranscriptionAPI, TranscriptionAPIFactory } from './TranscriptionAPI';
import { ConfigManager } from './ConfigManager';
import { TaskManager } from './TaskManager';
import { FileManager } from './FileManager';
import { LogManager } from './LogManager';

/**
 * 转录管理器接口
 */
export interface TranscriptionManager {
  /**
   * 开始转录
   * @param taskId 任务ID
   * @param options 转录选项
   */
  startTranscription(taskId: string, options?: TranscriptionOptions): Promise<void>;
  
  /**
   * 停止转录
   * @param taskId 任务ID
   */
  stopTranscription(taskId: string): Promise<void>;
  
  /**
   * 获取转录状态
   * @param taskId 任务ID
   * @returns 转录状态
   */
  getTranscriptionStatus(taskId: string): TranscriptionStatus;
  
  /**
   * 获取转录进度
   * @param taskId 任务ID
   * @returns 进度百分比
   */
  getTranscriptionProgress(taskId: string): number;
  
  /**
   * 获取转录结果
   * @param taskId 任务ID
   * @returns 转录结果
   */
  getTranscriptionResult(taskId: string): Promise<TranscriptionResult>;
  
  /**
   * 导出转录结果
   * @param taskId 任务ID
   * @param format 导出格式
   * @returns 导出文件路径
   */
  exportTranscription(taskId: string, format: ExportFormat): Promise<string>;
  
  /**
   * 批量转录
   * @param taskIds 任务ID列表
   */
  batchTranscribe(taskIds: string[]): Promise<void>;
}

/**
 * 转录管理器实现
 */
export class TranscriptionManagerImpl implements TranscriptionManager {
  private apiClient: TranscriptionAPI | null = null;
  private configManager: ConfigManager;
  private taskManager: TaskManager;
  private fileManager: FileManager;
  private logManager: LogManager;
  private eventEmitter: EventEmitter;
  private transcriptionQueue: Map<string, TranscriptionStatus> = new Map();
  private isProcessing: boolean = false;

  constructor(
    configManager: ConfigManager,
    taskManager: TaskManager,
    fileManager: FileManager
  ) {
    this.configManager = configManager;
    this.taskManager = taskManager;
    this.fileManager = fileManager;
    this.logManager = new LogManager();
    this.eventEmitter = new EventEmitter();
  }

  /**
   * 初始化转录管理器
   */
  async initialize(): Promise<void> {
    try {
      this.logManager.log(LogLevel.INFO, LogCategory.TRANSCRIPT, '初始化转录管理器');
      
      // 获取活跃的API配置
      const apiConfig = await this.configManager.getApiConfig('openai');
      if (apiConfig) {
        this.apiClient = TranscriptionAPIFactory.createAPI(apiConfig);
        this.logManager.log(LogLevel.INFO, LogCategory.TRANSCRIPT, 'API客户端初始化成功', {
          apiType: apiConfig.apiType,
          model: apiConfig.model
        });
      } else {
        this.logManager.warn(LogCategory.TRANSCRIPT, '未找到活跃的API配置');
      }
    } catch (error) {
      this.logManager.error(LogCategory.TRANSCRIPT, '转录管理器初始化失败', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 开始转录
   */
  async startTranscription(taskId: string, options?: TranscriptionOptions): Promise<void> {
    try {
      this.logManager.log(LogLevel.INFO, LogCategory.TRANSCRIPT, '开始转录任务', { taskId });

      // 验证任务状态
      const task = await this.taskManager.getTask(taskId);
      if (!task) {
        throw new Error(`任务不存在: ${taskId}`);
      }

      if (task.state !== TaskState.SAVED) {
        throw new Error(`任务状态不正确，无法开始转录: ${task.state}`);
      }

      // 验证API客户端
      if (!this.apiClient) {
        throw new Error('API客户端未初始化');
      }

      // 更新任务状态为转录中
      await this.taskManager.updateTaskState(taskId, TaskState.IN_TRANSCRIB);

      // 创建转录状态
      const status: TranscriptionStatus = {
        taskId,
        status: 'transcribing',
        progress: 0,
        startTime: new Date()
      };
      this.transcriptionQueue.set(taskId, status);

      // 开始转录处理
      this.processTranscription(taskId, options);

    } catch (error) {
      this.logManager.error(LogCategory.TRANSCRIPT, '开始转录失败', error instanceof Error ? error : new Error(String(error)), { taskId });
      throw error;
    }
  }

  /**
   * 停止转录
   */
  async stopTranscription(taskId: string): Promise<void> {
    try {
      this.logManager.log(LogLevel.INFO, LogCategory.TRANSCRIPT, '停止转录任务', { taskId });

      const status = this.transcriptionQueue.get(taskId);
      if (status) {
        status.status = 'cancelled';
        status.endTime = new Date();
        this.transcriptionQueue.set(taskId, status);
      }

      // 更新任务状态
      await this.taskManager.updateTaskState(taskId, TaskState.FAILED);

    } catch (error) {
      this.logManager.error(LogCategory.TRANSCRIPT, '停止转录失败', error instanceof Error ? error : new Error(String(error)), { taskId });
      throw error;
    }
  }

  /**
   * 获取转录状态
   */
  getTranscriptionStatus(taskId: string): TranscriptionStatus {
    const status = this.transcriptionQueue.get(taskId);
    if (!status) {
      return {
        taskId,
        status: 'not_found',
        progress: 0,
        startTime: new Date()
      };
    }
    return status;
  }

  /**
   * 获取转录进度
   */
  getTranscriptionProgress(taskId: string): number {
    const status = this.transcriptionQueue.get(taskId);
    return status ? status.progress : 0;
  }

  /**
   * 获取转录结果
   */
  async getTranscriptionResult(taskId: string): Promise<TranscriptionResult> {
    try {
      // 从数据库获取转录结果
      const task = await this.taskManager.getTask(taskId);
      if (!task || !task.transcriptionLoc) {
        throw new Error(`转录结果不存在: ${taskId}`);
      }

      // 读取转录文件
      const transcriptionData = fs.readFileSync(task.transcriptionLoc, 'utf-8');
      const result: TranscriptionResult = JSON.parse(transcriptionData);

      return result;

    } catch (error) {
      this.logManager.error(LogCategory.TRANSCRIPT, '获取转录结果失败', error instanceof Error ? error : new Error(String(error)), { taskId });
      throw error;
    }
  }

  /**
   * 导出转录结果
   */
  async exportTranscription(taskId: string, format: ExportFormat): Promise<string> {
    try {
      this.logManager.log(LogLevel.INFO, LogCategory.TRANSCRIPT, '导出转录结果', { taskId, format });

      const result = await this.getTranscriptionResult(taskId);
      
      // 根据格式生成导出内容
      let exportContent = '';
      let fileExtension = '';

      switch (format) {
        case ExportFormat.TXT:
          exportContent = result.apiResponse?.text || '';
          fileExtension = '.txt';
          break;
        case ExportFormat.JSON:
          exportContent = JSON.stringify(result, null, 2);
          fileExtension = '.json';
          break;
        case ExportFormat.SRT:
          exportContent = this.generateSRT(result);
          fileExtension = '.srt';
          break;
        case ExportFormat.VTT:
          exportContent = this.generateVTT(result);
          fileExtension = '.vtt';
          break;
        default:
          throw new Error(`不支持的导出格式: ${format}`);
      }

      // 生成导出文件路径
      const exportDir = path.join(process.cwd(), 'exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const exportPath = path.join(exportDir, `transcription_${taskId}_${Date.now()}${fileExtension}`);
      fs.writeFileSync(exportPath, exportContent, 'utf-8');

      this.logManager.log(LogLevel.INFO, LogCategory.TRANSCRIPT, '转录结果导出成功', { 
        taskId, 
        format, 
        exportPath 
      });

      return exportPath;

    } catch (error) {
      this.logManager.error(LogCategory.TRANSCRIPT, '导出转录结果失败', error instanceof Error ? error : new Error(String(error)), { taskId, format });
      throw error;
    }
  }

  /**
   * 批量转录
   */
  async batchTranscribe(taskIds: string[]): Promise<void> {
    try {
      this.logManager.log(LogLevel.INFO, LogCategory.TRANSCRIPT, '开始批量转录', { 
        taskCount: taskIds.length,
        taskIds 
      });

      for (const taskId of taskIds) {
        try {
          await this.startTranscription(taskId);
          // 等待当前任务完成或失败
          await this.waitForTranscriptionComplete(taskId);
        } catch (error) {
          this.logManager.error(LogCategory.TRANSCRIPT, '批量转录中单个任务失败', error instanceof Error ? error : new Error(String(error)), { taskId });
          // 继续处理下一个任务
        }
      }

      this.logManager.log(LogLevel.INFO, LogCategory.TRANSCRIPT, '批量转录完成', { 
        taskCount: taskIds.length 
      });

    } catch (error) {
      this.logManager.error(LogCategory.TRANSCRIPT, '批量转录失败', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 处理转录任务
   */
  private async processTranscription(taskId: string, options?: TranscriptionOptions): Promise<void> {
    try {
      const task = await this.taskManager.getTask(taskId);
      if (!task || !task.audioLoc) {
        throw new Error(`任务或音频文件不存在: ${taskId}`);
      }

      const startTime = Date.now();

      // 调用API进行转录
      const result = await this.apiClient!.transcribe(task.audioLoc, options || {});

      // 计算处理时间
      const processingTime = (Date.now() - startTime) / 1000;
      result.processingTime = processingTime;
      result.taskID = taskId;

      // 保存转录结果到文件
      const transcriptionDir = path.join(process.cwd(), 'transcriptions', taskId);
      if (!fs.existsSync(transcriptionDir)) {
        fs.mkdirSync(transcriptionDir, { recursive: true });
      }

      const transcriptionPath = path.join(transcriptionDir, 'transcription.json');
      fs.writeFileSync(transcriptionPath, JSON.stringify(result, null, 2), 'utf-8');

      // 更新任务信息
      await this.taskManager.updateTask(taskId, {
        transcriptionLoc: transcriptionPath
      });

      // 更新任务状态为完成
      await this.taskManager.updateTaskState(taskId, TaskState.COMPLETED);

      // 更新转录状态
      const status = this.transcriptionQueue.get(taskId);
      if (status) {
        status.status = 'completed';
        status.progress = 100;
        status.endTime = new Date();
        this.transcriptionQueue.set(taskId, status);
      }

      this.logManager.log(LogLevel.INFO, LogCategory.TRANSCRIPT, '转录任务完成', {
        taskId,
        processingTime,
        wordCount: result.wordCount,
        language: result.language
      });

    } catch (error) {
      this.logManager.error(LogCategory.TRANSCRIPT, '转录处理失败', error instanceof Error ? error : new Error(String(error)), { taskId });

      // 更新任务状态为失败
      await this.taskManager.updateTaskState(taskId, TaskState.FAILED);

      // 更新转录状态
      const status = this.transcriptionQueue.get(taskId);
      if (status) {
        status.status = 'failed';
        status.error = error instanceof Error ? error.message : String(error);
        status.endTime = new Date();
        this.transcriptionQueue.set(taskId, status);
      }
    }
  }

  /**
   * 等待转录完成
   */
  private async waitForTranscriptionComplete(taskId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const status = this.transcriptionQueue.get(taskId);
        if (!status) {
          reject(new Error(`转录状态不存在: ${taskId}`));
          return;
        }

        if (status.status === 'completed') {
          resolve();
        } else if (status.status === 'failed' || status.status === 'cancelled') {
          reject(new Error(`转录失败: ${status.error || '未知错误'}`));
        } else {
          // 继续等待
          setTimeout(checkStatus, 1000);
        }
      };

      checkStatus();
    });
  }

  /**
   * 生成SRT格式字幕
   */
  private generateSRT(result: TranscriptionResult): string {
    const segments = result.apiResponse?.segments || [];
    let srtContent = '';

    segments.forEach((segment: any, index: number) => {
      const startTime = this.formatTime(segment.start);
      const endTime = this.formatTime(segment.end);
      
      srtContent += `${index + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${segment.text}\n\n`;
    });

    return srtContent;
  }

  /**
   * 生成VTT格式字幕
   */
  private generateVTT(result: TranscriptionResult): string {
    const segments = result.apiResponse?.segments || [];
    let vttContent = 'WEBVTT\n\n';

    segments.forEach((segment: any) => {
      const startTime = this.formatTimeVTT(segment.start);
      const endTime = this.formatTimeVTT(segment.end);
      
      vttContent += `${startTime} --> ${endTime}\n`;
      vttContent += `${segment.text}\n\n`;
    });

    return vttContent;
  }

  /**
   * 格式化时间为SRT格式
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  /**
   * 格式化时间为VTT格式
   */
  private formatTimeVTT(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
} 