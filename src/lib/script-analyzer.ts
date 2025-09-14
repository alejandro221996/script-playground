// Analizador de scripts para detectar datos requeridos automáticamente

export interface DetectedField {
  path: string;           // e.g., "event.inputFields.phone"
  type: 'input' | 'env' | 'variable' | 'undefined';
  name: string;          // e.g., "phone"
  context?: string;      // Línea de código donde se encontró
  required: boolean;     // Si parece ser requerido o tiene fallback
  suggestedValue?: string; // Valor sugerido basado en el contexto
}

export interface ScriptAnalysis {
  hasExportsMain: boolean;
  inputFields: DetectedField[];
  envVariables: DetectedField[];
  undefinedVariables: DetectedField[];
  otherVariables: DetectedField[];
  suggestions: string[];
}

export function analyzeScript(code: string): ScriptAnalysis {
  const analysis: ScriptAnalysis = {
    hasExportsMain: false,
    inputFields: [],
    envVariables: [],
    undefinedVariables: [],
    otherVariables: [],
    suggestions: []
  };

  // Detectar si tiene exports.main
  analysis.hasExportsMain = /exports\.main\s*=/.test(code);

  // Patrones para detectar diferentes tipos de acceso a datos
  const patterns = {
    // event.inputFields["field"] o event.inputFields.field
    inputFields: /event\.inputFields\[["']([^"']+)["']\]|event\.inputFields\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    
    // process.env.VARIABLE o process.env["VARIABLE"]
    envVars: /process\.env\.([A-Z_][A-Z0-9_]*)|process\.env\[["']([A-Z_][A-Z0-9_]*)["']\]/g,
    
    // Variables que pueden ser importantes
    otherVars: /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
    
    // Variables usadas pero no definidas (heurística simple)
    usedVars: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b(?=\s*[^\s=])/g
  };

  const lines = code.split('\n');

  // Recolectar variables definidas para detectar las no definidas
  const definedVariables = new Set<string>();
  const builtInVariables = new Set([
    // JavaScript built-ins
    'console', 'fetch', 'axios', 'require', 'exports', 'module', 'global', 'globalThis',
    'process', 'Buffer', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
    'Date', 'Array', 'Object', 'String', 'Number', 'Boolean', 'JSON', 'Math', 'Promise',
    'Error', 'RegExp', 'Map', 'Set', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
    
    // JavaScript keywords and literals
    'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
    'try', 'catch', 'finally', 'throw', 'new', 'this', 'typeof', 'instanceof', 'in', 'of',
    'true', 'false', 'null', 'undefined', 'var', 'let', 'const', 'async', 'await',
    
    // Common variable names that are usually defined in context
    'event', 'response', 'request', 'data', 'result', 'error', 'callback', 'config', 'options',
    
    // Array and Object methods
    'length', 'push', 'pop', 'shift', 'unshift', 'slice', 'splice', 'join', 'split',
    'map', 'filter', 'reduce', 'find', 'findIndex', 'includes', 'indexOf', 'forEach',
    'some', 'every', 'sort', 'reverse', 'concat', 'keys', 'values', 'entries',
    
    // String and Number methods
    'toString', 'valueOf', 'charAt', 'charCodeAt', 'substring', 'substr', 'toLowerCase',
    'toUpperCase', 'trim', 'replace', 'match', 'search', 'padStart', 'padEnd'
  ]);

  // 1. Detectar variables DECLARADAS en el código
  const variableDeclarations = [
    // var, let, const declarations (más simple y robusto)
    /(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    // Function declarations
    /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    // Import statements  
    /import\s+(?:\{([^}]*)\}|([a-zA-Z_$][a-zA-Z0-9_$]*)).*from/g,
    // Destructuring assignments (basic)
    /(?:const|let|var)\s*\{\s*([^}]*)\s*\}/g,
    // For loop variables
    /for\s*\(\s*(?:var|let|const)?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g
  ];

  variableDeclarations.forEach(regex => {
    let declMatch;
    const regexCopy = new RegExp(regex.source, regex.flags);
    while ((declMatch = regexCopy.exec(code)) !== null) {
      if (declMatch[1]) {
        // Handle destructuring and imports with multiple variables
        if (declMatch[1].includes(',')) {
          declMatch[1].split(',').forEach(name => {
            const cleanName = name.trim().split(/[\s:]/)[0];
            if (cleanName && /^[a-zA-Z_$]/.test(cleanName)) {
              definedVariables.add(cleanName);
            }
          });
        } else {
          const cleanName = declMatch[1].trim().split(/[\s:]/)[0];
          if (cleanName && /^[a-zA-Z_$]/.test(cleanName)) {
            definedVariables.add(cleanName);
          }
        }
      }
      if (declMatch[2]) {
        definedVariables.add(declMatch[2]);
      }
    }
  });

  // 2. Detectar parámetros de funciones (incluyendo callbacks)
  const functionPatterns = [
    // Function declarations and expressions
    /function\s+\w*\s*\(([^)]*)\)/g,
    // Arrow functions
    /\(([^)]*)\)\s*=>/g,
    // Single parameter arrow functions
    /(?:^|[^a-zA-Z0-9_$])([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g,
    // Method definitions
    /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*\{/g,
    // NUEVO: Callbacks comunes (map, filter, reduce, forEach, etc.)
    /\.(map|filter|reduce|forEach|find|findIndex|some|every|sort)\s*\(\s*\(([^)]*)\)/g,
    // NUEVO: Callbacks con arrow functions
    /\.(map|filter|reduce|forEach|find|findIndex|some|every|sort)\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g
  ];

  functionPatterns.forEach((regex, index) => {
    let funcMatch;
    const regexCopy = new RegExp(regex.source, regex.flags);
    while ((funcMatch = regexCopy.exec(code)) !== null) {
      let params;
      
      // Para callbacks de array methods
      if (index >= 4) { // Los últimos dos patterns son para callbacks
        params = funcMatch[2] || funcMatch[3];
      } else {
        params = funcMatch[1] || funcMatch[2];
      }
      
      if (params && !params.includes('=>')) {
        params.split(',').forEach(param => {
          const cleanParam = param.trim().split(/[\s=]/)[0];
          if (cleanParam && /^[a-zA-Z_$]/.test(cleanParam)) {
            definedVariables.add(cleanParam);
          }
        });
      }
    }
  });

  // 3. Detectar variables que se asignan (incluso sin declaración explícita)
  const assignmentPattern = /(?:^|[^a-zA-Z0-9_$.])([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:\[.*\])?\s*=/g;
  let assignMatch;
  while ((assignMatch = assignmentPattern.exec(code)) !== null) {
    // Excluir propiedades de objetos (como obj.prop = value)
    const beforeVar = code.charAt(assignMatch.index);
    if (beforeVar !== '.' && beforeVar !== '[') {
      definedVariables.add(assignMatch[1]);
    }
  }
  
  // 4. Detectar variables en await expressions (común en scripts async)
  const awaitPattern = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*await/g;
  let awaitMatch;
  while ((awaitMatch = awaitPattern.exec(code)) !== null) {
    definedVariables.add(awaitMatch[1]);
  }

  console.log('🔍 Variables definidas detectadas:', Array.from(definedVariables));

  // 2. Analizar inputFields
  patterns.inputFields.lastIndex = 0;
  let inputFieldMatch;
  while ((inputFieldMatch = patterns.inputFields.exec(code)) !== null) {
    const fieldName = inputFieldMatch[1] || inputFieldMatch[2];
    const lineIndex = code.substring(0, inputFieldMatch.index).split('\n').length - 1;
    const line = lines[lineIndex]?.trim();
    
    const hasDefault = line?.includes('||') || line?.includes('??');
    const hasOptional = line?.includes('?');
    const suggestedValue = getSuggestedValue(fieldName);

    if (!analysis.inputFields.some(f => f.name === fieldName)) {
      analysis.inputFields.push({
        path: `event.inputFields.${fieldName}`,
        type: 'input',
        name: fieldName,
        context: line,
        required: !hasDefault && !hasOptional,
        suggestedValue
      });
    }
  }

  // 3. Analizar environment variables
  patterns.envVars.lastIndex = 0;
  let envVarMatch;
  while ((envVarMatch = patterns.envVars.exec(code)) !== null) {
    const varName = envVarMatch[1] || envVarMatch[2];
    const lineIndex = code.substring(0, envVarMatch.index).split('\n').length - 1;
    const line = lines[lineIndex]?.trim();
    
    const hasDefault = line?.includes('||') || line?.includes('??');
    const suggestedValue = getSuggestedEnvValue(varName);

    if (!analysis.envVariables.some(f => f.name === varName)) {
      analysis.envVariables.push({
        path: `process.env.${varName}`,
        type: 'env',
        name: varName,
        context: line,
        required: !hasDefault,
        suggestedValue
      });
    }
  }

  // 4. Detectar variables USADAS pero no definidas
  const usedVariables = new Set<string>();
  
  // Mejorar la detección de template literals y strings
  const allStrings = [];
  
  // 1. Template literals
  const templateLiteralRegex = /`[^`]*`/g;
  let templateLiteralMatch;
  while ((templateLiteralMatch = templateLiteralRegex.exec(code)) !== null) {
    allStrings.push({
      start: templateLiteralMatch.index,
      end: templateLiteralMatch.index + templateLiteralMatch[0].length,
      content: templateLiteralMatch[0],
      isTemplate: true
    });
  }
  
  // 2. Strings regulares
  const stringRegex = /(['"])[^'"]*\1/g;
  let stringMatch2;
  while ((stringMatch2 = stringRegex.exec(code)) !== null) {
    allStrings.push({
      start: stringMatch2.index,
      end: stringMatch2.index + stringMatch2[0].length,
      content: stringMatch2[0],
      isTemplate: false
    });
  }
  
  // Función para verificar si una posición está dentro de un string REGULAR (no template literal)
  const isInsideRegularString = (index: number) => {
    return allStrings.some(str => 
      !str.isTemplate && index >= str.start && index <= str.end
    );
  };
  
  // Función para verificar si está dentro de un template literal (pero fuera de ${})
  const isInsideTemplateButOutsideVariable = (index: number) => {
    return allStrings.some(str => {
      if (!str.isTemplate) return false;
      if (index < str.start || index > str.end) return false;
      
      // Verificar si está dentro de ${}
      const templateContent = str.content;
      const relativeIndex = index - str.start;
      const beforeVariable = templateContent.substring(0, relativeIndex);
      const afterVariable = templateContent.substring(relativeIndex);
      
      // Contar ${} abiertos vs cerrados antes de esta posición
      const openBraces = (beforeVariable.match(/\$\{/g) || []).length;
      const closeBraces = (beforeVariable.match(/\}/g) || []).length;
      
      // Si hay más abiertos que cerrados, estamos dentro de ${}
      return openBraces <= closeBraces;
    });
  };
  
  // Lista de palabras que NUNCA son variables de usuario
  const commonWords = new Set([
    // URLs y dominios
    'http', 'https', 'www', 'com', 'org', 'net', 'api', 'users', 'posts', 'comments',
    'jsonplaceholder', 'typicode', 'github', 'google', 'facebook',
    // Propiedades comunes de objetos
    'length', 'name', 'email', 'phone', 'id', 'data', 'response', 'request', 'error',
    'status', 'ok', 'headers', 'body', 'url', 'method', 'json', 'text',
    // Palabras clave de JavaScript
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'return', 'throw', 'try', 'catch', 'finally', 'async', 'await', 'const', 'let', 'var',
    // Métodos comunes
    'map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every',
    'push', 'pop', 'shift', 'unshift', 'splice', 'slice',
    // Nombres comunes que NO son variables
    'company', 'title', 'content', 'user', 'post', 'comment',
    // Palabras en español de comentarios
    'obtener', 'posts', 'de', 'un', 'usuario', 'específico', 'comentarios', 'cada',
    'solo', 'primeros', 'completos', 'con', 'procesados', 'encontrados', 'del',
    // Objetos globales
    'console', 'fetch', 'Promise', 'Array', 'Object', 'String', 'Number'
  ]);

  // Patrón específico para template literals
  const templateVariablePattern = /\$\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g;
  let templateVarMatch;
  while ((templateVarMatch = templateVariablePattern.exec(code)) !== null) {
    const varName = templateVarMatch[1];
    
    if (varName && 
        varName.length > 1 && 
        !builtInVariables.has(varName) && 
        !definedVariables.has(varName) &&
        !commonWords.has(varName)
    ) {
      usedVariables.add(varName);
    }
  }
  
  // Otros patrones (excluyendo template literals ya procesados)
  const otherVariablePatterns = [
    // Variable seguida de operadores o métodos (excluyendo comentarios)
    /(?:^|[^a-zA-Z0-9_$/.])\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b(?=\s*[\[\.])/g,
    // Variable en operaciones aritméticas o lógicas (excluyendo comentarios) 
    /(?:^|[=+\-*/,%&|^<>!()\[,;\s])\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\b(?=\s*[+\-*/,%&|^<>!=)\];,\s])/g,
    // Variable después de return, throw, etc.
    /(?:return|throw|yield|await)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g
  ];

  // Función para verificar si una posición está dentro de un comentario
  const isInsideComment = (index: number) => {
    const lineStart = code.lastIndexOf('\n', index) + 1;
    const lineContent = code.substring(lineStart, code.indexOf('\n', index) || code.length);
    const relativeIndex = index - lineStart;
    
    // Verificar comentarios de línea //
    const singleLineCommentIndex = lineContent.indexOf('//');
    if (singleLineCommentIndex !== -1 && relativeIndex > singleLineCommentIndex) {
      return true;
    }
    
    // Verificar comentarios de bloque /* */
    const beforeIndex = code.substring(0, index);
    const lastBlockStart = beforeIndex.lastIndexOf('/*');
    const lastBlockEnd = beforeIndex.lastIndexOf('*/');
    
    return lastBlockStart > lastBlockEnd;
  };

  // console.log('🔍 Analizando otros patrones...');

  otherVariablePatterns.forEach((regex, patternIndex) => {
    let otherMatch;
    const regexCopy = new RegExp(regex.source, regex.flags);
    while ((otherMatch = regexCopy.exec(code)) !== null) {
      const varName = otherMatch[1];
      const matchIndex = otherMatch.index + otherMatch[0].indexOf(varName);
      
      if (varName && 
          varName.length > 1 && 
          !builtInVariables.has(varName) && 
          !definedVariables.has(varName) &&
          !isInsideRegularString(matchIndex) &&
          !isInsideTemplateButOutsideVariable(matchIndex) &&
          !isInsideComment(matchIndex) &&
          !commonWords.has(varName)
      ) {
        usedVariables.add(varName);
      }
    }
  });

  // console.log('🎯 Variables usadas pero no definidas:', Array.from(usedVariables));

  // Agregar variables no definidas al análisis (solo las que realmente parecen necesitar valores)
  usedVariables.forEach(varName => {
    // Buscar el contexto donde se usa la variable
    const varRegex = new RegExp(`\\b${varName}\\b`, 'g');
    const matches = [];
    let contextMatch;
    
    while ((contextMatch = varRegex.exec(code)) !== null) {
      const lineStart = code.lastIndexOf('\n', contextMatch.index) + 1;
      const lineEnd = code.indexOf('\n', contextMatch.index);
      const line = code.substring(lineStart, lineEnd === -1 ? code.length : lineEnd).trim();
      
      // Solo agregar si la variable se usa de forma que sugiere que necesita un valor
      if (line && (
        line.includes(`\${${varName}}`) || // Template literal
        line.includes(`${varName}.`) ||   // Acceso a propiedad
        line.includes(`${varName}[`) ||   // Acceso a array/object
        line.includes(`(${varName}`) ||   // Parámetro de función
        line.includes(`= ${varName}`) ||  // Asignación desde la variable
        line.includes(`${varName},`) ||   // En lista de parámetros
        line.match(new RegExp(`\\b${varName}\\s*[+\\-*/=%<>!&|]`)) // Operaciones
      )) {
        matches.push({ line, index: contextMatch.index });
      }
    }

    if (matches.length > 0) {
      const firstMatch = matches[0];
      const suggestedValue = getSuggestedValue(varName);

      analysis.undefinedVariables.push({
        path: varName,
        type: 'undefined',
        name: varName,
        context: firstMatch.line,
        required: true,
        suggestedValue
      });
    }
  });

  // Generar sugerencias
  if (analysis.hasExportsMain) {
    analysis.suggestions.push('📝 Script detectado como función HubSpot (exports.main)');
  }
  
  if (analysis.inputFields.length > 0) {
    analysis.suggestions.push(`🎯 Detectados ${analysis.inputFields.length} campos de entrada requeridos`);
  }
  
  if (analysis.envVariables.length > 0) {
    analysis.suggestions.push(`🌍 Detectadas ${analysis.envVariables.length} variables de entorno`);
  }

  if (analysis.undefinedVariables.length > 0) {
    analysis.suggestions.push(`⚠️ Detectadas ${analysis.undefinedVariables.length} variables no definidas que necesitan valores`);
  }

  const requiredFields = [...analysis.inputFields, ...analysis.envVariables, ...analysis.undefinedVariables].filter(f => f.required);
  if (requiredFields.length > 0) {
    analysis.suggestions.push(`🔴 ${requiredFields.length} campos parecen ser obligatorios`);
  }

  return analysis;
}

// Sugerir valores basados en el nombre del campo
function getSuggestedValue(fieldName: string): string {
  const suggestions: Record<string, string> = {
    // Identificadores
    'contactId': 'test-contact-456',
    'opportunityId': 'test-opp-123',
    'userId': '1',
    'id': 'test-id-789',
    'postId': '1',
    'commentId': '1',
    
    // Información personal
    'phone': '+525512345678',
    'email': 'test@example.com',
    'firstname': 'Juan',
    'lastname': 'Pérez',
    'name': 'Juan Pérez',
    'country': 'México',
    
    // Fechas (timestamps)
    'date_of_birth': String(Date.now() - (25 * 365 * 24 * 60 * 60 * 1000)), // 25 años atrás
    'start_date_1': String(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30 días adelante
    'start_date_2': String(Date.now() + (60 * 24 * 60 * 60 * 1000)), // 60 días adelante
    'start_date_3': String(Date.now() + (90 * 24 * 60 * 60 * 1000)), // 90 días adelante
    
    // Códigos y programas
    'code_start_date_1': 'CODE1',
    'code_start_date_2': 'CODE2',
    'code_start_date_3': 'CODE3',
    'program': 'Programa de Prueba',
    'product_key': 'PROD123',
    'source': 'web',
    'rvoe': 'RVOE123456',
    
    // Valores tier
    'tier_value1_4': '$1,200',
    'tier_value5_12': '$2,400',
    
    // Teléfonos
    'voicebot_phone_number': '+525597092980'
  };

  // Buscar por nombre exacto
  if (suggestions[fieldName]) {
    return suggestions[fieldName];
  }

  // Buscar por patrones
  if (fieldName.includes('phone')) return '+525512345678';
  if (fieldName.includes('email')) return 'test@example.com';
  if (fieldName.includes('date')) return String(Date.now());
  if (fieldName.includes('id') || fieldName.includes('Id')) return `test-${fieldName}-123`;
  if (fieldName.includes('name')) return 'Test Value';
  if (fieldName.includes('code')) return 'TEST123';
  if (fieldName.includes('tier') || fieldName.includes('value')) return '$1,000';

  return 'test-value';
}

function getSuggestedEnvValue(varName: string): string {
  const suggestions: Record<string, string> = {
    'API_BASE_URL': 'https://api.example.com',
    'API_KEY': 'test-api-key-123',
    'TIMEOUT': '5000',
    'PORT': '3000',
    'NODE_ENV': 'development',
    'DATABASE_URL': 'postgresql://user:pass@localhost:5432/db',
    'JWT_SECRET': 'test-jwt-secret',
    'SHOW_USER_DETAILS': 'true'
  };

  if (suggestions[varName]) {
    return suggestions[varName];
  }

  if (varName.includes('URL')) return 'https://api.example.com';
  if (varName.includes('KEY') || varName.includes('SECRET')) return 'test-secret-123';
  if (varName.includes('PORT')) return '3000';
  if (varName.includes('TIMEOUT')) return '5000';
  if (varName.includes('SHOW') || varName.includes('ENABLE')) return 'true';

  return 'test-env-value';
}

// Función helper para generar datos de prueba completos
export function generateTestData(analysis: ScriptAnalysis): {
  inputFields: Record<string, any>;
  envVariables: Record<string, string>;
  undefinedVariables: Record<string, any>;
} {
  const inputFields: Record<string, any> = {};
  const envVariables: Record<string, string> = {};
  const undefinedVariables: Record<string, any> = {};

  // Generar inputFields
  analysis.inputFields.forEach(field => {
    inputFields[field.name] = field.suggestedValue;
  });

  // Generar envVariables
  analysis.envVariables.forEach(field => {
    envVariables[field.name] = field.suggestedValue;
  });

  // Generar undefinedVariables
  analysis.undefinedVariables.forEach(field => {
    undefinedVariables[field.name] = field.suggestedValue;
  });

  return { inputFields, envVariables, undefinedVariables };
}