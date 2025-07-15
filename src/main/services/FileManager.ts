import { DatabaseManager } from './DatabaseManager';
import { LogManager, LogLevel } from './LogManager';
import { 
  AudioFile, 
  AudioFileInfo, 
  StorageUsage,
  FileError,
  LogCategory 
} from '../../shared/types';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const statAsync = promisify(fs.stat);
const copyFileAsync = promisify(fs.copyFile);
const unlinkAsync = promisify(fs.unlink);
const readdirAsync = promisify(fs.readdir);

export interface FileManager {
  // 导入音频文件
  importAudioFiles(filePaths: string[]): Promise<AudioFile[]>;
  
  // 验证音频文件
  validateAudioFile(filePath: string): Promise<boolean>;
  
  // 获取音频文件信息
  getAudioFileInfo(filePath: string): Promise<AudioFileInfo>;
  
  // 复制音频文件
  copyAudioFile(sourcePath: string, taskId: string): Promise<string>;
  
  // 删除音频文件
  deleteAudioFile(filePath: string): Promise<void>;
  
  // 获取存储空间使用情况
  getStorageUsage(): Promise<StorageUsage>;
  
  // 清理临时文件
  cleanupTempFiles(): Promise<void>;
}

export class FileManagerImpl implements FileManager {
  private db: DatabaseManager;
  private logger: LogManager;
  private appDir: string;
  private tempDir: string;
  private audioDir: string;
  private transcriptionDir: string;

  // 支持的音频格式
  private readonly supportedFormats = ['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg'];
  
  // 文件大小限制 (100MB)
  private readonly maxFileSize = 100 * 1024 * 1024;

  constructor(db: DatabaseManager, logger: LogManager) {
    this.db = db;
    this.logger = logger;
    
    // 初始化目录路径
    const { app } = require('electron');
    this.appDir = path.join(app.getPath('userData'), 'files');
    this.tempDir = path.join(this.appDir, 'temp');
    this.audioDir = path.join(this.appDir, 'audio');
    this.transcriptionDir = path.join(this.appDir, 'transcriptions');
  }

