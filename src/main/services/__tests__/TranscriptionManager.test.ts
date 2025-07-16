import { TranscriptionManagerImpl } from '../TranscriptionManager';
import { ConfigManagerImpl } from '../ConfigManager';
import { TaskManagerImpl } from '../TaskManager';
import { FileManagerImpl } from '../FileManager';
import { DatabaseManager } from '../DatabaseManager';
import { LogManager } from '../LogManager';
import { TaskState, TranscriptionStatus, ExportFormat } from '../../../shared/types';

// Mock dependencies
jest.mock('../ConfigManager');
jest.mock('../TaskManager');
jest.mock('../FileManager');
jest.mock('../DatabaseManager');
jest.mock('../LogManager');

describe('TranscriptionManagerImpl', () => {
  let transcriptionManager: TranscriptionManagerImpl;
  let mockConfigManager: jest.Mocked<ConfigManagerImpl>;
  let mockTaskManager: jest.Mocked<TaskManagerImpl>;
  let mockFileManager: jest.Mocked<FileManagerImpl>;
  let mockDatabaseManager: jest.Mocked<DatabaseManager>;
  let mockLogManager: jest.Mocked<LogManager>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockConfigManager = new ConfigManagerImpl(mockDatabaseManager, mockLogManager) as jest.Mocked<ConfigManagerImpl>;
    mockTaskManager = new TaskManagerImpl(mockDatabaseManager, mockLogManager) as jest.Mocked<TaskManagerImpl>;
    mockFileManager = new FileManagerImpl(mockDatabaseManager, mockLogManager) as jest.Mocked<FileManagerImpl>;
    mockDatabaseManager = new DatabaseManager() as jest.Mocked<DatabaseManager>;
    mockLogManager = new LogManager() as jest.Mocked<LogManager>;

    // Create transcription manager instance
    transcriptionManager = new TranscriptionManagerImpl(
      mockConfigManager,
      mockTaskManager,
      mockFileManager
    );
  });

  describe('initialize', () => {
    it('should initialize transcription manager successfully', async () => {
      // Mock API config
      mockConfigManager.getApiConfig.mockResolvedValue({
        configID: 'test-config',
        apiType: 'openai',
        apiUrl: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        model: 'whisper-1',
        timeout: 30,
        maxRetries: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await transcriptionManager.initialize();

      expect(mockConfigManager.getApiConfig).toHaveBeenCalledWith('openai');
    });

    it('should handle missing API config gracefully', async () => {
      mockConfigManager.getApiConfig.mockResolvedValue(null);

      await transcriptionManager.initialize();

      expect(mockConfigManager.getApiConfig).toHaveBeenCalledWith('openai');
    });
  });

  describe('startTranscription', () => {
    const mockTask = {
      taskID: 'test-task',
      title: 'Test Task',
      state: TaskState.SAVED,
      audioSource: 'RECORD' as any,
      audioLoc: '/path/to/audio.wav',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(async () => {
      // Mock API config
      mockConfigManager.getApiConfig.mockResolvedValue({
        configID: 'test-config',
        apiType: 'openai',
        apiUrl: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        model: 'whisper-1',
        timeout: 30,
        maxRetries: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await transcriptionManager.initialize();
    });

    it('should start transcription successfully', async () => {
      mockTaskManager.getTask.mockResolvedValue(mockTask);
      mockTaskManager.updateTaskState.mockResolvedValue();

      await transcriptionManager.startTranscription('test-task');

      expect(mockTaskManager.getTask).toHaveBeenCalledWith('test-task');
      expect(mockTaskManager.updateTaskState).toHaveBeenCalledWith('test-task', TaskState.IN_TRANSCRIB);
    });

    it('should throw error for non-existent task', async () => {
      mockTaskManager.getTask.mockResolvedValue(null);

      await expect(transcriptionManager.startTranscription('non-existent-task'))
        .rejects.toThrow('任务不存在: non-existent-task');
    });

    it('should throw error for invalid task state', async () => {
      const invalidTask = { ...mockTask, state: TaskState.PENDING };
      mockTaskManager.getTask.mockResolvedValue(invalidTask);

      await expect(transcriptionManager.startTranscription('test-task'))
        .rejects.toThrow('任务状态不正确，无法开始转录: PENDING');
    });
  });

  describe('stopTranscription', () => {
    it('should stop transcription successfully', async () => {
      mockTaskManager.updateTaskState.mockResolvedValue();

      await transcriptionManager.stopTranscription('test-task');

      expect(mockTaskManager.updateTaskState).toHaveBeenCalledWith('test-task', TaskState.FAILED);
    });
  });

  describe('getTranscriptionStatus', () => {
    it('should return transcription status', () => {
      const status = transcriptionManager.getTranscriptionStatus('test-task');

      expect(status).toEqual({
        taskId: 'test-task',
        status: 'not_found',
        progress: 0,
        startTime: expect.any(Date)
      });
    });
  });

  describe('getTranscriptionProgress', () => {
    it('should return transcription progress', () => {
      const progress = transcriptionManager.getTranscriptionProgress('test-task');

      expect(progress).toBe(0);
    });
  });

  describe('getTranscriptionResult', () => {
    const mockTask = {
      taskID: 'test-task',
      title: 'Test Task',
      state: TaskState.COMPLETED,
      audioSource: 'RECORD' as any,
      audioLoc: '/path/to/audio.wav',
      transcriptionLoc: '/path/to/transcription.json',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return transcription result', async () => {
      mockTaskManager.getTask.mockResolvedValue(mockTask);

      // Mock fs.readFileSync
      const mockReadFileSync = jest.spyOn(require('fs'), 'readFileSync');
      const mockDate = new Date('2025-01-01T00:00:00.000Z');
      mockReadFileSync.mockReturnValue(JSON.stringify({
        resultID: 'test-result',
        taskID: 'test-task',
        format: 'TXT',
        model: 'whisper-1',
        text: 'Hello world',
        createdAt: mockDate,
        updatedAt: mockDate
      }));

      const result = await transcriptionManager.getTranscriptionResult('test-task');

      expect(result).toEqual({
        resultID: 'test-result',
        taskID: 'test-task',
        format: 'TXT',
        model: 'whisper-1',
        text: 'Hello world',
        createdAt: mockDate,
        updatedAt: mockDate
      });

      mockReadFileSync.mockRestore();
    });

    it('should throw error for non-existent transcription', async () => {
      mockTaskManager.getTask.mockResolvedValue(null);

      await expect(transcriptionManager.getTranscriptionResult('test-task'))
        .rejects.toThrow('转录结果不存在: test-task');
    });
  });

  describe('exportTranscription', () => {
    const mockResult = {
      resultID: 'test-result',
      taskID: 'test-task',
      format: 'TXT',
      model: 'whisper-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      apiResponse: {
        text: 'Hello world',
        segments: [
          { start: 0, end: 1, text: 'Hello' },
          { start: 1, end: 2, text: 'world' }
        ]
      }
    };

    beforeEach(() => {
      // Mock getTranscriptionResult
      jest.spyOn(transcriptionManager, 'getTranscriptionResult').mockResolvedValue(mockResult);

      // Mock fs operations
      const mockFs = require('fs');
      jest.spyOn(mockFs, 'existsSync').mockReturnValue(false);
      jest.spyOn(mockFs, 'mkdirSync').mockImplementation(() => {});
      jest.spyOn(mockFs, 'writeFileSync').mockImplementation(() => {});
    });

    it('should export transcription as TXT format', async () => {
      const exportPath = await transcriptionManager.exportTranscription('test-task', ExportFormat.TXT);

      expect(exportPath).toMatch(/transcription_test-task_\d+\.txt$/);
    });

    it('should export transcription as JSON format', async () => {
      const exportPath = await transcriptionManager.exportTranscription('test-task', ExportFormat.JSON);

      expect(exportPath).toMatch(/transcription_test-task_\d+\.json$/);
    });

    it('should export transcription as SRT format', async () => {
      const exportPath = await transcriptionManager.exportTranscription('test-task', ExportFormat.SRT);

      expect(exportPath).toMatch(/transcription_test-task_\d+\.srt$/);
    });

    it('should export transcription as VTT format', async () => {
      const exportPath = await transcriptionManager.exportTranscription('test-task', ExportFormat.VTT);

      expect(exportPath).toMatch(/transcription_test-task_\d+\.vtt$/);
    });

    it('should throw error for unsupported format', async () => {
      await expect(transcriptionManager.exportTranscription('test-task', 'UNSUPPORTED' as any))
        .rejects.toThrow('不支持的导出格式: UNSUPPORTED');
    });
  });

  describe('batchTranscribe', () => {
    it('should process batch transcription', async () => {
      const taskIds = ['task1', 'task2', 'task3'];

      // Mock startTranscription to resolve immediately
      const mockStartTranscription = jest.spyOn(transcriptionManager, 'startTranscription').mockResolvedValue();

      await transcriptionManager.batchTranscribe(taskIds);

      expect(mockStartTranscription).toHaveBeenCalledTimes(3);
      expect(mockStartTranscription).toHaveBeenNthCalledWith(1, 'task1', undefined);
      expect(mockStartTranscription).toHaveBeenNthCalledWith(2, 'task2', undefined);
      expect(mockStartTranscription).toHaveBeenNthCalledWith(3, 'task3', undefined);
    });
  });
}); 