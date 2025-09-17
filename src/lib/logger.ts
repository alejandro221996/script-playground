type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(entry: LogEntry): string {
    const { timestamp, level, message, context, error } = entry;
    
    let formatted = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      formatted += ` | Context: ${JSON.stringify(context)}`;
    }
    
    if (error) {
      formatted += ` | Error: ${error.message}`;
      if (this.isDevelopment && error.stack) {
        formatted += `\nStack: ${error.stack}`;
      }
    }
    
    return formatted;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error
    };

    const formatted = this.formatMessage(entry);

    // En desarrollo, usar console con colores
    if (this.isDevelopment) {
      switch (level) {
        case 'debug':
          console.debug('🐛', formatted);
          break;
        case 'info':
          console.info('ℹ️', formatted);
          break;
        case 'warn':
          console.warn('⚠️', formatted);
          break;
        case 'error':
          console.error('❌', formatted);
          break;
      }
    } else {
      // En producción, usar JSON estructurado
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log('error', message, context, error);
  }

  // Métodos específicos para diferentes contextos
  apiRequest(method: string, path: string, duration: number, status: number) {
    this.info('API Request', {
      method,
      path,
      duration,
      status,
      type: 'api_request'
    });
  }

  scriptExecution(scriptId: string, duration: number, success: boolean, error?: string) {
    const level = success ? 'info' : 'error';
    this.log(level, 'Script Execution', {
      scriptId,
      duration,
      success,
      error,
      type: 'script_execution'
    });
  }

  databaseQuery(query: string, duration: number, error?: Error) {
    if (error) {
      this.error('Database Query Failed', error, {
        query: query.substring(0, 100), // Truncar queries largas
        duration,
        type: 'database_query'
      });
    } else {
      this.debug('Database Query', {
        query: query.substring(0, 100),
        duration,
        type: 'database_query'
      });
    }
  }
}

export const logger = new Logger();

// Middleware para logging de requests
export function logRequest(req: Request, startTime: number, status: number) {
  const duration = Date.now() - startTime;
  const url = new URL(req.url);
  
  logger.apiRequest(
    req.method,
    url.pathname,
    duration,
    status
  );
}
