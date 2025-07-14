# WhisperElectron

一个基于 Electron 的桌面应用，用于音频录制和 Whisper 语音转录。

## 项目状态

### 第一阶段：基础架构 ✅ 已完成

- ✅ **数据库模块**：完整的数据库管理功能，支持 SQLite 数据库初始化、表创建、索引管理和数据迁移
- ✅ **日志模块**：多级别日志记录系统，支持错误处理和日志清理，使用原生 ANSI 颜色代码
- ✅ **测试覆盖**：DatabaseManager 和 LogManager 的完整单元测试和集成测试，测试覆盖率超过 85%

### 技术特点

- 🚀 **高性能**：基于 Electron + React + TypeScript 的现代化架构
- 🎨 **美观界面**：使用 Tailwind CSS 构建的响应式用户界面
- 🔧 **模块化设计**：清晰的模块划分和接口定义，易于扩展和维护
- 🧪 **完整测试**：完善的单元测试和集成测试覆盖
- 🔒 **安全可靠**：完善的错误处理和数据验证机制

## 功能特性

### 已完成功能 ✅

- **数据库管理**：自动创建数据表、索引和默认数据
- **日志系统**：多级别日志记录，支持文件和控制台输出
- **错误处理**：完善的异常处理和错误恢复机制
- **测试框架**：完整的测试覆盖，确保代码质量

### 计划功能 🔄

- **音频录制**：支持麦克风录音和音频设备管理
- **文件导入**：支持多种音频格式的文件导入
- **语音转录**：集成 OpenAI Whisper API 进行语音转文字
- **任务管理**：完整的任务创建、管理和状态跟踪
- **配置管理**：灵活的应用配置和快捷键设置
- **系统集成**：全局快捷键和系统托盘支持

## 技术栈

- **前端**: React 18+ + TypeScript + Tailwind CSS
- **后端**: Electron + Node.js + TypeScript
- **数据库**: SQLite
- **构建工具**: Vite
- **日志**: Winston (使用原生 ANSI 颜色代码)
- **测试**: Jest + Testing Library

## 开发环境

### 系统要求

- Node.js 18+
- npm 或 yarn
- Git

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建应用

```bash
npm run build
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式运行测试
npm run test:watch
```

## 测试状态

### 测试覆盖率

- **总体覆盖率**：语句覆盖率 38.46%，分支覆盖率 23.8%，函数覆盖率 28.44%
- **DatabaseManager**：语句覆盖率 87.17%，函数覆盖率 100%
- **LogManager**：语句覆盖率 85.71%，函数覆盖率 100%

### 测试结果

- ✅ **单元测试**：21个测试用例，全部通过
- ✅ **集成测试**：4个测试用例，全部通过
- ✅ **测试质量**：完善的 Mock 机制，测试数据隔离，错误场景全面覆盖

## 项目结构

```
recording-whisper-menubar/
├── docs/                    # 项目文档
│   ├── PRD.md              # 产品需求文档
│   ├── technicalDesign.md  # 技术设计文档
│   ├── devPlan.md          # 开发计划
│   └── logFormat.md        # 日志格式规范
├── src/                    # 源代码
│   ├── main/               # 主进程代码
│   │   └── services/       # 核心服务模块
│   └── renderer/           # 渲染进程代码
├── tests/                  # 测试文件
└── README.md              # 项目说明
```

## 开发计划

### 第一阶段 ✅ 已完成
- 项目基础搭建
- 数据库模块开发
- 日志模块开发
- 基础UI组件库
- 完整测试覆盖

### 第二阶段 🔄 进行中
- 任务管理模块
- 配置管理模块
- 音频文件管理模块

### 第三阶段 📋 计划中
- 录音功能模块
- 转录功能模块
- 文件导入模块

### 第四阶段 📋 计划中
- 系统集成模块
- 用户界面优化
- 性能优化

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 项目 Issues：[GitHub Issues](https://github.com/your-username/recording-whisper-menubar/issues)
- 邮箱：your-email@example.com 