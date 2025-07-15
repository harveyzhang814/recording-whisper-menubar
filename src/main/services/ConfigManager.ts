import { DatabaseManager } from './DatabaseManager';
import { LogManager, LogLevel } from './LogManager';
import { 
  AppConfig, 
  ApiConfig, 
  ShortcutConfig, 
  ValidationResult,
  DatabaseError,
  LogCategory 
} from '../../shared/types';
import { EventEmitter } from 'events';

export interface ConfigManager {
  // 获取指定分类的配置，如果提供key则返回特定配置项
  getConfig(category: string, key?: string): Promise<any>;
  
  // 设置指定分类和键的配置值
  setConfig(category: string, key: string, value: any): Promise<void>;
  
  // 获取指定类型的API配置
  getApiConfig(apiType: string): Promise<ApiConfig | null>;
  
  // 获取所有快捷键配置
  getShortcuts(): Promise<ShortcutConfig[]>;
  
  // 更新快捷键配置
  updateShortcut(action: string, key: string, isEnabled: boolean): Promise<void>;
  
  // 验证配置有效性
  validateConfig(category: string, config: any): ValidationResult;
}

export class ConfigManagerImpl implements ConfigManager {
  private db: DatabaseManager;
  private logger: LogManager;
  private cache: Map<string, any> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(db: DatabaseManager, logger: LogManager) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * 初始化配置管理器
   */
  async initialize(): Promise<void> {
    try {
      this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '初始化配置管理器');
      
      // 检查数据库连接状态
      const database = this.db.getDatabase();
      if (!database) {
        throw new DatabaseError('数据库未连接');
      }

      // 创建配置表（如果不存在）
      await this.createConfigTables();

      // 加载默认配置到数据库
      await this.loadDefaultConfigs();

      // 验证配置完整性
      await this.validateAllConfigs();

      // 初始化配置缓存
      await this.initializeCache();

      this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '配置管理器初始化完成');
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '配置管理器初始化失败', error as Error);
      throw error;
    }
  }

  /**
   * 创建配置相关表
   */
  private async createConfigTables(): Promise<void> {
    const database = this.db.getDatabase();
    
    const createAppConfigTable = `
      CREATE TABLE IF NOT EXISTS app_config (
        configID TEXT PRIMARY KEY,
        configKey TEXT NOT NULL,
        configValue TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        isSystem BOOLEAN DEFAULT FALSE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createApiConfigTable = `
      CREATE TABLE IF NOT EXISTS api_config (
        configID TEXT PRIMARY KEY,
        apiType TEXT NOT NULL,
        apiUrl TEXT NOT NULL,
        apiKey TEXT,
        model TEXT NOT NULL,
        timeout INTEGER DEFAULT 30,
        maxRetries INTEGER DEFAULT 3,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createShortcutConfigTable = `
      CREATE TABLE IF NOT EXISTS shortcut_config (
        shortcutID TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        key TEXT NOT NULL,
        isEnabled BOOLEAN DEFAULT TRUE,
        description TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      database.exec(createAppConfigTable);
      database.exec(createApiConfigTable);
      database.exec(createShortcutConfigTable);

      // 创建索引
      database.exec('CREATE INDEX IF NOT EXISTS idx_app_config_category ON app_config(category)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(configKey)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_api_config_type ON api_config(apiType)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_shortcut_config_action ON shortcut_config(action)');

      this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '配置表创建完成');
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '创建配置表失败', error as Error);
      throw new DatabaseError('创建配置表失败', { error });
    }
  }

  /**
   * 加载默认配置
   */
  private async loadDefaultConfigs(): Promise<void> {
    const defaultConfigs: AppConfig[] = [
      {
        configID: this.generateUUID(),
        configKey: 'theme',
        configValue: 'dark',
        category: 'ui',
        description: '应用主题设置',
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        configID: this.generateUUID(),
        configKey: 'language',
        configValue: 'zh-CN',
        category: 'ui',
        description: '应用语言设置',
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        configID: this.generateUUID(),
        configKey: 'audioFormat',
        configValue: 'wav',
        category: 'audio',
        description: '默认音频格式',
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        configID: this.generateUUID(),
        configKey: 'sampleRate',
        configValue: '44100',
        category: 'audio',
        description: '默认采样率',
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        configID: this.generateUUID(),
        configKey: 'storagePath',
        configValue: '',
        category: 'system',
        description: '文件存储路径',
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const defaultApiConfigs: ApiConfig[] = [
      {
        configID: this.generateUUID(),
        apiType: 'whisper',
        apiUrl: 'https://api.openai.com/v1/audio/transcriptions',
        apiKey: '',
        model: 'whisper-1',
        timeout: 30,
        maxRetries: 3,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const defaultShortcuts: ShortcutConfig[] = [
      {
        shortcutID: this.generateUUID(),
        action: 'startRecording',
        key: 'CommandOrControl+Shift+R',
        isEnabled: true,
        description: '开始录音',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        shortcutID: this.generateUUID(),
        action: 'stopRecording',
        key: 'CommandOrControl+Shift+S',
        isEnabled: true,
        description: '停止录音',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        shortcutID: this.generateUUID(),
        action: 'showWindow',
        key: 'CommandOrControl+Shift+W',
        isEnabled: true,
        description: '显示/隐藏窗口',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    try {
      // 插入默认配置（如果不存在）
      for (const config of defaultConfigs) {
        await this.insertConfigIfNotExists(config);
      }

      for (const apiConfig of defaultApiConfigs) {
        await this.insertApiConfigIfNotExists(apiConfig);
      }

      for (const shortcut of defaultShortcuts) {
        await this.insertShortcutIfNotExists(shortcut);
      }

      this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '默认配置加载完成');
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '加载默认配置失败', error as Error);
      throw error;
    }
  }

  /**
   * 插入配置（如果不存在）
   */
  private async insertConfigIfNotExists(config: AppConfig): Promise<void> {
    const database = this.db.getDatabase();
    const sql = `
      INSERT OR IGNORE INTO app_config 
      (configID, configKey, configValue, category, description, isSystem, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const stmt = database.prepare(sql);
    stmt.run(
      config.configID,
      config.configKey,
      config.configValue,
      config.category,
      config.description,
      config.isSystem ? 1 : 0,
      config.createdAt.toISOString(),
      config.updatedAt.toISOString()
    );
  }

  /**
   * 插入API配置（如果不存在）
   */
  private async insertApiConfigIfNotExists(config: ApiConfig): Promise<void> {
    const database = this.db.getDatabase();
    const sql = `
      INSERT OR IGNORE INTO api_config 
      (configID, apiType, apiUrl, apiKey, model, timeout, maxRetries, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const stmt = database.prepare(sql);
    stmt.run(
      config.configID,
      config.apiType,
      config.apiUrl,
      config.apiKey,
      config.model,
      config.timeout,
      config.maxRetries,
      config.isActive ? 1 : 0,
      config.createdAt.toISOString(),
      config.updatedAt.toISOString()
    );
  }

  /**
   * 插入快捷键配置（如果不存在）
   */
  private async insertShortcutIfNotExists(shortcut: ShortcutConfig): Promise<void> {
    const database = this.db.getDatabase();
    const sql = `
      INSERT OR IGNORE INTO shortcut_config 
      (shortcutID, action, key, isEnabled, description, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const stmt = database.prepare(sql);
    stmt.run(
      shortcut.shortcutID,
      shortcut.action,
      shortcut.key,
      shortcut.isEnabled ? 1 : 0,
      shortcut.description,
      shortcut.createdAt.toISOString(),
      shortcut.updatedAt.toISOString()
    );
  }

  /**
   * 验证所有配置
   */
  private async validateAllConfigs(): Promise<void> {
    try {
      const categories = ['ui', 'audio', 'system'];
      
      for (const category of categories) {
        const configs = await this.getConfig(category);
        for (const [key, value] of Object.entries(configs)) {
          const validation = this.validateConfig(category, { [key]: value });
          if (!validation.isValid) {
            this.logger.log(LogLevel.WARN, LogCategory.SYSTEM, `配置验证失败: ${category}.${key}`, { errors: validation.errors });
          }
        }
      }

      this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '配置验证完成');
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '配置验证失败', error as Error);
      throw error;
    }
  }

  /**
   * 初始化配置缓存
   */
  private async initializeCache(): Promise<void> {
    try {
      const categories = ['ui', 'audio', 'system'];
      
      for (const category of categories) {
        const configs = await this.getConfig(category);
        this.cache.set(category, configs);
      }

      this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '配置缓存初始化完成');
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '配置缓存初始化失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取配置
   */
  async getConfig(category: string, key?: string): Promise<any> {
    try {
      // 先从缓存获取
      if (this.cache.has(category) && !key) {
        return this.cache.get(category);
      }

      const database = this.db.getDatabase();
      let sql: string;
      let params: any[];

      if (key) {
        sql = 'SELECT * FROM app_config WHERE category = ? AND configKey = ?';
        params = [category, key];
      } else {
        sql = 'SELECT * FROM app_config WHERE category = ?';
        params = [category];
      }

      const stmt = database.prepare(sql);
      const rows = stmt.all(params) as any[];
      
      if (key) {
        if (rows.length === 0) {
          return null;
        }
        return this.parseConfigValue(rows[0].configValue);
      } else {
        const configs: any = {};
        for (const row of rows) {
          configs[row.configKey] = this.parseConfigValue(row.configValue);
        }
        
        // 更新缓存
        this.cache.set(category, configs);
        return configs;
      }
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '获取配置失败', error as Error, { category, key });
      throw new DatabaseError('获取配置失败', { category, key, error });
    }
  }

  /**
   * 设置配置
   */
  async setConfig(category: string, key: string, value: any): Promise<void> {
    try {
      // 验证配置值
      const validation = this.validateConfig(category, { [key]: value });
      if (!validation.isValid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      // 检查是否为系统配置
      const database = this.db.getDatabase();
      const existingConfigStmt = database.prepare('SELECT isSystem FROM app_config WHERE category = ? AND configKey = ?');
      const existingConfig = existingConfigStmt.all(category, key) as any[];

      if (existingConfig.length > 0 && existingConfig[0].isSystem) {
        throw new Error('系统配置不允许修改');
      }

      const configValue = this.serializeConfigValue(value);
      const now = new Date();

      const sql = `
        INSERT OR REPLACE INTO app_config 
        (configID, configKey, configValue, category, description, isSystem, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const stmt = database.prepare(sql);
      stmt.run(
        this.generateUUID(),
        key,
        configValue,
        category,
        `用户配置: ${key}`,
        0,
        now.toISOString(),
        now.toISOString()
      );

      // 更新缓存
      const categoryConfigs = await this.getConfig(category);
      categoryConfigs[key] = value;
      this.cache.set(category, categoryConfigs);

      // 触发配置变更事件
      this.eventEmitter.emit('configChanged', { category, key, value });

      this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '配置更新成功', { category, key, value });
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '设置配置失败', error as Error, { category, key, value });
      throw error;
    }
  }

  /**
   * 获取API配置
   */
  async getApiConfig(apiType: string): Promise<ApiConfig | null> {
    try {
      const database = this.db.getDatabase();
      const sql = 'SELECT * FROM api_config WHERE apiType = ? AND isActive = 1 LIMIT 1';
      const stmt = database.prepare(sql);
      const rows = stmt.all(apiType) as any[];

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        configID: row.configID,
        apiType: row.apiType,
        apiUrl: row.apiUrl,
        apiKey: row.apiKey,
        model: row.model,
        timeout: row.timeout,
        maxRetries: row.maxRetries,
        isActive: row.isActive === 1,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      };
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '获取API配置失败', error as Error, { apiType });
      throw new DatabaseError('获取API配置失败', { apiType, error });
    }
  }

  /**
   * 获取所有快捷键配置
   */
  async getShortcuts(): Promise<ShortcutConfig[]> {
    try {
      const database = this.db.getDatabase();
      const sql = 'SELECT * FROM shortcut_config ORDER BY action';
      const stmt = database.prepare(sql);
      const rows = stmt.all() as any[];

      return rows.map((row: any) => ({
        shortcutID: row.shortcutID,
        action: row.action,
        key: row.key,
        isEnabled: row.isEnabled === 1,
        description: row.description,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      }));
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '获取快捷键配置失败', error as Error);
      throw new DatabaseError('获取快捷键配置失败', { error });
    }
  }

  /**
   * 更新快捷键配置
   */
  async updateShortcut(action: string, key: string, isEnabled: boolean): Promise<void> {
    try {
      // 验证快捷键格式
      if (!this.isValidShortcut(key)) {
        throw new Error('无效的快捷键格式');
      }

      // 检查快捷键冲突
      const hasConflict = await this.checkShortcutConflict(key, action);
      if (hasConflict) {
        throw new Error('快捷键冲突');
      }

      const database = this.db.getDatabase();
      const sql = `
        UPDATE shortcut_config 
        SET key = ?, isEnabled = ?, updatedAt = ? 
        WHERE action = ?
      `;

      const stmt = database.prepare(sql);
      stmt.run(key, isEnabled ? 1 : 0, new Date().toISOString(), action);

      this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '快捷键配置更新成功', { action, key, isEnabled });
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '更新快捷键配置失败', error as Error, { action, key, isEnabled });
      throw error;
    }
  }

  /**
   * 验证配置有效性
   */
  validateConfig(category: string, config: any): ValidationResult {
    const errors: string[] = [];

    try {
      switch (category) {
        case 'ui':
          errors.push(...this.validateUIConfig(config));
          break;
        case 'audio':
          errors.push(...this.validateAudioConfig(config));
          break;
        case 'system':
          errors.push(...this.validateSystemConfig(config));
          break;
        default:
          errors.push(`未知的配置分类: ${category}`);
      }
    } catch (error) {
      errors.push(`配置验证异常: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证UI配置
   */
  private validateUIConfig(config: any): string[] {
    const errors: string[] = [];

    if (config.theme !== undefined) {
      if (!['light', 'dark', 'system'].includes(config.theme)) {
        errors.push('主题必须是 light、dark 或 system');
      }
    }

    if (config.language !== undefined) {
      if (!['zh-CN', 'en-US'].includes(config.language)) {
        errors.push('语言必须是 zh-CN 或 en-US');
      }
    }

    return errors;
  }

  /**
   * 验证音频配置
   */
  private validateAudioConfig(config: any): string[] {
    const errors: string[] = [];

    if (config.audioFormat !== undefined) {
      if (!['wav', 'mp3', 'm4a', 'flac'].includes(config.audioFormat)) {
        errors.push('音频格式必须是 wav、mp3、m4a 或 flac');
      }
    }

    if (config.sampleRate !== undefined) {
      const sampleRate = parseInt(config.sampleRate);
      if (isNaN(sampleRate) || ![8000, 16000, 22050, 44100, 48000].includes(sampleRate)) {
        errors.push('采样率必须是 8000、16000、22050、44100 或 48000');
      }
    }

    return errors;
  }

  /**
   * 验证系统配置
   */
  private validateSystemConfig(config: any): string[] {
    const errors: string[] = [];

    if (config.storagePath !== undefined && config.storagePath !== '') {
      // 这里可以添加路径验证逻辑
      // 暂时只检查是否为空字符串
    }

    return errors;
  }

  /**
   * 检查快捷键冲突
   */
  private async checkShortcutConflict(key: string, excludeAction?: string): Promise<boolean> {
    try {
      const database = this.db.getDatabase();
      let sql = 'SELECT action FROM shortcut_config WHERE key = ?';
      let params = [key];

      if (excludeAction) {
        sql += ' AND action != ?';
        params.push(excludeAction);
      }

      const stmt = database.prepare(sql);
      const rows = stmt.all(params) as any[];
      return rows.length > 0;
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '检查快捷键冲突失败', error as Error);
      return false;
    }
  }

  /**
   * 验证快捷键格式
   */
  private isValidShortcut(key: string): boolean {
    // 简单的快捷键格式验证
    // 支持: CommandOrControl+Key, Alt+Key, Shift+Key 等组合
    const shortcutPattern = /^(CommandOrControl|Alt|Shift|Ctrl|Meta|Super)?(\+[A-Z0-9])+$/;
    return shortcutPattern.test(key);
  }

  /**
   * 解析配置值
   */
  private parseConfigValue(value: string): any {
    try {
      // 尝试解析为JSON
      return JSON.parse(value);
    } catch {
      // 如果不是JSON，尝试解析为数字或布尔值
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (!isNaN(Number(value))) return Number(value);
      return value;
    }
  }

  /**
   * 序列化配置值
   */
  private serializeConfigValue(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
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
   * 获取事件发射器
   */
  getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      this.cache.clear();
      this.eventEmitter.removeAllListeners();
      this.logger.log(LogLevel.INFO, LogCategory.SYSTEM, '配置管理器清理完成');
    } catch (error) {
      this.logger.error(LogCategory.SYSTEM, '配置管理器清理失败', error as Error);
    }
  }
} 