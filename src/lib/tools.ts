import { tool } from 'langchain';
import { z } from 'zod';

// 后端 API 基础 URL
const API_BASE_URL = 'http://localhost:8000';

// 路径配置缓存
let pathConfigCache: {
  templatePath: string;
  projectsBasePath: string;
  projectRoot: string;
} | null = null;

/**
 * 从后端获取路径配置
 * 该函数会缓存结果，避免重复请求
 * 
 * @returns Promise<PathConfig> 包含模板路径、项目基础路径等配置
 */
export async function getPathConfig(): Promise<{
  templatePath: string;
  projectsBasePath: string;
  projectRoot: string;
}> {
  if (pathConfigCache) {
    return pathConfigCache;
}

  try {
    const response = await fetch(`${API_BASE_URL}/api/config/paths`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch path config: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    pathConfigCache = {
      templatePath: data.template_path,
      projectsBasePath: data.projects_base_path,
      projectRoot: data.project_root,
    };
    
    console.log('📁 Path configuration loaded:', pathConfigCache);
    
    return pathConfigCache;
  } catch (error) {
    console.error('❌ Failed to load path configuration:', error);
    
    // 如果无法从后端获取配置，使用默认的容器路径
    // 在容器内运行时，这些路径应该是正确的
    pathConfigCache = {
      templatePath: '/app/shadcn-ui',
      projectsBasePath: '/app/generated-projects',
      projectRoot: '/app',
    };
    
    console.log('⚠️  Using default container paths:', pathConfigCache);
    
    return pathConfigCache;
  }
}


/**
 * 工具 1: 初始化项目
 * 复制模板项目到新的文件夹，并返回新项目的绝对路径
 */
export const initializeProjectTool = tool(
  async (input) => {
    const { projectName } = input;
    
    try {
      // 从后端获取路径配置
      const pathConfig = await getPathConfig();
      
      // 生成随机后缀（6位字母数字）
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const newProjectName = `${projectName}-${randomSuffix}`;
      
      console.log(`🚀 Initializing project "${newProjectName}" using template: ${pathConfig.templatePath}`);
      
      // 调用后端 API 复制项目
      const response = await fetch(`${API_BASE_URL}/api/project/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_path: pathConfig.templatePath,
          project_name: newProjectName,
          target_base_path: pathConfig.projectsBasePath,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return `Error: ${error.detail}`;
      }
      
      const result = await response.json();
      
      console.log(`✅ Project initialized: ${result.project_path}`);
      
      return JSON.stringify({
        success: true,
        projectName: newProjectName,
        projectPath: result.project_path,
        message: `Project initialized successfully at: ${result.project_path}`,
        templateUsed: pathConfig.templatePath,
      }, null, 2);
    } catch (error) {
      console.error('❌ Failed to initialize project:', error);
      return `Failed to initialize project: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'initialize_project',
    description: 'Initialize a new frontend project by copying the template. This creates a new project folder with a random suffix for uniqueness. Returns the absolute path of the new project.',
    schema: z.object({
      projectName: z.string().describe('The base name for the new project (e.g., "my-app"). A random suffix will be added automatically.'),
    }),
  }
);

/**
 * 工具 2: 读取文件内容
 */
export const readFileTool = tool(
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
    description: 'Read the content of a file from the filesystem. Use this to view code, configuration files, or any text-based file.',
    schema: z.object({
      path: z.string().describe('The absolute path to the file you want to read'),
    }),
  }
);

/**
 * 工具 3: 读取文件树结构
 */
export const readFileTreeTool = tool(
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
    description: 'Read the directory tree structure of a project. This gives you an overview of all files and folders in a directory. Essential for understanding project structure.',
    schema: z.object({
      path: z.string().describe('The absolute path to the directory you want to explore'),
      maxDepth: z.number().optional().describe('Maximum depth to traverse (default: 3, max: 10)'),
    }),
  }
);

/**
 * 工具 4: 创建或重写文件
 */
export const writeFileTool = tool(
  async (input) => {
    const { path, content, createIfNotExists = true } = input;
    
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
    description: 'Create a new file or completely overwrite an existing file with new content. Use this to create new components, modify existing code, or update configuration files.',
    schema: z.object({
      path: z.string().describe('The absolute path where the file should be written'),
      content: z.string().describe('The complete content to write to the file'),
      createIfNotExists: z.boolean().optional().describe('If true, create the file and parent directories if they don\'t exist (default: true)'),
    }),
  }
);

/**
 * 工具 5: 安装项目依赖
 */
export const installDependenciesTool = tool(
  async (input) => {
    const { projectPath } = input;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/project/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_path: projectPath,
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
      
      return fullOutput || 'Dependencies installed successfully';
    } catch (error) {
      return `Failed to install dependencies: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'install_dependencies',
    description: 'Install project dependencies using pnpm. This will cd to the project directory and run "pnpm install". Use this after initializing a project or adding new dependencies to package.json.',
    schema: z.object({
      projectPath: z.string().describe('The absolute path to the project directory'),
    }),
  }
);

/**
 * 工具 6: 验证项目（运行 ESLint）
 */
export const validateProjectTool = tool(
  async (input) => {
    const { projectPath } = input;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/project/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_path: projectPath,
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
      
      return fullOutput || 'Project validation completed with no errors';
    } catch (error) {
      return `Failed to validate project: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'validate_project',
    description: 'Validate the project by running ESLint. This checks for code quality issues, syntax errors, and style violations. Use this before building or deploying.',
    schema: z.object({
      projectPath: z.string().describe('The absolute path to the project directory'),
    }),
  }
);

/**
 * 工具 7: 构建项目
 */
export const buildProjectTool = tool(
  async (input) => {
    const { projectPath } = input;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/project/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_path: projectPath,
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
      
      return fullOutput || 'Project built successfully';
    } catch (error) {
      return `Failed to build project: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'build_project',
    description: 'Build the project for production using pnpm build. This creates optimized production-ready files. Use this before deploying the application.',
    schema: z.object({
      projectPath: z.string().describe('The absolute path to the project directory'),
    }),
  }
);

/**
 * 工具 8: 运行项目（开发服务器）
 */
export const runProjectTool = tool(
  async (input) => {
    const { projectPath, port } = input;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/project/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_path: projectPath,
          port: port,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return `Error: ${error.detail}`;
      }
      
      const result = await response.json();
      
      return JSON.stringify({
        success: true,
        message: 'Development server started successfully',
        processId: result.process_id,
        projectPath: result.project_path,
        port: result.port,
        url: result.url,
        command: result.command,
      }, null, 2);
    } catch (error) {
      return `Failed to run project: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'run_project',
    description: 'Start the development server for the project. The server will run in the background as a separate process. Returns process information including the URL where the app is accessible. The port will be automatically assigned if not specified (typically starting from 5173).',
    schema: z.object({
      projectPath: z.string().describe('The absolute path to the project directory'),
      port: z.number().optional().describe('Port number to run the dev server on (optional, will auto-select if not provided)'),
    }),
  }
);

/**
 * 工具 9: 停止运行的项目
 */
export const stopProjectTool = tool(
  async (input) => {
    const { processId, projectPath } = input;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/project/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          process_id: processId,
          project_path: projectPath,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return `Error: ${error.detail}`;
      }
      
      const result = await response.json();
      
      return JSON.stringify({
        success: true,
        message: result.message,
        processId: result.process_id,
      }, null, 2);
    } catch (error) {
      return `Failed to stop project: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'stop_project',
    description: 'Stop a running development server. You can stop a project by either providing its process ID or project path. Use this when the user wants to stop the server or before starting a new one on the same port.',
    schema: z.object({
      processId: z.string().optional().describe('The process ID returned when the project was started'),
      projectPath: z.string().optional().describe('The absolute path to the project directory (alternative to processId)'),
    }),
  }
);

/**
 * 工具 10: 查找可用端口
 */
export const findAvailablePortTool = tool(
  async (input) => {
    const { startPort = 6300, count = 1 } = input;
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/project/find-port?start_port=${startPort}&count=${count}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        return `Error: ${error.detail}`;
      }
      
      const result = await response.json();
      
      return JSON.stringify({
        success: true,
        ports: result.ports,
        message: `Found ${result.ports.length} available port(s): ${result.ports.join(', ')}`,
      }, null, 2);
    } catch (error) {
      return `Failed to find available port: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'find_available_port',
    description: 'Find available ports for running development servers. This helps avoid port conflicts. Port range: 6300-6329 (30 ports available).',
    schema: z.object({
      startPort: z.number().optional().describe('Port number to start searching from (default: 6300)'),
      count: z.number().optional().describe('Number of available ports to find (default: 1)'),
    }),
  }
);

