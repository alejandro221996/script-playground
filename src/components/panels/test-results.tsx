'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, Download, Filter, Terminal, AlertCircle, Info, AlertTriangle } from 'lucide-react';

// Hook para evitar errores de hidratación
function useIsClient() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return isClient;
}

// Componente de timestamp seguro para hidratación
function SafeTimestamp({ timestamp }: { timestamp: string }) {
  const isClient = useIsClient();
  
  if (!isClient) {
    return <span className="font-mono text-xs opacity-70">--:--:--</span>;
  }
  
  const date = new Date(timestamp);
  const timeString = date.toLocaleTimeString('es-ES', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  return <span className="font-mono text-xs opacity-70">{timeString}</span>;
}

// Función para detectar y formatear JSON
function formatMessage(message: string): { formatted: string; isJson: boolean } {
  try {
    // Intentar parsear como JSON
    const parsed = JSON.parse(message);
    return {
      formatted: JSON.stringify(parsed, null, 2),
      isJson: true
    };
  } catch {
    // Si no es JSON, buscar JSON embebido en strings
    try {
      // Buscar patrones como "logs_voicebot": "{...}"
      const jsonStringRegex = /:\s*"(\{.*\})"/g;
      let hasEmbeddedJson = false;
      const processedMessage = message.replace(jsonStringRegex, (match, jsonString) => {
        try {
          // Decodificar el string JSON escapado
          const unescaped = jsonString.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          const parsed = JSON.parse(unescaped);
          hasEmbeddedJson = true;
          return `: ${JSON.stringify(parsed, null, 2)}`;
        } catch {
          return match;
        }
      });

      if (hasEmbeddedJson) {
        return {
          formatted: processedMessage,
          isJson: true
        };
      }

      // Buscar objetos JavaScript completos
      if (message.includes('{') && message.includes('}')) {
        // Intentar extraer y formatear objetos JSON del mensaje
        const lines = message.split('\n');
        const formattedLines = lines.map(line => {
          // Buscar líneas que contengan objetos JSON
          const match = line.match(/(\{.*\})/);
          if (match) {
            try {
              const jsonPart = match[1];
              const parsed = JSON.parse(jsonPart);
              return line.replace(jsonPart, JSON.stringify(parsed, null, 2));
            } catch {
              return line;
            }
          }
          return line;
        });
        
        return {
          formatted: formattedLines.join('\n'),
          isJson: formattedLines.some(line => line !== lines[formattedLines.indexOf(line)])
        };
      }
    } catch {
      // Si todo falla, retornar el mensaje original
    }
    
    return {
      formatted: message,
      isJson: false
    };
  }
}

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
}

interface TestResultsProps {
  logs?: LogEntry[];
  executionResult?: any;
  executionError?: string;
  isRunning?: boolean;
  onClear?: () => void;
}

