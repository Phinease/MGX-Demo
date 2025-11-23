import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, CheckCircle2, XCircle, Square, ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import { Message, MessageContent } from '@/types';
import { streamAgent, convertToLangChainMessages } from '@/lib/agent';
import { toast } from 'sonner';

interface ChatPanelProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  // Conversation management
  currentConversationId: string | null;
  onSaveMessage?: (conversationId: string, message: Message) => void;
  // Coding preview callbacks
  onFileWriteStart?: (filePath: string, fileContent: string) => void;
  onFileWriteContent?: (content: string) => void;
  onFileWriteComplete?: () => void;
  // Project run callbacks
  onProjectRun?: (projectInfo: {
    url: string;
    processId: string;
    projectPath: string;
    port: number;
  }) => void;
  onProjectStop?: () => void;
  // Project initialization callback
  onProjectInit?: (projectPath: string, projectName: string) => void;
}

export default function ChatPanel({
  messages,
  setMessages,
  currentConversationId,
  onSaveMessage,
  onFileWriteStart,
  onFileWriteContent,
  onFileWriteComplete,
  onProjectRun,
  onProjectStop,
  onProjectInit,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

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
      
      // Save user message to conversation
      if (currentConversationId && onSaveMessage) {
        onSaveMessage(currentConversationId, userMessage);
      }
      setIsStreaming(true);

      // Create AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

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

        for await (const chunk of streamAgent(userInput, chatHistory, abortController.signal)) {
          chunkCount++;
          console.log(`[ChatPanel] Chunk #${chunkCount}:`, chunk);

          // ============================================
          // Handle file write start event
          // ============================================
          if (chunk.type === 'file_write_start') {
            console.log('[ChatPanel] File write start:', chunk.filePath);
            
            // Trigger file preview (detailed content not shown in dialog)
            if (onFileWriteStart && chunk.filePath && chunk.fileContent) {
              onFileWriteStart(chunk.filePath, chunk.fileContent);
            }
            
            // Show only brief hint in dialog
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
          // Handle file write content streaming updates
          else if (chunk.type === 'file_write_content') {
            console.log('[ChatPanel] File write content chunk');
            
            // Trigger preview component update (not shown in dialog)
            if (onFileWriteContent && chunk.content) {
              onFileWriteContent(chunk.content);
            }
          }
          // Handle custom updates (tool's config.writer output)
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
          // Handle complete text (backward compatibility)
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
          // Handle tool call
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
          // Handle tool call result
          else if (chunk.type === 'tool_result') {
            console.log('[ChatPanel] Tool result:', chunk.toolName, chunk.toolOutput);
            
            // Check if initialize_project tool call succeeded
            if (chunk.toolName === 'initialize_project' && chunk.toolOutput) {
              try {
                const output = typeof chunk.toolOutput === 'string' 
                  ? JSON.parse(chunk.toolOutput) 
                  : chunk.toolOutput;
                
                if (output.success && output.projectPath && onProjectInit) {
                  onProjectInit(output.projectPath, output.projectName);
                }
              } catch (e) {
                console.error('[ChatPanel] Failed to parse initialize_project output:', e);
              }
            }
            
            // Check if run_project tool call succeeded
            if (chunk.toolName === 'run_project' && chunk.toolOutput) {
              try {
                const output = typeof chunk.toolOutput === 'string' 
                  ? JSON.parse(chunk.toolOutput) 
                  : chunk.toolOutput;
                
                if (output.success && output.url && onProjectRun) {
                  onProjectRun({
                    url: output.url,
                    processId: output.processId,
                    projectPath: output.projectPath,
                    port: output.port,
                  });
                }
              } catch (e) {
                console.error('[ChatPanel] Failed to parse run_project output:', e);
              }
            }
            
            // Check if stop_project tool call succeeded
            if (chunk.toolName === 'stop_project' && chunk.toolOutput) {
              try {
                const output = typeof chunk.toolOutput === 'string' 
                  ? JSON.parse(chunk.toolOutput) 
                  : chunk.toolOutput;
                
                if (output.success && onProjectStop) {
                  onProjectStop();
                }
              } catch (e) {
                console.error('[ChatPanel] Failed to parse stop_project output:', e);
              }
            }
            
            const toolCall = toolCalls.get(chunk.toolName || 'unknown');
            if (toolCall && toolCall.toolCall) {
              // Check if result is an error
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
          // Handle step information
          // ============================================
          else if (chunk.type === 'step') {
            console.log('[ChatPanel] Step:', chunk.stepName);
          }
          // ============================================
          // Handle error
          // ============================================
          else if (chunk.type === 'error') {
            console.error('[ChatPanel] Error chunk:', chunk.content);
            toast.error(chunk.content);
          }
        }

        console.log(`[ChatPanel] Stream completed. Total chunks: ${chunkCount}`);
        console.log(`[ChatPanel] Text chunks collected: ${textChunks.length}, Tool calls: ${toolCalls.size}`);
        
        // Notify file write completion
        if (onFileWriteComplete) {
          onFileWriteComplete();
        }
        
        // Save agent message to conversation
        if (currentConversationId && onSaveMessage && (textChunks.length > 0 || toolCalls.size > 0)) {
          const finalAgentMessage: Message = {
            id: agentMessageId,
            role: 'agent',
            contents: [
              ...Array.from(toolCalls.values()),
              ...(customUpdates.length > 0 ? [{ type: 'custom' as const, content: customUpdates.join('\n') }] : []),
              ...(textChunks.length > 0 ? [{ type: 'text' as const, content: textChunks.join('') }] : []),
            ],
            timestamp: new Date().toISOString(),
          };
          onSaveMessage(currentConversationId, finalAgentMessage);
        }
        
        // If no content was generated, show a hint message
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
        
        // Check if it was an abort
        if (abortController.signal.aborted) {
          toast.info('Request was stopped by user');
          
          // Add stopped message
          setMessages(prev => {
            const newMessages = [...prev];
            const msgIndex = newMessages.findIndex(m => m.id === agentMessageId);
            if (msgIndex !== -1) {
              const currentContents = newMessages[msgIndex].contents;
              newMessages[msgIndex] = {
                ...newMessages[msgIndex],
                contents: [
                  ...currentContents,
                  {
                    type: 'text',
                    content: '\n\n[Request stopped by user]',
                  }
                ],
              };
            }
            return newMessages;
          });
        } else {
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
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
        console.log('[ChatPanel] Streaming finished');
      }
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      console.log('[ChatPanel] Aborting request...');
      abortControllerRef.current.abort();
      toast.info('Stopping request...');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Toggle tool card expand/collapse state
  const toggleToolExpanded = (toolId: string) => {
    setExpandedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  };

  // Truncate long text for preview
  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderToolCall = (content: MessageContent) => {
    if (!content.toolCall) return null;

    const { name, status, input, output, id } = content.toolCall;
    const toolId = id || `${name}-${content.toolCall.timestamp}`;
    const isExpanded = expandedTools.has(toolId);

    // Format output content
    const formatContent = (data: any): string => {
      if (typeof data === 'string') return data;
      return JSON.stringify(data, null, 2);
    };

    const inputText = input ? formatContent(input) : '';
    const outputText = output ? formatContent(output) : '';

    return (
      <Card className="mt-2 bg-muted/50 overflow-hidden">
        {/* Tool header - always visible */}
        <div 
          className="p-3 cursor-pointer hover:bg-muted/70 transition-colors"
          onClick={() => toggleToolExpanded(toolId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <code className="text-sm font-mono text-primary font-semibold">{name}</code>
              </div>
              {status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
              {status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
            </div>
            <Badge 
              variant={status === 'completed' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'}
              className="flex-shrink-0"
            >
              {status}
            </Badge>
          </div>
          
          {/* Preview info - shown when collapsed */}
          {!isExpanded && (input || output) && (
            <div className="mt-2 text-xs text-muted-foreground">
              {input && (
                <div className="truncate">
                  <span className="font-semibold">Input: </span>
                  {truncateText(typeof input === 'string' ? input : JSON.stringify(input), 80)}
                </div>
              )}
              {output && (
                <div className="truncate mt-1">
                  <span className="font-semibold">Output: </span>
                  {truncateText(typeof output === 'string' ? output : JSON.stringify(output), 80)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detailed info - shown when expanded */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-3 border-t pt-3">
            {input && (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Input:</div>
                <div className="bg-background rounded p-2 text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto">
                  <pre className="whitespace-pre-wrap break-words">{inputText}</pre>
                </div>
              </div>
            )}
            {output && (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Output:</div>
                <div className="bg-background rounded p-2 text-xs font-mono overflow-x-auto max-h-60 overflow-y-auto">
                  <pre className="whitespace-pre-wrap break-words">{outputText}</pre>
                </div>
              </div>
            )}
            {!input && !output && (
              <div className="text-xs text-muted-foreground italic">
                No details available
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  // Show empty state when no conversation is selected
  if (!currentConversationId) {
    return (
      <div className="flex flex-col h-full bg-background border-r">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">
                No Conversation Selected
              </h3>
              <p className="text-sm text-muted-foreground">
                Select an existing conversation from the list or create a new one to start chatting.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            disabled={isStreaming}
          />
          {isStreaming ? (
            <Button onClick={handleStop} size="icon" className="h-[60px] w-[60px]" variant="destructive">
              <Square className="h-5 w-5" />
            </Button>
          ) : (
            <Button onClick={handleSend} disabled={!input.trim()} size="icon" className="h-[60px] w-[60px]">
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}