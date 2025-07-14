import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

// 颜色化文本的辅助函数
const colorize = (color: keyof typeof colors, text: string): string => {
  return `${colors[color]}${text}${colors.reset}`;
};

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export enum LogCategory {
  SYSTEM = 'SYSTEM',
  AUDIO = 'AUDIO',
  TRANSCRIPT = 'TRANSCRIPT',
  TASK = 'TASK',
  UI = 'UI',
  API = 'API',
  CONFIG = 'CONFIG',
  SHORTCUT = 'SHORTCUT',
  TRAY = 'TRAY',
}

export interface LogMetadata {
  taskId?: string;
  filePath?: string;
  device?: string;
  format?: string;
  sampleRate?: number;
  [key: string]: any;
}

export class LogManager {
  private logger!: winston.Logger;
  private logDir: string;

  constructor() {
    this.logDir = this.getLogDirectory();
    this.initialize();
  }

  private getLogDirectory(): string {
    const { app } = require('electron');
    const logPath = path.join(app.getPath('userData'), 'logs');
    
    // 确保日志目录存在
    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath, { recursive: true });
    }
    
    return logPath;
  }

  private initialize(): void {
    // 创建日志格式
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // 控制台格式（开发环境）
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
      winston.format.printf(({ timestamp, level, category, message, taskId, ...metadata }) => {
        const levelColor = this.getLevelColor(level as string);
        const categoryColor = this.getCategoryColor(category as string);
        
        let logMessage = `${colorize('gray', `[${timestamp}]`)} ${levelColor(`[${level.toUpperCase()}]`)} ${categoryColor(`[${category}]`)} ${message}`;
        
        if (taskId) {
          logMessage += ` ${colorize('cyan', `任务ID: ${taskId}`)}`;
        }
        
        if (Object.keys(metadata).length > 0) {
          logMessage += `\n  ${colorize('gray', JSON.stringify(metadata, null, 2))}`;
        }
        
        return logMessage;
      })
    );

    // 文件格式
    const fileFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // 创建传输器
    const transports: winston.transport[] = [];

    // 控制台传输器（开发环境）
    if (process.env.NODE_ENV === 'development') {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
          level: 'debug',
        })
      );
    }

    // 应用日志文件传输器
    transports.push(
      new DailyRotateFile({
        filename: path.join(this.logDir, 'app-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d',
        format: fileFormat,
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      })
    );

    // 错误日志文件传输器
    transports.push(
      new DailyRotateFile({
        filename: path.join(this.logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: fileFormat,
        level: 'error',
      })
    );

    // 创建日志记录器
    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      format: logFormat,
      transports,
      exitOnError: false,
    });

    // 处理未捕获的异常
    this.logger.exceptions.handle(
      new DailyRotateFile({
        filename: path.join(this.logDir, 'exceptions-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: fileFormat,
      })
    );

    // 处理未处理的Promise拒绝
    this.logger.rejections.handle(
      new DailyRotateFile({
        filename: path.join(this.logDir, 'rejections-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: fileFormat,
      })
    );
  }

  private getLevelColor(level: string): (text: string) => string {
    switch (level) {
      case 'error':
        return (text: string) => colorize('red', text);
      case 'warn':
        return (text: string) => colorize('yellow', text);
      case 'info':
        return (text: string) => colorize('blue', text);
      case 'debug':
        return (text: string) => colorize('gray', text);
      default:
        return (text: string) => colorize('white', text);
    }
  }

  private getCategoryColor(category: string): (text: string) => string {
    switch (category) {
      case LogCategory.SYSTEM:
        return (text: string) => colorize('magenta', text);
      case LogCategory.AUDIO:
        return (text: string) => colorize('cyan', text);
      case LogCategory.TRANSCRIPT:
        return (text: string) => colorize('green', text);
      case LogCategory.TASK:
        return (text: string) => colorize('blue', text);
      case LogCategory.UI:
        return (text: string) => colorize('yellow', text);
      case LogCategory.API:
        return (text: string) => colorize('red', text);
      case LogCategory.CONFIG:
        return (text: string) => colorize('white', text);
      case LogCategory.SHORTCUT:
        return (text: string) => colorize('gray', text);
      case LogCategory.TRAY:
        return (text: string) => colorize('cyan', text);
      default:
        return (text: string) => colorize('white', text);
    }
  }

  log(level: LogLevel, category: LogCategory, message: string, metadata?: LogMetadata): void {
    const levelString = LogLevel[level].toLowerCase();
    
    this.logger.log(levelString, message, {
      category,
      ...metadata,
    });
  }

  error(category: LogCategory, message: string, error?: Error, metadata?: LogMetadata): void {
    this.logger.error(message, {
      category,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : undefined,
      ...metadata,
    });
  }

  warn(category: LogCategory, message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.WARN, category, message, metadata);
  }

  info(category: LogCategory, message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.INFO, category, message, metadata);
  }

  debug(category: LogCategory, message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.DEBUG, category, message, metadata);
  }

  // 便捷方法
  system(message: string, metadata?: LogMetadata): void {
    this.info(LogCategory.SYSTEM, message, metadata);
  }

  audio(message: string, metadata?: LogMetadata): void {
    this.info(LogCategory.AUDIO, message, metadata);
  }

  transcript(message: string, metadata?: LogMetadata): void {
    this.info(LogCategory.TRANSCRIPT, message, metadata);
  }

  task(message: string, metadata?: LogMetadata): void {
    this.info(LogCategory.TASK, message, metadata);
  }

  ui(message: string, metadata?: LogMetadata): void {
    this.info(LogCategory.UI, message, metadata);
  }

  api(message: string, metadata?: LogMetadata): void {
    this.info(LogCategory.API, message, metadata);
  }

  config(message: string, metadata?: LogMetadata): void {
    this.info(LogCategory.CONFIG, message, metadata);
  }

  shortcut(message: string, metadata?: LogMetadata): void {
    this.info(LogCategory.SHORTCUT, message, metadata);
  }

  tray(message: string, metadata?: LogMetadata): void {
    this.info(LogCategory.TRAY, message, metadata);
  }

  async cleanupOldLogs(): Promise<void> {
    try {
      const files = fs.readdirSync(this.logDir);
      const logFiles = files.filter(file => file.endsWith('.log'));
      
      const cutoffTime = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90天
      
      for (const file of logFiles) {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          this.info(LogCategory.SYSTEM, `删除旧日志文件: ${file}`);
        }
      }
    } catch (error) {
      this.error(LogCategory.SYSTEM, '清理旧日志失败', error as Error);
    }
  }

  getLogFiles(): string[] {
    try {
      const files = fs.readdirSync(this.logDir);
      return files.filter(file => file.endsWith('.log'));
    } catch (error) {
      this.error(LogCategory.SYSTEM, '获取日志文件列表失败', error as Error);
      return [];
    }
  }

  getLogContent(filename: string): string {
    try {
      const filePath = path.join(this.logDir, filename);
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      this.error(LogCategory.SYSTEM, `读取日志文件失败: ${filename}`, error as Error);
      return '';
    }
  }
} 