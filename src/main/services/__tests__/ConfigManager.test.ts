import { ConfigManagerImpl } from '../ConfigManager';
import { DatabaseManager } from '../DatabaseManager';
import { LogManager } from '../LogManager';

// Mock DatabaseManager
jest.mock('../DatabaseManager');
const MockDatabaseManager = DatabaseManager as jest.MockedClass<typeof DatabaseManager>;

// Mock LogManager
jest.mock('../LogManager');
const MockLogManager = LogManager as jest.MockedClass<typeof LogManager>;

describe('ConfigManager', () => {
  let configManager: ConfigManagerImpl;
  let mockDb: jest.Mocked<DatabaseManager>;
  let mockLogger: jest.Mocked<LogManager>;
  let mockDatabase: any;

  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();

    // 创建mock数据库实例
    mockDatabase = {
      exec: jest.fn(),
      prepare: jest.fn(),
      query: jest.fn(),
    };

    // 设置DatabaseManager mock
    mockDb = new MockDatabaseManager() as jest.Mocked<DatabaseManager>;
    mockDb.getDatabase.mockReturnValue(mockDatabase);

    // 设置LogManager mock
    mockLogger = new MockLogManager() as jest.Mocked<LogManager>;
    mockLogger.log = jest.fn();
    mockLogger.error = jest.fn();

    // 创建ConfigManager实例
    configManager = new ConfigManagerImpl(mockDb, mockLogger);
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      // 设置mock返回值
      mockDatabase.exec.mockResolvedValue(undefined);
      mockDatabase.prepare.mockReturnValue({
        run: jest.fn(),
        all: jest.fn().mockReturnValue([]),
        get: jest.fn().mockReturnValue(null),
      });

      await configManager.initialize();

      expect(mockDb.getDatabase).toHaveBeenCalled();
      expect(mockDatabase.exec).toHaveBeenCalledTimes(7); // 3个表 + 4个索引
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        '配置管理器初始化完成'
      );
    });

    it('should throw error if database is not connected', async () => {
      mockDb.getDatabase.mockReturnValue(null as any);

      await expect(configManager.initialize()).rejects.toThrow('数据库未连接');
    });
  });

  describe('getConfig', () => {
    beforeEach(async () => {
      // 初始化配置管理器
      mockDatabase.exec.mockResolvedValue(undefined);
      mockDatabase.prepare.mockReturnValue({
        run: jest.fn(),
        all: jest.fn().mockReturnValue([]),
        get: jest.fn().mockReturnValue(null),
      });
      await configManager.initialize();
    });

    it('should get config by category', async () => {
      const mockRows = [
        { configKey: 'theme', configValue: 'dark' },
        { configKey: 'language', configValue: 'zh-CN' },
      ];

      mockDatabase.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue(mockRows),
      });

      const result = await configManager.getConfig('ui');

      expect(result).toEqual({
        theme: 'dark',
        language: 'zh-CN',
      });
    });

    it('should get specific config by key', async () => {
      const mockRow = { configValue: 'dark' };

      mockDatabase.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([mockRow]),
      });

      const result = await configManager.getConfig('ui', 'theme');

      expect(result).toBe('dark');
    });

    it('should return null for non-existent config', async () => {
      mockDatabase.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([]),
      });

      const result = await configManager.getConfig('ui', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('setConfig', () => {
    beforeEach(async () => {
      // 初始化配置管理器
      mockDatabase.exec.mockResolvedValue(undefined);
      mockDatabase.prepare.mockReturnValue({
        run: jest.fn(),
        all: jest.fn().mockReturnValue([]),
        get: jest.fn().mockReturnValue(null),
      });
      await configManager.initialize();
    });

    it('should set config successfully', async () => {
      mockDatabase.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([]), // 不是系统配置
        run: jest.fn(),
      });

      await configManager.setConfig('ui', 'theme', 'light');

      expect(mockDatabase.prepare).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        '配置更新成功',
        expect.objectContaining({
          category: 'ui',
          key: 'theme',
          value: 'light',
        })
      );
    });

    it('should throw error for invalid config', async () => {
      await expect(configManager.setConfig('ui', 'theme', 'invalid')).rejects.toThrow(
        '配置验证失败'
      );
    });

    it('should throw error for system config', async () => {
      mockDatabase.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([{ isSystem: 1 }]), // 系统配置
      });

      await expect(configManager.setConfig('system', 'storagePath', '/new/path')).rejects.toThrow(
        '系统配置不允许修改'
      );
    });
  });

  describe('getApiConfig', () => {
    beforeEach(async () => {
      // 初始化配置管理器
      mockDatabase.exec.mockResolvedValue(undefined);
      mockDatabase.prepare.mockReturnValue({
        run: jest.fn(),
        all: jest.fn().mockReturnValue([]),
        get: jest.fn().mockReturnValue(null),
      });
      await configManager.initialize();
    });

    it('should get API config successfully', async () => {
      const mockRow = {
        configID: 'test-id',
        apiType: 'whisper',
        apiUrl: 'https://api.openai.com/v1/audio/transcriptions',
        apiKey: 'test-key',
        model: 'whisper-1',
        timeout: 30,
        maxRetries: 3,
        isActive: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockDatabase.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([mockRow]),
      });

      const result = await configManager.getApiConfig('whisper');

      expect(result).toEqual({
        configID: 'test-id',
        apiType: 'whisper',
        apiUrl: 'https://api.openai.com/v1/audio/transcriptions',
        apiKey: 'test-key',
        model: 'whisper-1',
        timeout: 30,
        maxRetries: 3,
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      });
    });

    it('should return null for non-existent API config', async () => {
      mockDatabase.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([]),
      });

      const result = await configManager.getApiConfig('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getShortcuts', () => {
    beforeEach(async () => {
      // 初始化配置管理器
      mockDatabase.exec.mockResolvedValue(undefined);
      mockDatabase.prepare.mockReturnValue({
        run: jest.fn(),
        all: jest.fn().mockReturnValue([]),
        get: jest.fn().mockReturnValue(null),
      });
      await configManager.initialize();
    });

    it('should get shortcuts successfully', async () => {
      const mockRows = [
        {
          shortcutID: 'test-id',
          action: 'startRecording',
          key: 'CommandOrControl+Shift+R',
          isEnabled: 1,
          description: '开始录音',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockDatabase.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue(mockRows),
      });

      const result = await configManager.getShortcuts();

      expect(result).toEqual([
        {
          shortcutID: 'test-id',
          action: 'startRecording',
          key: 'CommandOrControl+Shift+R',
          isEnabled: true,
          description: '开始录音',
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]);
    });
  });

  describe('updateShortcut', () => {
    beforeEach(async () => {
      // 初始化配置管理器
      mockDatabase.exec.mockResolvedValue(undefined);
      mockDatabase.prepare.mockReturnValue({
        run: jest.fn(),
        all: jest.fn().mockReturnValue([]),
        get: jest.fn().mockReturnValue(null),
      });
      await configManager.initialize();
    });

    it('should update shortcut successfully', async () => {
      mockDatabase.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([]), // 无冲突
        run: jest.fn(),
      });

      await configManager.updateShortcut('startRecording', 'CommandOrControl+Shift+A', true);

      expect(mockDatabase.prepare).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        '快捷键配置更新成功',
        expect.objectContaining({
          action: 'startRecording',
          key: 'CommandOrControl+Shift+A',
          isEnabled: true,
        })
      );
    });

    it('should throw error for invalid shortcut format', async () => {
      await expect(configManager.updateShortcut('startRecording', 'invalid', true)).rejects.toThrow(
        '无效的快捷键格式'
      );
    });

    it('should throw error for shortcut conflict', async () => {
      mockDatabase.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([{ action: 'otherAction' }]), // 有冲突
      });

      await expect(
        configManager.updateShortcut('startRecording', 'CommandOrControl+Shift+R', true)
      ).rejects.toThrow('快捷键冲突');
    });
  });

  describe('validateConfig', () => {
    it('should validate UI config correctly', () => {
      const validResult = configManager.validateConfig('ui', { theme: 'dark' });
      expect(validResult.isValid).toBe(true);

      const invalidResult = configManager.validateConfig('ui', { theme: 'invalid' });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('主题必须是 light、dark 或 system');
    });

    it('should validate audio config correctly', () => {
      const validResult = configManager.validateConfig('audio', { audioFormat: 'wav' });
      expect(validResult.isValid).toBe(true);

      const invalidResult = configManager.validateConfig('audio', { audioFormat: 'invalid' });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('音频格式必须是 wav、mp3、m4a 或 flac');
    });

    it('should return error for unknown category', () => {
      const result = configManager.validateConfig('unknown', { key: 'value' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('未知的配置分类: unknown');
    });
  });

  describe('cleanup', () => {
    it('should cleanup successfully', async () => {
      await configManager.cleanup();

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        '配置管理器清理完成'
      );
    });
  });
}); 