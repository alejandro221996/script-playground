'use client';

import { Play, Square, Save, FileText } from 'lucide-react';

interface HeaderProps {
  onRun?: () => void;
  onSave?: () => void;
  onStop?: () => void;
  isRunning?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onRun, 
  onSave, 
  onStop, 
  isRunning = false 
}) => {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center justify-between px-4">
        {/* Left side - Logo and title */}
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Script Playground</h1>
        </div>

        {/* Center - Script controls */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={onRun}
            disabled={isRunning}
            className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md text-sm font-medium transition-colors"
          >
            <Play className="h-3 w-3" />
            <span>{isRunning ? 'Ejecutando...' : 'Run'}</span>
          </button>
          <button 
            onClick={onStop}
            disabled={!isRunning}
            className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md text-sm font-medium transition-colors"
          >
            <Square className="h-3 w-3" />
            <span>Stop</span>
          </button>
          <button 
            onClick={onSave}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            <Save className="h-3 w-3" />
            <span>Save</span>
          </button>
        </div>

        {/* Right side - Status */}
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${
            isRunning ? 'text-green-600' : 'text-muted-foreground'
          }`}>
            {isRunning ? 'Ejecutando...' : 'Listo'}
          </span>
          <div className={`w-2 h-2 rounded-full ${
            isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`} />
        </div>
      </div>
    </header>
  );
};