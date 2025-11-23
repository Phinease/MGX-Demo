# MGX-Demo Docker 部署指南

## 📋 概述

本项目使用 Docker 容器化，采用 **桥接网络模式**（兼容所有平台），包含：
- 🐍 Python FastAPI 后端服务（端口 8000）
- ⚛️ React + Vite 前端应用（端口 5173+）
- 📦 使用 `uv` 管理 Python 依赖
- 📦 使用 `pnpm` 管理 Node.js 依赖
- 🚀 容器启动时**自动启动前端和后端**两个服务
- 🌐 兼容 macOS、Windows 和 Linux

## 🚀 快速开始

### 方式一：使用便捷脚本（推荐）

```bash
# 一键构建并运行
./docker-run.sh
```

### 方式二：使用 Docker Compose

```bash
# 构建并启动（后台运行）
docker-compose up -d

# 查看实时日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方式三：手动 Docker 命令

```bash
# 构建镜像
docker build -t mgx-demo:latest .

# 运行容器（host 网络模式）
docker run -d \
  --name mgx-demo-app \
  --network host \
  -v $(pwd)/generated-projects:/app/generated-projects \
  mgx-demo:latest
```

## 🔧 容器配置说明

### 网络模式
- **网络类型**: Host 网络模式
- **说明**: 容器直接使用主机网络栈，所有端口直接映射到主机
- **优点**: 适合演示环境，无需端口映射配置
- **注意**: 仅适用于 Linux，macOS 和 Windows 需要使用桥接模式

### 端口使用
- `8000`: 后端 API 服务
- `5173-5180`: 前端开发服务器（动态生成的项目）

### 卷挂载
- `./generated-projects:/app/generated-projects`: 持久化动态生成的项目

### 依赖管理
- **Python**: 使用 `uv sync` 在 backend 目录中创建虚拟环境
- **Node.js**: 使用 `pnpm install` 安装前端依赖

## 📝 常用命令

### 容器管理

```bash
# 查看运行状态
docker-compose ps

# 进入容器 shell
docker exec -it mgx-demo-app bash

# 重启服务
docker-compose restart

# 停止并删除容器
docker-compose down

# 查看日志（实时）
docker-compose logs -f

# 查看日志（最后 100 行）
docker-compose logs --tail=100
```

### 调试命令

```bash
# 查看前端日志
docker exec -it mgx-demo-app tail -f /var/log/frontend.log

# 查看所有日志（前端+后端）
docker-compose logs -f

# 进入容器并检查 Python 环境
docker exec -it mgx-demo-app bash -c "cd /app/backend && source .venv/bin/activate && python --version"

# 检查 pnpm 版本
docker exec -it mgx-demo-app pnpm --version

# 检查 uv 版本
docker exec -it mgx-demo-app /root/.cargo/bin/uv --version

# 检查服务进程
docker exec -it mgx-demo-app ps aux | grep -E "python|node"

# 手动重启前端（如需要）
docker exec -it mgx-demo-app bash -c "cd /app && pkill node && pnpm dev &"

# 手动启动后端（调试）
docker exec -it mgx-demo-app bash -c "cd /app/backend && source .venv/bin/activate && python start.py"
```

### 重新构建

```bash
# 重新构建镜像（不使用缓存）
docker-compose build --no-cache

# 重新构建并启动
docker-compose up -d --build
```

## 🌐 服务访问

容器启动后会**自动启动两个服务**：

1. **前端服务** (Vite 开发服务器)
   - 地址: http://localhost:5173
   - 自动热重载
   - 日志位置: `/var/log/frontend.log`

2. **后端服务** (FastAPI)
   - API 地址: http://localhost:8000
   - 交互式文档: http://localhost:8000/docs
   - Redoc 文档: http://localhost:8000/redoc

3. **动态生成的项目** (后端启动的额外前端)
   - 端口范围: 5174-5180
   - 由后端 API 动态管理

## 🐛 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs

# 检查容器状态
docker-compose ps -a
```

### 端口已被占用

```bash
# 查看端口占用（Linux/macOS）
lsof -i :8000

# 停止占用端口的进程
kill -9 <PID>
```

### Python 依赖问题

```bash
# 进入容器手动安装依赖
docker exec -it mgx-demo-app bash
cd /app/backend
uv sync
```

### 前端依赖问题

```bash
# 进入容器手动安装依赖
docker exec -it mgx-demo-app bash
cd /app
pnpm install
```

## 📂 项目结构

```
MGX-Demo/
├── backend/                 # Python FastAPI 后端
│   ├── main.py             # 主应用入口
│   ├── start.py            # 启动脚本
│   ├── pyproject.toml      # Python 依赖配置
│   └── .venv/              # uv 创建的虚拟环境
├── src/                    # React 前端源码
├── generated-projects/     # 动态生成的项目（挂载卷）
├── Dockerfile              # Docker 镜像定义
├── docker-compose.yml      # Docker Compose 配置
├── .dockerignore           # Docker 忽略文件
├── docker-build.sh         # 构建脚本
└── docker-run.sh           # 运行脚本
```

## ⚙️ 环境变量

可以在 `docker-compose.yml` 中修改环境变量：

```yaml
environment:
  - NODE_ENV=development        # Node.js 环境
  - PYTHONUNBUFFERED=1         # Python 输出不缓冲
```

## 🔄 更新部署

当代码更新后：

```bash
# 停止容器
docker-compose down

# 重新构建镜像
docker-compose build

# 启动新容器
docker-compose up -d
```

或使用一行命令：

```bash
docker-compose down && docker-compose up -d --build
```

## 📊 性能优化（可选）

如果需要生产环境部署，建议：

1. 使用多阶段构建
2. 使用桥接网络替代 host 网络
3. 构建前端生产版本
4. 启用 Nginx 反向代理
5. 配置 SSL/TLS
6. 限制容器资源使用

## 📄 许可证

请参考项目主 README 文件。

