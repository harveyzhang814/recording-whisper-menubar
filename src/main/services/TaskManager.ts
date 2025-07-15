import { DatabaseManager } from './DatabaseManager';
import { LogManager, LogLevel } from './LogManager';
import { 
  Task, 
  TaskState, 
  AudioSource, 
  TaskFilters, 
  PaginatedResult,
  DatabaseError,
  LogCategory 
} from '../../shared/types';
import { EventEmitter } from 'events';

export interface TaskManager {
  // 创建新任务
  createTask(audioSource: AudioSource, metadata?: any): Promise<Task>;
  
  // 获取任务列表
  getTasks(filters?: TaskFilters): Promise<Task[]>;
  
  // 获取单个任务详情
  getTask(taskId: string): Promise<Task | null>;
  
  // 更新任务信息
  updateTask(taskId: string, updates: Partial<Task>): Promise<void>;
  
  // 删除任务
  deleteTask(taskId: string): Promise<void>;
  
  // 更新任务状态
  updateTaskState(taskId: string, state: TaskState): Promise<void>;
  
  // 搜索任务
  searchTasks(query: string): Promise<Task[]>;
}

export class TaskManagerImpl implements TaskManager {
  private db: DatabaseManager;
  private logger: LogManager;
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(db: DatabaseManager, logger: LogManager) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * 初始化任务管理器
   */
  async initialize(): Promise<void> {
    try {
      this.logger.log(LogLevel.INFO, LogCategory.TASK, '初始化任务管理器');
      
      // 检查数据库连接状态
      const database = this.db.getDatabase();
      if (!database) {
        throw new DatabaseError('数据库未连接');
      }

      // 创建任务相关表（如果不存在）
      await this.createTaskTables();

      // 设置任务状态监听器
      this.setupEventListeners();

      this.logger.log(LogLevel.INFO, LogCategory.TASK, '任务管理器初始化完成');
    } catch (error) {
      this.logger.error(LogCategory.TASK, '任务管理器初始化失败', error as Error);
      throw error;
    }
  }

