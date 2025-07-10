# WhisperElectron 技术设计文档

## 概述

本文档详细描述了WhisperElectron项目的技术实现方案，包括架构设计、模块划分、接口定义等具体技术细节。

## 技术架构

### 整体架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   渲染进程      │    │   主进程        │    │   系统服务      │
│   (React)       │◄──►│   (Electron)    │◄──►│   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   用户界面      │    │   业务逻辑      │    │   数据存储      │
│   (TypeScript)  │    │   (TypeScript)  │    │   (SQLite)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 技术栈

- **前端**: React 18+ + TypeScript + Tailwind CSS
- **后端**: Electron + Node.js + TypeScript
- **数据库**: SQLite
- **构建工具**: Vite
- **日志**: Winston

## 核心模块设计

### 1. 配置管理模块

#### 1.1 配置管理器接口

```typescript
interface ConfigManager {
  // 获取指定分类的配置，如果提供key则返回特定配置项
  getConfig(category: string, key?: string): any;
  
  // 设置指定分类和键的配置值
  setConfig(category: string, key: string, value: any): Promise<void>;
  
  // 获取指定类型的API配置
  getApiConfig(apiType: string): Promise<ApiConfig | null>;
  
  // 获取所有快捷键配置
  getShortcuts(): Promise<ShortcutConfig[]>;
  
  // 更新快捷键配置
  updateShortcut(action: string, key: string, isEnabled: boolean): Promise<void>;
  
  // 验证配置有效性
  validateConfig(category: string, config: any): boolean;
}
```

#### 1.2 配置管理器实现

```typescript
class ConfigManagerImpl implements ConfigManager {
  // 初始化配置管理器，加载默认配置
  async initialize(): Promise<void> {
    // 检查数据库连接
    // 创建配置表（如果不存在）
    // 加载默认配置
    // 验证配置完整性
  }
  
  // 获取配置的具体实现
  async getConfig(category: string, key?: string): Promise<any> {
    // 根据category查询app_config表
    // 如果指定了key，返回特定配置项
    // 否则返回该分类下的所有配置
    // 处理配置值的类型转换
  }
  
  // 设置配置的具体实现
  async setConfig(category: string, key: string, value: any): Promise<void> {
    // 验证配置值的有效性
    // 检查是否为系统配置（只读）
    // 更新或插入配置项
    // 触发配置变更事件
    // 记录配置变更日志
  }
  
  // 获取API配置的具体实现
  async getApiConfig(apiType: string): Promise<ApiConfig | null> {
    // 查询api_config表
    // 过滤活跃的API配置
    // 返回匹配的API配置
  }
  
  // 获取快捷键配置的具体实现
  async getShortcuts(): Promise<ShortcutConfig[]> {
    // 查询shortcut_config表
    // 返回所有快捷键配置
    // 按action排序
  }
  
  // 更新快捷键配置的具体实现
  async updateShortcut(action: string, key: string, isEnabled: boolean): Promise<void> {
    // 验证快捷键格式
    // 检查快捷键冲突
    // 更新数据库记录
    // 重新注册系统快捷键
    // 记录操作日志
  }
  
  // 验证配置有效性的具体实现
  validateConfig(category: string, config: any): boolean {
    // 根据category定义验证规则
    // 检查必填字段
    // 验证数据类型和范围
    // 返回验证结果
  }
}
```

### 2. 任务管理模块

#### 2.1 任务管理器接口

```typescript
interface TaskManager {
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
```

#### 2.2 任务管理器实现

