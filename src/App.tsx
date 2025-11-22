import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navigation from '@/components/Navigation';
import ChatPanel from '@/components/ChatPanel';
import WorkspacePanel from '@/components/WorkspacePanel';
import AuthModal from '@/components/AuthModal';
import { User, Message } from '@/types';
import { signIn, signUp, signOut, getCurrentUser } from '@/lib/supabase';
import { useFileTree } from '@/hooks/useFileTree';
import { useCodingPreview } from '@/hooks/useCodingPreview';
import { toast } from 'sonner';

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [projectPath] = useState<string>('/Users/shuangruichen/Code/MGX-Demo');
  
  // Track running project for preview
  const [runningProject, setRunningProject] = useState<{
    url: string;
    processId: string;
    projectPath: string;
    port: number;
    isRunning: boolean;
  } | null>(null);
  
  // Use file tree hook to load real file system data
  const { 
    fileTree, 
    isLoading: isLoadingFileTree,
    error: fileTreeError,
    isBackendConnected,
    loadFileTree 
  } = useFileTree({
    projectPath,
    autoLoad: true,
  });

  // Use coding preview hook to manage file previews
  const {
    currentPreview,
    previewHistory,
    startPreview,
    setContent,
    completePreview,
    clearPreview,
    clearHistory,
  } = useCodingPreview();

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
  
  // Show file tree loading errors
  useEffect(() => {
    if (fileTreeError) {
      toast.error(fileTreeError);
    }
  }, [fileTreeError]);

  // Handle file write preview callbacks
  const handleFileWriteStart = (filePath: string, fileContent: string) => {
    console.log('[App] Starting file write preview:', filePath);
    startPreview(filePath, fileContent);
  };

  const handleFileWriteContent = (content: string) => {
    console.log('[App] Updating file write content');
    setContent(content);
  };

  const handleFileWriteComplete = () => {
    console.log('[App] File write complete');
    completePreview();
  };

  // Handle project run callback
  const handleProjectRun = (projectInfo: {
    url: string;
    processId: string;
    projectPath: string;
    port: number;
  }) => {
    console.log('[App] Project started:', projectInfo);
    setRunningProject({
      ...projectInfo,
      isRunning: true,
    });
    toast.success(`Project running at ${projectInfo.url}`);
  };

  // Handle project stop callback
  const handleProjectStop = () => {
    console.log('[App] Project stopped');
    setRunningProject(null);
    toast.info('Project stopped');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="h-screen flex flex-col">
          <Navigation user={user} onLoginClick={() => setAuthModalOpen(true)} onLogout={handleLogout} />

          <div className="flex-1 flex overflow-hidden">
            {/* Chat Panel - Left Side */}
            <div className="w-1/3">
              <ChatPanel 
                messages={messages} 
                setMessages={setMessages}
                onFileWriteStart={handleFileWriteStart}
                onFileWriteContent={handleFileWriteContent}
                onFileWriteComplete={handleFileWriteComplete}
                onProjectRun={handleProjectRun}
                onProjectStop={handleProjectStop}
              />
            </div>

            {/* Workspace Panel - Right Side (includes preview, coding, and editor tabs) */}
            <div className="w-2/3">
              <WorkspacePanel 
                fileTree={fileTree} 
                projectPath={projectPath}
                isLoading={isLoadingFileTree}
                onRefresh={loadFileTree}
                codingPreview={currentPreview}
                onClearPreview={clearPreview}
                runningProject={runningProject}
              />
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