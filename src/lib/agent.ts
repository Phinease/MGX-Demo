import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';

// 导入工具和提示词
import { tools } from './tools';
import { SYSTEM_PROMPTS } from './prompts';

// 配置 OpenAI 兼容模型（通义千问）
const model = new ChatOpenAI({
  model: 'qwen-plus',
  temperature: 0.7,
  apiKey: 'sk-cc75be06983048da82d30fc2e43d2ada',
  configuration: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
});

// 创建前端编码智能体
const agent = createAgent({
  model: model,
  tools: tools,
  systemPrompt: SYSTEM_PROMPTS.FRONTEND_CODING,
});

// 导出类型定义
export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'step' | 'error' | 'custom' | 'file_write_start' | 'file_write_content';
  content: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  stepName?: string;
  timestamp: string;
  // 新增：用于文件写入预览
  filePath?: string;
  fileContent?: string;
  isStreaming?: boolean;
}

// 流式执行 agent - 使用多种 stream mode 获取完整信息
export async function* streamAgent(
  input: string,
  chatHistory: BaseMessage[] = [],
  abortSignal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  console.log('[Agent] Starting stream for input:', input);
  console.log('[Agent] Chat history length:', chatHistory.length);
  
  try {
    // 检查是否已经被取消
    if (abortSignal?.aborted) {
      yield {
        type: 'error',
        content: 'Request was aborted',
        timestamp: new Date().toISOString(),
      };
      return;
    }

    // 构建消息列表
    const messages = [
      ...chatHistory,
      { role: 'user' as const, content: input }
    ];

    console.log('[Agent] Calling agent.stream with messages:', messages.length);

    // 使用多种 streamMode 来获取完整的信息：
    // - 'updates' 获取每个 agent 步骤的更新（完整的工具调用信息和最终文本）
    // - 'custom' 获取工具中通过 config.writer 发送的自定义更新
    const stream = await agent.stream(
      { messages },
      { streamMode: ['updates', 'custom'] }
    );

    console.log('[Agent] Stream started with modes (updates, custom)');

    // 跟踪已处理的消息和工具调用
    const processedToolCalls = new Set<string>();
    const seenSteps = new Set<string>(); // 跟踪已处理的步骤

    for await (const chunk of stream) {
      // 检查是否被取消
      if (abortSignal?.aborted) {
        console.log('[Agent] Stream aborted by user');
        yield {
          type: 'error',
          content: 'Request was aborted by user',
          timestamp: new Date().toISOString(),
        };
        break;
      }

      // Multiple streaming modes 返回格式：[streamMode, data]
      if (!Array.isArray(chunk) || chunk.length !== 2) {
        console.warn('[Agent] Unexpected chunk format:', chunk);
        continue;
      }

      const [streamMode, data] = chunk;
      console.log(`[Agent] Received ${streamMode} chunk:`, typeof data === 'string' ? data.substring(0, 100) : data);

      // ============================================
      // 处理 'custom' 模式：工具内部通过 config.writer 发送的更新
      // ============================================
      if (streamMode === 'custom') {
        console.log('[Agent] Custom update:', data);
        if (typeof data === 'string') {
          console.log('[Agent] Custom update:', data);
          
          // 检查是否是文件写入相关的更新
          if (data.includes('Writing to file:')) {
            const pathMatch = data.match(/Writing to file: (.+)/);
            if (pathMatch) {
              yield {
                type: 'file_write_start',
                content: data,
                filePath: pathMatch[1],
                timestamp: new Date().toISOString(),
              };
              continue;
            }
          }
          
          // 普通的 custom 更新
          yield {
            type: 'custom',
            content: data,
            timestamp: new Date().toISOString(),
          };
        }
        continue;
      }

      // ============================================
      // 处理 'updates' 模式：完整的 Agent 步骤更新
      // ============================================
      if (streamMode === 'updates') {
        console.log('[Agent] Updates mode:', data);
        // updates 模式返回的是一个对象，key 是节点名，value 是更新内容
        if (!data || typeof data !== 'object') {
          continue;
        }

        // 获取节点名和更新内容
        const entries = Object.entries(data);
        if (entries.length === 0) {
          continue;
        }

        const [nodeName, nodeUpdate] = entries[0];
        console.log(`[Agent] Update from node: ${nodeName}`, nodeUpdate);

        const stepKey = `${nodeName}-${Date.now()}`;
        
        // 检查是否已处理过此步骤（避免重复）
        if (seenSteps.has(stepKey)) {
          continue;
        }
        seenSteps.add(stepKey);

        // 处理节点更新
        const updateData = nodeUpdate as any;
        
        if (updateData.messages && Array.isArray(updateData.messages)) {
          const messages = updateData.messages;
          
          for (const message of messages) {
            const messageType = message._getType?.() || message.type || message.constructor?.name;
            
            // 处理 AI 消息中的工具调用
            if (messageType === 'ai' || messageType === 'AIMessage' || messageType === 'AIMessageChunk') {
              // 处理AI消息的文本内容
              const content = message.content || message.kwargs?.content;
              if (content && typeof content === 'string' && content.trim()) {
                console.log('[Agent] AI response text:', content);
                yield {
                  type: 'text',
                  content: content,
                  timestamp: new Date().toISOString(),
                };
              }
              
              // 尝试从多个位置获取工具调用信息
              let toolCalls = message.tool_calls || message.kwargs?.tool_calls;
              
              // 如果 tool_calls 为空，尝试从 tool_call_chunks 获取
              if (!toolCalls || toolCalls.length === 0) {
                const toolCallChunks = message.tool_call_chunks || message.kwargs?.tool_call_chunks;
                if (toolCallChunks && Array.isArray(toolCallChunks) && toolCallChunks.length > 0) {
                  toolCalls = toolCallChunks.map((chunk: any) => {
                    let parsedArgs = chunk.args;
                    if (typeof chunk.args === 'string') {
                      try {
                        parsedArgs = JSON.parse(chunk.args);
                      } catch (parseError) {
                        console.warn('[Agent] Failed to parse tool call chunk args:', parseError);
                        parsedArgs = { raw: chunk.args, parseError: parseError instanceof Error ? parseError.message : String(parseError) };
                      }
                    }
                    return {
                      id: chunk.id || `tool-${chunk.name}-${Date.now()}`,
                      name: chunk.name,
                      args: parsedArgs,
                    };
                  });
                  console.log('[Agent] Extracted tool calls from tool_call_chunks:', toolCalls);
                }
              }
              
              // 如果还是没有，尝试从 additional_kwargs.tool_calls 获取
              if (!toolCalls || toolCalls.length === 0) {
                const additionalToolCalls = message.kwargs?.additional_kwargs?.tool_calls;
                if (additionalToolCalls && Array.isArray(additionalToolCalls) && additionalToolCalls.length > 0) {
                  toolCalls = additionalToolCalls.map((tc: any) => {
                    let parsedArgs = tc.function?.arguments;
                    if (typeof tc.function?.arguments === 'string') {
                      try {
                        parsedArgs = JSON.parse(tc.function.arguments);
                      } catch (parseError) {
                        console.warn('[Agent] Failed to parse additional_kwargs tool call args:', parseError);
                        parsedArgs = { raw: tc.function.arguments, parseError: parseError instanceof Error ? parseError.message : String(parseError) };
                      }
                    }
                    return {
                      id: tc.id || `tool-${tc.function?.name}-${Date.now()}`,
                      name: tc.function?.name,
                      args: parsedArgs,
                    };
                  });
                  console.log('[Agent] Extracted tool calls from additional_kwargs:', toolCalls);
                }
              }
              
              // 处理 invalid_tool_calls (工具调用失败)
              const invalidToolCalls = message.invalid_tool_calls || message.kwargs?.invalid_tool_calls;
              if (invalidToolCalls && Array.isArray(invalidToolCalls) && invalidToolCalls.length > 0) {
                console.log('[Agent] Invalid tool calls detected:', invalidToolCalls);
                for (const invalidCall of invalidToolCalls) {
                  const toolId = invalidCall.id || `tool-${invalidCall.name}-${Date.now()}`;
                  
                  if (!processedToolCalls.has(toolId)) {
                    processedToolCalls.add(toolId);
                    
                    // 安全地解析工具参数
                    let parsedArgs = invalidCall.args;
                    if (typeof invalidCall.args === 'string') {
                      try {
                        parsedArgs = JSON.parse(invalidCall.args);
                      } catch (parseError) {
                        console.warn('[Agent] Failed to parse invalid tool call args:', parseError);
                        // 如果解析失败，保留原始字符串
                        parsedArgs = { raw: invalidCall.args, parseError: parseError instanceof Error ? parseError.message : String(parseError) };
                      }
                    }
                    
                    // 发送工具调用失败信息
                    yield {
                      type: 'tool_call',
                      content: `Tool call failed: ${invalidCall.name} - ${invalidCall.error}`,
                      toolName: invalidCall.name,
                      toolInput: parsedArgs,
                      timestamp: new Date().toISOString(),
                    };
                    
                    // 立即发送失败结果
                    yield {
                      type: 'tool_result',
                      content: `Error: ${invalidCall.error}`,
                      toolName: invalidCall.name,
                      toolOutput: `Error: ${invalidCall.error}`,
                      timestamp: new Date().toISOString(),
                    };
                  }
                }
              }
              
              if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
                for (const toolCall of toolCalls) {
                  const toolId = toolCall.id || `tool-${toolCall.name}-${Date.now()}`;
                  
                  if (!processedToolCalls.has(toolId)) {
                    console.log('[Agent] Tool call detected:', toolCall);
                    processedToolCalls.add(toolId);
                    
                    // 特殊处理 write_file 工具
                    if (toolCall.name === 'write_file') {
                      yield {
                        type: 'file_write_start',
                        content: `Writing file: ${toolCall.args?.path || 'unknown'}`,
                        toolName: toolCall.name,
                        toolInput: toolCall.args,
                        filePath: toolCall.args?.path,
                        fileContent: toolCall.args?.content,
                        timestamp: new Date().toISOString(),
                      };
                    }
                    
                    // 发送工具调用信息
                    yield {
                      type: 'tool_call',
                      content: `Calling ${toolCall.name}...`,
                      toolName: toolCall.name,
                      toolInput: toolCall.args,
                      timestamp: new Date().toISOString(),
                    };
                  }
                }
              }
            }
            
            // 处理工具消息（工具执行结果）
            else if (messageType === 'tool' || messageType === 'ToolMessage') {
              const content = message.content || message.kwargs?.content;
              const toolName = message.name || message.kwargs?.name || 'unknown';
              const toolCallId = message.tool_call_id || message.kwargs?.tool_call_id;
              
              console.log('[Agent] Tool result detected:', { toolName, toolCallId, content });
              
              yield {
                type: 'tool_result',
                content: content,
                toolName: toolName,
                toolOutput: content,
                timestamp: new Date().toISOString(),
              };
            }
          }
        }
        
        // 发送步骤完成信息
        yield {
          type: 'step',
          content: `Step completed: ${nodeName}`,
          stepName: nodeName,
          timestamp: new Date().toISOString(),
        };
        
        continue;
      }
    }

    console.log('[Agent] Stream completed successfully');
  } catch (error) {
    console.error('[Agent] Stream error:', error);
    yield {
      type: 'error',
      content: `Error: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

// 简单的非流式调用（用于测试）
export async function invokeAgent(input: string, chatHistory: BaseMessage[] = []) {
  console.log('[Agent] Invoking agent with input:', input);
  try {
    const messages = [
      ...chatHistory,
      { role: 'user' as const, content: input }
    ];

    const result = await agent.invoke({ messages });
    console.log('[Agent] Invoke result:', result);
    
    // 获取最后一条消息
    if (result.messages && result.messages.length > 0) {
      const lastMessage = result.messages[result.messages.length - 1];
      return lastMessage.content;
    }
    
    return 'No response from agent';
  } catch (error) {
    console.error('[Agent] Invoke error:', error);
    throw new Error(`Agent error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 辅助函数：转换消息格式
export function convertToLangChainMessages(messages: Array<{ role: string; content: string }>): BaseMessage[] {
  return messages.map(msg => {
    if (msg.role === 'user') {
      return new HumanMessage(msg.content);
    } else {
      return new AIMessage(msg.content);
    }
  });
}

// 导出 agent 和相关工具
export { agent, model };
export { tools } from './tools';
export { SYSTEM_PROMPTS } from './prompts';