```typescript
class TaskManagerImpl implements TaskManager {
  // 创建任务的具体实现
  async createTask(audioSource: AudioSource, metadata?: any): Promise<Task> {
    // 生成唯一任务ID
    // 创建任务记录
    // 设置初始状态为PENDING
    // 保存元数据
    // 记录创建日志
    // 返回创建的任务
  }
  
  // 获取任务列表的具体实现
  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    // 构建查询条件
    // 执行数据库查询
    // 关联音频文件和转录结果
    // 按创建时间倒序排列
    // 返回任务列表
  }
  
  // 获取任务详情的具体实现
  async getTask(taskId: string): Promise<Task | null> {
    // 查询任务基本信息
    // 关联音频文件信息
    // 关联转录结果信息
    // 返回完整任务信息
  }
  
  // 更新任务的具体实现
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    // 验证任务是否存在
    // 检查字段更新权限
    // 更新数据库记录
    // 记录更新日志
    // 触发任务更新事件
  }
  
  // 删除任务的具体实现
  async deleteTask(taskId: string): Promise<void> {
    // 验证任务状态（防止删除进行中的任务）
    // 删除关联的音频文件
    // 删除关联的转录文件
    // 删除数据库记录
    // 记录删除日志
  }
  
  // 更新任务状态的具体实现
  async updateTaskState(taskId: string, state: TaskState): Promise<void> {
    // 验证状态转换的合法性
    // 更新任务状态
    // 记录状态变更日志
    // 触发状态变更事件
    // 通知UI更新
  }
  
  // 搜索任务的具体实现
  async searchTasks(query: string): Promise<Task[]> {
    // 构建搜索条件（标题、描述、标签）
    // 执行模糊查询
    // 返回匹配的任务列表
  }
}
```

### 3. 音频录制模块

#### 3.1 录音管理器接口

```typescript
interface AudioRecorder {
  // 开始录音
  startRecording(options?: RecordingOptions): Promise<void>;
  
  // 停止录音
  stopRecording(): Promise<AudioFile>;
  
  // 暂停录音
  pauseRecording(): Promise<void>;
  
  // 恢复录音
  resumeRecording(): Promise<void>;
  
  // 取消录音
  cancelRecording(): Promise<void>;
  
  // 获取录音状态
  getRecordingState(): RecordingState;
  
  // 获取实时音量
  getVolumeLevel(): number;
  
  // 获取录音时长
  getRecordingDuration(): number;
  
  // 设置录音设备
  setRecordingDevice(deviceId: string): Promise<void>;
  
  // 获取可用录音设备
  getAvailableDevices(): Promise<AudioDevice[]>;
}
```

#### 3.2 录音管理器实现

```typescript
class AudioRecorderImpl implements AudioRecorder {
  // 开始录音的具体实现
  async startRecording(options?: RecordingOptions): Promise<void> {
    // 检查录音权限
    // 初始化音频流
    // 配置录音参数（采样率、声道、格式）
    // 开始音频数据采集
    // 实时处理音频数据
    // 更新录音状态
    // 记录开始录音日志
  }
  
  // 停止录音的具体实现
  async stopRecording(): Promise<AudioFile> {
    // 停止音频流
    // 保存录音文件
    // 生成音频文件元数据
    // 更新录音状态
    // 记录停止录音日志
    // 返回音频文件信息
  }
  
  // 暂停录音的具体实现
  async pauseRecording(): Promise<void> {
    // 暂停音频数据采集
    // 保持音频流连接
    // 更新录音状态
    // 记录暂停日志
  }
  
  // 恢复录音的具体实现
  async resumeRecording(): Promise<void> {
    // 恢复音频数据采集
    // 更新录音状态
    // 记录恢复日志
  }
  
  // 取消录音的具体实现
  async cancelRecording(): Promise<void> {
    // 停止音频流
    // 删除临时文件
    // 重置录音状态
    // 记录取消日志
  }
  
  // 获取录音状态的具体实现
  getRecordingState(): RecordingState {
    // 返回当前录音状态
    // 包含录音时长、音量等信息
  }
  
  // 获取实时音量的具体实现
  getVolumeLevel(): number {
    // 计算当前音频数据的音量
    // 返回0-100的音量值
  }
  
  // 获取录音时长的具体实现
  getRecordingDuration(): number {
    // 计算从开始录音到现在的时长
    // 返回秒数
  }
  
  // 设置录音设备的具体实现
  async setRecordingDevice(deviceId: string): Promise<void> {
    // 验证设备ID有效性
    // 切换录音设备
    // 重新初始化音频流
    // 记录设备切换日志
  }
  
  // 获取可用录音设备的具体实现
  async getAvailableDevices(): Promise<AudioDevice[]> {
    // 枚举系统音频设备
    // 过滤输入设备
    // 返回设备列表
  }
}
```

