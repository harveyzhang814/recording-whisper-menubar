# 日志模块使用指南

## 概述

本文档详细描述了WhisperElectron项目中日志模块的使用规范、格式标准、最佳实践等内容，为开发团队提供统一的日志记录指导。

## 日志系统架构

### 整体设计

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   应用层        │    │   日志管理器    │    │   日志存储      │
│   (业务代码)    │───►│   (LogManager)  │───►│   (文件/控制台)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   日志调用      │    │   格式处理      │    │   日志轮转      │
│   (log.info)    │    │   (格式化器)    │    │   (文件管理)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 技术栈

- **日志库**: Winston
- **格式化**: Winston Format
- **文件轮转**: Winston Daily Rotate File
- **颜色支持**: Chalk (开发环境)

## 日志级别定义

### 级别说明

| 级别    | 数值 | 描述           | 使用场景                    | 示例 |
| ------- | ---- | -------------- | --------------------------- | ---- |
| ERROR   | 0    | 错误           | 系统错误、API调用失败       | 数据库连接失败、API超时 |
| WARN    | 1    | 警告           | 配置问题、性能警告          | 配置项缺失、内存使用过高 |
| INFO    | 2    | 信息           | 正常操作、状态变更          | 应用启动、任务完成 |
| DEBUG   | 3    | 调试           | 详细调试信息                | 函数调用、变量值 |

### 级别选择原则

- **ERROR**: 影响应用正常运行或数据完整性的错误
- **WARN**: 可能影响功能但不会导致系统崩溃的问题
- **INFO**: 重要的业务操作和状态变更
- **DEBUG**: 开发调试时需要的详细信息

## 日志分类系统

### 分类定义

| 分类        | 描述           | 示例场景                    | 使用频率 |
| ----------- | -------------- | --------------------------- | -------- |
| SYSTEM      | 系统级日志     | 应用启动、关闭、配置加载     | 低 |
| AUDIO       | 音频相关       | 录音开始/停止、设备切换      | 中 |
| TRANSCRIPT  | 转录相关       | API调用、转录进度、结果保存  | 高 |
| TASK        | 任务管理       | 任务创建、状态变更、删除     | 高 |
| UI          | 界面交互       | 用户操作、界面状态变更       | 中 |
| API         | API调用        | 网络请求、响应、错误         | 高 |
| CONFIG      | 配置管理       | 配置变更、验证、加载         | 低 |
| FILE        | 文件操作       | 文件读写、删除、移动         | 中 |

### 分类使用原则

- **单一职责**: 每个日志记录只属于一个分类
- **业务导向**: 分类应该反映业务功能模块
- **便于过滤**: 分类应该便于日志分析和问题定位

## 日志格式规范

### 结构化日志格式

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "category": "TASK",
  "message": "任务创建成功",
  "taskId": "uuid-1234-5678",
  "metadata": {
    "audioSource": "RECORD",
    "duration": 120,
    "fileSize": 2048576
  }
}
```

### 字段说明

| 字段        | 类型   | 必填 | 描述           | 示例 |
| ----------- | ------ | ---- | -------------- | ---- |
| timestamp   | string | 是   | ISO 8601时间戳 | "2024-01-15T10:30:45.123Z" |
| level       | string | 是   | 日志级别       | "INFO" |
| category    | string | 是   | 日志分类       | "TASK" |
| message     | string | 是   | 日志消息       | "任务创建成功" |
| taskId      | string | 否   | 关联任务ID     | "uuid-1234-5678" |
| metadata    | object | 否   | 附加元数据     | { "duration": 120 } |

### 控制台输出格式

```
[2024-01-15 18:30:45.123] [INFO] [TASK] 任务创建成功
  ├─ 任务ID: uuid-1234-5678
  ├─ 音频来源: RECORD
  ├─ 时长: 120秒
  └─ 文件大小: 2.0MB
```

## 日志使用示例

### 基础日志记录

```typescript
// 简单信息日志
logger.info('应用启动成功', { 
  category: 'SYSTEM',
  metadata: { version: '1.0.0' }
});

// 错误日志
logger.error('API调用失败', {
  category: 'API',
  taskId: taskId,
  error: error,
  metadata: { 
    apiUrl: 'https://api.openai.com/v1/audio/transcriptions',
    retryCount: 3
  }
});

// 警告日志
logger.warn('配置项缺失', {
  category: 'CONFIG',
  metadata: { 
    missingKey: 'api_key',
    defaultValue: 'default_value'
  }
});

