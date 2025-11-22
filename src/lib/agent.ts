import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { allTools } from './tools';

// 配置 OpenAI 兼容模型（通义千问）
const model = new ChatOpenAI({
  model: 'qwen-plus',
  temperature: 0.7,
  apiKey: 'sk-cc75be06983048da82d30fc2e43d2ada',
  configuration: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
});

// 使用从 tools.ts 导入的工具列表
const tools = allTools;

// 创建 agent
const agent = createAgent({
  model: model,
  tools: tools,
  systemPrompt: `You are a powerful AI assistant specialized in software development and system operations.

You have access to tools that allow you to:
- Read and write files in the project
- Explore project structure
- Execute shell commands (npm, git, build tools, etc.)
- Search for information
- Perform calculations

Your goal is to help users build complete frontend projects, deploy applications, and manage the development workflow.

When working on tasks:
1. First understand the project structure using read_file_tree
2. Read relevant files to understand the codebase
3. Make necessary changes using write_file
4. Execute commands to install dependencies, build, test, or deploy
5. Always explain what you're doing and why

Be proactive, thorough, and help users accomplish their development goals efficiently.`,
});

// 导出类型定义
export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'step' | 'error' | 'custom';
  content: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  stepName?: string;
  timestamp: string;
}

// 流式执行 agent - 使用多种 stream mode 获取完整信息
export async function* streamAgent(
  input: string,
  chatHistory: BaseMessage[] = []
): AsyncGenerator<StreamChunk> {
  console.log('[Agent] Starting stream for input:', input);
  console.log('[Agent] Chat history length:', chatHistory.length);
  
  try {
    // 构建消息列表
    const messages = [
      ...chatHistory,
      { role: 'user' as const, content: input }
    ];

    console.log('[Agent] Calling agent.stream with messages:', messages.length);

    // 使用多种 streamMode 来获取完整的信息：
    // - 'values' 获取完整的 agent 步骤
    // - 'custom' 获取工具中通过 config.writer 发送的自定义更新
    const stream = await agent.stream(
      { messages },
      { streamMode: ['values', 'custom'] as any }
    );

    console.log('[Agent] Stream started, waiting for chunks...');

    // 跟踪已处理的消息和工具调用
    let previousMessageCount = messages.length;
    const processedToolCalls = new Set<string>();
    let lastTextContent = '';

    for await (const chunk of stream) {
      // 检查是否是 custom stream mode 的输出
      if (Array.isArray(chunk) && chunk.length === 2) {
        const [streamMode, data] = chunk;
        
        // 处理 custom 模式的输出（来自 config.writer）
        if (streamMode === 'custom' && typeof data === 'string') {
          console.log('[Agent] Custom update:', data);
          yield {
            type: 'custom',
            content: data,
            timestamp: new Date().toISOString(),
          };
          continue;
        }
        
        // 如果是 values 模式，提取实际数据
        if (streamMode === 'values') {
          const valuesChunk = data;
          if (!valuesChunk || typeof valuesChunk !== 'object' || !('messages' in valuesChunk)) {
            continue;
          }
          
          // 处理 values 数据
          const chunkData = valuesChunk as { messages?: any[] };
          
          if (!chunkData.messages || !Array.isArray(chunkData.messages)) {
            continue;
          }

          const allMessages = chunkData.messages;
          console.log(`[Agent] Processing ${allMessages.length} messages (previous: ${previousMessageCount})`);
          
          // 只处理新增的消息
          if (allMessages.length > previousMessageCount) {
            const newMessages = allMessages.slice(previousMessageCount);
            
            for (const message of newMessages) {
              const messageType = message._getType?.() || message.type || message.constructor?.name;
              console.log('[Agent] New message type:', messageType);

              // 处理 AI 消息
              if (messageType === 'ai' || messageType === 'AIMessage') {
                const content = message.content || message.kwargs?.content;
                const toolCalls = message.tool_calls || message.kwargs?.tool_calls;

                // 先处理工具调用
                if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
                  for (const toolCall of toolCalls) {
                    const toolId = toolCall.id;
                    if (!processedToolCalls.has(toolId)) {
                      console.log('[Agent] Tool call detected:', toolCall);
                      processedToolCalls.add(toolId);
                      
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

                // 处理文本内容（最终回复）
                if (content && typeof content === 'string' && content.trim() !== '') {
                  // 如果是新的文本内容，进行流式输出
                  if (content !== lastTextContent) {
                    console.log('[Agent] AI response:', content);
                    
                    // 计算增量文本
                    const newText = content.substring(lastTextContent.length);
                    if (newText) {
                      // 将新文本分成小块进行流式输出（模拟 token 级流式）
                      const chunkSize = 5; // 每次输出5个字符
                      for (let i = 0; i < newText.length; i += chunkSize) {
                        const textChunk = newText.substring(i, i + chunkSize);
                        yield {
                          type: 'text',
                          content: textChunk,
                          timestamp: new Date().toISOString(),
                        };
                        // 添加小延迟以模拟真实的流式效果
                        await new Promise(resolve => setTimeout(resolve, 20));
                      }
                    }
                    lastTextContent = content;
                  }
                }
              }
              // 处理工具消息（工具执行结果）
              else if (messageType === 'tool' || messageType === 'ToolMessage') {
                const content = message.content || message.kwargs?.content;
                const toolName = message.name || message.kwargs?.name || 'unknown';
                
                console.log('[Agent] Tool result detected:', toolName, content);
                yield {
                  type: 'tool_result',
                  content: content,
                  toolName: toolName,
                  toolOutput: content,
                  timestamp: new Date().toISOString(),
                };
              }
            }
            
            previousMessageCount = allMessages.length;
          }
          continue;
        }
      }
      
      // 兼容处理：如果不是数组格式，尝试直接处理为 values
      if (chunk && typeof chunk === 'object' && 'messages' in chunk) {
        const chunkData = chunk as { messages?: any[] };
        
        if (!chunkData.messages || !Array.isArray(chunkData.messages)) {
          console.log('[Agent] No messages in chunk, skipping');
          continue;
        }

        const allMessages = chunkData.messages;
        console.log(`[Agent] Processing ${allMessages.length} messages (previous: ${previousMessageCount})`);
        
        // 只处理新增的消息
        if (allMessages.length > previousMessageCount) {
          const newMessages = allMessages.slice(previousMessageCount);
          
          for (const message of newMessages) {
            const messageType = message._getType?.() || message.type || message.constructor?.name;
            console.log('[Agent] New message type:', messageType);

            // 处理 AI 消息
            if (messageType === 'ai' || messageType === 'AIMessage') {
              const content = message.content || message.kwargs?.content;
              const toolCalls = message.tool_calls || message.kwargs?.tool_calls;

              // 先处理工具调用
              if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
                for (const toolCall of toolCalls) {
                  const toolId = toolCall.id;
                  if (!processedToolCalls.has(toolId)) {
                    console.log('[Agent] Tool call detected:', toolCall);
                    processedToolCalls.add(toolId);
                    
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

              // 处理文本内容（最终回复）
              if (content && typeof content === 'string' && content.trim() !== '') {
                // 如果是新的文本内容，进行流式输出
                if (content !== lastTextContent) {
                  console.log('[Agent] AI response:', content);
                  
                  // 计算增量文本
                  const newText = content.substring(lastTextContent.length);
                  if (newText) {
                    // 将新文本分成小块进行流式输出（模拟 token 级流式）
                    const chunkSize = 5; // 每次输出5个字符
                    for (let i = 0; i < newText.length; i += chunkSize) {
                      const textChunk = newText.substring(i, i + chunkSize);
                      yield {
                        type: 'text',
                        content: textChunk,
                        timestamp: new Date().toISOString(),
                      };
                      // 添加小延迟以模拟真实的流式效果
                      await new Promise(resolve => setTimeout(resolve, 20));
                    }
                  }
                  lastTextContent = content;
                }
              }
            }
            // 处理工具消息（工具执行结果）
            else if (messageType === 'tool' || messageType === 'ToolMessage') {
              const content = message.content || message.kwargs?.content;
              const toolName = message.name || message.kwargs?.name || 'unknown';
              
              console.log('[Agent] Tool result detected:', toolName, content);
              yield {
                type: 'tool_result',
                content: content,
                toolName: toolName,
                toolOutput: content,
                timestamp: new Date().toISOString(),
              };
            }
          }
          
          previousMessageCount = allMessages.length;
        }
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

export { agent, model, tools };