### 4. 转录处理模块

#### 4.1 转录管理器接口

```typescript
interface TranscriptionManager {
  // 开始转录
  startTranscription(taskId: string, options?: TranscriptionOptions): Promise<void>;
  
  // 停止转录
  stopTranscription(taskId: string): Promise<void>;
  
  // 获取转录状态
  getTranscriptionStatus(taskId: string): TranscriptionStatus;
  
  // 获取转录进度
  getTranscriptionProgress(taskId: string): number;
  
  // 获取转录结果
  getTranscriptionResult(taskId: string): Promise<TranscriptionResult>;
  
  // 导出转录结果
  exportTranscription(taskId: string, format: ExportFormat): Promise<string>;
  
  // 批量转录
  batchTranscribe(taskIds: string[]): Promise<void>;
}
```

#### 4.2 转录管理器实现

```typescript
class TranscriptionManagerImpl implements TranscriptionManager {
  // 开始转录的具体实现
  async startTranscription(taskId: string, options?: TranscriptionOptions): Promise<void> {
    // 验证任务状态
    // 获取音频文件路径
    // 获取API配置
    // 调用Whisper API
    // 处理API响应
    // 保存转录结果
    // 更新任务状态
    // 记录转录日志
  }
  
  // 停止转录的具体实现
  async stopTranscription(taskId: string): Promise<void> {
    // 检查转录状态
    // 取消API请求
    // 更新任务状态
    // 记录停止日志
  }
  
  // 获取转录状态的具体实现
  getTranscriptionStatus(taskId: string): TranscriptionStatus {
    // 查询任务状态
    // 返回转录状态信息
  }
  
  // 获取转录进度的具体实现
  getTranscriptionProgress(taskId: string): number {
    // 计算转录进度百分比
    // 返回0-100的进度值
  }
  
  // 获取转录结果的具体实现
  async getTranscriptionResult(taskId: string): Promise<TranscriptionResult> {
    // 查询转录结果
    // 读取转录文件
    // 返回完整结果
  }
  
  // 导出转录结果的具体实现
  async exportTranscription(taskId: string, format: ExportFormat): Promise<string> {
    // 获取转录结果
    // 转换为指定格式
    // 生成导出文件
    // 返回文件路径
  }
  
  // 批量转录的具体实现
  async batchTranscribe(taskIds: string[]): Promise<void> {
    // 验证任务列表
    // 创建转录队列
    // 逐个处理转录任务
    // 处理错误和重试
    // 记录批量处理日志
  }
}
```

### 5. 文件管理模块

#### 5.1 文件管理器接口

```typescript
interface FileManager {
  // 导入音频文件
  importAudioFiles(filePaths: string[]): Promise<AudioFile[]>;
  
  // 验证音频文件
  validateAudioFile(filePath: string): Promise<boolean>;
  
  // 获取音频文件信息
  getAudioFileInfo(filePath: string): Promise<AudioFileInfo>;
  
  // 复制音频文件
  copyAudioFile(sourcePath: string, taskId: string): Promise<string>;
  
  // 删除音频文件
  deleteAudioFile(filePath: string): Promise<void>;
  
  // 获取存储空间使用情况
  getStorageUsage(): Promise<StorageUsage>;
  
  // 清理临时文件
  cleanupTempFiles(): Promise<void>;
}
```

#### 5.2 文件管理器实现

