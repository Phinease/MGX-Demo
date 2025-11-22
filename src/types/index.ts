export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  input?: Record<string, unknown>;
  output?: string;
  timestamp: string;
}

export interface MessageContent {
  type: 'text' | 'tool_call' | 'custom';
  content: string;
  toolCall?: ToolCall;
}

export interface Message {
  id: string;
  role: 'user' | 'agent';
  contents: MessageContent[];
  timestamp: string;
}

export interface Conversation {
  id: string;
  messages: Message[];
}

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  language?: string;
  children?: FileNode[];
}