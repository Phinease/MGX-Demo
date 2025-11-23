import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navigation from '@/components/Navigation';
import ChatPanel from '@/components/ChatPanel';
import WorkspacePanel from '@/components/WorkspacePanel';
import AuthModal from '@/components/AuthModal';
import ConversationList from '@/components/ConversationList';
import Intro from '@/components/Intro';
import { User, Message } from '@/types';
import { 
  signIn, 
  signUp, 
  signOut, 
  getCurrentUser, 
  supabase,
  getConversationState,
  updateCodingState,
  updatePreviewState,
  stopPreviewState,
  updateProjectState,
  type ConversationState,
} from '@/lib/supabase';
import { useFileTree } from '@/hooks/useFileTree';
import { useCodingPreview } from '@/hooks/useCodingPreview';
import { useConversations } from '@/hooks/useConversations';
import { toast } from 'sonner';

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [projectPath, setProjectPath] = useState<string>(''); // 空字符串，等待项目初始化
  const [conversationListCollapsed, setConversationListCollapsed] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  
  // Track running project for preview
  const [runningProject, setRunningProject] = useState<{
    url: string;
    processId: string;
    projectPath: string;
    port: number;
    isRunning: boolean;
  } | null>(null);
  
  // Conversation management
  const {
    conversations,
    currentConversationId,
    isLoading: isLoadingConversations,
    createConversation,
    deleteConversation,
    updateConversation,
    setCurrentConversation,
    loadMessages: loadConversationMessages,
    saveConversationMessage,
  } = useConversations(user?.id || null);
  
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
    
    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          nickname: session.user.user_metadata?.nickname || 'User',
          avatar: session.user.user_metadata?.avatar,
        });
      } else {
        setUser(null);
        setMessages([]);
        setCurrentConversation(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
    setMessages([]);
    setCurrentConversation(null);
    toast.success('Logged out successfully');
  };
  
  // Handle conversation selection
  const handleSelectConversation = async (conversationId: string | null) => {
    if (conversationId === currentConversationId) return;
    
    setCurrentConversation(conversationId);
    
    if (conversationId) {
      setIsLoadingMessages(true);
      try {
        // Load messages
        const loadedMessages = await loadConversationMessages(conversationId);
        setMessages(loadedMessages);
        
        // Load conversation state
        const { data: state, error: stateError } = await getConversationState(conversationId);
        if (state && !stateError) {
          setConversationState(state);
          
          // Restore project path if available and reload file tree
          if (state.project_path) {
            setProjectPath(state.project_path);
            // Trigger file tree reload after path change
            setTimeout(() => {
              loadFileTree();
            }, 100);
          } else {
            // No project path, clear it to trigger refresh
            setProjectPath('');
          }
          
          // Restore preview state if running
          if (state.preview_is_running && state.preview_url) {
            setRunningProject({
              url: state.preview_url,
              processId: state.preview_process_id || '',
              projectPath: state.project_path || '',
              port: state.preview_port || 5173,
              isRunning: true,
            });
          } else {
            setRunningProject(null);
          }
          
          // Restore coding preview if active
          if (state.coding_is_active && state.coding_file_path) {
            startPreview(state.coding_file_path, state.coding_file_content || '');
          } else {
            clearPreview();
          }
        } else {
          // No state found, set defaults and clear project path
          setProjectPath('');
          setConversationState(null);
          setRunningProject(null);
          clearPreview();
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load conversation messages');
      } finally {
        setIsLoadingMessages(false);
      }
    } else {
      // No conversation selected, clear everything
      setMessages([]);
      setProjectPath('');
      setConversationState(null);
      setRunningProject(null);
      clearPreview();
    }
  };
  
  // Handle new conversation creation
  const handleCreateConversation = async () => {
    if (!user) {
      setAuthModalOpen(true);
      toast.info('Please sign in to create conversations');
      return;
    }
    
    const newConversationId = await createConversation();
    if (newConversationId) {
      // Reset all conversation-related states (same as selecting no conversation)
      setMessages([]);
      setProjectPath(''); // Clear project path to trigger WorkspacePanel refresh
      setConversationState(null);
      setRunningProject(null);
      clearPreview();
      clearHistory();
      
      toast.success('New conversation created');
    }
  };
  
  // Handle saving message to current conversation
  const handleSaveMessage = async (conversationId: string, message: Message) => {
    if (user && conversationId) {
      await saveConversationMessage(conversationId, message);
    }
  };
  
  // Show file tree loading errors
  useEffect(() => {
    if (fileTreeError) {
      toast.error(fileTreeError);
    }
  }, [fileTreeError]);

  // Handle file write preview callbacks
  const handleFileWriteStart = async (filePath: string, fileContent: string) => {
    console.log('[App] Starting file write preview:', filePath);
    startPreview(filePath, fileContent);
    
    // Save to conversation state and update local state
    if (currentConversationId) {
      const { data } = await updateCodingState(currentConversationId, filePath, fileContent, true);
      if (data) {
        setConversationState(data);
      }
    }
  };

  const handleFileWriteContent = async (content: string) => {
    console.log('[App] Updating file write content');
    setContent(content);
    
    // Update content in conversation state
    if (currentConversationId && currentPreview) {
      const { data } = await updateCodingState(currentConversationId, currentPreview.filePath, content, true);
      if (data) {
        setConversationState(data);
      }
    }
  };

  const handleFileWriteComplete = async () => {
    console.log('[App] File write complete');
    completePreview();
    
    // Mark coding as inactive and update local state
    if (currentConversationId) {
      const { data } = await updateCodingState(currentConversationId, null, null, false);
      if (data) {
        setConversationState(data);
      }
    }
  };

  // Handle project run callback
  const handleProjectRun = async (projectInfo: {
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
    
    // Save preview state and update local state
    if (currentConversationId) {
      const { data } = await updatePreviewState(currentConversationId, {
        url: projectInfo.url,
        processId: projectInfo.processId,
        port: projectInfo.port,
        isRunning: true,
      });
      
      // Update local conversation state
      if (data) {
        setConversationState(data);
      } else {
        setConversationState(prev => prev ? {
          ...prev,
          preview_url: projectInfo.url,
          preview_process_id: projectInfo.processId,
          preview_port: projectInfo.port,
          preview_is_running: true,
        } : null);
      }
    }
    
    toast.success(`Project running at ${projectInfo.url}`);
  };

  // Handle project stop callback
  const handleProjectStop = async () => {
    console.log('[App] Project stopped');
    setRunningProject(null);
    
    // Update preview state and local state
    if (currentConversationId) {
      const { data } = await stopPreviewState(currentConversationId);
      
      // Update local conversation state
      if (data) {
        setConversationState(data);
      } else {
        setConversationState(prev => prev ? {
          ...prev,
          preview_is_running: false,
        } : null);
      }
    }
    
    toast.info('Project stopped');
  };
  
  // Handle project initialization
  const handleProjectInit = async (projectPath: string, projectName: string) => {
    console.log('[App] Project initialized:', projectPath, projectName);
    
    // Update project path
    setProjectPath(projectPath);
    
    // Save to conversation state
    if (currentConversationId) {
      const { data } = await updateProjectState(currentConversationId, projectPath, projectName);
      
      // Update local state immediately with returned data or construct it
      if (data) {
        setConversationState(data);
      } else {
        setConversationState(prev => prev ? {
          ...prev,
          project_initialized: true,
          project_path: projectPath,
          project_name: projectName,
        } : {
          id: '',
          conversation_id: currentConversationId,
          project_initialized: true,
          project_path: projectPath,
          project_name: projectName,
          preview_url: null,
          preview_process_id: null,
          preview_port: null,
          preview_is_running: false,
          editor_folder_path: null,
          editor_selected_file: null,
          coding_file_path: null,
          coding_file_content: null,
          coding_is_active: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      
      // Reload file tree for the new project path
      setTimeout(() => {
        loadFileTree();
      }, 100);
    }
    
    toast.success('Project initialized successfully');
  };

  // Show intro screen if not logged in
  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <div className="h-screen flex flex-col">
            <Navigation user={user} onLoginClick={() => setAuthModalOpen(true)} onLogout={handleLogout} />
            <Intro onLoginClick={() => setAuthModalOpen(true)} />
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
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="h-screen flex flex-col">
          <Navigation user={user} onLoginClick={() => setAuthModalOpen(true)} onLogout={handleLogout} />

          <div className="flex-1 flex overflow-hidden">
            {/* Conversation List - Far Left Side */}
            <ConversationList
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelectConversation={handleSelectConversation}
              onCreateConversation={handleCreateConversation}
              onDeleteConversation={deleteConversation}
              onUpdateConversation={updateConversation}
              isCollapsed={conversationListCollapsed}
              onToggleCollapse={() => setConversationListCollapsed(!conversationListCollapsed)}
              isLoading={isLoadingConversations}
            />
            
            {/* Chat Panel - Left Side */}
            <div className="w-1/3">
              <ChatPanel 
                messages={messages} 
                setMessages={setMessages}
                currentConversationId={currentConversationId}
                onSaveMessage={handleSaveMessage}
                onFileWriteStart={handleFileWriteStart}
                onFileWriteContent={handleFileWriteContent}
                onFileWriteComplete={handleFileWriteComplete}
                onProjectRun={handleProjectRun}
                onProjectStop={handleProjectStop}
                onProjectInit={handleProjectInit}
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
                projectInitialized={conversationState?.project_initialized || false}
              />
            </div>
          </div>
          
          {/* Show loading indicator when loading messages */}
          {isLoadingMessages && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-background border rounded-lg p-6 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">Loading conversation...</span>
                </div>
              </div>
            </div>
          )}

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