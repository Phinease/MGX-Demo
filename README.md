# MGX-Demo - AI 驱动的前端开发平台

> 陈双瑞笔试项目 - 核心开发时间 约10小时

一个基于 AI 智能体的全栈前端开发平台，支持通过自然语言对话创建、编辑、预览和部署 React 项目。

## 📋 项目介绍

MGX-Demo 是一个创新的 AI 驱动的开发平台，通过集成大语言模型（通义千问）和 LangChain 框架，实现了智能化的前端项目开发流程。用户只需通过自然语言描述需求，AI 智能体就能自动完成项目初始化、代码编写、依赖安装、构建和部署全流程。

### ✨ 核心特性

- 🤖 **智能对话式开发**：通过自然语言与 AI 交互，无需手动编写脚手架代码
- 📦 **全自动化工作流**：从项目初始化到部署的完整自动化
- 🔍 **实时代码追踪**：可视化 AI 编码过程，实时预览生成的代码
- 💾 **会话持久化**：基于 Supabase 的完整会话管理和状态保存
- 🐳 **容器化部署**：Docker 一键部署，支持多项目并发运行
- 🌐 **智能环境适配**：自动检测云端/本地环境，无需手动配置

## 🚀 核心功能

### 1. 前端项目编程智能体

基于 LangChain 和通义千问构建的智能编码助手，支持完整的项目开发流程。

**技术栈**：
- LangChain - AI 应用框架
- 通义千问 Qwen-Plus - 大语言模型
- Tool Calling - 工具调用机制
- Stream Processing - 流式响应处理

**参考文件**：`src/lib/agent.ts`, `src/lib/tools.ts`, `src/lib/prompts.ts`

### 2. 前端项目自动化部署与预览

实现项目初始化、依赖安装、验证、构建、运行的全自动化流程，支持多端口动态部署。

**技术栈**：
- FastAPI - 高性能 Python Web 框架
- Process Management - 进程管理
- Port Management (6300-6329) - 动态端口分配
- Docker Bridge Network - 容器网络桥接

**参考文件**：`backend/main.py`, `src/components/PreviewFrame.tsx`

### 3. 项目内容实时预览与编辑

可视化文件树浏览和 Monaco Editor 代码编辑，支持实时保存和刷新。

**技术栈**：
- Monaco Editor - VSCode 编辑器内核
- File System API - 文件系统接口
- Real-time Sync - 实时同步
- Language Detection - 语言自动检测

**参考文件**：`src/components/EditorPanel.tsx`, `src/components/CodeEditor.tsx`

### 4. 智能体编码跟踪与审核

实时追踪 AI 写入的文件内容，提供流式预览和历史记录功能。

**技术栈**：
- Stream Monitoring - 流式监控
- File Preview - 文件预览
- History Tracking - 历史追踪
- Real-time Display - 实时展示

**参考文件**：`src/components/CodingPreview.tsx`, `src/hooks/useCodingPreview.ts`

### 5. 用户级会话管理与数据持久化

基于 Supabase 的完整会话系统，包含消息历史、项目状态、预览状态持久化。

**技术栈**：
- Supabase Auth - 用户认证
- PostgreSQL - 关系型数据库
- Real-time Sync - 实时同步
- State Management - 状态管理

**参考文件**：`src/components/ConversationList.tsx`, `src/lib/supabase.ts`, `src/App.tsx`

### 6. 容器化部署

Docker 容器化部署方案，支持前后端统一启动，端口映射（8000, 5173, 6300-6329）。

**技术栈**：
- Docker - 容器化技术
- Docker Compose - 多容器编排
- Bridge Network - 桥接网络
- Multi-service Orchestration - 多服务编排

**参考文件**：`Dockerfile`, `docker-run.sh`, `docker-compose.yml`

## 🎯 技术亮点

