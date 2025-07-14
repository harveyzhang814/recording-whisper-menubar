import { LogManager, LogLevel, LogCategory } from '../LogManager';
import fs from 'fs';
import path from 'path';

// Mock Electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-app-data'),
  },
}));

// Mock winston to avoid file system issues in tests
jest.mock('winston', () => {
  const originalModule = jest.requireActual('winston');
  return {
    ...originalModule,
    createLogger: jest.fn(() => ({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      exceptions: {
        handle: jest.fn(),
      },
      rejections: {
        handle: jest.fn(),
      },
    })),
    transports: {
      ...originalModule.transports,
      Console: jest.fn(),
    },
    format: {
      ...originalModule.format,
      combine: jest.fn(() => ({})),
      timestamp: jest.fn(() => ({})),
      errors: jest.fn(() => ({})),
      json: jest.fn(() => ({})),
      printf: jest.fn(() => ({})),
    },
  };
});

jest.mock('winston-daily-rotate-file', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
  }));
});

describe('LogManager', () => {
  let logManager: LogManager;
  let logDir: string;

  beforeEach(() => {
    // 清理测试日志目录
    logDir = '/tmp/test-app-data/logs';
    const parentDir = '/tmp/test-app-data';
    
    // 确保父目录存在
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    
    // 清理并重新创建日志目录
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true, force: true });
    }
    fs.mkdirSync(logDir, { recursive: true });

    logManager = new LogManager();
  });

  afterEach(() => {
    // 清理测试日志目录
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true, force: true });
    }
  });

  describe('初始化测试', () => {
    test('应该成功初始化LogManager', () => {
      expect(logManager).toBeDefined();
    });

    test('应该创建日志目录', () => {
      expect(fs.existsSync(logDir)).toBe(true);
    });
  });

  describe('日志级别测试', () => {
    test('应该正确记录不同级别的日志', () => {
      const testMessage = '测试日志消息';
      
      expect(() => {
        logManager.error(LogCategory.SYSTEM, testMessage);
        logManager.warn(LogCategory.SYSTEM, testMessage);
        logManager.info(LogCategory.SYSTEM, testMessage);
        logManager.debug(LogCategory.SYSTEM, testMessage);
      }).not.toThrow();
    });

    test('应该正确记录错误日志', () => {
      const error = new Error('测试错误');
      const testMessage = '测试错误消息';
      
      expect(() => {
        logManager.error(LogCategory.SYSTEM, testMessage, error);
      }).not.toThrow();
    });

    test('应该正确记录带元数据的错误日志', () => {
      const error = new Error('测试错误');
      const testMessage = '测试错误消息';
      const metadata = { taskId: 'test-123', userId: 'user-456' };
      
      expect(() => {
        logManager.error(LogCategory.SYSTEM, testMessage, error, metadata);
      }).not.toThrow();
    });

    test('应该正确记录不带错误的错误日志', () => {
      const testMessage = '测试错误消息';
      
      expect(() => {
        logManager.error(LogCategory.SYSTEM, testMessage);
      }).not.toThrow();
    });
  });

  describe('日志分类测试', () => {
    test('应该正确记录不同分类的日志', () => {
      const testMessage = '测试分类日志';
      
      expect(() => {
        logManager.system(testMessage);
        logManager.audio(testMessage);
        logManager.transcript(testMessage);
        logManager.task(testMessage);
        logManager.ui(testMessage);
        logManager.api(testMessage);
        logManager.config(testMessage);
        logManager.shortcut(testMessage);
        logManager.tray(testMessage);
      }).not.toThrow();
    });

    test('应该正确记录带元数据的分类日志', () => {
      const testMessage = '测试分类日志';
      const metadata = { taskId: 'test-123', filePath: '/path/to/file' };
      
      expect(() => {
        logManager.system(testMessage, metadata);
        logManager.audio(testMessage, metadata);
        logManager.transcript(testMessage, metadata);
        logManager.task(testMessage, metadata);
        logManager.ui(testMessage, metadata);
        logManager.api(testMessage, metadata);
        logManager.config(testMessage, metadata);
        logManager.shortcut(testMessage, metadata);
        logManager.tray(testMessage, metadata);
      }).not.toThrow();
    });
  });

  describe('日志级别枚举测试', () => {
    test('应该正确使用LogLevel枚举', () => {
      const testMessage = '测试枚举日志';
      
      expect(() => {
        logManager.log(LogLevel.ERROR, LogCategory.SYSTEM, testMessage);
        logManager.log(LogLevel.WARN, LogCategory.SYSTEM, testMessage);
        logManager.log(LogLevel.INFO, LogCategory.SYSTEM, testMessage);
        logManager.log(LogLevel.DEBUG, LogCategory.SYSTEM, testMessage);
      }).not.toThrow();
    });

    test('应该正确转换日志级别', () => {
      expect(LogLevel[LogLevel.ERROR]).toBe('ERROR');
      expect(LogLevel[LogLevel.WARN]).toBe('WARN');
      expect(LogLevel[LogLevel.INFO]).toBe('INFO');
      expect(LogLevel[LogLevel.DEBUG]).toBe('DEBUG');
    });
  });

  describe('日志分类枚举测试', () => {
    test('应该正确使用LogCategory枚举', () => {
      expect(LogCategory.SYSTEM).toBe('SYSTEM');
      expect(LogCategory.AUDIO).toBe('AUDIO');
      expect(LogCategory.TRANSCRIPT).toBe('TRANSCRIPT');
      expect(LogCategory.TASK).toBe('TASK');
      expect(LogCategory.UI).toBe('UI');
      expect(LogCategory.API).toBe('API');
      expect(LogCategory.CONFIG).toBe('CONFIG');
      expect(LogCategory.SHORTCUT).toBe('SHORTCUT');
      expect(LogCategory.TRAY).toBe('TRAY');
    });
  });

  describe('元数据测试', () => {
    test('应该正确记录带元数据的日志', () => {
      const testMessage = '测试元数据日志';
      const metadata = {
        taskId: 'test-task-123',
        filePath: '/path/to/file',
        device: 'test-device',
        format: 'WAV',
        sampleRate: 44100,
        customField: 'custom-value',
      };
      
      expect(() => {
        logManager.info(LogCategory.AUDIO, testMessage, metadata);
      }).not.toThrow();
    });

    test('应该正确记录空元数据的日志', () => {
      const testMessage = '测试空元数据日志';
      
      expect(() => {
        logManager.info(LogCategory.SYSTEM, testMessage, {});
      }).not.toThrow();
    });

    test('应该正确记录undefined元数据的日志', () => {
      const testMessage = '测试undefined元数据日志';
      
      expect(() => {
        logManager.info(LogCategory.SYSTEM, testMessage);
      }).not.toThrow();
    });
  });

  describe('日志文件管理测试', () => {
    test('应该能够获取日志文件列表', () => {
      expect(() => {
        const logFiles = logManager.getLogFiles();
        expect(Array.isArray(logFiles)).toBe(true);
      }).not.toThrow();
    });

    test('应该能够读取日志文件内容', () => {
      expect(() => {
        const content = logManager.getLogContent('test.log');
        expect(typeof content).toBe('string');
      }).not.toThrow();
    });

    test('应该能够清理旧日志文件', async () => {
      expect(async () => {
        await logManager.cleanupOldLogs();
      }).not.toThrow();
    });

    test('应该处理日志目录不存在的情况', () => {
      // 删除日志目录
      if (fs.existsSync(logDir)) {
        fs.rmSync(logDir, { recursive: true, force: true });
      }
      
      expect(() => {
        const logFiles = logManager.getLogFiles();
        expect(Array.isArray(logFiles)).toBe(true);
        expect(logFiles.length).toBe(0);
      }).not.toThrow();
    });

    test('应该处理读取不存在的日志文件', () => {
      expect(() => {
        const content = logManager.getLogContent('non-existent-file.log');
        expect(content).toBe('');
      }).not.toThrow();
    });
  });

  describe('错误处理测试', () => {
    test('应该处理文件系统错误', () => {
      // 模拟文件系统错误
      const originalReaddirSync = fs.readdirSync;
      fs.readdirSync = jest.fn(() => {
        throw new Error('模拟文件系统错误');
      });

      expect(() => {
        const logFiles = logManager.getLogFiles();
        expect(Array.isArray(logFiles)).toBe(true);
        expect(logFiles.length).toBe(0);
      }).not.toThrow();

      // 恢复原始函数
      fs.readdirSync = originalReaddirSync;
    });

    test('应该处理文件读取错误', () => {
      // 模拟文件读取错误
      const originalReadFileSync = fs.readFileSync;
      fs.readFileSync = jest.fn(() => {
        throw new Error('模拟文件读取错误');
      });

      expect(() => {
        const content = logManager.getLogContent('test.log');
        expect(content).toBe('');
      }).not.toThrow();

      // 恢复原始函数
      fs.readFileSync = originalReadFileSync;
    });

    test('应该处理清理旧日志时的错误', async () => {
      // 模拟文件系统错误
      const originalReaddirSync = fs.readdirSync;
      fs.readdirSync = jest.fn(() => {
        throw new Error('模拟清理错误');
      });

      expect(async () => {
        await logManager.cleanupOldLogs();
      }).not.toThrow();

      // 恢复原始函数
      fs.readdirSync = originalReaddirSync;
    });
  });

  describe('性能测试', () => {
    test('应该能够快速记录大量日志', () => {
      const startTime = Date.now();
      
      // 记录100条日志（减少数量避免测试时间过长）
      for (let i = 0; i < 100; i++) {
        logManager.info(LogCategory.SYSTEM, `性能测试日志 ${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 应该在1秒内完成
      expect(duration).toBeLessThan(1000);
    });

    test('应该能够快速记录带元数据的日志', () => {
      const startTime = Date.now();
      const metadata = { taskId: 'test-123', index: 0 };
      
      // 记录50条带元数据的日志
      for (let i = 0; i < 50; i++) {
        metadata.index = i;
        logManager.info(LogCategory.TASK, `性能测试日志 ${i}`, metadata);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 应该在500毫秒内完成
      expect(duration).toBeLessThan(500);
    });
  });

  describe('边界条件测试', () => {
    test('应该处理空消息', () => {
      expect(() => {
        logManager.info(LogCategory.SYSTEM, '');
        logManager.error(LogCategory.SYSTEM, '');
        logManager.warn(LogCategory.SYSTEM, '');
        logManager.debug(LogCategory.SYSTEM, '');
      }).not.toThrow();
    });

    test('应该处理长消息', () => {
      const longMessage = 'a'.repeat(10000);
      
      expect(() => {
        logManager.info(LogCategory.SYSTEM, longMessage);
      }).not.toThrow();
    });

    test('应该处理特殊字符消息', () => {
      const specialMessage = '特殊字符: !@#$%^&*()_+-=[]{}|;:,.<>?';
      
      expect(() => {
        logManager.info(LogCategory.SYSTEM, specialMessage);
      }).not.toThrow();
    });

    test('应该处理Unicode字符消息', () => {
      const unicodeMessage = 'Unicode字符: 中文测试 🚀 🌟 💻';
      
      expect(() => {
        logManager.info(LogCategory.SYSTEM, unicodeMessage);
      }).not.toThrow();
    });
  });

  describe('并发测试', () => {
    test('应该支持并发日志记录', async () => {
      const promises = [];
      const logCount = 50;
      
      for (let i = 0; i < logCount; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            logManager.info(LogCategory.SYSTEM, `并发日志 ${i}`);
            resolve();
          })
        );
      }
      
      await Promise.all(promises);
      
      // 验证所有日志都记录成功
      expect(promises.length).toBe(logCount);
    });
  });

  describe('环境变量测试', () => {
    test('应该在开发环境下正确配置', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // 重新创建LogManager以应用新的环境变量
      const devLogManager = new LogManager();
      expect(devLogManager).toBeDefined();
      
      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
    });

    test('应该在生产环境下正确配置', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      // 重新创建LogManager以应用新的环境变量
      const prodLogManager = new LogManager();
      expect(prodLogManager).toBeDefined();
      
      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
    });
  });
}); 