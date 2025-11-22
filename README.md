# MGX Demo - AI Agent Monitoring Platform

A modern agent monitoring platform built with React, TypeScript, and shadcn/ui, featuring real-time file system integration.

## Features

- 🎨 Modern UI with shadcn/ui components
- 💬 Chat interface for agent interaction
- 📁 Real-time file system browsing
- 🔍 Code viewer with syntax highlighting
- 👤 User authentication with Supabase
- 🚀 Fast development with Vite

## Technology Stack

### Frontend
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- React Query

### Backend
- Python 3.10+
- FastAPI
- uvicorn

## Quick Start

### Frontend

```shell
# Install dependencies
pnpm i

# Start development server
pnpm run dev
```

The frontend will run on `http://localhost:5173`

### Backend

```shell
# Navigate to backend directory
cd backend

# Install dependencies with uv
uv sync

# Start backend server
uv run python main.py
```

The backend will run on `http://localhost:8000`

## File System Integration

The application reads real file system data through a FastAPI backend.

### Configuration

In `src/App.tsx`, configure your project path:

```typescript
const [projectPath] = useState<string>('/path/to/your/project');
```

### Features

- Browse local file systems
- View file contents with syntax highlighting
- Automatic language detection (30+ languages)
- Smart filtering (ignores node_modules, .git, etc.)
- File refresh capability
- Error handling and loading states

## Build

```shell
pnpm run build
```

## Project Structure

```
├── src/
│   ├── components/        # React components
│   │   ├── ChatPanel.tsx
│   │   ├── CodePanel.tsx
│   │   └── ui/           # shadcn/ui components
│   ├── hooks/            # Custom React hooks
│   │   └── useFileTree.ts
│   ├── lib/              # Utility modules
│   │   ├── fileSystemApi.ts  # File system API client
│   │   └── supabase.ts
│   └── types/            # TypeScript types
├── backend/
│   ├── main.py          # FastAPI server
│   └── pyproject.toml   # Python dependencies
```

## License

MIT
