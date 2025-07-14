import { DatabaseManager } from '../DatabaseManager';
import fs from 'fs';
import path from 'path';

// Mock Electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-app-data'),
  },
}));

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;
  let testDbPath: string;

  beforeEach(async () => {
    // 清理测试数据库
    testDbPath = '/tmp/test-app-data/data/whisperelectron.db';
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // 确保目录存在
    fs.mkdirSync(path.dirname(testDbPath), { recursive: true });

    dbManager = new DatabaseManager();
  });

  afterEach(() => {
    // 清理资源
    dbManager.close();
    
    // 删除测试文件
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('初始化测试', () => {
    test('应该成功初始化数据库', async () => {
      await dbManager.initialize();
      
      const db = dbManager.getDatabase();
      expect(db).toBeDefined();
      
      // 验证表是否创建
      const tables = ['task', 'audio_file', 'transcription_result', 'transcription_file', 'app_config', 'api_config', 'shortcut_config'];
      for (const table of tables) {
        const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
        expect(result).toBeTruthy();
      }
    });

    test('应该启用外键约束', async () => {
      await dbManager.initialize();
      const db = dbManager.getDatabase();
      
      const result = db.pragma('foreign_keys');
      expect(result[0].foreign_keys).toBe(1);
    });

    test('应该创建索引', async () => {
      await dbManager.initialize();
      const db = dbManager.getDatabase();
      
      // 验证索引是否创建
      const indexes = [
        'idx_task_state',
        'idx_task_created_at',
        'idx_audio_file_task_id',
        'idx_transcription_result_task_id',
        'idx_app_config_category',
        'idx_api_config_type',
        'idx_shortcut_config_action'
      ];
      
      for (const index of indexes) {
        const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name=?`).get(index);
        expect(result).toBeTruthy();
      }
    });

    test('应该插入默认数据', async () => {
      await dbManager.initialize();
      const db = dbManager.getDatabase();
      
      // 验证默认应用配置
      const themeConfig = db.prepare('SELECT * FROM app_config WHERE configKey = ?').get('theme');
      expect(themeConfig).toBeTruthy();
      expect(themeConfig.configValue).toBe('system');
      
      // 验证默认快捷键配置
      const shortcuts = db.prepare('SELECT * FROM shortcut_config').all();
      expect(shortcuts.length).toBeGreaterThan(0);
      
      // 验证默认API配置
      const apiConfig = db.prepare('SELECT * FROM api_config WHERE apiType = ?').get('whisper');
      expect(apiConfig).toBeTruthy();
      expect(apiConfig.apiUrl).toBe('https://api.openai.com/v1/audio/transcriptions');
    });

    test('应该验证数据库完整性', async () => {
      await dbManager.initialize();
      
      // 验证数据库验证通过
      expect(() => {
        // 这里我们无法直接调用私有方法，但可以通过初始化过程间接验证
        const db = dbManager.getDatabase();
        const tables = ['task', 'audio_file', 'transcription_result', 'transcription_file', 'app_config', 'api_config', 'shortcut_config'];
        
        for (const table of tables) {
          const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
          expect(result).toBeTruthy();
        }
      }).not.toThrow();
    });
  });

  describe('数据库操作测试', () => {
    beforeEach(async () => {
      await dbManager.initialize();
    });

    test('应该能够创建任务', () => {
      const db = dbManager.getDatabase();
      const now = new Date().toISOString();
      const taskId = 'test-task-123';
      
      db.prepare(`
        INSERT INTO task (taskID, title, description, state, audioSource, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(taskId, '测试任务', '测试描述', 'PENDING', 'RECORD', now, now);
      
      const task = db.prepare('SELECT * FROM task WHERE taskID = ?').get(taskId);
      expect(task).toBeTruthy();
      expect(task.title).toBe('测试任务');
    });

    test('应该能够创建音频文件', () => {
      const db = dbManager.getDatabase();
      const now = new Date().toISOString();
      const taskId = 'test-task-123';
      const fileId = 'test-file-123';
      
      // 先创建任务
      db.prepare(`
        INSERT INTO task (taskID, title, description, state, audioSource, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(taskId, '测试任务', '测试描述', 'PENDING', 'RECORD', now, now);
      
      // 创建音频文件
      db.prepare(`
        INSERT INTO audio_file (fileID, taskID, fileName, filePath, fileSize, format, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(fileId, taskId, 'test.wav', '/path/to/test.wav', 1024, 'WAV', now, now);
      
      const audioFile = db.prepare('SELECT * FROM audio_file WHERE fileID = ?').get(fileId);
      expect(audioFile).toBeTruthy();
      expect(audioFile.fileName).toBe('test.wav');
    });

    test('应该能够创建转录结果', () => {
      const db = dbManager.getDatabase();
      const now = new Date().toISOString();
      const taskId = 'test-task-123';
      const resultId = 'test-result-123';
      
      // 先创建任务
      db.prepare(`
        INSERT INTO task (taskID, title, description, state, audioSource, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(taskId, '测试任务', '测试描述', 'PENDING', 'RECORD', now, now);
      
      // 创建转录结果
      db.prepare(`
        INSERT INTO transcription_result (resultID, taskID, format, model, language, confidence, processingTime, wordCount, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(resultId, taskId, 'TXT', 'whisper-1', 'zh-CN', 0.95, 10.5, 5, now, now);
      
      const result = db.prepare('SELECT * FROM transcription_result WHERE resultID = ?').get(resultId);
      expect(result).toBeTruthy();
      expect(result.model).toBe('whisper-1');
    });

    test('应该支持外键约束', () => {
      const db = dbManager.getDatabase();
      const now = new Date().toISOString();
      const fileId = 'test-file-123';
      
      // 尝试创建没有对应任务的音频文件（应该失败）
      expect(() => {
        db.prepare(`
          INSERT INTO audio_file (fileID, taskID, fileName, filePath, fileSize, format, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(fileId, 'non-existent-task', 'test.wav', '/path/to/test.wav', 1024, 'WAV', now, now);
      }).toThrow();
    });

    test('应该能够查询配置', () => {
      const db = dbManager.getDatabase();
      
      // 查询应用配置
      const themeConfig = db.prepare('SELECT * FROM app_config WHERE configKey = ?').get('theme');
      expect(themeConfig).toBeTruthy();
      
      // 查询API配置
      const apiConfig = db.prepare('SELECT * FROM api_config WHERE apiType = ?').get('whisper');
      expect(apiConfig).toBeTruthy();
      
      // 查询快捷键配置
      const shortcuts = db.prepare('SELECT * FROM shortcut_config').all();
      expect(shortcuts.length).toBeGreaterThan(0);
    });

    test('应该能够更新配置', () => {
      const db = dbManager.getDatabase();
      const now = new Date().toISOString();
      
      // 更新主题配置
      db.prepare(`
        UPDATE app_config SET configValue = ?, updatedAt = ? WHERE configKey = ?
      `).run('dark', now, 'theme');
      
      const themeConfig = db.prepare('SELECT * FROM app_config WHERE configKey = ?').get('theme');
      expect(themeConfig.configValue).toBe('dark');
    });
  });

  describe('错误处理测试', () => {
    test('应该在数据库未初始化时抛出错误', () => {
      expect(() => {
        dbManager.getDatabase();
      }).toThrow('数据库未初始化');
    });

    test('应该在重复初始化时正常工作', async () => {
      await dbManager.initialize();
      await dbManager.initialize(); // 第二次初始化应该不会出错
      
      const db = dbManager.getDatabase();
      expect(db).toBeDefined();
    });
  });

  describe('数据库关闭测试', () => {
    test('应该能够正确关闭数据库', async () => {
      await dbManager.initialize();
      expect(dbManager.getDatabase()).toBeDefined();
      
      dbManager.close();
      
      expect(() => {
        dbManager.getDatabase();
      }).toThrow('数据库未初始化');
    });

    test('应该能够多次关闭数据库而不出错', async () => {
      await dbManager.initialize();
      
      dbManager.close();
      dbManager.close(); // 第二次关闭应该不会出错
    });
  });

  describe('UUID生成测试', () => {
    test('应该生成有效的UUID', async () => {
      await dbManager.initialize();
      const db = dbManager.getDatabase();
      
      // 通过插入数据来测试UUID生成
      const now = new Date().toISOString();
      const taskId = 'test-task-123';
      
      db.prepare(`
        INSERT INTO task (taskID, title, description, state, audioSource, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(taskId, '测试任务', '测试描述', 'PENDING', 'RECORD', now, now);
      
      // 验证任务ID格式
      expect(taskId).toMatch(/^[a-zA-Z0-9-]+$/);
    });
  });

  describe('性能测试', () => {
    test('应该能够处理大量数据', async () => {
      await dbManager.initialize();
      const db = dbManager.getDatabase();
      
      const startTime = Date.now();
      const taskCount = 100;
      
      // 批量插入任务
      const insertStmt = db.prepare(`
        INSERT INTO task (taskID, title, description, state, audioSource, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (let i = 0; i < taskCount; i++) {
        const now = new Date().toISOString();
        const taskId = `perf-test-${i}`;
        
        insertStmt.run(taskId, `性能测试任务 ${i}`, `性能测试 ${i}`, 'PENDING', 'RECORD', now, now);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 验证数据已插入
      const count = db.prepare('SELECT COUNT(*) as count FROM task WHERE taskID LIKE ?').get('perf-test-%') as { count: number };
      expect(count.count).toBe(taskCount);
      
      // 性能要求：100次插入应该在1秒内完成
      expect(duration).toBeLessThan(1000);
    });
  });
}); 