// 调试日志
logger.debug('函数调用', {
  category: 'SYSTEM',
  metadata: {
    function: 'createTask',
    parameters: { audioSource: 'RECORD' }
  }
});
```

### 业务场景日志

#### 录音功能

```typescript
// 开始录音
logger.info('录音开始', {
  category: 'AUDIO',
  metadata: {
    device: '麦克风 (Realtek Audio)',
    format: 'WAV',
    sampleRate: 44100,
    channels: 2
  }
});

// 录音状态更新
logger.debug('录音状态更新', {
  category: 'AUDIO',
  metadata: {
    duration: 45,
    volume: 75,
    fileSize: 1024000
  }
});

// 录音完成
logger.info('录音完成', {
  category: 'AUDIO',
  taskId: taskId,
  metadata: {
    duration: 120,
    fileSize: 2048576,
    filePath: '/path/to/audio.wav'
  }
});
```

#### 转录功能

```typescript
// 开始转录
logger.info('转录开始', {
  category: 'TRANSCRIPT',
  taskId: taskId,
  metadata: {
    model: 'base',
    language: 'zh-CN',
    fileSize: 2048576
  }
});

// API调用
logger.debug('API请求', {
  category: 'API',
  taskId: taskId,
  metadata: {
    url: 'https://api.openai.com/v1/audio/transcriptions',
    method: 'POST',
    requestSize: 2048576
  }
});

// 转录完成
logger.info('转录完成', {
  category: 'TRANSCRIPT',
  taskId: taskId,
  metadata: {
    processingTime: 15.5,
    wordCount: 245,
    confidence: 0.92
  }
});
```

#### 任务管理

```typescript
// 任务创建
logger.info('任务创建', {
  category: 'TASK',
  taskId: taskId,
  metadata: {
    title: '会议记录',
    audioSource: 'RECORD',
    state: 'PENDING'
  }
});

// 任务状态变更
logger.info('任务状态变更', {
  category: 'TASK',
  taskId: taskId,
  metadata: {
    fromState: 'PENDING',
    toState: 'IN_TRANSCRIB',
    timestamp: new Date().toISOString()
  }
});

// 任务完成
logger.info('任务完成', {
  category: 'TASK',
  taskId: taskId,
  metadata: {
    totalTime: 180,
    resultSize: 1024
  }
});
```

## 错误日志规范

### 错误日志格式

```typescript
// 系统错误
logger.error('数据库连接失败', {
  category: 'SYSTEM',
  error: error,
  metadata: {
    database: 'sqlite',
    operation: 'connect',
    retryCount: 3
  }
});

// API错误
logger.error('Whisper API调用失败', {
  category: 'API',
  taskId: taskId,
  error: error,
  metadata: {
    apiUrl: 'https://api.openai.com/v1/audio/transcriptions',
    statusCode: 429,
    retryCount: 3,
    errorCode: 'rate_limit_exceeded'
  }
});

// 文件操作错误
logger.error('文件删除失败', {
  category: 'FILE',
  taskId: taskId,
  error: error,
  metadata: {
    filePath: '/path/to/file.wav',
    operation: 'delete',
    reason: 'file_not_found'
  }
});
```

### 错误信息处理

- **错误堆栈**: 自动包含完整的错误堆栈信息
- **错误上下文**: 提供错误发生的业务上下文
- **错误分类**: 根据错误类型进行分类处理
- **敏感信息**: 自动脱敏处理敏感数据

## 性能日志

### 性能监控日志

```typescript
// 操作耗时
logger.info('操作耗时', {
  category: 'SYSTEM',
  metadata: {
    operation: 'transcription',
    duration: 15.5,
    taskId: taskId
  }
});

// 内存使用
logger.debug('内存使用', {
  category: 'SYSTEM',
  metadata: {
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  }
});

// API响应时间
logger.debug('API响应时间', {
  category: 'API',
  taskId: taskId,
  metadata: {
    apiUrl: 'https://api.openai.com/v1/audio/transcriptions',
    responseTime: 1250,
    requestSize: 2048576
  }
});
```

## 日志配置

### 开发环境配置

```typescript
const devConfig = {
  level: 'DEBUG',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // 控制台输出（带颜色）
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // 文件输出
    new winston.transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d'
    })
  ]
};
```

### 生产环境配置

```typescript
const prodConfig = {
  level: 'INFO',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // 错误日志单独文件
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'ERROR',
      maxSize: '20m',
      maxFiles: '30d'
    }),
    // 所有日志
    new winston.transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d'
    })
  ]
};
```

## 日志文件管理

### 文件组织结构

```
logs/
├── app-2024-01-15.log      # 当日应用日志
├── error-2024-01-15.log    # 当日错误日志
├── app-2024-01-14.log      # 昨日应用日志
├── error-2024-01-14.log    # 昨日错误日志
└── archive/                # 归档目录
    ├── app-2024-01-13.log.gz
    ├── error-2024-01-13.log.gz
    └── ...
