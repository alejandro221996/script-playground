// URL Analyzer - Detecta URLs y parámetros configurables en scripts
export interface DetectedVariable {
  name: string;
  value: string;
  type: 'url' | 'endpoint' | 'token' | 'timeout' | 'other';
  description: string;
  line?: number;
  mockSuggestion?: string; // Sugerencia de endpoint mock
  mockSuggestionType?: 'exact' | 'similar' | 'new'; // Tipo de sugerencia
  similarityScore?: number; // Puntuación de similitud (0-1)
  originalUrl?: string; // URL original para referencia
}

export function analyzeScriptUrls(code: string, existingMocks?: Array<{endpoint: string, method: string, enabled: boolean}>): DetectedVariable[] {
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
          const mockSuggestion = findBestMockSuggestion(url, existingMocks);
          const variableName = generateVariableName(url);

          variables.push({
            name: variableName,
            value: url,
            originalUrl: url,
            type: 'url',
            description: `API endpoint detectado: ${extractServiceName(url)}`,
            line: lineNumber,
            ...mockSuggestion
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

// Función inteligente para encontrar la mejor sugerencia de mock
function findBestMockSuggestion(url: string, existingMocks?: Array<{endpoint: string, method: string, enabled: boolean}>): {
  mockSuggestion?: string;
  mockSuggestionType?: 'exact' | 'similar' | 'new';
  similarityScore?: number;
} {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    
    // 1. Verificar servicios conocidos con alta confianza
    const knownService = getKnownServiceMock(hostname, pathname);
    if (knownService && existingMocks) {
      const exactMatch = existingMocks.find(mock => 
        mock.endpoint === knownService && mock.enabled
      );
      if (exactMatch) {
        return {
          mockSuggestion: knownService,
          mockSuggestionType: 'exact',
          similarityScore: 1.0
        };
      }
    }
    
    // 2. Buscar coincidencias similares en mocks existentes
    if (existingMocks && existingMocks.length > 0) {
      const similarMock = findSimilarMock(url, existingMocks);
      if (similarMock.score > 0.6) { // Solo sugerir si hay > 60% similitud
        return {
          mockSuggestion: similarMock.endpoint,
          mockSuggestionType: 'similar',
          similarityScore: similarMock.score
        };
      }
    }
    
    // 3. Solo sugerir nuevo mock para servicios conocidos
    if (knownService) {
      return {
        mockSuggestion: knownService,
        mockSuggestionType: 'new',
        similarityScore: 0.8 // Alta confianza para servicios conocidos
      };
    }
    
    // 4. No sugerir nada para URLs desconocidas
    return {};
    
  } catch (e) {
    return {};
  }
}

// Verificar servicios conocidos
function getKnownServiceMock(hostname: string, pathname: string): string | null {
  // Servicios con mapeo específico
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
  
  // Servicios públicos comunes
  if (hostname.includes('jsonplaceholder.typicode.com')) {
    if (pathname.includes('/users')) return '/api/mock/users';
    if (pathname.includes('/posts')) return '/api/mock/posts';  
    if (pathname.includes('/comments')) return '/api/mock/comments';
    return '/api/mock/jsonplaceholder';
  }
  
  if (hostname.includes('reqres.in')) {
    return '/api/mock/reqres';
  }
  
  if (hostname.includes('httpbin.org')) {
    return '/api/mock/httpbin';
  }
  
  return null;
}

// Buscar mock similar usando algoritmo de similitud
function findSimilarMock(url: string, existingMocks: Array<{endpoint: string, method: string, enabled: boolean}>): {
  endpoint: string;
  score: number;
} {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  const pathname = urlObj.pathname;
  
  let bestMatch = { endpoint: '', score: 0 };
  
  for (const mock of existingMocks.filter(m => m.enabled)) {
    const score = calculateSimilarity(hostname, pathname, mock.endpoint);
    if (score > bestMatch.score) {
      bestMatch = { endpoint: mock.endpoint, score };
    }
  }
  
  return bestMatch;
}

// Calcular similitud entre URL y endpoint mock
function calculateSimilarity(hostname: string, pathname: string, mockEndpoint: string): number {
  let score = 0;
  
  // Similitud por dominio
  const domainParts = hostname.split('.');
  const mockParts = mockEndpoint.split('/');
  
  for (const domainPart of domainParts) {
    for (const mockPart of mockParts) {
      if (domainPart.toLowerCase().includes(mockPart.toLowerCase()) ||
          mockPart.toLowerCase().includes(domainPart.toLowerCase())) {
        score += 0.3;
      }
    }
  }
  
  // Similitud por path
  const pathParts = pathname.split('/').filter(p => p.length > 0);
  for (const pathPart of pathParts) {
    for (const mockPart of mockParts) {
      if (pathPart.toLowerCase() === mockPart.toLowerCase()) {
        score += 0.4;
      } else if (pathPart.toLowerCase().includes(mockPart.toLowerCase()) ||
                 mockPart.toLowerCase().includes(pathPart.toLowerCase())) {
        score += 0.2;
      }
    }
  }
  
  return Math.min(score, 1.0); // Máximo 1.0
}

// Generar endpoint mock basado en la URL original (función legacy)
function generateMockEndpointLegacy(url: string): string {
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