| 特性 | 描述 |
|------|------|
| **流式响应处理** | 实现 Agent 工具调用和内容的实时流式输出 |
| **多进程管理** | 后端支持同时运行 30 个独立项目实例 |
| **状态持久化** | 完整的会话状态保存，支持断点续传 |
| **智能环境适配** | 自动检测云端/本地环境，智能替换 API 地址和预览 URL |

## 📦 安装部署

### 前置要求

- Node.js 20.x 或更高版本
- Python 3.11 或更高版本
- pnpm 8.x 或更高版本
- uv (Python 包管理器)
- Docker & Docker Compose (用于容器化部署)

### 本地开发

#### 1. 安装依赖

```bash
# 安装前端依赖
pnpm install

# 安装后端依赖
cd backend
uv sync
```

#### 2. 配置环境变量

创建 `.env` 文件：

```bash
# Supabase 配置
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API 配置
API_BASE_URL=http://localhost:8000
```

#### 3. 启动服务

**启动后端**：

```bash
cd backend
uv run python start.py
```

后端将运行在 `http://localhost:8000`

**启动前端**：

```bash
pnpm dev
```

前端将运行在 `http://localhost:5173`

#### 4. 访问应用

打开浏览器访问 `http://localhost:5173`

### 容器化部署

#### 快速启动

使用提供的脚本一键启动：

```bash
chmod +x docker-run.sh
./docker-run.sh
```

#### 手动部署

```bash
# 构建并启动服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

#### 多架构镜像构建

**构建 AMD64 (x86_64) 架构镜像**：

```bash
docker buildx build --platform linux/amd64 -t mgx-demo:amd64 --load .
```

**构建 ARM64 (Apple Silicon / ARM) 架构镜像**：

```bash
docker buildx build --platform linux/arm64 -t mgx-demo:arm64 --load .
```

**构建多架构镜像并推送**：

```bash
# 创建 buildx 构建器实例（首次使用）
docker buildx create --name multiarch --driver docker-container --use

# 构建并推送多架构镜像
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t yourusername/mgx-demo:latest \
  --push .
```

**本地构建多架构镜像（不推送）**：

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t mgx-demo:multiarch \
  --load .
```

#### 服务访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端应用 | http://localhost:5173 | 主界面 |
| 后端 API | http://localhost:8000 | RESTful API |
| API 文档 | http://localhost:8000/docs | FastAPI Swagger 文档 |
| 动态项目 | http://localhost:6300-6329 | AI 生成的项目预览（30 个端口） |

## ⚠️ 已知问题

### 1. LangChain Update 模式原生问题

在 update 模式下工具无法正常调用，未实现 LLM token 级别的流式输出，影响实时性体验。

**影响**：用户无法看到 AI 逐字输出文本的效果，只能看到工具调用和最终结果。

### 2. 智能体提示词优化不足

提示词与核心业务流程需要进一步优化，可能存在遵从较差或执行不精确的问题。

**改进方向**：需要更多测试案例和提示词迭代优化。

### 3. 对话历史保存机制缺陷

未成功运行完整的对话轮次时，没有存入智能体对话历史（上下文），导致续聊上下文丢失。

**影响**：如果 AI 执行中断或出错，下次对话可能无法延续之前的上下文。

## 📂 项目结构