```

### 日志轮转策略

- **按日期轮转**: 每天创建新的日志文件
- **文件大小限制**: 单文件最大20MB
- **保留策略**: 
  - 应用日志保留7天
  - 错误日志保留30天
  - 归档日志压缩后保留90天

### 日志清理

```typescript
// 自动清理过期日志
async function cleanupOldLogs() {
  // 删除超过7天的应用日志
  // 删除超过30天的错误日志
  // 压缩归档日志
  // 删除超过90天的归档日志
}
```

## 安全考虑

### 敏感信息处理

```typescript
// API密钥脱敏
logger.info('API配置更新', {
  category: 'CONFIG',
  metadata: {
    apiType: 'whisper',
    apiUrl: 'https://api.openai.com/v1/audio/transcriptions',
    apiKey: 'sk-***' // 自动脱敏
  }
});

// 文件路径处理
logger.info('文件操作', {
  category: 'FILE',
  metadata: {
    operation: 'copy',
    sourcePath: '***/audio.wav', // 相对路径
    targetPath: '***/audio.wav'  // 相对路径
  }
});

// 用户信息保护
logger.info('用户操作', {
  category: 'UI',
  metadata: {
    action: 'button_click',
    component: 'record_button',
    userId: '***' // 不记录具体用户信息
  }
});
```

### 数据脱敏规则

- **API密钥**: 只显示前3个字符，其余用*替代
- **文件路径**: 使用相对路径，不记录完整绝对路径
- **用户信息**: 只记录操作类型，不记录具体用户数据
- **错误详情**: 过滤敏感信息后再记录

## 日志分析

### 日志查询示例

```bash
# 查看所有错误日志
grep '"level":"ERROR"' logs/app-*.log

# 查看特定任务的日志
grep '"taskId":"uuid-1234-5678"' logs/app-*.log

# 查看API调用日志
grep '"category":"API"' logs/app-*.log

# 查看性能日志
grep '"operation":"transcription"' logs/app-*.log | grep '"duration"'
```

### 日志分析工具

- **ELK Stack**: Elasticsearch + Logstash + Kibana
- **Logtail**: 云日志分析服务
- **自定义脚本**: 基于grep、awk等工具的分析脚本

## 最佳实践

### 日志记录原则

1. **及时记录**: 在关键操作点及时记录日志
2. **信息完整**: 包含足够的上下文信息
3. **级别适当**: 选择合适的日志级别
4. **分类准确**: 使用正确的日志分类
5. **格式统一**: 遵循统一的日志格式

### 常见错误

```typescript
// ❌ 错误示例：日志信息不完整
logger.info('操作失败');

// ✅ 正确示例：包含完整上下文
logger.error('文件上传失败', {
  category: 'FILE',
  taskId: taskId,
  error: error,
  metadata: {
    filePath: '/path/to/file.wav',
    fileSize: 2048576,
    retryCount: 3
  }
});

// ❌ 错误示例：敏感信息泄露
logger.info('用户登录', {
  metadata: {
    username: 'admin',
    password: '123456'
  }
});

// ✅ 正确示例：脱敏处理
logger.info('用户登录', {
  category: 'UI',
  metadata: {
    username: '***',
    loginTime: new Date().toISOString()
  }
});
```

### 性能考虑

1. **异步记录**: 日志记录应该是异步操作
2. **批量写入**: 批量写入日志文件
3. **内存管理**: 避免日志数据占用过多内存
4. **磁盘空间**: 定期清理过期日志文件

## 故障排查

### 常见问题

1. **日志文件过大**: 检查日志轮转配置
2. **日志丢失**: 检查文件权限和磁盘空间
3. **性能问题**: 检查日志级别和记录频率
4. **格式错误**: 检查日志格式配置

### 调试技巧

1. **临时提高日志级别**: 在开发环境使用DEBUG级别
2. **添加调试日志**: 在关键路径添加调试信息
3. **日志过滤**: 使用grep等工具过滤特定日志
4. **日志分析**: 使用日志分析工具进行问题定位

## 总结

本文档提供了WhisperElectron项目日志模块的完整使用指南，包括：

1. **格式规范**: 统一的日志格式和字段定义
2. **使用示例**: 各种业务场景的日志记录示例
3. **最佳实践**: 日志记录的最佳实践和常见错误
4. **安全考虑**: 敏感信息处理和脱敏规则
5. **故障排查**: 常见问题和调试技巧

通过遵循本指南，可以确保项目日志的一致性和可维护性，为问题定位和系统监控提供有力支持。 