import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/types';
import { LogIn } from 'lucide-react';

interface NavigationProps {
  user: User | null;
  onLoginClick: () => void;
  onLogout: () => void;
}

export default function Navigation({ user, onLoginClick, onLogout }: NavigationProps) {
  return (
    <nav className="border-b bg-background">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            MGX
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.nickname.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{user.nickname}</span>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button variant="default" size="sm" onClick={onLoginClick}>
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}