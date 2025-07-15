# 日志格式规范

## 概述

本文档定义了 WhisperElectron 项目的日志格式规范，包括日志级别、分类、格式和颜色规范。

## 日志级别

### 级别定义

```typescript
enum LogLevel {
  ERROR = 'error',   // 错误级别 - 红色
  WARN = 'warn',     // 警告级别 - 黄色
  INFO = 'info',     // 信息级别 - 蓝色
  DEBUG = 'debug'    // 调试级别 - 灰色
}
```

### 级别说明

- **ERROR**: 系统错误，需要立即关注和处理
- **WARN**: 警告信息，可能影响功能但不会导致系统崩溃
- **INFO**: 一般信息，记录重要的业务操作
- **DEBUG**: 调试信息，仅在开发环境显示

## 日志分类

### 分类定义

```typescript
enum LogCategory {
  SYSTEM = 'system',           // 系统相关
  RECORDING = 'recording',     // 录音相关
  TRANSCRIPTION = 'transcription', // 转录相关
  FILE = 'file',              // 文件操作
  CONFIG = 'config',          // 配置相关
  SHORTCUT = 'shortcut',      // 快捷键相关
  TRAY = 'tray'              // 系统托盘相关
}
```

## 日志格式

### 标准格式

```
[时间戳] [级别] [分类] 消息内容 [元数据]
```

### 示例

```
[2024-01-15 10:30:45.123] [INFO] [SYSTEM] 应用启动成功
[2024-01-15 10:30:46.456] [ERROR] [DATABASE] 数据库连接失败: connection timeout
[2024-01-15 10:30:47.789] [WARN] [CONFIG] 配置文件不存在，使用默认配置
[2024-01-15 10:30:48.012] [DEBUG] [RECORDING] 开始录音，设备ID: default
```

## 颜色规范

### 控制台输出颜色

使用原生 ANSI 颜色代码，避免第三方依赖：

```typescript
// 颜色代码定义
const COLORS = {
  red: '\x1b[31m',      // 错误 - 红色
  green: '\x1b[32m',    // 成功 - 绿色
  yellow: '\x1b[33m',   // 警告 - 黄色
  blue: '\x1b[34m',     // 信息 - 蓝色
  magenta: '\x1b[35m',  // 特殊 - 洋红色
  cyan: '\x1b[36m',     // 调试 - 青色
  white: '\x1b[37m',    // 默认 - 白色
  gray: '\x1b[90m',     // 次要 - 灰色
  reset: '\x1b[0m'      // 重置颜色
};

// 级别颜色映射
const LEVEL_COLORS = {
  error: COLORS.red,
  warn: COLORS.yellow,
  info: COLORS.blue,
  debug: COLORS.gray
};
```

### 颜色化函数

```typescript
const colorize = (color: string, text: string): string => {
  const colorCode = COLORS[color] || COLORS.white;
  return `${colorCode}${text}${COLORS.reset}`;
};
```

## 日志记录规范

### 基本记录

```typescript
// 信息日志
logManager.log('info', 'system', '应用启动成功');

// 错误日志
logManager.error('database', '数据库连接失败', error, { 
  retryCount: 3,
  timeout: 5000 
});

// 警告日志
logManager.log('warn', 'config', '配置文件不存在，使用默认配置');

// 调试日志
logManager.log('debug', 'recording', '开始录音', { 
  deviceId: 'default',
  sampleRate: 44100 
});
```

### 元数据规范

元数据应该是可序列化的对象，包含相关的上下文信息：

```typescript
// 好的元数据示例
{
  userId: 'user123',
  taskId: 'task456',
  duration: 5000,
  fileSize: 1024000,
    retryCount: 3,
  timestamp: '2024-01-15T10:30:45.123Z'
  }

// 避免的元数据
{
  error: new Error('some error'),  // 错误对象应该单独处理
  function: someFunction,          // 函数对象无法序列化
  element: document.body           // DOM对象无法序列化
}
```

## 文件日志

### 文件格式

日志文件使用 JSON 格式，便于解析和分析：

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "category": "system",
  "message": "应用启动成功",
  "metadata": {
    "version": "1.0.0",
    "platform": "darwin"
  }
}
```

### 文件命名

```
logs/
├── app-2024-01-15.log    // 应用日志
├── error-2024-01-15.log  // 错误日志
└── debug-2024-01-15.log  // 调试日志
```

## 日志轮转

### 轮转策略

- **按大小轮转**: 单个日志文件最大 10MB
- **按时间轮转**: 每天创建新的日志文件
- **保留策略**: 保留最近 30 天的日志文件
- **压缩策略**: 超过 7 天的日志文件自动压缩

### 轮转配置

```typescript
const logRotationConfig = {
  maxSize: '10m',           // 最大文件大小
  maxFiles: '30d',          // 保留天数
  compress: true,           // 启用压缩
  datePattern: 'YYYY-MM-DD' // 日期格式
};
```

## 性能考虑

### 异步日志

日志记录应该是异步操作，避免阻塞主线程：

```typescript
// 异步日志记录
await logManager.log('info', 'system', '操作完成');

// 批量日志记录
await logManager.logBatch([
  { level: 'info', category: 'system', message: '操作1完成' },
  { level: 'info', category: 'system', message: '操作2完成' }
]);
```

### 日志级别控制

在生产环境中，只记录 ERROR 和 WARN 级别的日志：

```typescript
const isProduction = process.env.NODE_ENV === 'production';
const minLevel = isProduction ? 'warn' : 'debug';

logManager.setLogLevel(minLevel);
```

## 测试规范

### 日志测试

```typescript
describe('LogManager', () => {
  test('should log with correct format', () => {
    const logManager = new LogManager();
    const spy = jest.spyOn(console, 'log');
    
    logManager.log('info', 'test', 'test message');
    
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\] \[INFO\] \[TEST\] test message/)
    );
  });
  
  test('should apply correct colors', () => {
    const logManager = new LogManager();
    const spy = jest.spyOn(console, 'log');
    
    logManager.log('error', 'test', 'error message');
    
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('\x1b[31m') // 红色
    );
  });
});
```

## 技术改进

### 移除 chalk 依赖 ✅

- ✅ 使用原生 ANSI 颜色代码，提高兼容性
- ✅ 减少第三方依赖，降低维护成本
- ✅ 避免 chalk 版本兼容性问题
- ✅ 提高跨平台一致性

### 颜色代码优化

```typescript
// 优化的颜色化函数
const colorize = (color: string, text: string): string => {
  const colorMap = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
  };
  
  const colorCode = colorMap[color] || colorMap.white;
  return `${colorCode}${text}\x1b[0m`;
};
```

## 总结

本日志格式规范确保了：

1. **一致性**: 统一的日志格式和颜色规范
2. **可读性**: 清晰的日志结构和颜色区分
3. **可维护性**: 使用原生 ANSI 颜色代码，减少依赖
4. **性能**: 异步日志记录，避免阻塞主线程
5. **可扩展性**: 支持自定义日志分类和元数据
6. **可测试性**: 完善的测试覆盖和验证机制 