import { cn } from '@/lib/utils';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <Loader2 
      className={cn('animate-spin', sizeClasses[size], className)} 
    />
  );
}

interface LoadingStateProps {
  isLoading: boolean;
  error?: string | null;
  success?: boolean;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  children?: React.ReactNode;
  className?: string;
}

export function LoadingState({
  isLoading,
  error,
  success,
  loadingText = 'Loading...',
  successText = 'Success!',
  errorText,
  children,
  className
}: LoadingStateProps) {
  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <LoadingSpinner size="sm" />
        <span>{loadingText}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex items-center gap-2 text-destructive', className)}>
        <XCircle className="h-4 w-4" />
        <span>{errorText || error}</span>
      </div>
    );
  }

  if (success) {
    return (
      <div className={cn('flex items-center gap-2 text-green-600', className)}>
        <CheckCircle className="h-4 w-4" />
        <span>{successText}</span>
      </div>
    );
  }

  return <>{children}</>;
}

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ progress, className, showPercentage = true }: ProgressBarProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between text-sm text-muted-foreground mb-1">
        <span>Progress</span>
        {showPercentage && <span>{Math.round(progress)}%</span>}
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning';
  text?: string;
  className?: string;
}

export function StatusBadge({ status, text, className }: StatusBadgeProps) {
  const statusConfig = {
    idle: {
      icon: null,
      color: 'bg-gray-100 text-gray-800',
      text: text || 'Idle'
    },
    loading: {
      icon: <LoadingSpinner size="sm" />,
      color: 'bg-blue-100 text-blue-800',
      text: text || 'Loading'
    },
    success: {
      icon: <CheckCircle className="h-3 w-3" />,
      color: 'bg-green-100 text-green-800',
      text: text || 'Success'
    },
    error: {
      icon: <XCircle className="h-3 w-3" />,
      color: 'bg-red-100 text-red-800',
      text: text || 'Error'
    },
    warning: {
      icon: <AlertCircle className="h-3 w-3" />,
      color: 'bg-yellow-100 text-yellow-800',
      text: text || 'Warning'
    }
  };

  const config = statusConfig[status];

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
      config.color,
      className
    )}>
      {config.icon}
      {config.text}
    </span>
  );
}
