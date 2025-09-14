// Helper para manejar environment variables
export function getEnvironmentVariables(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {}; // SSR fallback
  }
  
  try {
    const stored = localStorage.getItem('scriptplayground-env-vars');
    if (!stored) return {};
    
    const variables = JSON.parse(stored);
    
    // Convertir array de variables a objeto key-value
    return variables.reduce((env: Record<string, string>, variable: any) => {
      if (variable.key && variable.value) {
        env[variable.key] = variable.value;
      }
      return env;
    }, {});
  } catch (error) {
    console.error('Error loading environment variables:', error);
    return {};
  }
}

export function setEnvironmentVariable(key: string, value: string, description?: string, isSecret?: boolean) {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem('scriptplayground-env-vars');
    const variables = stored ? JSON.parse(stored) : [];
    
    const existingIndex = variables.findIndex((v: any) => v.key === key);
    
    const newVariable = {
      id: existingIndex >= 0 ? variables[existingIndex].id : Date.now().toString(),
      key,
      value,
      description: description || '',
      isSecret: isSecret || false
    };
    
    if (existingIndex >= 0) {
      variables[existingIndex] = newVariable;
    } else {
      variables.push(newVariable);
    }
    
    localStorage.setItem('scriptplayground-env-vars', JSON.stringify(variables));
  } catch (error) {
    console.error('Error setting environment variable:', error);
  }
}