```typescript
class FileManagerImpl implements FileManager {
  // 导入音频文件的具体实现
  async importAudioFiles(filePaths: string[]): Promise<AudioFile[]> {
    // 验证文件路径
    // 检查文件格式
    // 复制文件到应用目录
    // 生成文件元数据
    // 返回音频文件信息
  }
  
  // 验证音频文件的具体实现
  async validateAudioFile(filePath: string): Promise<boolean> {
    // 检查文件是否存在
    // 验证文件格式
    // 检查文件大小
    // 验证音频完整性
    // 返回验证结果
  }
  
  // 获取音频文件信息的具体实现
  async getAudioFileInfo(filePath: string): Promise<AudioFileInfo> {
    // 读取文件元数据
    // 获取音频时长
    // 获取采样率等信息
    // 返回音频信息
  }
  
  // 复制音频文件的具体实现
  async copyAudioFile(sourcePath: string, taskId: string): Promise<string> {
    // 生成目标路径
    // 复制文件
    // 验证复制结果
    // 返回目标路径
  }
  
  // 删除音频文件的具体实现
  async deleteAudioFile(filePath: string): Promise<void> {
    // 检查文件是否存在
    // 删除文件
    // 记录删除日志
  }
  
  // 获取存储空间使用情况的具体实现
  async getStorageUsage(): Promise<StorageUsage> {
    // 计算应用目录大小
    // 统计各类文件大小
    // 返回使用情况
  }
  
  // 清理临时文件的具体实现
  async cleanupTempFiles(): Promise<void> {
    // 扫描临时目录
    // 删除过期文件
    // 记录清理日志
  }
}
```

### 6. 系统集成模块

#### 6.1 快捷键管理器接口

```typescript
interface ShortcutManager {
  // 注册快捷键
  registerShortcut(action: string, key: string): Promise<void>;
  
  // 注销快捷键
  unregisterShortcut(action: string): Promise<void>;
  
  // 更新快捷键
  updateShortcut(action: string, key: string): Promise<void>;
  
  // 检查快捷键冲突
  checkShortcutConflict(key: string): Promise<boolean>;
  
  // 获取所有快捷键
  getAllShortcuts(): Promise<ShortcutConfig[]>;
  
  // 启用/禁用快捷键
  toggleShortcut(action: string, enabled: boolean): Promise<void>;
}
```

#### 6.2 快捷键管理器实现

```typescript
class ShortcutManagerImpl implements ShortcutManager {
  // 注册快捷键的具体实现
  async registerShortcut(action: string, key: string): Promise<void> {
    // 验证快捷键格式
    // 检查快捷键冲突
    // 注册系统快捷键
    // 保存到数据库
    // 记录注册日志
  }
  
  // 注销快捷键的具体实现
  async unregisterShortcut(action: string): Promise<void> {
    // 注销系统快捷键
    // 更新数据库状态
    // 记录注销日志
  }
  
  // 更新快捷键的具体实现
  async updateShortcut(action: string, key: string): Promise<void> {
    // 注销旧快捷键
    // 注册新快捷键
    // 更新数据库
    // 记录更新日志
  }
  
  // 检查快捷键冲突的具体实现
  async checkShortcutConflict(key: string): Promise<boolean> {
    // 查询现有快捷键
    // 检查是否冲突
    // 返回冲突状态
  }
  
  // 获取所有快捷键的具体实现
  async getAllShortcuts(): Promise<ShortcutConfig[]> {
    // 查询数据库
    // 返回快捷键列表
  }
  
  // 启用/禁用快捷键的具体实现
  async toggleShortcut(action: string, enabled: boolean): Promise<void> {
    // 更新数据库状态
    // 注册或注销系统快捷键
    // 记录状态变更
  }
}
```

#### 6.3 系统托盘管理器接口

```typescript
interface TrayManager {
  // 初始化系统托盘
  initialize(): Promise<void>;
  
  // 更新托盘图标
  updateIcon(iconPath: string): Promise<void>;
  
  // 更新托盘菜单
  updateMenu(menuItems: MenuItem[]): Promise<void>;
  
  // 显示托盘通知
  showNotification(title: string, message: string): Promise<void>;
  
  // 设置托盘工具提示
  setTooltip(tooltip: string): Promise<void>;
  
  // 销毁系统托盘
  destroy(): Promise<void>;
}
```

