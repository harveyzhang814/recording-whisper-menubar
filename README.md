# WhisperElectron

智能语音转录桌面应用 - 基于React+Electron的跨平台语音处理解决方案

## 📖 项目简介

WhisperElectron是一款基于React+Electron的跨平台桌面应用，提供高效、便捷的音频录制和语音转录服务。产品集成了OpenAI Whisper API和其他API，支持实时录音、文件导入、自动转录等功能，为用户提供完整的语音处理解决方案。

## ✨ 核心功能

- **🎤 高效录制**: 支持全局快捷键，随时随地开始录音
- **🤖 智能转录**: 基于Whisper API的高质量语音转文本
- **📁 统一管理**: 集中管理所有录音和转录任务
- **🔒 本地存储**: 数据完全本地化，保护用户隐私
- **🖥️ 跨平台**: 支持Windows、macOS平台

## 🎯 目标用户

- **内容创作者**: 需要快速记录灵感和想法的创作者
- **商务人士**: 需要会议记录和语音备忘的专业人士
- **学生群体**: 需要课程记录和学习笔记的学生
- **开发者**: 需要语音转录功能的技术人员

## 🛠️ 技术栈

### 前端
- **框架**: React 18+
- **语言**: TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **状态管理**: React Hooks

### 后端
- **平台**: Electron
- **语言**: TypeScript
- **数据库**: SQLite
- **IPC通信**: Electron IPC
- **文件处理**: Node.js fs

### 外部服务
- **语音转录**: Whisper API (或其他自定义API)

## 📋 功能特性

### 音频录制
- 全局快捷键录音
- 高质量录制（WAV、MP3格式）
- 实时状态显示
- 设备选择支持

### 文件导入
- 多格式支持（MP3、WAV、M4A、FLAC等）
- 批量导入功能
- 文件验证和预览

### 语音转录
- 自动转录
- 手动转录
- 批量转录
- 多格式输出（TXT、JSON、SRT、VTT）

### 任务管理
- 任务状态跟踪
- 任务搜索和筛选
- 任务编辑和删除
- 结果导出

### 系统集成
- 系统托盘支持
- 全局快捷键
- 主题切换
- 多语言支持

## 🚀 开发指南

### 环境要求

- Node.js 18+
- npm 或 yarn
- Git

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd stt-on-whisper

# 安装依赖
npm install
# 或
yarn install
```

### 开发模式

```bash
# 启动开发服务器
npm run dev
# 或
yarn dev
```

### 构建应用

```bash
# 构建生产版本
npm run build
# 或
yarn build

# 打包应用
npm run package
# 或
yarn package
```

## 📁 项目结构

```
stt-on-whisper/
├── docs/                    # 项目文档
│   ├── PRD.md              # 产品需求文档
│   ├── technicalDesign.md  # 技术设计文档
│   └── logFormat.md        # 日志格式规范
├── src/                    # 源代码
│   ├── main/              # Electron主进程
│   ├── renderer/          # React渲染进程
│   ├── shared/            # 共享代码
│   └── types/             # TypeScript类型定义
├── public/                # 静态资源
├── dist/                  # 构建输出
├── logs/                  # 日志文件
└── package.json           # 项目配置
```

## 📝 开发规范

### 代码规范
- 使用TypeScript进行类型检查
- 遵循ESLint规则
- 使用Prettier进行代码格式化
- 提交前运行代码检查

### 提交规范
- 使用语义化提交信息
- 每个提交只包含一个功能或修复
- 提交前进行代码审查

### 测试规范
- 编写单元测试
- 进行集成测试
- 保持高测试覆盖率

## 🔧 配置说明

### API配置
- 支持Whisper官方API
- 支持私有部署的定制化API
- 可配置模型、语言、输出格式等参数

### 音频配置
- 支持多种音频格式
- 可配置采样率、声道数等参数
- 支持设备选择和测试

### 快捷键配置
- 支持自定义全局快捷键
- 自动检测快捷键冲突
- 支持快捷键禁用

## 📊 性能要求

- **界面响应**: < 100ms
- **录音启动**: < 500ms
- **内存使用**: < 300MB（空闲时）
- **CPU使用**: < 20%（录音时）

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

- 项目维护者: [Your Name]
- 邮箱: [your.email@example.com]
- 项目地址: [GitHub Repository URL]

## 🙏 致谢

- [OpenAI Whisper](https://github.com/openai/whisper) - 语音转录API
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [React](https://reactjs.org/) - 用户界面库
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架 