export const TestResults: React.FC<TestResultsProps> = ({
  logs = [],
  executionResult,
  executionError,
  isRunning = false,
  onClear
}) => {
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Solo crear timestamps estáticos una vez
  const [sampleLogs] = useState<LogEntry[]>(() => {
    const baseTime = Date.now();
    return [
      {
        level: 'info',
        message: '¡Bienvenido a Script Playground!',
        timestamp: new Date(baseTime).toISOString()
      },
      {
        level: 'info', 
        message: 'Ejecuta un script para ver los resultados aquí',
        timestamp: new Date(baseTime + 1000).toISOString()
      },
      {
        level: 'warn',
        message: 'Tip: Usa console.log(), console.warn(), console.error() en tu script',
        timestamp: new Date(baseTime + 2000).toISOString()
      }
    ];
  });

  const displayLogs = logs.length > 0 ? logs : sampleLogs;
  const filteredLogs = filter === 'all' 
    ? displayLogs 
    : displayLogs.filter(log => log.level === filter);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      case 'info':
        return <Info className="h-3 w-3 text-blue-500" />;
      default:
        return <Terminal className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50';
      case 'warn':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/50';
      case 'info':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50';
      default:
        return 'text-muted-foreground bg-muted/50';
    }
  };

  const clearLogs = () => {
    onClear?.();
  };

  const downloadLogs = () => {
    const logText = filteredLogs
      .map(log => `[${formatTimestamp(new Date(log.timestamp))}] ${log.level.toUpperCase()}: ${log.message}`)
      .join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogCounts = () => {
    const counts = { info: 0, warn: 0, error: 0 };
    displayLogs.forEach(log => {
      if (counts.hasOwnProperty(log.level)) {
        counts[log.level as keyof typeof counts]++;
      }
    });
    return counts;
  };

  const counts = getLogCounts();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4" />
          <h3 className="text-sm font-medium">Console Output</h3>
          {isRunning && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600">Ejecutando...</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Filter buttons */}
          <div className="flex items-center space-x-1 bg-background rounded p-1">
            <button
              onClick={() => setFilter('all')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                filter === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              Todo ({displayLogs.length})
            </button>
            <button
              onClick={() => setFilter('info')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                filter === 'info' ? 'bg-blue-500 text-white' : 'hover:bg-muted'
              }`}
            >
              Info ({counts.info})
            </button>
            <button
              onClick={() => setFilter('warn')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                filter === 'warn' ? 'bg-yellow-500 text-white' : 'hover:bg-muted'
              }`}
            >
              Warn ({counts.warn})
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                filter === 'error' ? 'bg-red-500 text-white' : 'hover:bg-muted'
              }`}
            >
              Error ({counts.error})
            </button>
          </div>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1 rounded transition-colors ${
              autoScroll ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
            title="Auto-scroll"
          >
            <Filter className="h-3 w-3" />
          </button>

          {/* Download logs */}
          <button
            onClick={downloadLogs}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Descargar logs"
          >
            <Download className="h-3 w-3" />
          </button>

          {/* Clear logs */}
          <button
            onClick={clearLogs}
            className="p-1 hover:bg-muted rounded transition-colors text-red-500"
            title="Limpiar console"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-auto">
        {/* Execution result */}
        {executionResult && (
          <div className="p-3 border-b bg-green-50 dark:bg-green-950/50">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Ejecución completada
              </span>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded text-xs font-mono">
                RESULT
              </span>
            </div>
            <div className="bg-black/5 dark:bg-white/5 p-3 rounded border-l-4 border-green-400">
              <pre className="text-xs text-green-600 dark:text-green-400 whitespace-pre-wrap font-mono">
                {typeof executionResult === 'object' 
                  ? JSON.stringify(executionResult, null, 2)
                  : String(executionResult)
                }
              </pre>
            </div>
          </div>
        )}

        {/* Execution error */}
        {executionError && (
          <div className="p-3 border-b bg-red-50 dark:bg-red-950/50">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                Error de ejecución
              </span>
            </div>
            <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
              {executionError}
            </pre>
          </div>
        )}

        {/* Console logs */}
        <div className="p-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay logs para mostrar</p>
              <p className="text-xs mt-1">Ejecuta un script para ver la salida aquí</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((log, index) => {
                const { formatted, isJson } = formatMessage(log.message);
                
                return (
                  <div
                    key={index}
                    className={`p-2 rounded-md text-xs ${getLogColor(log.level)}`}
                  >
                    <div className="flex items-start space-x-2">
                      {getLogIcon(log.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <SafeTimestamp timestamp={log.timestamp} />
                          <span className="font-semibold text-xs uppercase">
                            {log.level}
                          </span>
                          {isJson && (
                            <span className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded text-xs font-mono">
                              JSON
                            </span>
                          )}
                        </div>
                        <pre className={`whitespace-pre-wrap mt-1 leading-relaxed ${
                          isJson ? 'bg-black/5 dark:bg-white/5 p-2 rounded border-l-2 border-blue-300 dark:border-blue-600 font-mono text-xs' : ''
                        }`}>
                          {formatted}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};