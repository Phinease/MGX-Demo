#!/usr/bin/env python3
"""
Quick start script for the backend server
"""
import subprocess
import sys

def main():
    print("Starting FastAPI backend server...")
    print("Server will run on http://localhost:8000")
    print("Press Ctrl+C to stop the server\n")
    
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "main:app",
            "--reload",
            "--host", "0.0.0.0",
            "--port", "8000"
        ], check=True)
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except subprocess.CalledProcessError as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

