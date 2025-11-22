import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Message, MessageContent } from '@/types';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isStreaming?: boolean;
}

export default function ChatPanel({ messages, onSendMessage, isStreaming = false }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
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
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}