#### 6.4 系统托盘管理器实现

```typescript
class TrayManagerImpl implements TrayManager {
  // 初始化系统托盘的具体实现
  async initialize(): Promise<void> {
    // 创建托盘图标
    // 设置默认菜单
    // 绑定事件处理
    // 记录初始化日志
  }
  
  // 更新托盘图标的具体实现
  async updateIcon(iconPath: string): Promise<void> {
    // 验证图标文件
    // 更新托盘图标
    // 记录更新日志
  }
  
  // 更新托盘菜单的具体实现
  async updateMenu(menuItems: MenuItem[]): Promise<void> {
    // 构建菜单结构
    // 更新托盘菜单
    // 绑定菜单事件
  }
  
  // 显示托盘通知的具体实现
  async showNotification(title: string, message: string): Promise<void> {
    // 检查系统通知权限
    // 显示系统通知
    // 记录通知日志
  }
  
  // 设置托盘工具提示的具体实现
  async setTooltip(tooltip: string): Promise<void> {
    // 更新托盘工具提示
  }
  
  // 销毁系统托盘的具体实现
  async destroy(): Promise<void> {
    // 清理事件监听
    // 销毁托盘对象
    // 记录销毁日志
  }
}
```

## 数据库设计

### 数据库初始化

```typescript
class DatabaseManager {
  // 初始化数据库
  async initialize(): Promise<void> {
    // 创建数据库连接
    // 执行建表脚本
    // 创建索引
    // 插入默认数据
    // 验证数据库完整性
  }
  
  // 执行建表脚本
  async createTables(): Promise<void> {
    // 创建task表
    // 创建audio_file表
    // 创建transcription_result表
    // 创建transcription_file表
    // 创建app_config表
    // 创建api_config表
    // 创建shortcut_config表
  }
  
  // 创建索引
  async createIndexes(): Promise<void> {
    // 为task表创建索引
    // 为audio_file表创建索引
    // 为transcription_result表创建索引
    // 为配置表创建索引
  }
  
  // 插入默认数据
  async insertDefaultData(): Promise<void> {
    // 插入默认配置
    // 插入默认快捷键
    // 插入默认API配置
  }
}
```

### 数据库迁移

```typescript
class DatabaseMigration {
  // 执行数据库迁移
  async migrate(): Promise<void> {
    // 检查当前版本
    // 执行迁移脚本
    // 更新版本号
    // 记录迁移日志
  }
  
  // 备份数据库
  async backup(): Promise<string> {
    // 创建备份文件
    // 复制数据库文件
    // 返回备份路径
  }
  
  // 恢复数据库
  async restore(backupPath: string): Promise<void> {
    // 验证备份文件
    // 停止数据库连接
    // 恢复数据库文件
    // 重新连接数据库
  }
}
```

## 日志系统

### 日志管理器

```typescript
class LogManager {
  // 初始化日志系统
  async initialize(): Promise<void> {
    // 配置日志格式
    // 设置日志级别
    // 创建日志目录
    // 配置日志轮转
  }
  
  // 记录系统日志
  log(level: LogLevel, category: LogCategory, message: string, metadata?: any): void {
    // 格式化日志消息
    // 添加时间戳
    // 写入日志文件
    // 控制台输出（开发环境）
  }
  
  // 记录错误日志
  error(category: LogCategory, message: string, error?: Error, metadata?: any): void {
    // 记录错误信息
    // 记录错误堆栈
    // 记录相关元数据
  }
  
  // 清理过期日志
  async cleanupOldLogs(): Promise<void> {
    // 扫描日志目录
    // 删除过期日志文件
    // 压缩归档日志
  }
}
```

## 错误处理

### 错误处理策略