  /**
   * 初始化文件管理器
   */
  async initialize(): Promise<void> {
    try {
      this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '初始化文件管理器');
      
      // 创建应用目录结构
      await this.createDirectories();

      // 初始化文件监控
      this.setupFileMonitoring();

      // 设置文件清理策略
      this.setupCleanupStrategy();

      this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '文件管理器初始化完成');
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '文件管理器初始化失败', error as Error);
      throw error;
    }
  }

  /**
   * 创建目录结构
   */
  private async createDirectories(): Promise<void> {
    const directories = [this.appDir, this.tempDir, this.audioDir, this.transcriptionDir];
    
    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(LogLevel.DEBUG, LogCategory.SYSTEM, `创建目录: ${dir}`);
      }
    }
  }

  /**
   * 设置文件监控
   */
  private setupFileMonitoring(): void {
    // 这里可以添加文件系统监控逻辑
    // 例如监控文件变化、自动清理等
    this.logger.log(LogLevel.DEBUG, LogCategory.SYSTEM, '文件监控已设置');
  }

  /**
   * 设置清理策略
   */
  private setupCleanupStrategy(): void {
    // 设置定时清理任务
    // 例如每天清理超过7天的临时文件
    this.logger.log(LogLevel.DEBUG, LogCategory.SYSTEM, '文件清理策略已设置');
  }

  /**
   * 导入音频文件
   */
  async importAudioFiles(filePaths: string[]): Promise<AudioFile[]> {
    try {
      const importedFiles: AudioFile[] = [];

      for (const filePath of filePaths) {
        try {
          // 验证文件
          const isValid = await this.validateAudioFile(filePath);
          if (!isValid) {
            this.logger.log(LogLevel.WARN, LogCategory.SYSTEM, `跳过无效文件: ${filePath}`);
            continue;
          }

          // 获取文件信息
          const fileInfo = await this.getAudioFileInfo(filePath);
          
          // 生成任务ID（这里简化处理，实际应该由任务管理器生成）
          const taskId = this.generateUUID();
          
          // 复制文件到应用目录
          const targetPath = await this.copyAudioFile(filePath, taskId);

          // 创建音频文件记录
          const audioFile: AudioFile = {
            fileID: this.generateUUID(),
            taskID: taskId,
            fileName: path.basename(filePath),
            filePath: targetPath,
            fileSize: fileInfo.fileSize,
            duration: fileInfo.duration,
            format: fileInfo.format,
            sampleRate: fileInfo.sampleRate,
            channels: fileInfo.channels,
            bitRate: fileInfo.bitRate,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // 保存到数据库
          await this.saveAudioFileToDatabase(audioFile);

          importedFiles.push(audioFile);

          this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '音频文件导入成功', {
            fileName: audioFile.fileName,
            fileSize: audioFile.fileSize,
            duration: audioFile.duration
          });

        } catch (error) {
          this.logger.error(LogCategory.SYSTEM, `导入文件失败: ${filePath}`, error as Error);
          // 继续处理其他文件
        }
      }

      return importedFiles;
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '批量导入音频文件失败', error as Error, { filePaths });
      throw new FileError('批量导入音频文件失败', { filePaths, error });
    }
  }

  /**
   * 验证音频文件
   */
  async validateAudioFile(filePath: string): Promise<boolean> {
    try {
      // 检查文件是否存在和可读
      if (!fs.existsSync(filePath)) {
        this.logger.log(LogLevel.WARN, LogCategory.SYSTEM, '文件不存在', { filePath });
        return false;
      }

      // 检查文件权限
      try {
        await fs.promises.access(filePath, fs.constants.R_OK);
      } catch {
        this.logger.log(LogLevel.WARN, LogCategory.SYSTEM, '文件无读取权限', { filePath });
        return false;
      }

      // 检查文件格式
      const ext = path.extname(filePath).toLowerCase();
      if (!this.supportedFormats.includes(ext)) {
        this.logger.log(LogLevel.WARN, LogCategory.SYSTEM, '不支持的音频格式', { filePath, format: ext });
        return false;
      }

      // 检查文件大小
      const stats = await statAsync(filePath);
      if (stats.size > this.maxFileSize) {
        this.logger.log(LogLevel.WARN, LogCategory.SYSTEM, '文件过大', { 
          filePath, 
          size: stats.size, 
          maxSize: this.maxFileSize 
        });
        return false;
      }

      // 检查文件是否为空
      if (stats.size === 0) {
        this.logger.log(LogLevel.WARN, LogCategory.SYSTEM, '文件为空', { filePath });
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '验证音频文件失败', error as Error, { filePath });
      return false;
    }
  }

  /**
   * 获取音频文件信息
   */
  async getAudioFileInfo(filePath: string): Promise<AudioFileInfo> {
    try {
      const stats = await statAsync(filePath);
      const ext = path.extname(filePath).toLowerCase();

      // 这里应该使用FFmpeg或其他音频处理库来获取详细的音频信息
      // 暂时返回基本信息和默认值
      const audioInfo: AudioFileInfo = {
        duration: 0, // 需要FFmpeg获取
        format: ext.substring(1), // 去掉点号
        sampleRate: 44100, // 默认值
        channels: 2, // 默认值
        bitRate: 128000, // 默认值
        fileSize: stats.size
      };

      // TODO: 使用FFmpeg获取真实音频信息
      // const ffmpeg = require('fluent-ffmpeg');
      // const getAudioInfo = () => new Promise((resolve, reject) => {
      //   ffmpeg.ffprobe(filePath, (err, metadata) => {
      //     if (err) reject(err);
      //     else resolve(metadata);
      //   });
      // });

      this.logger.log(LogLevel.DEBUG, LogCategory.SYSTEM, '获取音频文件信息成功', {
        filePath,
        fileSize: audioInfo.fileSize,
        format: audioInfo.format
      });

      return audioInfo;
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '获取音频文件信息失败', error as Error, { filePath });
      throw new FileError('获取音频文件信息失败', { filePath, error });
    }
  }

  /**
   * 复制音频文件
   */
  async copyAudioFile(sourcePath: string, taskId: string): Promise<string> {
    try {
      // 生成目标文件名
      const ext = path.extname(sourcePath);
      const fileName = `${taskId}${ext}`;
      const targetPath = path.join(this.audioDir, fileName);

      // 检查目标文件是否已存在
      if (fs.existsSync(targetPath)) {
        this.logger.log(LogLevel.WARN, LogCategory.SYSTEM, '目标文件已存在，生成新文件名', { targetPath });
        const timestamp = Date.now();
        const newFileName = `${taskId}_${timestamp}${ext}`;
        const newTargetPath = path.join(this.audioDir, newFileName);
        await copyFileAsync(sourcePath, newTargetPath);
        return newTargetPath;
      }

      // 复制文件
      await copyFileAsync(sourcePath, targetPath);

      // 验证复制结果
      const sourceStats = await statAsync(sourcePath);
      const targetStats = await statAsync(targetPath);

      if (sourceStats.size !== targetStats.size) {
        throw new Error('文件复制后大小不匹配');
      }

      this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '音频文件复制成功', {
        sourcePath,
        targetPath,
        fileSize: sourceStats.size
      });

      return targetPath;
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '复制音频文件失败', error as Error, { sourcePath, taskId });
      throw new FileError('复制音频文件失败', { sourcePath, taskId, error });
    }
  }

  /**
   * 删除音频文件
   */
  async deleteAudioFile(filePath: string): Promise<void> {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        this.logger.log(LogLevel.WARN, LogCategory.SYSTEM, '要删除的文件不存在', { filePath });
        return;
      }

      // 检查文件权限
      try {
        await fs.promises.access(filePath, fs.constants.W_OK);
      } catch {
        throw new Error('文件无写入权限');
      }

      // 删除文件
      await unlinkAsync(filePath);

      // 从数据库中删除记录
      await this.deleteAudioFileFromDatabase(filePath);

      this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '音频文件删除成功', { filePath });
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '删除音频文件失败', error as Error, { filePath });
      throw new FileError('删除音频文件失败', { filePath, error });
    }
  }

  /**
   * 获取存储空间使用情况
   */
  async getStorageUsage(): Promise<StorageUsage> {
    try {
      const totalSize = await this.calculateDirectorySize(this.appDir);
      const audioFilesSize = await this.calculateDirectorySize(this.audioDir);
      const transcriptionFilesSize = await this.calculateDirectorySize(this.transcriptionDir);
      const tempFilesSize = await this.calculateDirectorySize(this.tempDir);

      // 获取可用空间
      const availableSpace = await this.getAvailableSpace();

      const usage: StorageUsage = {
        totalSize,
        audioFilesSize,
        transcriptionFilesSize,
        tempFilesSize,
        availableSpace
      };

      this.logger.log(LogLevel.DEBUG, LogCategory.SYSTEM, '获取存储使用情况成功', usage);

      return usage;
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '获取存储使用情况失败', error as Error);
      throw new FileError('获取存储使用情况失败', { error });
    }
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
      const now = Date.now();
      let deletedCount = 0;
      let deletedSize = 0;

      const files = await readdirAsync(this.tempDir);
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await statAsync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await unlinkAsync(filePath);
          deletedCount++;
          deletedSize += stats.size;
        }
      }

      this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '临时文件清理完成', {
        deletedCount,
        deletedSize
      });
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '清理临时文件失败', error as Error);
      throw new FileError('清理临时文件失败', { error });
    }
  }

  /**
   * 保存音频文件到数据库
   */
  private async saveAudioFileToDatabase(audioFile: AudioFile): Promise<void> {
    try {
      const database = this.db.getDatabase();
      const sql = `
        INSERT INTO audio_file 
        (fileID, taskID, fileName, filePath, fileSize, duration, format, sampleRate, channels, bitRate, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const stmt = database.prepare(sql);
      stmt.run(
        audioFile.fileID,
        audioFile.taskID,
        audioFile.fileName,
        audioFile.filePath,
        audioFile.fileSize,
        audioFile.duration,
        audioFile.format,
        audioFile.sampleRate,
        audioFile.channels,
        audioFile.bitRate,
        audioFile.createdAt.toISOString(),
        audioFile.updatedAt.toISOString()
      );

      this.logger.log(LogLevel.DEBUG, LogCategory.SYSTEM, '音频文件保存到数据库成功', {
        fileID: audioFile.fileID,
        taskID: audioFile.taskID
      });
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '保存音频文件到数据库失败', error as Error, { audioFile });
      throw new FileError('保存音频文件到数据库失败', { audioFile, error });
    }
  }

  /**
   * 从数据库删除音频文件记录
   */
  private async deleteAudioFileFromDatabase(filePath: string): Promise<void> {
    try {
      const database = this.db.getDatabase();
      const sql = 'DELETE FROM audio_file WHERE filePath = ?';
      
      const stmt = database.prepare(sql);
      stmt.run(filePath);

      this.logger.log(LogLevel.DEBUG, LogCategory.SYSTEM, '音频文件从数据库删除成功', { filePath });
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '从数据库删除音频文件记录失败', error as Error, { filePath });
      // 不抛出错误，因为文件已经删除
    }
  }

  /**
   * 计算目录大小
   */
  private async calculateDirectorySize(dirPath: string): Promise<number> {
    try {
      if (!fs.existsSync(dirPath)) {
        return 0;
      }

      let totalSize = 0;
      const files = await readdirAsync(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await statAsync(filePath);
        
        if (stats.isFile()) {
          totalSize += stats.size;
        } else if (stats.isDirectory()) {
          totalSize += await this.calculateDirectorySize(filePath);
        }
      }

      return totalSize;
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '计算目录大小失败', error as Error, { dirPath });
      return 0;
    }
  }

  /**
   * 获取可用空间
   */
  private async getAvailableSpace(): Promise<number> {
    try {
      // 这里应该使用系统API获取磁盘可用空间
      // 暂时返回一个默认值
      return 1024 * 1024 * 1024; // 1GB
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '获取可用空间失败', error as Error);
      return 0;
    }
  }

  /**
   * 生成UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 获取应用目录路径
   */
  getAppDirectory(): string {
    return this.appDir;
  }

  /**
   * 获取音频目录路径
   */
  getAudioDirectory(): string {
    return this.audioDir;
  }

  /**
   * 获取转录目录路径
   */
  getTranscriptionDirectory(): string {
    return this.transcriptionDir;
  }

  /**
   * 获取临时目录路径
   */
  getTempDirectory(): string {
    return this.tempDir;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      // 清理临时文件
      await this.cleanupTempFiles();
      
      this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '文件管理器清理完成');
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '文件管理器清理失败', error as Error);
    }
  }
} 