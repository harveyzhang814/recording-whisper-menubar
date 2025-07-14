import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    // 确保应用数据目录存在
    const appDataPath = this.getAppDataPath();
    if (!fs.existsSync(appDataPath)) {
      fs.mkdirSync(appDataPath, { recursive: true });
    }
    
    this.dbPath = path.join(appDataPath, 'whisperelectron.db');
  }

  private getAppDataPath(): string {
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'data');
  }

  async initialize(): Promise<void> {
    try {
      // 创建数据库连接
      this.db = new Database(this.dbPath);
      
      // 启用外键约束
      this.db.pragma('foreign_keys = ON');
      
      // 执行建表脚本
      await this.createTables();
      
      // 创建索引
      await this.createIndexes();
      
      // 插入默认数据
      await this.insertDefaultData();
      
      // 验证数据库完整性
      await this.validateDatabase();
      
      console.log('数据库初始化完成');
    } catch (error) {
      console.error('数据库初始化失败:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    // 创建任务表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task (
        taskID TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        state TEXT NOT NULL DEFAULT 'PENDING',
        audioSource TEXT NOT NULL,
        audioLoc TEXT,
        transcriptionLoc TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        metadata TEXT
      )
    `);

    // 创建音频文件表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audio_file (
        fileID TEXT PRIMARY KEY,
        taskID TEXT NOT NULL,
        fileName TEXT NOT NULL,
        filePath TEXT NOT NULL,
        fileSize INTEGER NOT NULL,
        duration INTEGER,
        format TEXT NOT NULL,
        sampleRate INTEGER,
        channels INTEGER DEFAULT 1,
        bitRate INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (taskID) REFERENCES task(taskID) ON DELETE CASCADE
      )
    `);

    // 创建转录结果表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transcription_result (
        resultID TEXT PRIMARY KEY,
        taskID TEXT NOT NULL,
        format TEXT NOT NULL DEFAULT 'TXT',
        model TEXT NOT NULL,
        language TEXT,
        confidence REAL,
        processingTime INTEGER,
        wordCount INTEGER,
        apiResponse TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (taskID) REFERENCES task(taskID) ON DELETE CASCADE
      )
    `);

    // 创建转录文件表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transcription_file (
        fileID TEXT PRIMARY KEY,
        resultID TEXT NOT NULL,
        format TEXT NOT NULL,
        fileName TEXT NOT NULL,
        filePath TEXT NOT NULL,
        fileSize INTEGER NOT NULL,
        checksum TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (resultID) REFERENCES transcription_result(resultID) ON DELETE CASCADE
      )
    `);

    // 创建应用配置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_config (
        configID TEXT PRIMARY KEY,
        configKey TEXT NOT NULL UNIQUE,
        configValue TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        isSystem BOOLEAN NOT NULL DEFAULT FALSE,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // 创建API配置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_config (
        configID TEXT PRIMARY KEY,
        apiType TEXT NOT NULL,
        apiUrl TEXT NOT NULL,
        apiKey TEXT,
        model TEXT NOT NULL,
        timeout INTEGER NOT NULL DEFAULT 30,
        maxRetries INTEGER NOT NULL DEFAULT 3,
        isActive BOOLEAN NOT NULL DEFAULT TRUE,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // 创建快捷键配置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS shortcut_config (
        shortcutID TEXT PRIMARY KEY,
        action TEXT NOT NULL UNIQUE,
        key TEXT NOT NULL,
        isEnabled BOOLEAN NOT NULL DEFAULT TRUE,
        description TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    // 任务表索引
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_task_state ON task(state)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_task_created_at ON task(createdAt)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_task_audio_source ON task(audioSource)');

    // 音频文件表索引
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_audio_file_task_id ON audio_file(taskID)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_audio_file_format ON audio_file(format)');

    // 转录结果表索引
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_transcription_result_task_id ON transcription_result(taskID)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_transcription_result_model ON transcription_result(model)');

    // 转录文件表索引
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_transcription_file_result_id ON transcription_file(resultID)');

    // 配置表索引
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_app_config_category ON app_config(category)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_api_config_type ON api_config(apiType)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_shortcut_config_action ON shortcut_config(action)');
  }

  private async insertDefaultData(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    const now = new Date().toISOString();

    // 插入默认应用配置
    const defaultAppConfigs = [
      {
        configID: this.generateUUID(),
        configKey: 'theme',
        configValue: 'system',
        category: 'appearance',
        description: '应用主题设置',
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        configID: this.generateUUID(),
        configKey: 'language',
        configValue: 'zh-CN',
        category: 'appearance',
        description: '应用语言设置',
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        configID: this.generateUUID(),
        configKey: 'audioFormat',
        configValue: 'WAV',
        category: 'audio',
        description: '默认音频格式',
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        configID: this.generateUUID(),
        configKey: 'sampleRate',
        configValue: '44100',
        category: 'audio',
        description: '默认采样率',
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const insertAppConfig = this.db.prepare(`
      INSERT OR IGNORE INTO app_config 
      (configID, configKey, configValue, category, description, isSystem, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const config of defaultAppConfigs) {
      insertAppConfig.run(
        config.configID,
        config.configKey,
        config.configValue,
        config.category,
        config.description,
        config.isSystem ? 1 : 0,
        config.createdAt,
        config.updatedAt,
      );
    }

    // 插入默认快捷键配置
    const defaultShortcuts = [
      {
        shortcutID: this.generateUUID(),
        action: 'startRecording',
        key: 'CommandOrControl+Shift+R',
        isEnabled: true,
        description: '开始录音',
        createdAt: now,
        updatedAt: now,
      },
      {
        shortcutID: this.generateUUID(),
        action: 'stopRecording',
        key: 'CommandOrControl+Shift+S',
        isEnabled: true,
        description: '停止录音',
        createdAt: now,
        updatedAt: now,
      },
      {
        shortcutID: this.generateUUID(),
        action: 'showWindow',
        key: 'CommandOrControl+Shift+W',
        isEnabled: true,
        description: '显示/隐藏窗口',
        createdAt: now,
        updatedAt: now,
      },
    ];

    const insertShortcut = this.db.prepare(`
      INSERT OR IGNORE INTO shortcut_config 
      (shortcutID, action, key, isEnabled, description, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const shortcut of defaultShortcuts) {
      insertShortcut.run(
        shortcut.shortcutID,
        shortcut.action,
        shortcut.key,
        shortcut.isEnabled ? 1 : 0,
        shortcut.description,
        shortcut.createdAt,
        shortcut.updatedAt,
      );
    }

    // 插入默认API配置
    const defaultApiConfig = {
      configID: this.generateUUID(),
      apiType: 'whisper',
      apiUrl: 'https://api.openai.com/v1/audio/transcriptions',
      apiKey: '',
      model: 'whisper-1',
      timeout: 30,
      maxRetries: 3,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const insertApiConfig = this.db.prepare(`
      INSERT OR IGNORE INTO api_config 
      (configID, apiType, apiUrl, apiKey, model, timeout, maxRetries, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertApiConfig.run(
      defaultApiConfig.configID,
      defaultApiConfig.apiType,
      defaultApiConfig.apiUrl,
      defaultApiConfig.apiKey,
      defaultApiConfig.model,
      defaultApiConfig.timeout,
      defaultApiConfig.maxRetries,
      defaultApiConfig.isActive ? 1 : 0,
      defaultApiConfig.createdAt,
      defaultApiConfig.updatedAt,
    );
  }

  private async validateDatabase(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    // 检查表是否存在
    const tables = ['task', 'audio_file', 'transcription_result', 'transcription_file', 'app_config', 'api_config', 'shortcut_config'];
    
    for (const table of tables) {
      const result = this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
      if (!result) {
        throw new Error(`表 ${table} 不存在`);
      }
    }

    // 检查默认配置是否存在
    const themeConfig = this.db.prepare('SELECT * FROM app_config WHERE configKey = ?').get('theme');
    if (!themeConfig) {
      throw new Error('默认主题配置不存在');
    }

    console.log('数据库验证通过');
  }

  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }
    return this.db;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
} 