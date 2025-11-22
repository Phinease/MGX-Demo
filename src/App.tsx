import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navigation from '@/components/Navigation';
import ChatPanel from '@/components/ChatPanel';
import CodePanel from '@/components/CodePanel';
import AuthModal from '@/components/AuthModal';
import { User, Message } from '@/types';
import { mockConversation, mockFileTree } from '@/lib/mockData';
import { signIn, signUp, signOut, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(mockConversation.messages);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      setUser({
        id: currentUser.id,
        email: currentUser.email || '',
        nickname: currentUser.user_metadata?.nickname || 'User',
        avatar: currentUser.user_metadata?.avatar,
      });
    }
  };

  const handleLogin = async (email: string, password: string) => {
    const { data, error } = await signIn(email, password);
    if (error) throw error;
    if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        nickname: data.user.user_metadata?.nickname || 'User',
        avatar: data.user.user_metadata?.avatar,
      });
      toast.success('Successfully logged in!');
    }
  };

  const handleRegister = async (email: string, password: string, nickname: string) => {
    const { data, error } = await signUp(email, password, nickname);
    if (error) throw error;
    if (data.user) {
      toast.success('Account created! Please check your email to verify.');
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    toast.success('Logged out successfully');
  };

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      contents: [{ type: 'text', content }],
      timestamp: new Date().toISOString(),
    };
    setMessages([...messages, newMessage]);

    setIsStreaming(true);
    setTimeout(() => {
      const agentMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'agent',
        contents: [
          {
            type: 'text',
            content: 'I understand your request. Let me help you with that.',
          },
        ],
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, agentMessage]);
      setIsStreaming(false);
    }, 1500);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="h-screen flex flex-col">
          <Navigation user={user} onLoginClick={() => setAuthModalOpen(true)} onLogout={handleLogout} />

          <div className="flex-1 flex overflow-hidden">
            <div className="w-1/3">
              <ChatPanel messages={messages} onSendMessage={handleSendMessage} isStreaming={isStreaming} />
            </div>

            <div className="w-2/3">
              <CodePanel fileTree={mockFileTree} />
            </div>
          </div>

          <AuthModal
            open={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            onLogin={handleLogin}
            onRegister={handleRegister}
          />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;