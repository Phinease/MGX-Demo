#!/bin/bash

# Docker 运行脚本
# 用于快速启动 MGX-Demo 容器

set -e

echo "🚀 启动 MGX-Demo 容器（桥接网络 - 兼容所有平台）..."
echo ""

# 停止并删除旧容器（如果存在）
if docker ps -a | grep -q "mgx-demo-app"; then
    echo "🛑 停止旧容器..."
    docker-compose down || true
fi

# 使用 docker-compose 启动（会自动构建镜像如果不存在）
echo "🐳 使用 docker-compose 启动服务（桥接网络模式）..."
echo "   镜像名称: mgx-demo:latest"
echo ""
docker-compose up -d --build

echo ""
echo "✅ 容器启动成功!"
echo ""
echo "📋 服务信息 (桥接网络模式 - 端口映射):"
echo "  - 前端应用: http://localhost:5173"
echo "  - 后端 API: http://localhost:8000"
echo "  - API 文档: http://localhost:8000/docs"
echo "  - 动态项目: http://localhost:5174-5180"
echo ""
echo "💡 提示: 使用桥接网络模式，兼容 macOS/Windows/Linux"
echo ""
echo "📝 常用命令:"
echo "  - 查看日志: docker-compose logs -f"
echo "  - 停止服务: docker-compose down"
echo "  - 重启服务: docker-compose restart"
echo "  - 进入容器: docker exec -it mgx-demo-app bash"
echo ""

