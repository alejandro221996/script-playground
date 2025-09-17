import { NextRequest, NextResponse } from 'next/server';
import * as vm from 'vm';

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
}

interface RequestEntry {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  response?: any;
  timestamp: string;
  duration: number;
  status?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { code, envVariables, testData, undefinedVariables } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Code is required' },
        { status: 400 }
      );
    }

    const logs: LogEntry[] = [];
    const requests: RequestEntry[] = [];
    const startTime = Date.now();

    // Crear un sandbox seguro con el módulo vm nativo
    const sandbox = {
      console: {
        log: (...args: any[]) => {
          const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ');
          
          logs.push({
            level: 'info',
            message,
            timestamp: new Date().toISOString()
          });
          
          // También log al servidor para depuración (solo en desarrollo)
          if (process.env.NODE_ENV === 'development') {
            console.log('📋 SANDBOX LOG (info):', message);
          }
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
          
          if (process.env.NODE_ENV === 'development') {
            console.log('📋 SANDBOX LOG (error):', message);
          }
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
          
          if (process.env.NODE_ENV === 'development') {
            console.log('📋 SANDBOX LOG (warn):', message);
          }
        }
      },
      // Soporte para require y módulos comunes
      require: (moduleName: string) => {
        switch (moduleName) {
          case 'axios':
            // Simulamos axios con fetch y capturamos las requests
            return {
              post: async (url: string, data: any, config?: any) => {
                const requestStartTime = Date.now();
                
                // Capturar los datos de la request
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
                
                // Solo log en desarrollo

                const options: RequestInit = {
                  method: 'POST',
                  headers: requestData.headers,
                  body: requestData.body
                };

                if (config?.timeout) {
                  const controller = new AbortController();
                  setTimeout(() => controller.abort(), config.timeout);
                  options.signal = controller.signal;
                }

                let response, responseData, error = null;
                
                try {
                  response = await fetch(url, options);
                  responseData = await response.json();
                  
                  // Registrar la request y response exitosa
                  requests.push({
                    ...requestData,
                    response: responseData,
                    status: response.status,
                    duration: Date.now() - requestStartTime
                  });
                  
                  if (!response.ok) {
                    const httpError = new Error(`Request failed with status ${response.status}`);
                    (httpError as any).response = {
                      status: response.status,
                      data: responseData
                    };
                    throw httpError;
                  }
                  
                  return {
                    data: responseData,
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries())
                  };
                  
                } catch (fetchError) {
                  // Registrar la request fallida
                  requests.push({
                    ...requestData,
                    error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
                    status: response?.status || 0,
                    duration: Date.now() - requestStartTime
                  });
                  
                  throw fetchError;
                }
              },
              
              get: async (url: string, config?: any) => {
                const requestStartTime = Date.now();
                
                const requestData = {
                  url,
                  method: 'GET',
                  headers: config?.headers || {},
                  timestamp: new Date().toISOString()
                };
                
                // Solo log en desarrollo

                try {
                  const response = await fetch(url, {
                    method: 'GET',
                    headers: requestData.headers
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
                  
                } catch (fetchError) {
                  requests.push({
                    ...requestData,
                    error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
                    status: 0,
                    duration: Date.now() - requestStartTime
                  });
                  
                  throw fetchError;
                }
              }
            };
          default:
            throw new Error(`Module '${moduleName}' not found`);
        }
      },
      // Fetch API con interceptación
      fetch: async (url: string, options?: any) => {
        const requestStartTime = Date.now();
        const method = options?.method || 'GET';
        
        const requestData = {
          url,
          method,
          headers: options?.headers || {},
          body: options?.body,
          timestamp: new Date().toISOString()
        };
        
        // Solo log en desarrollo

        try {
          // Usar fetch global de Node.js, no el del contexto
          const response = await globalThis.fetch(url, options);
          
          const responseClone = response.clone();
          
          let responseData;
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            responseData = await responseClone.json();
          } else {
            responseData = await responseClone.text();
          }
          
          // Registrar la request exitosa
          requests.push({
            ...requestData,
            response: responseData,
            status: response.status,
            duration: Date.now() - requestStartTime
          });
          
          // Devolver un objeto response similar al fetch real
          return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            json: async () => {
              if (typeof responseData === 'string') {
                return JSON.parse(responseData);
              }
              return responseData;
            },
            text: async () => {
              if (typeof responseData === 'object') {
                return JSON.stringify(responseData);
              }
              return responseData;
            },
            clone: () => ({ json: async () => responseData })
          };
          
        } catch (fetchError) {
          // Registrar la request fallida
          requests.push({
            ...requestData,
            error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
            status: 0,
            duration: Date.now() - requestStartTime
          });
          
          throw fetchError;
        }
      },
      
      // Soporte para exports
      exports: {},
      module: { exports: {} },
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
      // Soporte para process.env
      process: {
        env: envVariables || {}
      },
      // Agregar testData al contexto del sandbox
      __testData: testData || {},
      // Agregar variables no definidas directamente al contexto
      ...(undefinedVariables || {}),
      // Inyectar cada variable del testData como variable global
      ...(testData || {})
    };

    // Crear contexto VM
    const context = vm.createContext(sandbox);
    
    // NO sobrescribir fetch en el contexto - usar el del sandbox directamente
    
    // Envolver el código en una función async para permitir await
    const wrappedCode = `
      (async function() {
        try {
          // Ejecutar el código del usuario y esperar a que termine completamente
          const result = await (async function() {
            ${code}
          })();
          
          // Asegurar que todos los logs síncronos se procesen
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Si el código define exports.main, ejecutarlo automáticamente con datos de prueba
          if (typeof exports !== 'undefined' && typeof exports.main === 'function') {
            
            // Datos de prueba por defecto
            const defaultInputFields = {
              phone: "+525512345678",
              opportunityId: "test-opp-123",
              contactId: "test-contact-456",
              firstname: "Juan",
              program: "Programa de Prueba",
              email: "test@example.com",
              country: "México",
              date_of_birth: Date.now() - (25 * 365 * 24 * 60 * 60 * 1000), // 25 años atrás
              start_date_1: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 días adelante
              code_start_date_1: "CODE1",
              start_date_2: Date.now() + (60 * 24 * 60 * 60 * 1000), // 60 días adelante
              code_start_date_2: "CODE2",
              start_date_3: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 días adelante
              code_start_date_3: "CODE3",
              tier_value1_4: "100",
              tier_value5_12: "200",
              product_key: "PROD123",
              source: "web",
              rvoe: "RVOE123",
              voicebot_phone_number: "+525597092980"
            };
            
            // Usar testData personalizada si está disponible, sino usar datos por defecto
            const inputFields = __testData && Object.keys(__testData).length > 0 
              ? { ...defaultInputFields, ...__testData }
              : defaultInputFields;
            
            // Datos de prueba para simular el evento de HubSpot
            const mockEvent = {
              inputFields
            };
            
            const mainResult = await exports.main(mockEvent);
            
            // Esperar un poco más para que todos los logs se procesen
            await new Promise(resolve => setTimeout(resolve, 200));
            
            return mainResult;
          }
          
          return result;
          
        } catch (error) {
          throw error;
        }
      })();
    `;

    let result;
    try {
      // Ejecutar el código con timeout
      const script = new vm.Script(wrappedCode);
      result = await script.runInContext(context, { timeout: 10000 });
      
      // Agregar delay para asegurar que todos los logs se capturen
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (vmError) {
      logs.push({
        level: 'error',
        message: `Script execution error: ${vmError instanceof Error ? vmError.message : vmError}`,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({
        success: false,
        error: vmError instanceof Error ? vmError.message : String(vmError),
        logs,
        requests,
        executionTime: Date.now() - startTime
      });
    }

    const response = {
      success: true,
      result,
      logs,
      requests,
      executionTime: Date.now() - startTime
    };

    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}