```typescript
class ErrorHandler {
  // 处理应用错误
  handleError(error: Error, context?: string): void {
    // 记录错误日志
    // 显示用户友好的错误信息
    // 执行错误恢复操作
    // 发送错误报告（可选）
  }
  
  // 处理API错误
  handleApiError(error: any, apiType: string): void {
    // 解析API错误信息
    // 执行重试逻辑
    // 降级处理
    // 通知用户
  }
  
  // 处理文件操作错误
  handleFileError(error: Error, operation: string, filePath: string): void {
    // 检查文件权限
    // 检查磁盘空间
    // 提供解决方案
    // 记录错误详情
  }
}
```

## 性能优化

### 性能监控

```typescript
class PerformanceMonitor {
  // 监控内存使用
  monitorMemoryUsage(): void {
    // 定期检查内存使用
    // 记录内存使用趋势
    // 触发内存清理
  }
  
  // 监控CPU使用
  monitorCpuUsage(): void {
    // 监控CPU使用率
    // 优化高CPU操作
    // 记录性能数据
  }
  
  // 监控响应时间
  monitorResponseTime(operation: string): void {
    // 记录操作开始时间
    // 记录操作结束时间
    // 计算响应时间
    // 记录性能指标
  }
}
```

## 安全考虑

### 安全措施

```typescript
class SecurityManager {
  // 验证API密钥
  validateApiKey(apiKey: string): boolean {
    // 检查API密钥格式
    // 验证密钥有效性
    // 返回验证结果
  }
  
  // 加密敏感数据
  encryptSensitiveData(data: string): string {
    // 使用加密算法
    // 加密敏感数据
    // 返回加密结果
  }
  
  // 解密敏感数据
  decryptSensitiveData(encryptedData: string): string {
    // 使用解密算法
    // 解密数据
    // 返回解密结果
  }
  
  // 清理敏感信息
  sanitizeLogData(data: any): any {
    // 移除敏感字段
    // 脱敏处理
    // 返回清理后的数据
  }
}
```

## 测试策略

### 单元测试

```typescript
// 配置管理器测试
describe('ConfigManager', () => {
  // 测试配置获取
  test('should get config correctly', async () => {
    // 准备测试数据
    // 执行测试
    // 验证结果
  });
  
  // 测试配置设置
  test('should set config correctly', async () => {
    // 准备测试数据
    // 执行测试
    // 验证结果
  });
});

// 任务管理器测试
describe('TaskManager', () => {
  // 测试任务创建
  test('should create task correctly', async () => {
    // 准备测试数据
    // 执行测试
    // 验证结果
  });
  
  // 测试任务状态更新
  test('should update task state correctly', async () => {
    // 准备测试数据
    // 执行测试
    // 验证结果
  });
});
```

### 集成测试

```typescript
// 录音到转录流程测试
describe('Recording to Transcription Flow', () => {
  test('should complete full workflow', async () => {
    // 开始录音
    // 停止录音
    // 创建任务
    // 开始转录
    // 验证结果
  });
});
```

### 端到端测试

```typescript
// 用户界面测试
describe('User Interface', () => {
  test('should handle user interactions', async () => {
    // 模拟用户操作
    // 验证界面响应
    // 验证数据更新
  });
});
```

## 部署和发布

### 构建配置

```typescript
// 开发环境构建
const devBuild = {
  // 启用热重载
  // 启用调试模式
  // 配置开发服务器
  // 设置环境变量
};

// 生产环境构建
const prodBuild = {
  // 代码压缩
  // 资源优化
  // 安全配置
  // 性能优化
};
```

### 打包配置

```typescript
// Electron打包配置
const electronBuilder = {
  // 应用信息
  // 图标设置
  // 权限配置
  // 自动更新
  // 代码签名
};
```

## 总结

本文档详细描述了WhisperElectron项目的技术实现方案，包括：

1. **模块化设计**: 清晰的模块划分和接口定义
2. **可扩展性**: 易于添加新功能和修改现有功能
3. **可维护性**: 良好的代码结构和错误处理
4. **性能优化**: 内存和CPU使用监控
5. **安全考虑**: 敏感数据保护和验证
6. **测试策略**: 完整的测试覆盖

通过这种设计，可以确保项目的稳定性、可维护性和可扩展性。
