#!/bin/bash

# Docker 构建脚本
# 用于构建 MGX-Demo 项目的 Docker 镜像

set -e

echo "🐳 开始构建 MGX-Demo Docker 镜像..."
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker 未安装"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 构建镜像
echo "📦 构建镜像 (这可能需要几分钟)..."
docker build -t mgx-demo:latest .

echo ""
echo "✅ 镜像构建完成!"
echo ""
echo "📋 使用方式:"
echo "  1. 运行容器: docker run -d -p 8000:8000 -p 5173:5173 mgx-demo:latest"
echo "  2. 使用 docker-compose: docker-compose up -d"
echo "  3. 查看日志: docker logs -f <container-id>"
echo ""