  /**
   * 创建任务相关表
   */
  private async createTaskTables(): Promise<void> {
    const database = this.db.getDatabase();
    
    // 创建任务表
    const createTaskTable = `
      CREATE TABLE IF NOT EXISTS task (
        taskID TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        state TEXT NOT NULL DEFAULT 'PENDING',
        audioSource TEXT NOT NULL,
        audioLoc TEXT,
        transcriptionLoc TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )
    `;

    // 创建音频文件表
    const createAudioFileTable = `
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
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (taskID) REFERENCES task(taskID) ON DELETE CASCADE
      )
    `;

    // 创建转录结果表
    const createTranscriptionResultTable = `
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
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (taskID) REFERENCES task(taskID) ON DELETE CASCADE
      )
    `;

    try {
      database.exec(createTaskTable);
      database.exec(createAudioFileTable);
      database.exec(createTranscriptionResultTable);

      // 创建索引
      database.exec('CREATE INDEX IF NOT EXISTS idx_task_state ON task(state)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_task_created_at ON task(createdAt)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_task_audio_source ON task(audioSource)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_audio_file_task_id ON audio_file(taskID)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_transcription_result_task_id ON transcription_result(taskID)');

      this.logger.log(LogLevel.INFO, LogCategory.TASK, '任务表创建完成');
    } catch (error) {
      this.logger.error(LogCategory.TASK, '创建任务表失败', error as Error);
      throw new DatabaseError('创建任务表失败', { error });
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听任务状态变更事件
    this.eventEmitter.on('taskStateChanged', (data: { taskId: string; oldState: TaskState; newState: TaskState }) => {
      this.logger.log(LogLevel.INFO, LogCategory.TASK, '任务状态变更', { 
        taskId: data.taskId, 
        oldState: data.oldState, 
        newState: data.newState 
      });
    });

    // 监听任务创建事件
    this.eventEmitter.on('taskCreated', (data: { task: Task }) => {
      this.logger.log(LogLevel.INFO, LogCategory.TASK, '任务创建成功', { 
        taskId: data.task.taskID, 
        title: data.task.title 
      });
    });

    // 监听任务删除事件
    this.eventEmitter.on('taskDeleted', (data: { taskId: string }) => {
      this.logger.log(LogLevel.INFO, LogCategory.TASK, '任务删除成功', { taskId: data.taskId });
    });
  }

  /**
   * 创建新任务
   */
  async createTask(audioSource: AudioSource, metadata?: any): Promise<Task> {
    try {
      const database = this.db.getDatabase();
      const taskId = this.generateUUID();
      const now = new Date();
      
      // 生成任务标题
      const title = this.generateTaskTitle(audioSource, now);
      
      // 创建任务记录
      const task: Task = {
        taskID: taskId,
        title,
        description: metadata?.description || '',
        state: TaskState.PENDING,
        audioSource,
        audioLoc: metadata?.audioLoc || '',
        transcriptionLoc: metadata?.transcriptionLoc || '',
        createdAt: now,
        updatedAt: now,
        metadata: metadata || {}
      };

      const sql = `
        INSERT INTO task 
        (taskID, title, description, state, audioSource, audioLoc, transcriptionLoc, createdAt, updatedAt, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const stmt = database.prepare(sql);
      stmt.run(
        task.taskID,
        task.title,
        task.description,
        task.state,
        task.audioSource,
        task.audioLoc,
        task.transcriptionLoc,
        task.createdAt.toISOString(),
        task.updatedAt.toISOString(),
        JSON.stringify(task.metadata)
      );

      // 触发任务创建事件
      this.eventEmitter.emit('taskCreated', { task });

      this.logger.log(LogLevel.INFO, LogCategory.TASK, '任务创建成功', { 
        taskId: task.taskID, 
        title: task.title,
        audioSource: task.audioSource 
      });

      return task;
    } catch (error) {
      this.logger.error(LogCategory.TASK, '创建任务失败', error as Error, { audioSource, metadata });
      throw new DatabaseError('创建任务失败', { audioSource, metadata, error });
    }
  }

  /**
   * 获取任务列表
   */
  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    try {
      const database = this.db.getDatabase();
      let sql = `
        SELECT t.*, 
               af.fileName as audioFileName,
               af.filePath as audioFilePath,
               af.fileSize as audioFileSize,
               af.duration as audioDuration,
               af.format as audioFormat,
               tr.format as transcriptionFormat,
               tr.model as transcriptionModel,
               tr.language as transcriptionLanguage,
               tr.confidence as transcriptionConfidence
        FROM task t
        LEFT JOIN audio_file af ON t.taskID = af.taskID
        LEFT JOIN transcription_result tr ON t.taskID = tr.taskID
      `;

      const conditions: string[] = [];
      const params: any[] = [];

      // 添加过滤条件
      if (filters?.state) {
        conditions.push('t.state = ?');
        params.push(filters.state);
      }

      if (filters?.audioSource) {
        conditions.push('t.audioSource = ?');
        params.push(filters.audioSource);
      }

      if (filters?.startDate) {
        conditions.push('t.createdAt >= ?');
        params.push(filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        conditions.push('t.createdAt <= ?');
        params.push(filters.endDate.toISOString());
      }

      if (filters?.searchQuery) {
        conditions.push('(t.title LIKE ? OR t.description LIKE ?)');
        const searchPattern = `%${filters.searchQuery}%`;
        params.push(searchPattern, searchPattern);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY t.createdAt DESC';

      if (filters?.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
        
        if (filters?.offset) {
          sql += ' OFFSET ?';
          params.push(filters.offset);
        }
      }

      const stmt = database.prepare(sql);
      const rows = stmt.all(params) as any[];

      const tasks: Task[] = rows.map(row => ({
        taskID: row.taskID,
        title: row.title,
        description: row.description,
        state: row.state as TaskState,
        audioSource: row.audioSource as AudioSource,
        audioLoc: row.audioLoc,
        transcriptionLoc: row.transcriptionLoc,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }));

      this.logger.log(LogLevel.DEBUG, LogCategory.TASK, '获取任务列表成功', { 
        count: tasks.length, 
        filters 
      });

      return tasks;
    } catch (error) {
      this.logger.error(LogCategory.TASK, '获取任务列表失败', error as Error, { filters });
      throw new DatabaseError('获取任务列表失败', { filters, error });
    }
  }

  /**
   * 获取单个任务详情
   */
  async getTask(taskId: string): Promise<Task | null> {
    try {
      const database = this.db.getDatabase();
      const sql = `
        SELECT t.*, 
               af.fileName as audioFileName,
               af.filePath as audioFilePath,
               af.fileSize as audioFileSize,
               af.duration as audioDuration,
               af.format as audioFormat,
               af.sampleRate as audioSampleRate,
               af.channels as audioChannels,
               af.bitRate as audioBitRate,
               tr.format as transcriptionFormat,
               tr.model as transcriptionModel,
               tr.language as transcriptionLanguage,
               tr.confidence as transcriptionConfidence,
               tr.processingTime as transcriptionProcessingTime,
               tr.wordCount as transcriptionWordCount,
               tr.apiResponse as transcriptionApiResponse
        FROM task t
        LEFT JOIN audio_file af ON t.taskID = af.taskID
        LEFT JOIN transcription_result tr ON t.taskID = tr.taskID
        WHERE t.taskID = ?
      `;

      const stmt = database.prepare(sql);
      const row = stmt.get(taskId) as any;

      if (!row) {
        return null;
      }

      const task: Task = {
        taskID: row.taskID,
        title: row.title,
        description: row.description,
        state: row.state as TaskState,
        audioSource: row.audioSource as AudioSource,
        audioLoc: row.audioLoc,
        transcriptionLoc: row.transcriptionLoc,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      };

      this.logger.log(LogLevel.DEBUG, LogCategory.TASK, '获取任务详情成功', { taskId });

      return task;
    } catch (error) {
      this.logger.error(LogCategory.TASK, '获取任务详情失败', error as Error, { taskId });
      throw new DatabaseError('获取任务详情失败', { taskId, error });
    }
  }

  /**
   * 更新任务信息
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    try {
      // 验证任务是否存在
      const existingTask = await this.getTask(taskId);
      if (!existingTask) {
        throw new Error(`任务不存在: ${taskId}`);
      }

      // 检查字段更新权限（防止修改只读字段）
      const allowedUpdates = ['title', 'description', 'metadata'];
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key)) {
          updateFields.push(`${key} = ?`);
          if (key === 'metadata') {
            updateValues.push(JSON.stringify(value));
          } else {
            updateValues.push(value);
          }
        }
      }

      if (updateFields.length === 0) {
        return; // 没有可更新的字段
      }

      updateFields.push('updatedAt = ?');
      updateValues.push(new Date().toISOString());
      updateValues.push(taskId);

      const database = this.db.getDatabase();
      const sql = `UPDATE task SET ${updateFields.join(', ')} WHERE taskID = ?`;
      
      const stmt = database.prepare(sql);
      stmt.run(...updateValues);

      // 触发任务更新事件
      this.eventEmitter.emit('taskUpdated', { taskId, updates });

      this.logger.log(LogLevel.INFO, LogCategory.TASK, '任务更新成功', { 
        taskId, 
        updates: Object.keys(updates) 
      });
    } catch (error) {
      this.logger.error(LogCategory.TASK, '更新任务失败', error as Error, { taskId, updates });
      throw error;
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      // 验证任务状态（防止删除进行中的任务）
      const task = await this.getTask(taskId);
      if (!task) {
        throw new Error(`任务不存在: ${taskId}`);
      }

      if (task.state === TaskState.RECORDING || task.state === TaskState.IN_TRANSCRIB) {
        throw new Error('无法删除进行中的任务');
      }

      const database = this.db.getDatabase();
      
      // 删除关联的音频文件
      const deleteAudioFilesSql = 'DELETE FROM audio_file WHERE taskID = ?';
      const deleteAudioFilesStmt = database.prepare(deleteAudioFilesSql);
      deleteAudioFilesStmt.run(taskId);

      // 删除关联的转录结果
      const deleteTranscriptionSql = 'DELETE FROM transcription_result WHERE taskID = ?';
      const deleteTranscriptionStmt = database.prepare(deleteTranscriptionSql);
      deleteTranscriptionStmt.run(taskId);

      // 删除任务
      const deleteTaskSql = 'DELETE FROM task WHERE taskID = ?';
      const deleteTaskStmt = database.prepare(deleteTaskSql);
      deleteTaskStmt.run(taskId);

      // 触发任务删除事件
      this.eventEmitter.emit('taskDeleted', { taskId });

      this.logger.log(LogLevel.INFO, LogCategory.TASK, '任务删除成功', { taskId });
    } catch (error) {
      this.logger.error(LogCategory.TASK, '删除任务失败', error as Error, { taskId });
      throw error;
    }
  }

  /**
   * 更新任务状态
   */
  async updateTaskState(taskId: string, state: TaskState): Promise<void> {
    try {
      // 验证任务是否存在
      const existingTask = await this.getTask(taskId);
      if (!existingTask) {
        throw new Error(`任务不存在: ${taskId}`);
      }

      // 验证状态转换的合法性
      if (!this.isValidStateTransition(existingTask.state, state)) {
        throw new Error(`无效的状态转换: ${existingTask.state} -> ${state}`);
      }

      const database = this.db.getDatabase();
      const sql = 'UPDATE task SET state = ?, updatedAt = ? WHERE taskID = ?';
      
      const stmt = database.prepare(sql);
      stmt.run(state, new Date().toISOString(), taskId);

      // 触发状态变更事件
      this.eventEmitter.emit('taskStateChanged', { 
        taskId, 
        oldState: existingTask.state, 
        newState: state 
      });

      this.logger.log(LogLevel.INFO, LogCategory.TASK, '任务状态更新成功', { 
        taskId, 
        oldState: existingTask.state, 
        newState: state 
      });
    } catch (error) {
      this.logger.error(LogCategory.TASK, '更新任务状态失败', error as Error, { taskId, state });
      throw error;
    }
  }

  /**
   * 搜索任务
   */
  async searchTasks(query: string): Promise<Task[]> {
    try {
      const database = this.db.getDatabase();
      const sql = `
        SELECT t.*, 
               af.fileName as audioFileName,
               af.filePath as audioFilePath,
               tr.format as transcriptionFormat,
               tr.model as transcriptionModel
        FROM task t
        LEFT JOIN audio_file af ON t.taskID = af.taskID
        LEFT JOIN transcription_result tr ON t.taskID = tr.taskID
        WHERE t.title LIKE ? 
           OR t.description LIKE ? 
           OR af.fileName LIKE ?
           OR tr.model LIKE ?
        ORDER BY t.createdAt DESC
      `;

      const searchPattern = `%${query}%`;
      const stmt = database.prepare(sql);
      const rows = stmt.all(searchPattern, searchPattern, searchPattern, searchPattern) as any[];

      const tasks: Task[] = rows.map(row => ({
        taskID: row.taskID,
        title: row.title,
        description: row.description,
        state: row.state as TaskState,
        audioSource: row.audioSource as AudioSource,
        audioLoc: row.audioLoc,
        transcriptionLoc: row.transcriptionLoc,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }));

      this.logger.log(LogLevel.DEBUG, LogCategory.TASK, '搜索任务成功', { 
        query, 
        count: tasks.length 
      });

      return tasks;
    } catch (error) {
      this.logger.error(LogCategory.TASK, '搜索任务失败', error as Error, { query });
      throw new DatabaseError('搜索任务失败', { query, error });
    }
  }

  /**
   * 验证状态转换的合法性
   */
  private isValidStateTransition(fromState: TaskState, toState: TaskState): boolean {
    const validTransitions: Record<TaskState, TaskState[]> = {
      [TaskState.PENDING]: [TaskState.RECORDING, TaskState.SAVED, TaskState.FAILED],
      [TaskState.RECORDING]: [TaskState.SAVED, TaskState.FAILED],
      [TaskState.SAVED]: [TaskState.IN_TRANSCRIB, TaskState.FAILED],
      [TaskState.IN_TRANSCRIB]: [TaskState.COMPLETED, TaskState.FAILED],
      [TaskState.COMPLETED]: [TaskState.FAILED], // 允许重新处理
      [TaskState.FAILED]: [TaskState.PENDING, TaskState.SAVED] // 允许重试
    };

    return validTransitions[fromState]?.includes(toState) || false;
  }

  /**
   * 生成任务标题
   */
  private generateTaskTitle(audioSource: AudioSource, createdAt: Date): string {
    const dateStr = createdAt.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const sourceStr = audioSource === AudioSource.RECORD ? '录音' : '导入';
    return `${sourceStr}任务 - ${dateStr}`;
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
      this.eventEmitter.removeAllListeners();
      this.logger.log(LogLevel.INFO, LogCategory.TASK, '任务管理器清理完成');
    } catch (error) {
      this.logger.error(LogCategory.TASK, '任务管理器清理失败', error as Error);
    }
  }
} 