// 任务管理相关类型
export enum TaskState {
  PENDING = 'PENDING',
  RECORDING = 'RECORDING',
  SAVED = 'SAVED',
  IN_TRANSCRIB = 'IN_TRANSCRIB',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum AudioSource {
  RECORD = 'RECORD',
  IMPORT = 'IMPORT'
}

export interface Task {
  taskID: string;
  title: string;
  description?: string;
  state: TaskState;
  audioSource: AudioSource;
  audioLoc?: string;
  transcriptionLoc?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: any;
}

export interface TaskFilters {
  state?: TaskState;
  audioSource?: AudioSource;
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

// 音频文件相关类型
export interface AudioFile {
  fileID: string;
  taskID: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  duration?: number;
  format: string;
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AudioFileInfo {
  duration: number;
  format: string;
  sampleRate: number;
  channels: number;
  bitRate: number;
  fileSize: number;
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  groupId: string;
  kind: string;
}

export interface StorageUsage {
  totalSize: number;
  audioFilesSize: number;
  transcriptionFilesSize: number;
  tempFilesSize: number;
  availableSpace: number;
}

// 转录相关类型
export interface TranscriptionResult {
  resultID: string;
  taskID: string;
  format: string;
  model: string;
  language?: string;
  confidence?: number;
  processingTime?: number;
  wordCount?: number;
  apiResponse?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranscriptionSegment {
  id: string;
  transcriptionId: string;
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export enum ExportFormat {
  TXT = 'TXT',
  JSON = 'JSON',
  SRT = 'SRT',
  VTT = 'VTT'
}

// 配置管理相关类型
export interface ApiConfig {
  configID: string;
  apiType: string;
  apiUrl: string;
  apiKey?: string;
  model: string;
  timeout: number;
  maxRetries: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShortcutConfig {
  shortcutID: string;
  action: string;
  key: string;
  isEnabled: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppConfig {
  configID: string;
  configKey: string;
  configValue: string;
  category: string;
  description?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 录音相关类型
export interface RecordingOptions {
  deviceId?: string;
  format?: string;
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  volumeLevel: number;
  deviceId: string;
  startTime: Date;
}

export interface TranscriptionOptions {
  model?: string;
  language?: string;
  format?: ExportFormat;
  temperature?: number;
  prompt?: string;
}

export interface TranscriptionStatus {
  taskId: string;
  status: string;
  progress: number;
  error?: string;
  startTime: Date;
  endTime?: Date;
}

// 日志相关类型
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export enum LogCategory {
  SYSTEM = 'SYSTEM',
  AUDIO = 'AUDIO',
  TRANSCRIPT = 'TRANSCRIPT',
  TASK = 'TASK',
  UI = 'UI',
  API = 'API'
}

// 错误类型
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public category: string,
    public metadata?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, metadata?: any) {
    super(message, 'DATABASE_ERROR', 'DATABASE', metadata);
    this.name = 'DatabaseError';
  }
}

export class FileError extends AppError {
  constructor(message: string, metadata?: any) {
    super(message, 'FILE_ERROR', 'FILE', metadata);
    this.name = 'FileError';
  }
}

export class ApiError extends AppError {
  constructor(message: string, metadata?: any) {
    super(message, 'API_ERROR', 'API', metadata);
    this.name = 'ApiError';
  }
}

// 通用类型
export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface EventData {
  type: string;
  data: any;
  timestamp: Date;
} 