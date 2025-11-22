import { ChatOpenAI } from '@langchain/openai';
import { tool, createAgent } from 'langchain';
import { z } from 'zod';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';

// 配置 OpenAI 兼容模型（通义千问）
const model = new ChatOpenAI({
  model: 'qwen-plus',
  temperature: 0.7,
  apiKey: 'sk-cc75be06983048da82d30fc2e43d2ada',
  configuration: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
});

// 工具 1: 搜索工具
const searchTool = tool(
  async ({ query }) => {
    console.log('[Tool] search called with query:', query);
    // 模拟搜索结果
    await new Promise(resolve => setTimeout(resolve, 1000));
    const result = `Search results for "${query}": Found relevant information about ${query}. This is a simulated search result with some details.`;
    console.log('[Tool] search result:', result);
    return result;
  },
  {
    name: 'search',
    description: 'Search for information on the internet. Use this when you need to find current information or answer questions about recent events.',
    schema: z.object({
      query: z.string().describe('The search query to look up'),
    }),
  }
);

// 工具 2: 计算器工具
const calculatorTool = tool(
  async ({ expression }) => {
    console.log('[Tool] calculator called with expression:', expression);
    try {
      // 简单的数学表达式求值
      const result = eval(expression);
      const output = `The result of ${expression} is ${result}`;
      console.log('[Tool] calculator result:', output);
      return output;
    } catch (error) {
      const errorMsg = `Error calculating ${expression}: ${error}`;
      console.error('[Tool] calculator error:', errorMsg);
      return errorMsg;
    }
  },
  {
    name: 'calculator',
    description: 'Perform mathematical calculations. Use this when you need to solve math problems or perform computations.',
    schema: z.object({
      expression: z.string().describe('The mathematical expression to evaluate (e.g., "2 + 2", "10 * 5")'),
    }),
  }
);

// 创建工具列表
const tools = [searchTool, calculatorTool];

// 创建 agent
const agent = createAgent({
  model: model,
  tools: tools,
  systemPrompt: 'You are a helpful AI assistant. Use the available tools to help answer questions. When using tools, explain what you are doing.',
});

// 导出类型定义
export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'step' | 'error';
  content: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  stepName?: string;
  timestamp: string;
}

// 流式执行 agent - 使用正确的 LangChain API
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

    // 使用 streamMode: "values" 来获取完整状态，更好地支持流式输出
    const stream = await agent.stream(
      { messages },
      { streamMode: 'values' }
    );

    console.log('[Agent] Stream started, waiting for chunks...');

    let previousMessageCount = 0;

    for await (const chunk of stream) {
      console.log('[Agent] Received chunk:', JSON.stringify(chunk, null, 2));

      // 类型守护：确保 chunk 是对象且包含 messages
      if (!chunk || typeof chunk !== 'object' || !('messages' in chunk)) {
        console.log('[Agent] Invalid chunk format, skipping');
        continue;
      }

      const chunkData = chunk as { messages?: any[] };
      
      // 使用 values 模式时，chunk 直接包含 messages 数组
      if (!chunkData.messages || !Array.isArray(chunkData.messages)) {
        console.log('[Agent] No messages in chunk, skipping');
        continue;
      }

      const messages = chunkData.messages;
      console.log(`[Agent] Processing ${messages.length} messages (previous: ${previousMessageCount})`);
      
      // 只处理新增的消息
      if (messages.length > previousMessageCount) {
        const newMessages = messages.slice(previousMessageCount);
        
        for (const message of newMessages) {
          console.log('[Agent] Processing message:', JSON.stringify(message, null, 2));
          
          // 处理不同类型的消息
          const messageType = message._getType?.() || message.type || message.constructor?.name;
          console.log('[Agent] Message type:', messageType);

          // AI消息处理
          if (messageType === 'ai' || messageType === 'AIMessage') {
            const content = message.content || message.kwargs?.content;
            const toolCalls = message.tool_calls || message.kwargs?.tool_calls;

            // 处理工具调用
            if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
              for (const toolCall of toolCalls) {
                console.log('[Agent] Tool call detected:', toolCall);
                yield {
                  type: 'tool_call',
                  content: `Calling ${toolCall.name}...`,
                  toolName: toolCall.name,
                  toolInput: toolCall.args,
                  timestamp: new Date().toISOString(),
                };
              }
            }

            // 处理文本内容（只有在没有工具调用或文本不为空时）
            if (content && typeof content === 'string' && content.trim() !== '') {
              console.log('[Agent] Text content detected:', content);
              yield {
                type: 'text',
                content: content,
                timestamp: new Date().toISOString(),
              };
            }
          }
          // 工具消息处理
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
      }

      previousMessageCount = messages.length;
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
