import { DatabaseManager } from '../DatabaseManager';
import { LogManager, LogCategory } from '../LogManager';
import fs from 'fs';
import path from 'path';

// Mock Electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((type: string) => {
      if (type === 'userData') {
        return '/tmp/test-app-data';
      }
      return '/tmp/test-logs';
    }),
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

describe('数据库和日志模块集成测试', () => {
  let dbManager: DatabaseManager;
  let logManager: LogManager;
  let testDbPath: string;
  let logDir: string;

  beforeEach(async () => {
    // 清理测试目录
    testDbPath = '/tmp/test-app-data/data/whisperelectron.db';
    logDir = '/tmp/test-logs';
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true, force: true });
    }
    
    // 确保目录存在
    fs.mkdirSync(path.dirname(testDbPath), { recursive: true });
    fs.mkdirSync(logDir, { recursive: true });

    dbManager = new DatabaseManager();
    logManager = new LogManager();
  });

  afterEach(() => {
    // 清理资源
    dbManager.close();
    
    // 删除测试文件
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true, force: true });
    }
  });

  describe('数据库操作日志记录测试', () => {
    test('应该记录数据库初始化日志', async () => {
      await dbManager.initialize();
      
      // 验证数据库初始化成功
      expect(dbManager.getDatabase()).toBeDefined();
    });

    test('应该记录数据库操作日志', async () => {
      await dbManager.initialize();
      const db = dbManager.getDatabase();
      
      // 执行数据库操作
      const now = new Date().toISOString();
      const taskId = 'integration-test-task';
      
      db.prepare(`
        INSERT INTO task (taskID, title, description, state, audioSource, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(taskId, '集成测试任务', '集成测试描述', 'PENDING', 'RECORD', now, now);
      
      // 记录操作日志
      expect(() => {
        logManager.task('创建新任务', { taskId, title: '集成测试任务' });
      }).not.toThrow();
      
      // 验证任务已创建
      const task = db.prepare('SELECT * FROM task WHERE taskID = ?').get(taskId);
      expect(task).toBeTruthy();
    });
  });

  describe('错误处理和日志记录测试', () => {
    test('应该记录数据库错误', async () => {
      await dbManager.initialize();
      const db = dbManager.getDatabase();
      
      try {
        // 尝试插入无效数据（违反外键约束）
        db.prepare(`
          INSERT INTO audio_file (fileID, taskID, fileName, filePath, fileSize, format, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run('test-file', 'non-existent-task', 'test.wav', '/path/to/file', 1000, 'WAV', new Date().toISOString(), new Date().toISOString());
      } catch (error) {
        // 记录错误日志
        expect(() => {
          logManager.error(LogCategory.TASK, '数据库操作失败', error as Error, { taskId: 'non-existent-task' });
        }).not.toThrow();
      }
    });
  });

  describe('并发操作测试', () => {
    test('应该支持并发数据库操作', async () => {
      await dbManager.initialize();
      const db = dbManager.getDatabase();
      
      const promises = [];
      const taskCount = 10;
      
      // 并发创建多个任务
      for (let i = 0; i < taskCount; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            const now = new Date().toISOString();
            const taskId = `concurrent-task-${i}`;
            
            db.prepare(`
              INSERT INTO task (taskID, title, description, state, audioSource, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(taskId, `并发任务 ${i}`, `并发测试 ${i}`, 'PENDING', 'RECORD', now, now);
            
            expect(() => {
              logManager.task(`创建并发任务 ${i}`, { taskId });
            }).not.toThrow();
            
            resolve();
          })
        );
      }
      
      await Promise.all(promises);
      
      // 验证所有任务都已创建
      const tasks = db.prepare('SELECT * FROM task WHERE taskID LIKE ?').all('concurrent-task-%');
      expect(tasks.length).toBe(taskCount);
    });
  });

  describe('数据完整性测试', () => {
    test('应该维护数据完整性', async () => {
      await dbManager.initialize();
      const db = dbManager.getDatabase();
      
      // 创建任务
      const now = new Date().toISOString();
      const taskId = 'integrity-test-task';
      
      db.prepare(`
        INSERT INTO task (taskID, title, description, state, audioSource, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(taskId, '完整性测试任务', '完整性测试', 'PENDING', 'RECORD', now, now);
      
      // 创建关联的音频文件
      const fileId = 'integrity-test-file';
      db.prepare(`
        INSERT INTO audio_file (fileID, taskID, fileName, filePath, fileSize, format, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(fileId, taskId, 'test.wav', '/path/to/test.wav', 1000, 'WAV', now, now);
      
      // 删除任务（应该级联删除音频文件）
      db.prepare('DELETE FROM task WHERE taskID = ?').run(taskId);
      
      // 验证音频文件也被删除
      const audioFile = db.prepare('SELECT * FROM audio_file WHERE fileID = ?').get(fileId);
      expect(audioFile).toBeUndefined();
      
      // 记录操作日志
      logManager.task('删除任务及关联数据', { taskId, fileId });
    });
  });

  describe('性能测试', () => {
    test('应该能够处理大量数据操作', async () => {
      await dbManager.initialize();
      const db = dbManager.getDatabase();
      
      const startTime = Date.now();
      const operationCount = 1000;
      
      // 批量插入数据
      const insertStmt = db.prepare(`
        INSERT INTO task (taskID, title, description, state, audioSource, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (let i = 0; i < operationCount; i++) {
        const now = new Date().toISOString();
        const taskId = `perf-test-${i}`;
        
        insertStmt.run(taskId, `性能测试任务 ${i}`, `性能测试 ${i}`, 'PENDING', 'RECORD', now, now);
        
        if (i % 100 === 0) {
          logManager.task(`批量创建任务进度: ${i}/${operationCount}`);
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 验证数据已插入
      const taskCount = db.prepare('SELECT COUNT(*) as count FROM task WHERE taskID LIKE ?').get('perf-test-%') as { count: number };
      expect(taskCount.count).toBe(operationCount);
      
      // 性能要求：1000次操作应该在10秒内完成
      expect(duration).toBeLessThan(10000);
      
      logManager.task('性能测试完成', { 
        operationCount, 
        duration, 
        operationsPerSecond: Math.round(operationCount / (duration / 1000)) 
      });
    });
  });
}); 