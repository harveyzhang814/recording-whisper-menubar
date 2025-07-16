import { TranscriptionResult, TranscriptionOptions, ApiConfig } from '../../shared/types';
import { OpenAIWhisperAPI } from './OpenAIWhisperAPI';
import { CustomWhisperAPI } from './CustomWhisperAPI';

/**
 * 转录API抽象接口，支持不同API提供商的统一调用
 */
export interface TranscriptionAPI {
  /**
   * 执行音频转录
   * @param audioFile 音频文件路径
   * @param options 转录选项
   * @returns 转录结果
   */
  transcribe(audioFile: string, options: TranscriptionOptions): Promise<TranscriptionResult>;
  
  /**
   * 获取支持的模型列表
   * @returns 模型名称列表
   */
  getModels(): Promise<string[]>;
  
  /**
   * 测试API连接
   * @returns 连接是否成功
   */
  testConnection(): Promise<boolean>;
}

/**
 * 转录API工厂类
 */
export class TranscriptionAPIFactory {
  /**
   * 根据配置创建对应的API客户端
   * @param config API配置
   * @returns 转录API实例
   */
  static createAPI(config: ApiConfig): TranscriptionAPI {
    switch (config.apiType.toLowerCase()) {
      case 'openai':
        return new OpenAIWhisperAPI(config);
      case 'custom':
        return new CustomWhisperAPI(config);
      default:
        throw new Error(`Unsupported API type: ${config.apiType}`);
    }
  }
} 