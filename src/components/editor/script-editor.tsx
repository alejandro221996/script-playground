'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import type { EditorConfig } from '@/types';

// Importar Monaco Editor dinámicamente para evitar errores de SSR
const MonacoEditor = dynamic(
  async () => {
    try {
      const monaco = await import('@monaco-editor/react');
      return monaco.default;
    } catch (error) {
      console.error('Error loading Monaco Editor:', error);
      throw error;
    }
  },
  { 
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando Monaco Editor...</p>
        </div>
      </div>
    )
  }
);

interface ScriptEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onSave?: () => void;
  onRun?: () => void;
  isRunning?: boolean;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  value = `// Script de ejemplo: Obtener usuarios de JSONPlaceholder
// Este script obtiene la lista de usuarios y muestra información básica

async function fetchUsers() {
  try {
    console.log('🔄 Iniciando petición para obtener usuarios...');
    
    const response = await fetch('https://jsonplaceholder.typicode.com/users');
    
    if (!response.ok) {
      throw new Error(\`Error HTTP: \${response.status} - \${response.statusText}\`);
    }
    
    const users = await response.json();
    
    console.log('✅ Usuarios obtenidos exitosamente');
    console.log(\`📊 Total de usuarios: \${users.length}\`);
    
    // Mostrar información básica de cada usuario
    users.forEach((user, index) => {
      console.log(\`\\n👤 Usuario \${index + 1}:\`);
      console.log(\`   Nombre: \${user.name}\`);
      console.log(\`   Email: \${user.email}\`);
      console.log(\`   Ciudad: \${user.address.city}\`);
      console.log(\`   Teléfono: \${user.phone}\`);
    });
    
    return users;
    
  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error.message);
    throw error;
  }
}

// Ejecutar la función
fetchUsers();`,
  onChange,
  onSave,
  onRun,
  isRunning = false
}) => {
  const { theme } = useTheme();
  const editorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFallback, setShowFallback] = useState(false);

  // Mostrar fallback después de 15 segundos si Monaco no carga
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setShowFallback(true);
        setIsLoading(false);
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  const editorConfig: Partial<EditorConfig> = {
    language: 'javascript',
    theme: theme === 'dark' ? 'vs-dark' : 'vs-light',
    fontSize: 14,
    wordWrap: 'on',
    minimap: {
      enabled: true,
    },
    scrollBeyondLastLine: false,
    automaticLayout: true,
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    setIsLoading(false);

    // Configurar shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
      onRun?.();
    });

    // Configurar opciones adicionales
    monaco.editor.setModelLanguage(editor.getModel(), 'javascript');
  };

  const handleChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange?.(newValue);
    }
  };

  return (
    <div className="h-full w-full relative">
      {showFallback ? (
        <div className="h-full flex flex-col">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ Monaco Editor no pudo cargar. Usando editor de texto simple.
            </p>
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="flex-1 w-full p-4 bg-background border border-border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="// Escribe tu código JavaScript aquí..."
            spellCheck={false}
          />
        </div>
      ) : (
        <MonacoEditor
          value={value}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          options={{
            ...editorConfig,
            readOnly: isRunning,
            selectOnLineNumbers: true,
            roundedSelection: false,
            cursorStyle: 'line',
            automaticLayout: true,
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            folding: true,
            bracketMatching: 'always',
            formatOnPaste: true,
            formatOnType: true,
          }}
          className="w-full h-full"
        />
      )}
      
      {isRunning && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-medium">
          Ejecutando...
        </div>
      )}
    </div>
  );
};