/**
 * 工具 11: 执行通用命令（保留用于特殊情况）
 */
export const executeCommandTool = tool(
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
    description: 'Execute a custom shell command. Use this only when the specialized tools (install_dependencies, validate_project, build_and_run_project) don\'t meet your needs. For standard operations, prefer the specialized tools.',
    schema: z.object({
      command: z.string().describe('The shell command to execute'),
      workingDir: z.string().optional().describe('The working directory where the command should be executed (optional)'),
      timeout: z.number().optional().describe('Maximum execution time in seconds (default: 300)'),
    }),
  }
);

// 导出所有工具
export const tools = [
  initializeProjectTool,
  readFileTool,
  readFileTreeTool,
  writeFileTool,
  installDependenciesTool,
  validateProjectTool,
  buildProjectTool,
  runProjectTool,
  stopProjectTool,
  findAvailablePortTool,
  executeCommandTool,
];

// 导出工具名称映射（用于调试和日志）
export const toolNames = {
  INITIALIZE_PROJECT: 'initialize_project',
  READ_FILE: 'read_file',
  READ_FILE_TREE: 'read_file_tree',
  WRITE_FILE: 'write_file',
  INSTALL_DEPENDENCIES: 'install_dependencies',
  VALIDATE_PROJECT: 'validate_project',
  BUILD_PROJECT: 'build_project',
  RUN_PROJECT: 'run_project',
  STOP_PROJECT: 'stop_project',
  FIND_AVAILABLE_PORT: 'find_available_port',
  EXECUTE_COMMAND: 'execute_command',
};

