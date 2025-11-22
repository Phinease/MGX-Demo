import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Message, MessageContent } from '@/types';
import { streamAgent, convertToLangChainMessages } from '@/lib/agent';
import { toast } from 'sonner';

interface ChatPanelProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  // Coding preview callbacks
  onFileWriteStart?: (filePath: string, fileContent: string) => void;
  onFileWriteContent?: (content: string) => void;
  onFileWriteComplete?: () => void;
}

export default function ChatPanel({
  messages,
  setMessages,
  onFileWriteStart,
  onFileWriteContent,
  onFileWriteComplete,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (input.trim() && !isStreaming) {
      const userInput = input.trim();
      setInput('');
      
      // Add user message
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        contents: [{ type: 'text', content: userInput }],
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      setIsStreaming(true);

      // Create agent message that will be updated with streaming chunks
      const agentMessageId = `msg-${Date.now() + 1}`;
      let agentMessage: Message = {
        id: agentMessageId,
        role: 'agent',
        contents: [],
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, agentMessage]);

      try {
        // Convert message history for LangChain
        const chatHistory = convertToLangChainMessages(
          messages.map(m => ({
            role: m.role,
            content: m.contents.filter(c => c.type === 'text').map(c => c.content).join('\n'),
          }))
        );

        console.log('[ChatPanel] Starting agent stream...');

        // Stream agent response
        const textChunks: string[] = [];
        const toolCalls = new Map<string, MessageContent>();
        const customUpdates: string[] = [];
        let chunkCount = 0;

        for await (const chunk of streamAgent(userInput, chatHistory)) {
          chunkCount++;
          console.log(`[ChatPanel] Chunk #${chunkCount}:`, chunk);

          // ============================================
          // 处理文件写入开始事件
          // ============================================
          if (chunk.type === 'file_write_start') {
            console.log('[ChatPanel] File write start:', chunk.filePath);
            
            // 触发文件预览（不在对话框中显示详细内容）
            if (onFileWriteStart && chunk.filePath && chunk.fileContent) {
              onFileWriteStart(chunk.filePath, chunk.fileContent);
            }
            
            // 在对话框中只显示简短提示
            customUpdates.push(`📝 Writing file: ${chunk.filePath}`);
            
            setMessages(prev => {
              const newMessages = [...prev];
              const msgIndex = newMessages.findIndex(m => m.id === agentMessageId);
              if (msgIndex !== -1) {
                const contents: MessageContent[] = [
                  ...Array.from(toolCalls.values()),
                ];
                
                if (customUpdates.length > 0) {
                  contents.push({ type: 'custom', content: customUpdates.join('\n') });
                }
                
                if (textChunks.length > 0) {
                  contents.push({ type: 'text', content: textChunks.join('') });
                }
                
                newMessages[msgIndex] = {
                  ...newMessages[msgIndex],
                  contents,
                };
              }
              return newMessages;
            });
          }
          // ============================================
          // 处理文件写入内容流式更新
          // ============================================
          else if (chunk.type === 'file_write_content') {
            console.log('[ChatPanel] File write content chunk');
            
            // 触发预览组件更新（不在对话框中显示）
            if (onFileWriteContent && chunk.content) {
              onFileWriteContent(chunk.content);
            }
          }
          // ============================================
          // 处理自定义更新（工具的 config.writer 输出）
          // ============================================
          else if (chunk.type === 'custom') {
            console.log('[ChatPanel] Custom update:', chunk.content);
            customUpdates.push(chunk.content);
            
            setMessages(prev => {
              const newMessages = [...prev];
              const msgIndex = newMessages.findIndex(m => m.id === agentMessageId);
              if (msgIndex !== -1) {
                const contents: MessageContent[] = [
                  ...Array.from(toolCalls.values()),
                ];
                
                if (customUpdates.length > 0) {
                  contents.push({ type: 'custom', content: customUpdates.join('\n') });
                }
                
                if (textChunks.length > 0) {
                  contents.push({ type: 'text', content: textChunks.join('') });
                }
                
                newMessages[msgIndex] = {
                  ...newMessages[msgIndex],
                  contents,
                };
              }
              return newMessages;
            });
          }
          // ============================================
          // 处理完整文本（向后兼容）
          // ============================================
          else if (chunk.type === 'text') {
            textChunks.push(chunk.content);
            const fullText = textChunks.join('');
            
            console.log('[ChatPanel] Received text chunk:', chunk.content);
            
            setMessages(prev => {
              const newMessages = [...prev];
              const msgIndex = newMessages.findIndex(m => m.id === agentMessageId);
              if (msgIndex !== -1) {
                const contents: MessageContent[] = [
                  ...Array.from(toolCalls.values()),
                ];
                
                if (customUpdates.length > 0) {
                  contents.push({ type: 'custom', content: customUpdates.join('\n') });
                }
                
                contents.push({ type: 'text', content: fullText });
                
                newMessages[msgIndex] = {
                  ...newMessages[msgIndex],
                  contents,
                };
              }
              return newMessages;
            });
          }
          // ============================================
          // 处理工具调用
          // ============================================
          else if (chunk.type === 'tool_call') {
            console.log('[ChatPanel] Tool call:', chunk.toolName, chunk.toolInput);
            
            const toolCallId = `tool-${chunk.timestamp}-${chunk.toolName}`;
            const toolCallContent: MessageContent = {
              type: 'tool_call',
              content: chunk.content,
              toolCall: {
                id: toolCallId,
                name: chunk.toolName || 'unknown',
                status: 'running',
                input: chunk.toolInput,
                timestamp: chunk.timestamp,
              },
            };
            
            toolCalls.set(chunk.toolName || 'unknown', toolCallContent);
            
            setMessages(prev => {
              const newMessages = [...prev];
              const msgIndex = newMessages.findIndex(m => m.id === agentMessageId);
              if (msgIndex !== -1) {
                const contents: MessageContent[] = [
                  ...Array.from(toolCalls.values()),
                ];
                
                if (customUpdates.length > 0) {
                  contents.push({ type: 'custom', content: customUpdates.join('\n') });
                }
                
                if (textChunks.length > 0) {
                  contents.push({ type: 'text', content: textChunks.join('') });
                }
                
                newMessages[msgIndex] = {
                  ...newMessages[msgIndex],
                  contents,
                };
              }
              return newMessages;
            });
          }
          // ============================================
          // 处理工具调用结果
          // ============================================
          else if (chunk.type === 'tool_result') {
            console.log('[ChatPanel] Tool result:', chunk.toolName, chunk.toolOutput);
            
            const toolCall = toolCalls.get(chunk.toolName || 'unknown');
            if (toolCall && toolCall.toolCall) {
              // 检查是否是错误结果
              const isError = typeof chunk.toolOutput === 'string' && chunk.toolOutput.startsWith('Error:');
              toolCall.toolCall.status = isError ? 'failed' : 'completed';
              toolCall.toolCall.output = chunk.toolOutput;
              
              setMessages(prev => {
                const newMessages = [...prev];
                const msgIndex = newMessages.findIndex(m => m.id === agentMessageId);
                if (msgIndex !== -1) {
                  const contents: MessageContent[] = [
                    ...Array.from(toolCalls.values()),
                  ];
                  
                  if (customUpdates.length > 0) {
                    contents.push({ type: 'custom', content: customUpdates.join('\n') });
                  }
                  
                  if (textChunks.length > 0) {
                    contents.push({ type: 'text', content: textChunks.join('') });
                  }
                  
                  newMessages[msgIndex] = {
                    ...newMessages[msgIndex],
                    contents,
                  };
                }
                return newMessages;
              });
            }
          }
          // ============================================
          // 处理步骤信息
          // ============================================
          else if (chunk.type === 'step') {
            console.log('[ChatPanel] Step:', chunk.stepName);
          }
          // ============================================
          // 处理错误
          // ============================================
          else if (chunk.type === 'error') {
            console.error('[ChatPanel] Error chunk:', chunk.content);
            toast.error(chunk.content);
          }
        }

        console.log(`[ChatPanel] Stream completed. Total chunks: ${chunkCount}`);
        console.log(`[ChatPanel] Text chunks collected: ${textChunks.length}, Tool calls: ${toolCalls.size}`);
        
        // 通知文件写入完成
        if (onFileWriteComplete) {
          onFileWriteComplete();
        }
        
        // 如果没有生成任何内容，显示提示消息
        if (textChunks.length === 0 && toolCalls.size === 0) {
          console.warn('[ChatPanel] No content generated');
          setMessages(prev => {
            const newMessages = [...prev];
            const msgIndex = newMessages.findIndex(m => m.id === agentMessageId);
            if (msgIndex !== -1) {
              newMessages[msgIndex] = {
                ...newMessages[msgIndex],
                contents: [{
                  type: 'text',
                  content: 'I processed your request, but did not generate a response.',
                }],
              };
            }
            return newMessages;
          });
        }
      } catch (error) {
        console.error('[ChatPanel] Agent error:', error);
        toast.error('Failed to get agent response: ' + (error instanceof Error ? error.message : String(error)));
        
        // Add error message
        setMessages(prev => {
          const newMessages = [...prev];
          const msgIndex = newMessages.findIndex(m => m.id === agentMessageId);
          if (msgIndex !== -1) {
            newMessages[msgIndex] = {
              ...newMessages[msgIndex],
              contents: [{
                type: 'text',
                content: 'Sorry, I encountered an error while processing your request.',
              }],
            };
          }
          return newMessages;
        });
      } finally {
        setIsStreaming(false);
        console.log('[ChatPanel] Streaming finished');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderToolCall = (content: MessageContent) => {
    if (!content.toolCall) return null;

    const { name, status, input, output } = content.toolCall;

    return (
      <Card className="p-3 mt-2 bg-muted/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <code className="text-sm font-mono text-primary">{name}</code>
            {status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
            {status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
          </div>
          <Badge variant={status === 'completed' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'}>
            {status}
          </Badge>
        </div>
        {input && (
          <div className="text-xs text-muted-foreground mb-1">
            <span className="font-semibold">Input:</span> {JSON.stringify(input)}
          </div>
        )}
        {output && (
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold">Output:</span> {output}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background border-r">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
              <div className="text-xs font-semibold mb-1 opacity-70">
                {message.role === 'user' ? 'You' : 'Agent'}
              </div>
              {message.contents.map((content, idx) => (
                <div key={idx}>
                  {content.type === 'text' && (
                    <div className="text-sm whitespace-pre-wrap">{content.content}</div>
                  )}
                  {content.type === 'tool_call' && (
                    <>
                      <div className="text-sm italic text-muted-foreground">{content.content}</div>
                      {renderToolCall(content)}
                    </>
                  )}
                  {content.type === 'custom' && (
                    <Card className="p-3 mt-2 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                      <div className="text-xs font-semibold mb-1 text-blue-700 dark:text-blue-300">
                        🔄 Tool Progress
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 whitespace-pre-wrap font-mono">
                        {content.content}
                      </div>
                    </Card>
                  )}
                </div>
              ))}
              <div className="text-xs opacity-50 mt-2">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex space-x-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[60px] resize-none"
          />
          <Button onClick={handleSend} disabled={!input.trim() || isStreaming} size="icon" className="h-[60px] w-[60px]">
            {isStreaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}