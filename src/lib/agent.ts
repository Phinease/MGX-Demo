import { ChatOpenAI } from '@langchain/openai';
import { createAgent, tool } from 'langchain';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { z } from 'zod';

// 后端 API 基础 URL
const API_BASE_URL = 'http://localhost:8000';

/**
 * 工具 1: 读取文件内容
 */
const readFileTool = tool(
  async (input) => {
    const { path } = input;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/files/content?path=${encodeURIComponent(path)}`);
      
      if (!response.ok) {
        const error = await response.json();
        return `Error: ${error.detail}`;
      }
      
      const data = await response.json();
      
      return JSON.stringify({
        path: data.path,
        name: data.name,
        language: data.language,
        content: data.content,
        size: data.content.length
      }, null, 2);
    } catch (error) {
      return `Failed to read file: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'read_file',
    description: 'Read the content of a file from the backend filesystem. Use this to view code, configuration files, or any text-based file.',
    schema: z.object({
      path: z.string().describe('The absolute path to the file you want to read'),
    }),
  }
);

/**
 * 工具 2: 读取文件树结构
 */
const readFileTreeTool = tool(
  async (input) => {
    const { path, maxDepth = 3 } = input;
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/files/tree?path=${encodeURIComponent(path)}&max_depth=${maxDepth}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        return `Error: ${error.detail}`;
      }
      
      const tree = await response.json();
      return JSON.stringify(tree, null, 2);
    } catch (error) {
      return `Failed to read directory tree: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'read_file_tree',
    description: 'Read the directory tree structure of a project. This gives you an overview of all files and folders in a directory. Very useful for understanding project structure.',
    schema: z.object({
      path: z.string().describe('The absolute path to the directory you want to explore'),
      maxDepth: z.number().optional().describe('Maximum depth to traverse (default: 3, max: 10)'),
    }),
  }
);

/**
 * 工具 3: 创建或重写文件
 */
const writeFileTool = tool(
  async (input) => {
    const { path, content, createIfNotExists = false } = input;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/files/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path,
          content,
          create_if_not_exists: createIfNotExists,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return `Error: ${error.detail}`;
      }
      
      const result = await response.json();
      return JSON.stringify(result, null, 2);
    } catch (error) {
      return `Failed to write file: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'write_file',
    description: 'Create a new file or completely overwrite an existing file with new content. Use this to create new code files, configuration files, or update existing files.',
    schema: z.object({
      path: z.string().describe('The absolute path where the file should be written'),
      content: z.string().describe('The complete content to write to the file'),
      createIfNotExists: z.boolean().optional().describe('If true, create the file and parent directories if they don\'t exist (default: false)'),
    }),
  }
);

/**
 * 工具 4: 执行命令
 */
const executeCommandTool = tool(
  async (input) => {
    const { command, workingDir, timeout = 300 } = input;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/command/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          working_dir: workingDir,
          timeout,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return `Error: ${error.detail}`;
      }
      
      // 读取流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullOutput = '';
      
      if (!reader) {
        return 'Error: No response stream available';
      }
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();
            
            if (data === '[DONE]') {
              continue;
            }
            
            try {
              const event = JSON.parse(data);
              
              if (event.type === 'stdout' || event.type === 'stderr') {
                fullOutput += event.data;
              }
            } catch (e) {
              // 忽略 JSON 解析错误
            }
          }
        }
      }
      
      return fullOutput || 'Command executed successfully (no output)';
    } catch (error) {
      return `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'execute_command',
    description: 'Execute a shell command on the backend server. Use this to run npm/pnpm commands, git operations, build scripts, or any other shell commands. The output will be streamed in real-time.',
    schema: z.object({
      command: z.string().describe('The shell command to execute (e.g., "npm install", "git status", "pnpm build")'),
      workingDir: z.string().optional().describe('The working directory where the command should be executed (optional)'),
      timeout: z.number().optional().describe('Maximum execution time in seconds (default: 300)'),
    }),
  }
);

/**
 * 工具 5: 搜索工具
 */
const searchTool = tool(
  async ({ query }) => {
    // 模拟搜索延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return `Search results for "${query}": Found relevant information about ${query}. This is a simulated search result with some details.`;
  },
  {
    name: 'search',
    description: 'Search for information on the internet. Use this when you need to find current information or answer questions about recent events.',
    schema: z.object({
      query: z.string().describe('The search query to look up'),
    }),
  }
);

/**
 * 工具 6: 计算器工具
 */
const calculatorTool = tool(
  async ({ expression }) => {
    try {
      const result = eval(expression);
      return `The result of ${expression} is ${result}`;
    } catch (error) {
      return `Error calculating ${expression}: ${error}`;
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

/** 工具 7: 获取天气 */
const getWeather = tool(
  ({ location }) => `Weather in ${location}: Sunny, 72°F`,
  {
    name: "get_weather",
    description: "Get weather information for a location",
    schema: z.object({
      location: z.string().describe("The location to get weather for"),
    }),
  }
);

// 所有工具列表
const tools = [
  readFileTool,
  readFileTreeTool,
  writeFileTool,
  executeCommandTool,
  searchTool,
  calculatorTool,
  getWeather
];

// 配置 OpenAI 兼容模型（通义千问）
const model = new ChatOpenAI({
  model: 'qwen-plus',
  temperature: 0.7,
  apiKey: 'sk-cc75be06983048da82d30fc2e43d2ada',
  configuration: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
});

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
                  toolCalls = toolCallChunks.map((chunk: any) => ({
                    id: chunk.id || `tool-${chunk.name}-${Date.now()}`,
                    name: chunk.name,
                    args: typeof chunk.args === 'string' ? JSON.parse(chunk.args) : chunk.args,
                  }));
                  console.log('[Agent] Extracted tool calls from tool_call_chunks:', toolCalls);
                }
              }
              
              // 如果还是没有，尝试从 additional_kwargs.tool_calls 获取
              if (!toolCalls || toolCalls.length === 0) {
                const additionalToolCalls = message.kwargs?.additional_kwargs?.tool_calls;
                if (additionalToolCalls && Array.isArray(additionalToolCalls) && additionalToolCalls.length > 0) {
                  toolCalls = additionalToolCalls.map((tc: any) => ({
                    id: tc.id || `tool-${tc.function?.name}-${Date.now()}`,
                    name: tc.function?.name,
                    args: typeof tc.function?.arguments === 'string' 
                      ? JSON.parse(tc.function.arguments) 
                      : tc.function?.arguments,
                  }));
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
                    
                    // 发送工具调用失败信息
                    yield {
                      type: 'tool_call',
                      content: `Tool call failed: ${invalidCall.name} - ${invalidCall.error}`,
                      toolName: invalidCall.name,
                      toolInput: typeof invalidCall.args === 'string' 
                        ? JSON.parse(invalidCall.args) 
                        : invalidCall.args,
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

export { agent, model, tools };
