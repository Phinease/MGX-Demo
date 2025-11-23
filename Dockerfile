# Use official Python 3.11 image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install uv (Python package manager)
RUN pip install --no-cache-dir uv
RUN uv --version

# Install pnpm (Node.js package manager)
RUN npm install -g pnpm@8.10.0

# Copy project source code (respects .dockerignore)
COPY . .

# Install backend dependencies (using uv sync with full path)
WORKDIR /app/backend
RUN uv sync

# Install frontend dependencies
WORKDIR /app
RUN pnpm install
RUN pnpm config set registry http://mirrors.cloud.aliyuncs.com

# Create necessary directories
RUN mkdir -p /app/generated-projects /var/log

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=development

# Switch to backend directory
WORKDIR /app/backend

# Create startup script (starts both frontend and backend)
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
echo "🚀 Starting MGX-Demo Services..."\n\
echo "================================"\n\
\n\
# Start frontend development server (background)\n\
echo "📦 Starting Frontend (Vite)..."\n\
cd /app\n\
pnpm dev > /var/log/frontend.log 2>&1 &\n\
FRONTEND_PID=$!\n\
echo "✅ Frontend started (PID: $FRONTEND_PID) on port 5173"\n\
\n\
# Wait for frontend to start\n\
sleep 3\n\
\n\
# Start backend server\n\
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
# Start backend (foreground)\n\
python start.py\n\
' > /app/start.sh && chmod +x /app/start.sh

# Switch back to root directory
WORKDIR /app

# Start all services
CMD ["/app/start.sh"]

