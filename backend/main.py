from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pathlib import Path
from typing import List, Optional, Dict
import os
import asyncio
import subprocess
import json
import shutil
import socket
from pydantic import BaseModel

app = FastAPI(title="File System API")

# Process management: store running development server processes
running_processes: Dict[str, dict] = {}

# ================== Path Configuration ==================
# Auto-detect project root directory (parent directory of backend files)
BACKEND_DIR = Path(__file__).parent
PROJECT_ROOT = BACKEND_DIR.parent

# Path configuration
PATH_CONFIG = {
    "template_path": str((PROJECT_ROOT / "shadcn-ui").absolute()),
    "projects_base_path": str((PROJECT_ROOT / "generated-projects").absolute()),
    "project_root": str(PROJECT_ROOT.absolute()),
}

# Configure CORS
# Support local development and cloud deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Note: must be set to False when using "*"
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


@app.get("/api/config/paths")
def get_path_config() -> dict:
    """
    Get path configuration information
    
    Returns:
        Configuration information including template path, project base path, etc.
    """
    return {
        "template_path": PATH_CONFIG["template_path"],
        "projects_base_path": PATH_CONFIG["projects_base_path"],
        "project_root": PATH_CONFIG["project_root"],
        "backend_dir": str(BACKEND_DIR.absolute()),
    }


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


# ================== New Project Management APIs ==================

class InitializeProjectRequest(BaseModel):
    template_path: str
    project_name: str
    target_base_path: str