```
MGX-Demo/
├── backend/                    # 后端服务
│   ├── main.py                # FastAPI 主应用
│   ├── start.py               # 启动脚本
│   ├── pyproject.toml         # Python 依赖
│   └── uv.lock                # 依赖锁文件
│
├── src/                        # 前端源码
│   ├── components/            # React 组件
│   │   ├── ChatPanel.tsx     # 聊天面板
│   │   ├── EditorPanel.tsx   # 代码编辑器面板
│   │   ├── PreviewFrame.tsx  # 预览框架
│   │   ├── CodingPreview.tsx # 编码预览
│   │   ├── ConversationList.tsx # 会话列表
│   │   ├── Intro.tsx         # 介绍页面
│   │   ├── ProjectInfoDialog.tsx # 项目信息弹窗
│   │   └── ui/               # shadcn/ui 组件库
│   │
│   ├── hooks/                 # 自定义 Hooks
│   │   ├── useCodingPreview.ts
│   │   └── useFileTree.ts
│   │
│   ├── lib/                   # 工具库
│   │   ├── agent.ts          # AI Agent 核心
│   │   ├── tools.ts          # Agent 工具定义
│   │   ├── prompts.ts        # 提示词配置
│   │   ├── supabase.ts       # Supabase 客户端
│   │   └── fileSystemApi.ts  # 文件系统 API
│   │
│   ├── types/                 # TypeScript 类型
│   └── App.tsx                # 应用主入口
│
├── shadcn-ui/                  # shadcn-ui 模板
├── generated-projects/         # AI 生成的项目
│
├── Dockerfile                  # Docker 镜像构建
├── docker-compose.yml          # Docker Compose 配置
├── docker-run.sh              # Docker 启动脚本
│
├── package.json               # 前端依赖
├── pnpm-lock.yaml             # 前端依赖锁
├── vite.config.ts             # Vite 配置
├── tailwind.config.ts         # Tailwind CSS 配置
└── tsconfig.json              # TypeScript 配置
```

## 🔧 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2.0 | UI 框架 |
| TypeScript | 5.x | 类型系统 |
| Vite | 6.x | 构建工具 |
| Tailwind CSS | 3.x | CSS 框架 |
| shadcn/ui | - | UI 组件库 |
| Monaco Editor | - | 代码编辑器 |
| LangChain | 0.3.x | AI 框架 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.11 | 编程语言 |
| FastAPI | 0.115.x | Web 框架 |
| uvicorn | 0.32.x | ASGI 服务器 |
| Pydantic | 2.x | 数据验证 |

### 数据库与认证

| 技术 | 用途 |
|------|------|
| Supabase | 用户认证、数据存储 |
| PostgreSQL | 关系型数据库 |

### DevOps

| 技术 | 用途 |
|------|------|
| Docker | 容器化 |
| Docker Compose | 容器编排 |
| pnpm | Node.js 包管理 |
| uv | Python 包管理 |

## 📝 下一步计划

### 1. 计划型智能体

支持用户审核与修改编程计划，提供更可控的开发流程。

### 2. 容器化隔离前端项目

为每个生成的前端项目提供独立容器环境，提升安全性和资源隔离。

### 3. Nginx 代理方案

通过 Nginx 代理所有生成的前端网页，支持页面访问无需公网 IP 与端口，提升安全性。

### 4. 增强错误恢复机制

支持项目构建自动回滚和重试机制，增加版本管理功能。

### 5. 上下文管理优化

支持截断、记忆、总结等更细化的上下文管理，防止超出模型上限，提升长对话体验。

### 6. 多角色智能体团队

实现多个专业角色的智能体协作，如架构师、前端工程师、测试工程师等。

### 7. 增强工具鲁棒性

提升各工具的异常处理能力，增加重试机制和更详细的错误提示。

### 8. 前端UI优化

提升用户界面的视觉效果和交互体验，优化布局和样式设计。

### 9. 标题自动生成

支持根据对话内容自动生成会话标题，提升会话管理的便利性。

## 🧪 测试指南

### 示例对话

**创建一个简单的计数器应用**：
```
创建一个计数器应用，包含加减按钮和重置功能
```

**创建一个 Todo List 应用**：
```
帮我创建一个 Todo List 应用，需要支持添加、删除、标记完成功能，使用 shadcn/ui 组件
```

**创建一个个人简历网站**：
```
创建一个个人简历网站，包含个人信息、技能、项目经历和联系方式板块
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

MIT License

## 👨‍💻 作者

**陈双瑞**

© 2025 MGX-Demo - AI 驱动的前端开发平台

---

⚡ Code with Cursor | Built with React + TypeScript + FastAPI | Powered by LangChain & Qwen
