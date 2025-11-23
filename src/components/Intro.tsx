import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquare, Code2, Zap, Shield, Info } from 'lucide-react';
import ProjectInfoDialog from './ProjectInfoDialog';

interface IntroProps {
  onLoginClick: () => void;
}

export default function Intro({ onLoginClick }: IntroProps) {
  const [showProjectInfo, setShowProjectInfo] = useState(false);

  // Automatically show project info dialog (shown every time when not logged in)
  useEffect(() => {
    // Delay 500ms to show, allowing the page to load first
    const timer = setTimeout(() => {
      setShowProjectInfo(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle dialog close
  const handleDialogChange = (open: boolean) => {
    setShowProjectInfo(open);
  };
  return (
    <>
      {/* Project info dialog */}
      <ProjectInfoDialog
        open={showProjectInfo}
        onOpenChange={handleDialogChange}
      />

      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-6">
        <div className="max-w-4xl w-full space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <div className="inline-block">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Code2 className="h-12 w-12 text-primary" />
                <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  MGX
                </h1>
              </div>
            </div>
            
            <p className="text-2xl text-muted-foreground font-light">
              AI-Powered Full-Stack Development Platform
            </p>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Chat with AI to build, preview, and deploy your projects in real-time.
              Let's build something amazing together.
            </p>
            
            <div className="flex items-center justify-center gap-3 pt-6">
              <Button 
                onClick={onLoginClick}
                size="lg"
                className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
              >
                Get Started - Sign In
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowProjectInfo(true)}
                className="text-lg px-6 py-6"
              >
                <Info className="h-5 w-5 mr-2" />
                Project Info
              </Button>
            </div>
          </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 pt-8">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Conversational Development</h3>
              <p className="text-sm text-muted-foreground">
                Simply describe what you want to build and let AI handle the implementation
              </p>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold">Real-Time Preview</h3>
              <p className="text-sm text-muted-foreground">
                See your changes live as the AI writes code and manages your project
              </p>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold">Persistent Sessions</h3>
              <p className="text-sm text-muted-foreground">
                All your conversations and projects are saved securely in the cloud
              </p>
            </div>
          </Card>
        </div>

          {/* CTA */}
          <div className="text-center pt-8 space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in to start creating your first project
            </p>
            <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
              <span>✨</span>
              <span>Powered by AI</span>
              <span>•</span>
              <span>Built with React</span>
              <span>•</span>
              <span>Secured by Supabase</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

