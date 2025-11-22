import { Conversation, FileNode } from '@/types';

export const mockConversation: Conversation = {
  id: 'conv-1',
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      contents: [
        {
          type: 'text',
          content: 'Please build an agent monitoring platform for me.',
        },
      ],
      timestamp: '2025-11-21T10:00:00Z',
    },
    {
      id: 'msg-2',
      role: 'agent',
      contents: [
        {
          type: 'text',
          content:
            'I can help you build an agent monitoring platform. To create the right plan, I need to clarify a few key points:\n\n1. What type of agents do you want to monitor? (AI agents, software agents, service agents, or something else?)\n2. What key metrics should the platform display? (status/health, performance metrics, activity logs, error rates, response times, or other specific metrics?)\n3. Do you need real-time monitoring with live updates, or is periodic refresh sufficient?\n4. Should the platform support multiple agents simultaneously, and do you need features like filtering, searching, or grouping agents?\n\nPlease provide these details so I can create a comprehensive monitoring dashboard for you.',
        },
      ],
      timestamp: '2025-11-21T10:00:05Z',
    },
    {
      id: 'msg-3',
      role: 'user',
      contents: [
        {
          type: 'text',
          content:
            'AI agents status/health, performance metrics, activity logs, error rates, response times, llm and tool traces periodic refresh is sufficient the platform support multiple agents simultaneously, like any agents and multi-agents',
        },
      ],
      timestamp: '2025-11-21T10:01:00Z',
    },
    {
      id: 'msg-4',
      role: 'agent',
      contents: [
        {
          type: 'text',
          content:
            '1. Dashboard overview page - Display all AI agents with their current status (active/inactive/error), key performance metrics (response times, success rates), and quick statistics summary\n2. Agent list view - Show multiple agents simultaneously with filtering and search capabilities, display each agent\'s health status, error rates, and last activity timestamp\n3. Detailed agent monitoring page - Individual agent view showing comprehensive performance metrics, activity logs with timestamps, error tracking, and response time charts\n4. LLM and tool traces viewer - Display execution traces for each agent including LLM calls, tool usage, input/output data, and execution timeline\n5. Real-time metrics dashboard - Performance charts and graphs showing trends over time for response times, error rates, and agent activity patterns with periodic refresh capability',
        },
      ],
      timestamp: '2025-11-21T10:01:10Z',
    },
    {
      id: 'msg-5',
      role: 'user',
      contents: [
        {
          type: 'text',
          content: 'Approve plan:',
        },
      ],
      timestamp: '2025-11-21T10:02:00Z',
    },
    {
      id: 'msg-6',
      role: 'agent',
      contents: [
        {
          type: 'text',
          content:
            "Great! The plan is approved. Now I'll search for an appropriate template to start building the AI agent monitoring platform.",
        },
        {
          type: 'tool_call',
          content: 'Searching for template...',
          toolCall: {
            id: 'tool-1',
            name: 'FrontendEngineer.search_template',
            status: 'completed',
            input: { query: 'dashboard with shadcn-ui' },
            output: 'Template found and initialized',
            timestamp: '2025-11-21T10:02:05Z',
          },
        },
        {
          type: 'text',
          content: "Now I'll read the README.md to understand the template structure, then create a comprehensive todo.md file for the AI agent monitoring platform.",
        },
        {
          type: 'tool_call',
          content: 'Reading file...',
          toolCall: {
            id: 'tool-2',
            name: 'Editor.read',
            status: 'completed',
            input: { path: 'README.md' },
            output: 'File content loaded successfully',
            timestamp: '2025-11-21T10:02:08Z',
          },
        },
        {
          type: 'text',
          content: "Perfect! I understand the template structure. Now I'll create a todo.md file outlining all the components and pages needed for the AI agent monitoring platform.",
        },
        {
          type: 'tool_call',
          content: 'Writing file...',
          toolCall: {
            id: 'tool-3',
            name: 'Editor.write',
            status: 'completed',
            input: { path: 'todo.md' },
            output: 'File written successfully',
            timestamp: '2025-11-21T10:02:12Z',
          },
        },
      ],
      timestamp: '2025-11-21T10:02:15Z',
    },
  ],
};

export const mockFileTree: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    path: 'src',
    children: [
      {
        name: 'components',
        type: 'folder',
        path: 'src/components',
        children: [
          {
            name: 'Dashboard.tsx',
            type: 'file',
            path: 'src/components/Dashboard.tsx',
            language: 'typescript',
            content: `import { Card } from '@/components/ui/card';

export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Agent Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold">Active Agents</h3>
          <p className="text-2xl">12</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold">Avg Response Time</h3>
          <p className="text-2xl">245ms</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold">Success Rate</h3>
          <p className="text-2xl">98.5%</p>
        </Card>
      </div>
    </div>
  );
}`,
          },
          {
            name: 'AgentCard.tsx',
            type: 'file',
            path: 'src/components/AgentCard.tsx',
            language: 'typescript',
            content: `import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AgentCardProps {
  name: string;
  status: 'active' | 'inactive' | 'error';
  responseTime: number;
}

export default function AgentCard({ name, status, responseTime }: AgentCardProps) {
  return (
    <Card className="p-4">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold">{name}</h3>
        <Badge variant={status === 'active' ? 'default' : 'destructive'}>
          {status}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        Response: {responseTime}ms
      </p>
    </Card>
  );
}`,
          },
        ],
      },
      {
        name: 'App.tsx',
        type: 'file',
        path: 'src/App.tsx',
        language: 'typescript',
        content: `import Dashboard from './components/Dashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Dashboard />
    </div>
  );
}`,
      },
    ],
  },
  {
    name: 'package.json',
    type: 'file',
    path: 'package.json',
    language: 'json',
    content: `{
  "name": "agent-monitoring-platform",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@tanstack/react-query": "^5.0.0"
  }
}`,
  },
];