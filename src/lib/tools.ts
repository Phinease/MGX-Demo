import { tool } from 'langchain';
import { z } from 'zod';
import { LangGraphRunnableConfig } from '@langchain/langgraph';

// 后端 API 基础 URL
const API_BASE_URL = 'http://localhost:8000';

/**
 * 工具 1: 读取文件内容
 */
export const readFileTool = tool(
  async (input, config: LangGraphRunnableConfig) => {
    const { path } = input;
    
    config.writer?.(`📖 Reading file: ${path}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/files/content?path=${encodeURIComponent(path)}`);
      
      if (!response.ok) {
        const error = await response.json();
        config.writer?.(`❌ Failed to read file: ${error.detail}`);
        return `Error: ${error.detail}`;
      }
      
      const data = await response.json();
      config.writer?.(`✅ Successfully read file (${data.content.length} characters)`);
      
      return JSON.stringify({
        path: data.path,
        name: data.name,
        language: data.language,
        content: data.content,
        size: data.content.length
      }, null, 2);
    } catch (error) {
      const errorMsg = `Failed to read file: ${error instanceof Error ? error.message : String(error)}`;
      config.writer?.(errorMsg);
      return errorMsg;
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
export const readFileTreeTool = tool(
  async (input, config: LangGraphRunnableConfig) => {
    const { path, maxDepth = 3 } = input;
    
    config.writer?.(`📁 Reading directory tree: ${path} (max depth: ${maxDepth})`);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/files/tree?path=${encodeURIComponent(path)}&max_depth=${maxDepth}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        config.writer?.(`❌ Failed to read directory tree: ${error.detail}`);
        return `Error: ${error.detail}`;
      }
      
      const tree = await response.json();
      
      // 计算文件和文件夹数量
      const countNodes = (nodes: any[]): { files: number; folders: number } => {
        let files = 0;
        let folders = 0;
        
        for (const node of nodes) {
          if (node.type === 'file') {
            files++;
          } else if (node.type === 'folder') {
            folders++;
            if (node.children) {
              const childCounts = countNodes(node.children);
              files += childCounts.files;
              folders += childCounts.folders;
            }
          }
        }
        
        return { files, folders };
      };
      
      const counts = countNodes(tree);
      config.writer?.(`✅ Found ${counts.folders} folders and ${counts.files} files`);
      
      return JSON.stringify(tree, null, 2);
    } catch (error) {
      const errorMsg = `Failed to read directory tree: ${error instanceof Error ? error.message : String(error)}`;
      config.writer?.(errorMsg);
      return errorMsg;
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
export const writeFileTool = tool(
  async (input, config: LangGraphRunnableConfig) => {
    const { path, content, createIfNotExists = false } = input;
    
    config.writer?.(`✍️  Writing to file: ${path}`);
    config.writer?.(`📝 Content length: ${content.length} characters`);
    
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
        config.writer?.(`❌ Failed to write file: ${error.detail}`);
        return `Error: ${error.detail}`;
      }
      
      const result = await response.json();
      config.writer?.(`✅ ${result.message}`);
      
      return JSON.stringify(result, null, 2);
    } catch (error) {
      const errorMsg = `Failed to write file: ${error instanceof Error ? error.message : String(error)}`;
      config.writer?.(errorMsg);
      return errorMsg;
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
export const executeCommandTool = tool(
  async (input, config: LangGraphRunnableConfig) => {
    const { command, workingDir, timeout = 300 } = input;
    
    config.writer?.(`⚡ Executing command: ${command}`);
    if (workingDir) {
      config.writer?.(`📂 Working directory: ${workingDir}`);
    }
    
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
        config.writer?.(`❌ Failed to execute command: ${error.detail}`);
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
                const prefix = event.type === 'stderr' ? '⚠️  ' : '📤 ';
                config.writer?.(`${prefix}${event.data}`);
                fullOutput += event.data;
              } else if (event.type === 'exit') {
                const exitIcon = event.code === 0 ? '✅' : '❌';
                config.writer?.(`${exitIcon} Command exited with code: ${event.code}`);
              } else if (event.type === 'error') {
                config.writer?.(`❌ Error: ${event.data}`);
              }
            } catch (e) {
              // 忽略 JSON 解析错误
            }
          }
        }
      }
      
      return fullOutput || 'Command executed successfully (no output)';
    } catch (error) {
      const errorMsg = `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`;
      config.writer?.(errorMsg);
      return errorMsg;
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
 * 工具 5: 搜索工具（保留原有的）
 */
export const searchTool = tool(
  async ({ query }, config: LangGraphRunnableConfig) => {
    config.writer?.(`🔍 Searching for: ${query}`);
    
    // 模拟搜索延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = `Search results for "${query}": Found relevant information about ${query}. This is a simulated search result with some details.`;
    
    config.writer?.(`✅ Search completed`);
    
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

/**
 * 工具 6: 计算器工具（保留原有的）
 */
export const calculatorTool = tool(
  async ({ expression }, config: LangGraphRunnableConfig) => {
    config.writer?.(`🧮 Calculating: ${expression}`);
    
    try {
      const result = eval(expression);
      const output = `The result of ${expression} is ${result}`;
      
      config.writer?.(`✅ Result: ${result}`);
      
      return output;
    } catch (error) {
      const errorMsg = `Error calculating ${expression}: ${error}`;
      config.writer?.(`❌ ${errorMsg}`);
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

// 导出所有工具
export const allTools = [
  readFileTool,
  readFileTreeTool,
  writeFileTool,
  executeCommandTool,
  searchTool,
  calculatorTool,
];

