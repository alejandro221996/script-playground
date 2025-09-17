import * as vm from 'vm';

// Whitelist de módulos permitidos
const ALLOWED_MODULES = new Set(['axios']);

// Crear sandbox seguro con módulos limitados
export function createSecureSandbox(envVariables: Record<string, string>, testData: any, undefinedVariables: any) {
  const logs: Array<{level: string; message: string; timestamp: string}> = [];
  const requests: Array<any> = [];

  const secureRequire = (moduleName: string) => {
    if (!ALLOWED_MODULES.has(moduleName)) {
      throw new Error(`Module '${moduleName}' is not allowed`);
    }
    
    switch (moduleName) {
      case 'axios':
        return createAxiosMock(requests);
      default:
        throw new Error(`Module '${moduleName}' not implemented`);
    }
  };

  const sandbox = {
    console: createSecureConsole(logs),
    require: secureRequire,
    fetch: createSecureFetch(requests),
    exports: {},
    module: { exports: {} },
    // Funciones básicas permitidas
    setTimeout,
    clearTimeout,
    Promise,
    Date,
    JSON,
    Math,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    String,
    Number,
    Boolean,
    Array,
    Object,
    RegExp,
    Error,
    process: {
      env: envVariables || {}
    },
    __testData: testData || {},
    ...(undefinedVariables || {}),
    ...(testData || {})
  };

  return { sandbox, logs, requests };
}

function createSecureConsole(logs: Array<any>) {
  return {
    log: (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      logs.push({
        level: 'info',
        message,
        timestamp: new Date().toISOString()
      });
    },
    error: (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      logs.push({
        level: 'error',
        message,
        timestamp: new Date().toISOString()
      });
    },
    warn: (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      logs.push({
        level: 'warn',
        message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

function createAxiosMock(requests: Array<any>) {
  return {
    post: async (url: string, data: any, config?: any) => {
      // Validar URL para prevenir SSRF
      if (!isValidUrl(url)) {
        throw new Error('Invalid URL provided');
      }
      
      const requestStartTime = Date.now();
      const requestData = {
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config?.headers || {})
        },
        body: typeof data === 'string' ? data : JSON.stringify(data),
        timestamp: new Date().toISOString()
      };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: requestData.headers,
          body: requestData.body
        });
        
        const responseData = await response.json();
        
        requests.push({
          ...requestData,
          response: responseData,
          status: response.status,
          duration: Date.now() - requestStartTime
        });
        
        return {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        };
      } catch (error) {
        requests.push({
          ...requestData,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 0,
          duration: Date.now() - requestStartTime
        });
        throw error;
      }
    },
    
    get: async (url: string, config?: any) => {
      if (!isValidUrl(url)) {
        throw new Error('Invalid URL provided');
      }
      
      // Similar implementation for GET
      // ... (código similar al POST)
    }
  };
}

function createSecureFetch(requests: Array<any>) {
  return async (url: string, options?: any) => {
    if (!isValidUrl(url)) {
      throw new Error('Invalid URL provided');
    }
    
    // Implementación similar pero con validaciones adicionales
    // ...
  };
}

function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // Bloquear URLs locales para prevenir SSRF
    const hostname = parsedUrl.hostname;
    
    // Bloquear localhost, IPs privadas, etc.
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')) {
      return false;
    }
    
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}
