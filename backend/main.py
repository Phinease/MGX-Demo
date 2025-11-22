from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from typing import List, Optional
import os
from pydantic import BaseModel

app = FastAPI(title="File System API")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite 默认端口
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FileNode(BaseModel):
    name: str
    type: str  # 'file' or 'folder'
    path: str
    content: Optional[str] = None
    language: Optional[str] = None
    children: Optional[List['FileNode']] = None


# 根据文件扩展名推断语言
def get_language(file_path: str) -> str:
    ext_map = {
        '.py': 'python',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.json': 'json',
        '.md': 'markdown',
        '.html': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.yml': 'yaml',
        '.yaml': 'yaml',
        '.toml': 'toml',
        '.sh': 'bash',
        '.sql': 'sql',
        '.java': 'java',
        '.go': 'go',
        '.rs': 'rust',
        '.cpp': 'cpp',
        '.c': 'c',
        '.h': 'c',
        '.hpp': 'cpp',
    }
    ext = Path(file_path).suffix.lower()
    return ext_map.get(ext, 'text')


# 忽略的文件和文件夹
IGNORE_PATTERNS = {
    'node_modules', '.git', '.vscode', '__pycache__', '.pytest_cache',
    'dist', 'build', '.next', '.nuxt', 'venv', '.venv', 'env',
    '.DS_Store', '.idea', '.vite', 'coverage'
}


def should_ignore(path: Path) -> bool:
    """检查是否应该忽略该路径"""
    return path.name in IGNORE_PATTERNS or path.name.startswith('.')


def read_directory_tree(directory_path: str, include_content: bool = False, max_depth: int = 5, current_depth: int = 0) -> List[FileNode]:
    """
    递归读取目录结构
    
    Args:
        directory_path: 目录路径
        include_content: 是否包含文件内容
        max_depth: 最大递归深度
        current_depth: 当前递归深度
    """
    if current_depth >= max_depth:
        return []
    
    path = Path(directory_path)
    
    if not path.exists():
        raise ValueError(f"Path does not exist: {directory_path}")
    
    if not path.is_dir():
        raise ValueError(f"Path is not a directory: {directory_path}")
    
    nodes = []
    
    try:
        # 获取所有项目并排序（文件夹优先）
        items = sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name))
        
        for item in items:
            # 跳过忽略的文件和文件夹
            if should_ignore(item):
                continue
            
            if item.is_dir():
                # 处理文件夹
                children = read_directory_tree(
                    str(item),
                    include_content=include_content,
                    max_depth=max_depth,
                    current_depth=current_depth + 1
                )
                nodes.append(FileNode(
                    name=item.name,
                    type='folder',
                    path=str(item.relative_to(path.parent)),
                    children=children if children else None
                ))
            else:
                # 处理文件
                file_node = FileNode(
                    name=item.name,
                    type='file',
                    path=str(item.relative_to(path.parent)),
                    language=get_language(item.name)
                )
                nodes.append(file_node)
    
    except PermissionError:
        # 跳过无权限访问的目录
        pass
    
    return nodes


@app.get("/")
def read_root():
    return {"message": "File System API is running"}


@app.get("/api/files/tree")
def get_file_tree(path: str, max_depth: int = 5) -> List[FileNode]:
    """
    获取目录树结构
    
    Args:
        path: 目录路径
        max_depth: 最大递归深度，默认5层
    """
    try:
        # 验证路径是否存在
        if not Path(path).exists():
            raise HTTPException(status_code=404, detail=f"Path not found: {path}")
        
        if not Path(path).is_dir():
            raise HTTPException(status_code=400, detail=f"Path is not a directory: {path}")
        
        tree = read_directory_tree(path, include_content=False, max_depth=max_depth)
        return tree
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/api/files/content")
def get_file_content(path: str) -> dict:
    """
    获取文件内容
    
    Args:
        path: 文件路径
    """
    try:
        file_path = Path(path)
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {path}")
        
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail=f"Path is not a file: {path}")
        
        # 检查文件大小（限制为 1MB）
        if file_path.stat().st_size > 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 1MB)")
        
        # 尝试读取文件内容
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            # 如果不是文本文件
            raise HTTPException(status_code=400, detail="File is not a text file")
        
        return {
            "path": str(file_path),
            "name": file_path.name,
            "content": content,
            "language": get_language(file_path.name)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
