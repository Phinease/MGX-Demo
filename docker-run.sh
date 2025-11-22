#!/bin/bash

# Docker 运行脚本
# 用于快速启动 MGX-Demo 容器

set -e

echo "🚀 启动 MGX-Demo 容器（演示模式 - Host 网络）..."
echo ""

# 检查镜像是否存在
if ! docker images | grep -q "mgx-demo"; then
    echo "⚠️  镜像不存在，开始构建..."
    ./docker-build.sh
fi

# 停止并删除旧容器（如果存在）
if docker ps -a | grep -q "mgx-demo-app"; then
    echo "🛑 停止旧容器..."
    docker stop mgx-demo-app || true
    docker rm mgx-demo-app || true
fi

# 使用 docker-compose 启动
echo "🐳 使用 docker-compose 启动服务（Host 网络模式）..."
docker-compose up -d

echo ""
echo "✅ 容器启动成功!"
echo ""
echo "📋 服务信息 (Host 网络模式 - 所有端口直接映射到主机):"
echo "  - 后端 API: http://localhost:8000"
echo "  - API 文档: http://localhost:8000/docs"
echo "  - 前端端口: 可使用任意可用端口 (5173-5180)"
echo ""
echo "⚠️  注意: 使用 host 网络模式，容器直接使用主机网络栈"
echo ""
echo "📝 常用命令:"
echo "  - 查看日志: docker-compose logs -f"
echo "  - 停止服务: docker-compose down"
echo "  - 重启服务: docker-compose restart"
echo "  - 进入容器: docker exec -it mgx-demo-app bash"
echo ""

