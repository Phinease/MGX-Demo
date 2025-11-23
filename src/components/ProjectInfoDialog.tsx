import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Code2,
  Rocket,
  FileEdit,
  Eye,
  MessageSquare,
  Container,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';

interface ProjectInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  techs: string[];
  files: string[];
}

interface IssueItem {
  type: 'known' | 'todo';
  title: string;
  description?: string;
}

export default function ProjectInfoDialog({ open, onOpenChange }: ProjectInfoDialogProps) {
  const features: FeatureItem[] = [
    {
      icon: <Code2 className="h-5 w-5 text-blue-500" />,
      title: '前端项目编程智能体',
      description: '基于 LangChain 和通义千问构建的智能编码助手，支持完整的项目开发流程',
      techs: ['LangChain', '通义千问 Qwen-Plus', 'Tool Calling', 'Stream Processing'],
      files: ['agent.ts', 'tools.ts', 'prompts.ts'],
    },
    {
      icon: <Rocket className="h-5 w-5 text-green-500" />,
      title: '前端项目自动化部署与预览',
      description: '实现项目初始化、依赖安装、验证、构建、运行的全自动化流程，支持多端口动态部署',
      techs: ['FastAPI', 'Process Management', 'Port Management (6300-6329)', 'Docker Bridge Network'],
      files: ['backend/main.py', 'PreviewFrame.tsx'],
    },
    {
      icon: <FileEdit className="h-5 w-5 text-purple-500" />,
      title: '项目内容实时预览与编辑',
      description: '可视化文件树浏览和 Monaco Editor 代码编辑，支持实时保存和刷新',
      techs: ['Monaco Editor', 'File System API', 'Real-time Sync', 'Language Detection'],
      files: ['EditorPanel.tsx', 'CodeEditor.tsx'],
    },
    {
      icon: <Eye className="h-5 w-5 text-orange-500" />,
      title: '智能体编码跟踪与审核',
      description: '实时追踪 AI 写入的文件内容，提供流式预览和历史记录功能',
      techs: ['Stream Monitoring', 'File Preview', 'History Tracking', 'Real-time Display'],
      files: ['CodingPreview.tsx', 'useCodingPreview.ts'],
    },
    {
      icon: <MessageSquare className="h-5 w-5 text-indigo-500" />,
      title: '用户级会话管理与数据持久化',
      description: '基于 Supabase 的完整会话系统，包含消息历史、项目状态、预览状态持久化',
      techs: ['Supabase Auth', 'PostgreSQL', 'Real-time Sync', 'State Management'],
      files: ['ConversationList.tsx', 'supabase.ts', 'App.tsx'],
    },
    {
      icon: <Container className="h-5 w-5 text-cyan-500" />,
      title: '容器化部署',
      description: 'Docker 容器化部署方案，支持前后端统一启动，端口映射（8000, 5173, 6300-6329）',
      techs: ['Docker', 'Docker Compose', 'Bridge Network', 'Multi-service Orchestration'],
      files: ['Dockerfile', 'docker-run.sh', 'docker-compose.yml'],
    },
  ];

  const knownIssues: IssueItem[] = [
    {
      type: 'known',
      title: '云端部署 localhost 访问问题',
      description: '已通过 PreviewFrame 组件的云端 IP 替换功能解决，支持全局配置云端服务器地址',
    },
    {
      type: 'known',
      title: 'Agent 工具调用响应延迟',
      description: 'LLM 响应时间较长，已通过流式输出优化用户体验',
    },
  ];

  const todoItems: IssueItem[] = [
    {
      type: 'todo',
      title: '支持更多项目模板',
      description: '当前仅支持 React + TypeScript 模板，计划支持 Vue、Next.js 等',
    },
    {
      type: 'todo',
      title: '增强错误恢复机制',
      description: '项目构建失败时自动回滚和重试机制',
    },
    {
      type: 'todo',
      title: '多人协作支持',
      description: '实现实时协作编辑和会话分享功能',
    },
    {
      type: 'todo',
      title: '项目导出功能',
      description: '支持将生成的项目打包下载',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Code2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">
                陈双瑞笔试项目
              </DialogTitle>
              <DialogDescription className="text-base mt-1">
                MGX-Demo - AI 驱动的前端开发平台
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="px-6 py-4 space-y-6">
            {/* 核心功能实现 */}
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-semibold">核心功能实现</h3>
              </div>

              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:border-primary/50 transition-colors bg-muted/20"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">{feature.icon}</div>
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold text-base">{feature.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>

                        {/* 技术栈 */}
                        <div className="flex flex-wrap gap-1.5">
                          {feature.techs.map((tech, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>

                        {/* 相关文件 */}
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground pt-1">
                          <Info className="h-3 w-3" />
                          <span>参考文件:</span>
                          {feature.files.map((file, idx) => (
                            <code
                              key={idx}
                              className="px-1.5 py-0.5 bg-muted rounded font-mono"
                            >
                              {file}
                            </code>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            {/* 技术亮点 */}
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">技术亮点</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                  <div className="font-medium text-sm mb-1">流式响应处理</div>
                  <div className="text-xs text-muted-foreground">
                    实现 Agent 工具调用和内容的实时流式输出
                  </div>
                </div>
                <div className="p-3 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
                  <div className="font-medium text-sm mb-1">多进程管理</div>
                  <div className="text-xs text-muted-foreground">
                    后端支持同时运行 30 个独立项目实例
                  </div>
                </div>
                <div className="p-3 border rounded-lg bg-purple-50/50 dark:bg-purple-950/20">
                  <div className="font-medium text-sm mb-1">状态持久化</div>
                  <div className="text-xs text-muted-foreground">
                    完整的会话状态保存，支持断点续传
                  </div>
                </div>
                <div className="p-3 border rounded-lg bg-orange-50/50 dark:bg-orange-950/20">
                  <div className="font-medium text-sm mb-1">云端适配</div>
                  <div className="text-xs text-muted-foreground">
                    支持云端 IP 配置，解决容器化部署预览问题
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* 已知问题 */}
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold">已知问题</h3>
              </div>
              <div className="space-y-2">
                {knownIssues.map((issue, index) => (
                  <div
                    key={index}
                    className="p-3 border border-orange-200 dark:border-orange-900 rounded-lg bg-orange-50/30 dark:bg-orange-950/20"
                  >
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{issue.title}</div>
                        {issue.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {issue.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            {/* 未实现需求 */}
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <Info className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">未实现需求（计划中）</h3>
              </div>
              <div className="space-y-2">
                {todoItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 border border-blue-200 dark:border-blue-900 rounded-lg bg-blue-50/30 dark:bg-blue-950/20"
                  >
                    <div className="flex items-start space-x-2">
                      <div className="h-4 w-4 border-2 border-blue-500 rounded mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.title}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 底部信息 */}
            <div className="pt-4 pb-2 text-center space-y-2">
              <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                <span>⚡</span>
                <span>Built with React + TypeScript + FastAPI</span>
                <span>•</span>
                <span>Powered by LangChain & Qwen</span>
              </div>
              <div className="text-xs text-muted-foreground">
                © 2025 陈双瑞 - MGX-Demo 笔试项目
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

