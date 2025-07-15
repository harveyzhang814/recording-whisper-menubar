import { TaskManagerImpl } from '../TaskManager';
import { DatabaseManager } from '../DatabaseManager';
import { LogManager } from '../LogManager';
import { TaskState, AudioSource } from '../../../shared/types';

// Mock DatabaseManager
jest.mock('../DatabaseManager');
const MockDatabaseManager = DatabaseManager as jest.MockedClass<typeof DatabaseManager>;

// Mock LogManager
jest.mock('../LogManager');
const MockLogManager = LogManager as jest.MockedClass<typeof LogManager>;

describe('TaskManager', () => {
  let taskManager: TaskManagerImpl;
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

    // 创建TaskManager实例
    taskManager = new TaskManagerImpl(mockDb, mockLogger);
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      // 设置mock返回值
      mockDatabase.exec.mockResolvedValue(undefined);

      await taskManager.initialize();

      expect(mockDb.getDatabase).toHaveBeenCalled();
      expect(mockDatabase.exec).toHaveBeenCalledTimes(8); // 3个表 + 5个索引
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        '任务管理器初始化完成'
      );
    });

    it('should throw error if database is not connected', async () => {
      mockDb.getDatabase.mockReturnValue(null as any);

      await expect(taskManager.initialize()).rejects.toThrow('数据库未连接');
    });
  });

  describe('createTask', () => {
    beforeEach(async () => {
      // 初始化任务管理器
      mockDatabase.exec.mockResolvedValue(undefined);
      await taskManager.initialize();
    });

    it('should create task successfully', async () => {
      mockDatabase.prepare.mockReturnValue({
        run: jest.fn(),
      });

      const result = await taskManager.createTask(AudioSource.RECORD, {
        description: '测试任务',
      });

      expect(result).toMatchObject({
        audioSource: AudioSource.RECORD,
        state: TaskState.PENDING,
        description: '测试任务',
      });
      expect(result.taskID).toBeDefined();
      expect(result.title).toContain('录音任务');
      expect(mockDatabase.prepare).toHaveBeenCalled();
    });

    it('should create import task successfully', async () => {
      mockDatabase.prepare.mockReturnValue({
        run: jest.fn(),
      });

      const result = await taskManager.createTask(AudioSource.IMPORT, {
        description: '导入任务',
      });

      expect(result).toMatchObject({
        audioSource: AudioSource.IMPORT,
        state: TaskState.PENDING,
        description: '导入任务',
      });
      expect(result.title).toContain('导入任务');
    });
  });

  describe('getTasks', () => {
    beforeEach(async () => {
      // 初始化任务管理器
      mockDatabase.exec.mockResolvedValue(undefined);
      await taskManager.initialize();
    });

    it('should get all tasks successfully', async () => {
      const mockRows = [
        {
          taskID: 'task-1',
          title: '录音任务 - 2024/01/01 12:00',
          description: '测试任务',
          state: TaskState.PENDING,
          audioSource: AudioSource.RECORD,
          audioLoc: '',
          transcriptionLoc: '',
          createdAt: '2024-01-01T12:00:00.000Z',
          updatedAt: '2024-01-01T12:00:00.000Z',
          metadata: '{}',
        },
      ];

      mockDatabase.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue(mockRows),
      });

      const result = await taskManager.getTasks();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        taskID: 'task-1',
        title: '录音任务 - 2024/01/01 12:00',
        state: TaskState.PENDING,
        audioSource: AudioSource.RECORD,
      });
    });

    it('should get tasks with filters', async () => {
      const mockRows = [
        {
          taskID: 'task-1',
          title: '录音任务 - 2024/01/01 12:00',
          description: '测试任务',
          state: TaskState.COMPLETED,
          audioSource: AudioSource.RECORD,
          audioLoc: '',
          transcriptionLoc: '',
          createdAt: '2024-01-01T12:00:00.000Z',
          updatedAt: '2024-01-01T12:00:00.000Z',
          metadata: '{}',
        },
      ];

      mockDatabase.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue(mockRows),
      });

      const result = await taskManager.getTasks({
        state: TaskState.COMPLETED,
        audioSource: AudioSource.RECORD,
      });

      expect(result).toHaveLength(1);
      expect(result[0].state).toBe(TaskState.COMPLETED);
    });
  });

  describe('getTask', () => {
    beforeEach(async () => {
      // 初始化任务管理器
      mockDatabase.exec.mockResolvedValue(undefined);
      await taskManager.initialize();
    });

    it('should get task by ID successfully', async () => {
      const mockRow = {
        taskID: 'task-1',
        title: '录音任务 - 2024/01/01 12:00',
        description: '测试任务',
        state: TaskState.PENDING,
        audioSource: AudioSource.RECORD,
        audioLoc: '',
        transcriptionLoc: '',
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
        metadata: '{}',
      };

      mockDatabase.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue(mockRow),
      });

      const result = await taskManager.getTask('task-1');

      expect(result).toMatchObject({
        taskID: 'task-1',
        title: '录音任务 - 2024/01/01 12:00',
        state: TaskState.PENDING,
        audioSource: AudioSource.RECORD,
      });
    });

    it('should return null for non-existent task', async () => {
      mockDatabase.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue(null),
      });

      const result = await taskManager.getTask('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateTask', () => {
    beforeEach(async () => {
      // 初始化任务管理器
      mockDatabase.exec.mockResolvedValue(undefined);
      await taskManager.initialize();
    });

    it('should update task successfully', async () => {
      // Mock getTask to return existing task
      mockDatabase.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          taskID: 'task-1',
          title: '原标题',
          state: TaskState.PENDING,
          audioSource: AudioSource.RECORD,
          createdAt: '2024-01-01T12:00:00.000Z',
          updatedAt: '2024-01-01T12:00:00.000Z',
        }),
        run: jest.fn(),
      });

      await taskManager.updateTask('task-1', {
        title: '新标题',
        description: '新描述',
      });

      expect(mockDatabase.prepare).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        '任务更新成功',
        expect.objectContaining({
          taskId: 'task-1',
          updates: ['title', 'description'],
        })
      );
    });

    it('should throw error for non-existent task', async () => {
      mockDatabase.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue(null),
      });

      await expect(
        taskManager.updateTask('non-existent', { title: '新标题' })
      ).rejects.toThrow('任务不存在: non-existent');
    });
  });

  describe('deleteTask', () => {
    beforeEach(async () => {
      // 初始化任务管理器
      mockDatabase.exec.mockResolvedValue(undefined);
      await taskManager.initialize();
    });

    it('should delete task successfully', async () => {
      // Mock getTask to return existing task
      mockDatabase.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          taskID: 'task-1',
          state: TaskState.COMPLETED,
        }),
        run: jest.fn(),
      });

      await taskManager.deleteTask('task-1');

      expect(mockDatabase.prepare).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        '任务删除成功',
        expect.objectContaining({ taskId: 'task-1' })
      );
    });

    it('should throw error for non-existent task', async () => {
      mockDatabase.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue(null),
      });

      await expect(taskManager.deleteTask('non-existent')).rejects.toThrow(
        '任务不存在: non-existent'
      );
    });

    it('should throw error for active task', async () => {
      mockDatabase.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          taskID: 'task-1',
          state: TaskState.RECORDING,
        }),
      });

      await expect(taskManager.deleteTask('task-1')).rejects.toThrow(
        '无法删除进行中的任务'
      );
    });
  });

  describe('updateTaskState', () => {
    beforeEach(async () => {
      // 初始化任务管理器
      mockDatabase.exec.mockResolvedValue(undefined);
      await taskManager.initialize();
    });

    it('should update task state successfully', async () => {
      // Mock getTask to return existing task
      mockDatabase.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          taskID: 'task-1',
          state: TaskState.PENDING,
        }),
        run: jest.fn(),
      });

      await taskManager.updateTaskState('task-1', TaskState.RECORDING);

      expect(mockDatabase.prepare).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        '任务状态更新成功',
        expect.objectContaining({
          taskId: 'task-1',
          oldState: TaskState.PENDING,
          newState: TaskState.RECORDING,
        })
      );
    });

    it('should throw error for invalid state transition', async () => {
      mockDatabase.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          taskID: 'task-1',
          state: TaskState.COMPLETED,
        }),
      });

      await expect(
        taskManager.updateTaskState('task-1', TaskState.PENDING)
      ).rejects.toThrow('无效的状态转换: COMPLETED -> PENDING');
    });
  });

  describe('searchTasks', () => {
    beforeEach(async () => {
      // 初始化任务管理器
      mockDatabase.exec.mockResolvedValue(undefined);
      await taskManager.initialize();
    });

    it('should search tasks successfully', async () => {
      const mockRows = [
        {
          taskID: 'task-1',
          title: '包含关键词的任务',
          description: '测试任务',
          state: TaskState.PENDING,
          audioSource: AudioSource.RECORD,
          audioLoc: '',
          transcriptionLoc: '',
          createdAt: '2024-01-01T12:00:00.000Z',
          updatedAt: '2024-01-01T12:00:00.000Z',
          metadata: '{}',
        },
      ];

      mockDatabase.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue(mockRows),
      });

      const result = await taskManager.searchTasks('关键词');

      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('包含关键词的任务');
    });
  });

  describe('cleanup', () => {
    it('should cleanup successfully', async () => {
      await taskManager.cleanup();

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        '任务管理器清理完成'
      );
    });
  });
}); 