@app.post("/api/project/initialize")
def initialize_project(request: InitializeProjectRequest) -> dict:
    """
    Initialize a new project by copying the template directory
    
    Args:
        request: InitializeProjectRequest containing template path, project name, and target base path
    """
    try:
        template_path = Path(request.template_path)
        target_base_path = Path(request.target_base_path)
        
        # Validate template path
        if not template_path.exists():
            raise HTTPException(status_code=404, detail=f"Template path not found: {request.template_path}")
        if not template_path.is_dir():
            raise HTTPException(status_code=400, detail=f"Template path is not a directory: {request.template_path}")
        
        # Create target base directory if it doesn't exist
        target_base_path.mkdir(parents=True, exist_ok=True)
        
        # Create new project directory
        new_project_path = target_base_path / request.project_name
        
        if new_project_path.exists():
            raise HTTPException(status_code=400, detail=f"Project directory already exists: {str(new_project_path)}")
        
        # Copy template to new location
        shutil.copytree(template_path, new_project_path, 
                       ignore=shutil.ignore_patterns('node_modules', '.git', 'dist', 'build', '.mgx'))
        
        return {
            "success": True,
            "message": "Project initialized successfully",
            "project_path": str(new_project_path.absolute()),
            "project_name": request.project_name
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize project: {str(e)}")


class ProjectPathRequest(BaseModel):
    project_path: str


@app.post("/api/project/install")
async def install_project_dependencies(request: ProjectPathRequest):
    """
    Install project dependencies using pnpm install
    
    Args:
        request: ProjectPathRequest containing the project path
    """
    try:
        project_path = Path(request.project_path)
        
        # Validate project path
        if not project_path.exists():
            raise HTTPException(status_code=404, detail=f"Project path not found: {request.project_path}")
        if not project_path.is_dir():
            raise HTTPException(status_code=400, detail=f"Path is not a directory: {request.project_path}")
        
        # Check if package.json exists
        package_json = project_path / "package.json"
        if not package_json.exists():
            raise HTTPException(status_code=400, detail=f"package.json not found in: {request.project_path}")
        
        # Execute pnpm install
        command = "pnpm install"
        
        return StreamingResponse(
            stream_command_output(command, str(project_path), timeout=600),
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
        raise HTTPException(status_code=500, detail=f"Failed to install dependencies: {str(e)}")


@app.post("/api/project/validate")
async def validate_project(request: ProjectPathRequest):
    """
    Validate project using ESLint
    
    Args:
        request: ProjectPathRequest containing the project path
    """
    try:
        project_path = Path(request.project_path)
        
        # Validate project path
        if not project_path.exists():
            raise HTTPException(status_code=404, detail=f"Project path not found: {request.project_path}")
        if not project_path.is_dir():
            raise HTTPException(status_code=400, detail=f"Path is not a directory: {request.project_path}")
        
        # Execute ESLint
        command = "pnpm exec eslint --quiet ./src"
        
        return StreamingResponse(
            stream_command_output(command, str(project_path), timeout=300),
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
        raise HTTPException(status_code=500, detail=f"Failed to validate project: {str(e)}")


class BuildProjectRequest(BaseModel):
    project_path: str


@app.post("/api/project/build")
async def build_project(request: BuildProjectRequest):
    """
    Build the project for production using pnpm build
    
    Args:
        request: BuildProjectRequest containing the project path
    """
    try:
        project_path = Path(request.project_path)
        
        # Validate project path
        if not project_path.exists():
            raise HTTPException(status_code=404, detail=f"Project path not found: {request.project_path}")
        if not project_path.is_dir():
            raise HTTPException(status_code=400, detail=f"Path is not a directory: {request.project_path}")
        
        # Check if package.json exists
        package_json = project_path / "package.json"
        if not package_json.exists():
            raise HTTPException(status_code=400, detail=f"package.json not found in: {request.project_path}")
        
        # Execute pnpm build
        command = "pnpm build"
        timeout = 600  # 10 minutes for build
        
        return StreamingResponse(
            stream_command_output(command, str(project_path), timeout=timeout),
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
        raise HTTPException(status_code=500, detail=f"Failed to build project: {str(e)}")


def find_available_port(start_port: int = 6300, count: int = 1) -> List[int]:
    """
    Find available ports starting from start_port
    Designed to work in Linux/Docker environments
    
    Args:
        start_port: Port to start searching from (default: 6300)
        count: Number of ports to find
        
    Returns:
        List of available port numbers
    """
    available_ports = []
    port = start_port
    max_port = start_port + 30  # Limit search to 30 ports (6300-6329)
    
    while len(available_ports) < count and port < max_port:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                # Set socket options for better compatibility in Linux/Docker
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind(('0.0.0.0', port))
                available_ports.append(port)
        except OSError:
            pass
        port += 1
    
    return available_ports


@app.get("/api/project/find-port")
def find_port(start_port: int = 6300, count: int = 1) -> dict:
    """
    Find available ports
    
    Args:
        start_port: Port to start searching from
        count: Number of ports to find
    """
    try:
        ports = find_available_port(start_port, count)
        
        if len(ports) < count:
            raise HTTPException(
                status_code=400, 
                detail=f"Could only find {len(ports)} available ports out of {count} requested"
            )
        
        return {
            "ports": ports,
            "start_port": start_port,
            "count": len(ports)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to find available port: {str(e)}")


class RunProjectRequest(BaseModel):
    project_path: str
    port: Optional[int] = None


@app.post("/api/project/run")
async def run_project(request: RunProjectRequest):
    """
    Run the project development server in background
    
    Args:
        request: RunProjectRequest containing the project path and optional port
    """
    try:
        project_path = Path(request.project_path)
        
        # Validate project path
        if not project_path.exists():
            raise HTTPException(status_code=404, detail=f"Project path not found: {request.project_path}")
        if not project_path.is_dir():
            raise HTTPException(status_code=400, detail=f"Path is not a directory: {request.project_path}")
        
        # Check if package.json exists
        package_json = project_path / "package.json"
        if not package_json.exists():
            raise HTTPException(status_code=400, detail=f"package.json not found in: {request.project_path}")
        
        # Check if already running
        project_path_str = str(project_path.absolute())
        for proc_id, proc_info in running_processes.items():
            if proc_info['project_path'] == project_path_str:
                # Check if process is still running
                if proc_info['process'].poll() is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Project already running on port {proc_info['port']} with process ID {proc_id}"
                    )
                else:
                    # Process died, remove it
                    del running_processes[proc_id]
                    break
        
        # Find available port if not specified
        if request.port is None:
            ports = find_available_port(6300, 1)
            if not ports:
                raise HTTPException(status_code=400, detail="No available ports found in range 6300-6329")
            port = ports[0]
        else:
            port = request.port
            # Check if port is available
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    # Set socket options for better compatibility in Linux/Docker
                    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                    s.bind(('0.0.0.0', port))
            except OSError:
                raise HTTPException(status_code=400, detail=f"Port {port} is already in use")
        
        # Start dev server in background
        import shlex
        command = f"pnpm dev --port {port}"
        cmd_parts = shlex.split(command)
        
        process = subprocess.Popen(
            cmd_parts,
            cwd=str(project_path),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Generate process ID
        process_id = f"proc-{project_path.name}-{port}"
        
        # Store process info
        running_processes[process_id] = {
            'process': process,
            'project_path': project_path_str,
            'port': port,
            'command': command,
            'pid': process.pid
        }
        
        # Wait a bit to check if process started successfully
        await asyncio.sleep(2)
        
        if process.poll() is not None:
            # Process already terminated
            del running_processes[process_id]
            raise HTTPException(status_code=500, detail="Failed to start development server")
        
        return {
            "success": True,
            "process_id": process_id,
            "project_path": project_path_str,
            "port": port,
            "url": f"http://localhost:{port}",
            "command": command,
            "pid": process.pid
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run project: {str(e)}")


class StopProjectRequest(BaseModel):
    process_id: Optional[str] = None
    project_path: Optional[str] = None


@app.post("/api/project/stop")
def stop_project(request: StopProjectRequest):
    """
    Stop a running development server
    
    Args:
        request: StopProjectRequest containing either process_id or project_path
    """
    try:
        if not request.process_id and not request.project_path:
            raise HTTPException(status_code=400, detail="Either process_id or project_path must be provided")
        
        # Find the process to stop
        process_to_stop = None
        process_id_to_remove = None
        
        if request.process_id:
            if request.process_id in running_processes:
                process_to_stop = running_processes[request.process_id]
                process_id_to_remove = request.process_id
        elif request.project_path:
            project_path_abs = str(Path(request.project_path).absolute())
            for proc_id, proc_info in running_processes.items():
                if proc_info['project_path'] == project_path_abs:
                    process_to_stop = proc_info
                    process_id_to_remove = proc_id
                    break
        
        if not process_to_stop:
            raise HTTPException(status_code=404, detail="No running process found")
        
        # Stop the process
        process = process_to_stop['process']
        
        if process.poll() is None:
            # Process is still running, terminate it
            try:
                # Try graceful termination first
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    # Force kill if termination didn't work
                    process.kill()
                    process.wait()
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to stop process: {str(e)}")
        
        # Remove from running processes
        if process_id_to_remove:
            del running_processes[process_id_to_remove]
        
        return {
            "success": True,
            "message": "Development server stopped successfully",
            "process_id": process_id_to_remove
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop project: {str(e)}")


@app.get("/api/project/list-running")
def list_running_projects():
    """
    List all running development servers
    """
    try:
        # Clean up dead processes
        dead_processes = []
        for proc_id, proc_info in running_processes.items():
            if proc_info['process'].poll() is not None:
                dead_processes.append(proc_id)
        
        for proc_id in dead_processes:
            del running_processes[proc_id]
        
        # Return info about running processes
        result = []
        for proc_id, proc_info in running_processes.items():
            result.append({
                "process_id": proc_id,
                "project_path": proc_info['project_path'],
                "port": proc_info['port'],
                "url": f"http://localhost:{proc_info['port']}",
                "pid": proc_info['pid']
            })
        
        return {
            "running_projects": result,
            "count": len(result)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list running projects: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
