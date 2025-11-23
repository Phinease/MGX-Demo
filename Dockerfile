# 使用官方 Python 3.11 镜像作为基础
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 安装 Node.js 20.x (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# 安装 uv (Python 包管理器)
RUN pip install --no-cache-dir uv
RUN uv --version

# 安装 pnpm (Node.js 包管理器)
RUN npm install -g pnpm@8.10.0

# 复制项目源码（遵循 .dockerignore）
COPY . .

# 安装后端依赖（使用 uv sync，使用完整路径）
WORKDIR /app/backend
RUN uv sync

# 安装前端依赖
WORKDIR /app
RUN pnpm install
RUN pnpm config set registry http://mirrors.cloud.aliyuncs.com

# 创建必要的目录
RUN mkdir -p /app/generated-projects /var/log

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=development

# 切换到后端目录
WORKDIR /app/backend

# 创建启动脚本（同时启动前端和后端）
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
echo "🚀 Starting MGX-Demo Services..."\n\
echo "================================"\n\
\n\
# 启动前端开发服务器（后台运行）\n\
echo "📦 Starting Frontend (Vite)..."\n\
cd /app\n\
pnpm dev > /var/log/frontend.log 2>&1 &\n\
FRONTEND_PID=$!\n\
echo "✅ Frontend started (PID: $FRONTEND_PID) on port 5173"\n\
\n\
# 等待前端启动\n\
sleep 3\n\
\n\
# 启动后端服务器\n\
echo ""\n\
echo "🐍 Starting Backend (FastAPI)..."\n\
cd /app/backend\n\
echo "📍 Working directory: $(pwd)"\n\
echo "🔧 Activating uv virtual environment..."\n\
source .venv/bin/activate\n\
echo "✅ Environment activated"\n\
echo "🌐 Starting FastAPI server on http://0.0.0.0:8000"\n\
echo ""\n\
echo "================================"\n\
echo "✅ All services started!"\n\
echo "  - Frontend: http://localhost:5173"\n\
echo "  - Backend:  http://localhost:8000"\n\
echo "  - API Docs: http://localhost:8000/docs"\n\
echo "================================"\n\
echo ""\n\
\n\
# 启动后端（前台运行）\n\
python start.py\n\
' > /app/start.sh && chmod +x /app/start.sh

# 切换回根目录
WORKDIR /app

# 启动所有服务
CMD ["/app/start.sh"]

