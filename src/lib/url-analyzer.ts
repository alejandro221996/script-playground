// URL Analyzer - Detecta URLs y parámetros configurables en scripts
export interface DetectedVariable {
  name: string;
  value: string;
  type: 'url' | 'endpoint' | 'token' | 'timeout' | 'other';
  description: string;
  line?: number;
  mockSuggestion?: string; // Sugerencia de endpoint mock
  originalUrl?: string; // URL original para referencia
}

export function analyzeScriptUrls(code: string): DetectedVariable[] {
  const variables: DetectedVariable[] = [];
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // 1. Detectar URLs completas en fetch/axios
    const urlPatterns = [
      /fetch\s*\(\s*["'`]([^"'`]+)["'`]/g,
      /axios\.(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/g,
      /\.post\s*\(\s*["'`]([^"'`]+)["'`]/g,
      /url:\s*["'`]([^"'`]+)["'`]/g
    ];

    urlPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const url = match[1] || match[2];
        if (url && url.startsWith('http')) {
          const mockSuggestion = generateMockEndpoint(url);
          const variableName = generateVariableName(url);

          variables.push({
            name: variableName,
            value: url,
            originalUrl: url,
            type: 'url',
            description: `API endpoint detectado: ${extractServiceName(url)}`,
            line: lineNumber,
            mockSuggestion: mockSuggestion
          });
        }
      }
    });

    // 2. Detectar tokens de autorización
    const tokenPatterns = [
      /["'`]Bearer\s+([^"'`\s]+)["'`]/g,
      /Authorization.*["'`]Bearer\s+([^"'`\s]+)["'`]/g,
      /accessToken.*["'`]([^"'`]+)["'`]/g,
      /apiKey.*["'`]([^"'`]+)["'`]/g
    ];

    tokenPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const token = match[1];
        if (token && token.length > 10) {
          variables.push({
            name: `API_TOKEN`,
            value: token,
            originalUrl: token,
            type: 'token',
            description: `Token de API detectado`,
            line: lineNumber,
            mockSuggestion: 'mock-api-token-123' // Token mock genérico
          });
        }
      }
    });

    // 3. Detectar timeouts
    const timeoutPattern = /timeout:\s*(\d+)/g;
    let timeoutMatch;
    while ((timeoutMatch = timeoutPattern.exec(line)) !== null) {
      variables.push({
        name: `TIMEOUT_MS`,
        value: timeoutMatch[1],
        originalUrl: timeoutMatch[1],
        type: 'timeout',
        description: `Timeout en milisegundos`,
        line: lineNumber,
        mockSuggestion: '2000' // 2 segundos para mock
      });
    }
  });

  // Remover duplicados por valor
  const uniqueVariables = variables.filter((variable, index, self) => 
    index === self.findIndex(v => v.originalUrl === variable.originalUrl)
  );

  return uniqueVariables;
}

// Generar endpoint mock basado en la URL original
function generateMockEndpoint(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    
    // Mapeo de servicios conocidos a endpoints mock
    if (hostname.includes('hubapi.com') || hostname.includes('hubspot')) {
      if (pathname.includes('/calls')) return '/api/mock/hubspot-calls';
      if (pathname.includes('/deals')) return '/api/mock/hubspot-deals'; 
      if (pathname.includes('/contacts')) return '/api/mock/hubspot-contacts';
      return '/api/mock/hubspot-general';
    }
    
    if (hostname.includes('call-orchestrator') || hostname.includes('retell')) {
      return '/api/mock/call-orchestrator';
    }
    
    if (hostname.includes('inconcertcc.com')) {
      return '/api/mock/integration-api';
    }
    
    // Endpoint genérico basado en el dominio
    const serviceName = hostname.split('.')[0];
    return `/api/mock/${serviceName}`;
    
  } catch (e) {
    return '/api/mock/generic-api';
  }
}

// Extraer nombre del servicio para descripción
function extractServiceName(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('hubapi.com')) return 'HubSpot API';
    if (urlObj.hostname.includes('call-orchestrator')) return 'Call Orchestrator';
    if (urlObj.hostname.includes('retell')) return 'Retell AI';
    if (urlObj.hostname.includes('inconcertcc.com')) return 'Integration API';
    return urlObj.hostname;
  } catch (e) {
    return 'API Externa';
  }
}

// Generar nombre de variable limpio
function generateVariableName(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/\./g, '_').toUpperCase();
    const pathname = urlObj.pathname.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    return `${hostname}${pathname}`.replace(/_+/g, '_').replace(/^_|_$/g, '');
  } catch (e) {
    return `API_URL_${Date.now()}`;
  }
}

export function generateConfigurableScript(
  originalCode: string, 
  detectedVars: DetectedVariable[]
): { 
  code: string, 
  variables: Record<string, string> 
} {
  let modifiedCode = originalCode;
  const variableMap: Record<string, string> = {};

  detectedVars.forEach(variable => {
    // Reemplazar el valor original con la variable
    modifiedCode = modifiedCode.replace(
      new RegExp(escapeRegExp(variable.value), 'g'),
      variable.name
    );
    variableMap[variable.name] = variable.value;
  });

  return {
    code: modifiedCode,
    variables: variableMap
  };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}