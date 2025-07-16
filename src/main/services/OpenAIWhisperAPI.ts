import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';
import { TranscriptionResult, TranscriptionOptions, ApiConfig, LogLevel, LogCategory } from '../../shared/types';
import { LogManager } from './LogManager';

// 转录API接口定义
export interface TranscriptionAPI {
  transcribe(audioFile: string, options: TranscriptionOptions): Promise<TranscriptionResult>;
  getModels(): Promise<string[]>;
  testConnection(): Promise<boolean>;
}

/**
 * OpenAI Whisper API的具体实现
 */
export class OpenAIWhisperAPI implements TranscriptionAPI {
  private client: AxiosInstance;
  private config: ApiConfig;
  private logManager: LogManager;

  constructor(config: ApiConfig) {
    this.config = config;
    this.logManager = new LogManager();
    
    // 初始化HTTP客户端
    this.client = axios.create({
      baseURL: config.apiUrl || 'https://api.openai.com/v1',
      timeout: config.timeout * 1000, // 转换为毫秒
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // 添加请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        this.logManager.log(LogLevel.DEBUG, LogCategory.API, `OpenAI API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          apiType: 'openai',
          method: config.method,
          url: config.url
        });
        return config;
      },
      (error) => {
        this.logManager.error(LogCategory.API, 'OpenAI API Request Error', error instanceof Error ? error : new Error(String(error)));
        return Promise.reject(error);
      }
    );

    // 添加响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        this.logManager.log(LogLevel.DEBUG, LogCategory.API, `OpenAI API Response: ${response.status}`, {
          apiType: 'openai',
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        this.logManager.error(LogCategory.API, 'OpenAI API Response Error', error instanceof Error ? error : new Error(String(error)), {
          apiType: 'openai',
          status: error.response?.status,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * 执行转录操作
   * @param audioFile 音频文件路径
   * @param options 转录选项
   * @returns 转录结果
   */
  async transcribe(audioFile: string, options: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      this.logManager.log(LogLevel.INFO, LogCategory.TRANSCRIPT, '开始OpenAI Whisper转录', {
        audioFile,
        model: options.model || this.config.model,
        language: options.language
      });

      // 验证音频文件存在
      if (!fs.existsSync(audioFile)) {
        throw new Error(`音频文件不存在: ${audioFile}`);
      }

      // 构建multipart/form-data请求
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioFile));
      formData.append('model', options.model || this.config.model);
      
      if (options.language) {
        formData.append('language', options.language);
      }
      
      if (options.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString());
      }
      
      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }

      // 发送请求到OpenAI API
      const response: AxiosResponse = await this.client.post('/audio/transcriptions', formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      // 解析转录结果
      const result: TranscriptionResult = {
        resultID: this.generateResultId(),
        taskID: '', // 由调用方设置
        format: 'TXT',
        model: options.model || this.config.model,
        language: response.data.language,
        confidence: response.data.confidence,
        processingTime: 0, // 需要计算
        wordCount: this.countWords(response.data.text),
        apiResponse: response.data,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.logManager.log(LogLevel.INFO, LogCategory.TRANSCRIPT, 'OpenAI Whisper转录完成', {
        resultId: result.resultID,
        wordCount: result.wordCount,
        language: result.language
      });

      return result;

    } catch (error) {
      this.logManager.error(LogCategory.TRANSCRIPT, 'OpenAI Whisper转录失败', error instanceof Error ? error : new Error(String(error)), {
        audioFile,
        model: options.model || this.config.model
      });
      throw error;
    }
  }

  /**
   * 获取可用模型
   * @returns 模型名称列表
   */
  async getModels(): Promise<string[]> {
    try {
      this.logManager.log(LogLevel.DEBUG, LogCategory.API, '获取OpenAI模型列表');

      const response: AxiosResponse = await this.client.get('/models');
      
      // 过滤Whisper相关模型
      const whisperModels = response.data.data
        .filter((model: any) => model.id.startsWith('whisper-'))
        .map((model: any) => model.id);

      this.logManager.log(LogLevel.INFO, LogCategory.API, `获取到${whisperModels.length}个Whisper模型`, {
        models: whisperModels
      });

      return whisperModels;

    } catch (error) {
      this.logManager.error(LogCategory.API, '获取OpenAI模型列表失败', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 测试API连接
   * @returns 连接是否成功
   */
  async testConnection(): Promise<boolean> {
    try {
      this.logManager.log(LogLevel.DEBUG, LogCategory.API, '测试OpenAI API连接');

      // 发送简单的测试请求
      const response: AxiosResponse = await this.client.get('/models');
      
      const isConnected = response.status === 200;
      
      this.logManager.log(LogLevel.INFO, LogCategory.API, `OpenAI API连接测试${isConnected ? '成功' : '失败'}`, {
        status: response.status
      });

      return isConnected;

    } catch (error) {
      this.logManager.error(LogCategory.API, 'OpenAI API连接测试失败', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * 生成结果ID
   * @returns 唯一的结果ID
   */
  private generateResultId(): string {
    return `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 计算单词数量
   * @param text 文本内容
   * @returns 单词数量
   */
  private countWords(text: string): number {
    if (!text || typeof text !== 'string') {
      return 0;
    }
    
    // 简单的单词计数，按空格分割
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
} 