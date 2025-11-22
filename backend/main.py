from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pathlib import Path
from typing import List, Optional
import os
import asyncio
import subprocess
import json
from pydantic import BaseModel

app = FastAPI(title="File System API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ],
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


# Infer language from file extension
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


# Ignore patterns for files and folders
IGNORE_PATTERNS = {
    'node_modules', '.git', '.vscode', '__pycache__', '.pytest_cache',
    'dist', 'build', '.next', '.nuxt', 'venv', '.venv', 'env',
    '.DS_Store', '.idea', '.vite', 'coverage'
}


def should_ignore(path: Path) -> bool:
    """Check if the path should be ignored"""
    return path.name in IGNORE_PATTERNS or path.name.startswith('.')


def read_directory_tree(directory_path: str, include_content: bool = False, max_depth: int = 5, current_depth: int = 0) -> List[FileNode]:
    """
    Recursively read directory structure
    
    Args:
        directory_path: Directory path
        include_content: Whether to include file content
        max_depth: Maximum recursion depth
        current_depth: Current recursion depth
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
        # Get all items and sort (folders first)
        items = sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name))
        
        for item in items:
            # Skip ignored files and folders
            if should_ignore(item):
                continue
            
            if item.is_dir():
                # Process folder - use absolute path
                children = read_directory_tree(
                    str(item),
                    include_content=include_content,
                    max_depth=max_depth,
                    current_depth=current_depth + 1
                )
                nodes.append(FileNode(
                    name=item.name,
                    type='folder',
                    path=str(item.absolute()),
                    children=children if children else None
                ))
            else:
                # Process file - use absolute path
                file_node = FileNode(
                    name=item.name,
                    type='file',
                    path=str(item.absolute()),
                    language=get_language(item.name)
                )
                nodes.append(file_node)
    
    except PermissionError:
        # Skip directories without permission
        pass
    
    return nodes


@app.get("/")
def read_root():
    return {"message": "File System API is running"}


@app.get("/api/files/tree")
def get_file_tree(path: str, max_depth: int = 5) -> List[FileNode]:
    """
    Get directory tree structure
    
    Args:
        path: Directory path
        max_depth: Maximum recursion depth, default 5
    """
    try:
        # Validate path exists
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
    Get file content
    
    Args:
        path: File path
    """
    try:
        file_path = Path(path)
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {path}")
        
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail=f"Path is not a file: {path}")
        
        # Check file size (limit to 1MB)
        if file_path.stat().st_size > 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 1MB)")
        
        # Try to read file content
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            # Not a text file
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


class SaveFileRequest(BaseModel):
    path: str
    content: str


@app.post("/api/files/save")
def save_file_content(request: SaveFileRequest) -> dict:
    """
    Save file content
    
    Args:
        request: SaveFileRequest containing path and content
    """
    try:
        file_path = Path(request.path)
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {request.path}")
        
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail=f"Path is not a file: {request.path}")
        
        # Write file content
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(request.content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to write file: {str(e)}")
        
        return {
            "success": True,
            "message": "File saved successfully",
            "path": str(file_path)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


class WriteFileRequest(BaseModel):
    path: str
    content: str
    create_if_not_exists: bool = False


@app.post("/api/files/write")
def write_file_content(request: WriteFileRequest) -> dict:
    """
    Write file content (create new or overwrite existing)
    
    Args:
        request: WriteFileRequest containing path, content, and creation flag
    """
    try:
        file_path = Path(request.path)
        
        # If file doesn't exist and create_if_not_exists is False, raise error
        if not file_path.exists() and not request.create_if_not_exists:
            raise HTTPException(status_code=404, detail=f"File not found: {request.path}. Set create_if_not_exists=true to create it.")
        
        # Create parent directories if they don't exist
        if request.create_if_not_exists:
            file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write file content
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(request.content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to write file: {str(e)}")
        
        action = "created" if not file_path.exists() else "updated"
        
        return {
            "success": True,
            "message": f"File {action} successfully",
            "path": str(file_path.absolute()),
            "size": len(request.content)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


class ExecuteCommandRequest(BaseModel):
    command: str
    working_dir: Optional[str] = None
    timeout: int = 300  # Default 5 minutes


async def stream_command_output(command: str, working_dir: Optional[str] = None, timeout: int = 300):
    """
    Stream command output in real-time using Server-Sent Events (SSE) format
    """
    try:
        # Split command into parts for subprocess
        import shlex
        cmd_parts = shlex.split(command)
        
        # Set working directory
        cwd = working_dir if working_dir else os.getcwd()
        
        # Send initial message
        yield f"data: {json.dumps({'type': 'start', 'command': command, 'cwd': cwd})}\n\n"
        
        # Create subprocess
        process = await asyncio.create_subprocess_exec(
            *cmd_parts,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd
        )
        
        # Function to read and stream output
        async def read_stream(stream, stream_type):
            while True:
                line = await stream.readline()
                if not line:
                    break
                try:
                    decoded_line = line.decode('utf-8').rstrip()
                    yield f"data: {json.dumps({'type': stream_type, 'data': decoded_line})}\n\n"
                except UnicodeDecodeError:
                    # Handle binary output
                    yield f"data: {json.dumps({'type': stream_type, 'data': '[binary data]'})}\n\n"
        
        # Read stdout and stderr concurrently
        async def read_all_streams():
            tasks = []
            if process.stdout:
                tasks.append(read_stream(process.stdout, 'stdout'))
            if process.stderr:
                tasks.append(read_stream(process.stderr, 'stderr'))
            
            for task in tasks:
                async for chunk in task:
                    yield chunk
        
        # Stream output
        async for chunk in read_all_streams():
            yield chunk
        
        # Wait for process to complete with timeout
        try:
            await asyncio.wait_for(process.wait(), timeout=timeout)
        except asyncio.TimeoutError:
            process.kill()
            yield f"data: {json.dumps({'type': 'error', 'data': f'Command timed out after {timeout} seconds'})}\n\n"
            return
        
        # Send exit code
        yield f"data: {json.dumps({'type': 'exit', 'code': process.returncode})}\n\n"
        
    except FileNotFoundError:
        yield f"data: {json.dumps({'type': 'error', 'data': f'Command not found: {command}'})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"
    finally:
        # Send completion marker
        yield "data: [DONE]\n\n"


@app.post("/api/command/execute")
async def execute_command(request: ExecuteCommandRequest):
    """
    Execute a shell command and stream the output in real-time
    
    Args:
        request: ExecuteCommandRequest containing command, working_dir, and timeout
    """
    try:
        # Validate working directory if provided
        if request.working_dir:
            working_dir_path = Path(request.working_dir)
            if not working_dir_path.exists():
                raise HTTPException(status_code=404, detail=f"Working directory not found: {request.working_dir}")
            if not working_dir_path.is_dir():
                raise HTTPException(status_code=400, detail=f"Path is not a directory: {request.working_dir}")
        
        # Return streaming response
        return StreamingResponse(
            stream_command_output(request.command, request.working_dir, request.timeout),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
