'use client';

import { useState } from 'react';
import { useRef } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { ScriptEditor } from '@/components/editor/script-editor';
import { PayloadViewer } from '@/components/panels/payload-viewer';
import { RequestLogger } from '@/components/panels/request-logger';
import { TestResults } from '@/components/panels/test-results';
import { MockConfigPanel } from '@/components/panels/mock-config-panel';
import type { MockConfigPanelRef } from '@/components/panels/mock-config-panel';
import { EnvironmentPanel } from '@/components/panels/environment-panel';
import { TestDataConfigurator } from '@/components/panels/test-data-configurator';
import { getEnvironmentVariables } from '@/lib/environment';
import { EXAMPLE_SCRIPTS, type ExampleScript } from '@/lib/example-scripts';
import { analyzeScriptUrls, type DetectedVariable } from '@/lib/url-analyzer';

interface ExecutionResult {
  success: boolean;
  result?: any;
  logs?: Array<{level: string; message: string; timestamp: string}>;
  requests?: Array<any>;
  executionTime?: number;
  error?: string;
}

export default function DashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'payload' | 'requests' | 'results' | 'environment' | 'testdata'>('testdata');
  const [scriptCode, setScriptCode] = useState(EXAMPLE_SCRIPTS[0].code); // Iniciar con el primer script
  const [selectedScript, setSelectedScript] = useState<ExampleScript>(EXAMPLE_SCRIPTS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [selectedPayload, setSelectedPayload] = useState<any>(null);
  const [detectedVariables, setDetectedVariables] = useState<DetectedVariable[]>([]);
  const [configurableVariables, setConfigurableVariables] = useState<Record<string, string>>({});
  const [mockConfigs, setMockConfigs] = useState<any[]>([]);
  const mockConfigRef = useRef<MockConfigPanelRef>(null);

  // Helper function para escape regex
  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Helper function para obtener URL base actual
  const getCurrentBaseUrl = (): string => {
    if (typeof window === 'undefined') return 'http://localhost:3000';
    return `${window.location.protocol}//${window.location.hostname}:${window.location.port || '3000'}`;
  };

  // Función para verificar si un mock existe
  const mockExists = (endpoint: string, method?: string): boolean => {
    if (!mockConfigRef.current) return false;
    return mockConfigRef.current.mockExists(endpoint, method);
  };

  // Cargar script predefinido
  const loadExampleScript = (script: ExampleScript) => {
    setSelectedScript(script);
    setScriptCode(script.code);
    setExecutionResult(null);
    
    // Analizar URLs y variables configurables con mocks existentes
    const existingMocks = mockConfigRef.current?.getMockConfigs() || [];
    const detected = analyzeScriptUrls(script.code, existingMocks);
    setDetectedVariables(detected);
    
    // Crear mapa inicial de variables configurables
    const configVars: Record<string, string> = {};
    detected.forEach(variable => {
      configVars[variable.name] = variable.value;
    });
    setConfigurableVariables(configVars);
    
    // Si el script tiene variables requeridas, cambiar a la pestaña de test data
    if (script.requiredVariables.testData || script.requiredVariables.envVariables || detected.length > 0) {
      setActiveTab('testdata');
    }
  };

  const handleRunScript = async () => {
    if (!scriptCode.trim()) {
      alert('Por favor, escribe algún código para ejecutar');
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);
    
    try {
      // Combinar variables del script seleccionado con las del environment
      const envVariables = {
        ...getEnvironmentVariables(),
        ...(selectedScript.requiredVariables.envVariables || {}),
        ...configurableVariables // Agregar variables configurables detectadas
      };

      // Usar test data del script predefinido
      const testData = selectedScript.requiredVariables.testData || {};

      // Reemplazar variables configurables en el código
      let modifiedCode = scriptCode;
      detectedVariables.forEach(variable => {
        const currentValue = configurableVariables[variable.name] || variable.value;
        const originalValue = variable.originalUrl || variable.value;
        // Reemplazar todas las ocurrencias de la variable original en el código
        modifiedCode = modifiedCode.replace(
          new RegExp(escapeRegExp(originalValue), 'g'),
          currentValue
        );
      });

      console.log('🌍 Environment variables:', envVariables);
      console.log('🧪 Test data:', testData);
      console.log('🔧 Configurable variables:', configurableVariables);

      const response = await fetch('/api/execute-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: modifiedCode, // Usar código modificado con variables reemplazadas
          envVariables: envVariables,
          testData: testData
        }),
      });

      const result: ExecutionResult = await response.json();
      
      console.log('🔍 Frontend Debug - Raw ExecutionResult:', result);
      console.log('🔍 Frontend Debug - Final logs for component:', result.logs || []);
      console.log('🔍 Frontend Debug - Final requests for component:', result.requests || []);
      
      setExecutionResult(result);
      
      // Cambiar automáticamente a la pestaña de resultados
      setActiveTab('results');

    } catch (error) {
      setExecutionResult({
        success: false,
        error: `Error de red: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Nueva función para ejecutar script con test data personalizada
  const handleRunScriptWithTestData = async (testData: { 
    inputFields: Record<string, any>; 
    envVariables: Record<string, string>;
    undefinedVariables: Record<string, any>;
  }) => {
    if (!scriptCode.trim()) {
      alert('Por favor, escribe algún código para ejecutar');
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);
    
    try {
      // Combinar variables de entorno globales con las del test data
      const globalEnvVars = getEnvironmentVariables();
      const combinedEnvVars = { ...globalEnvVars, ...testData.envVariables };
      
      console.log('🧪 Ejecutando con test data:', testData);
      console.log('🌍 Environment variables combinadas:', combinedEnvVars);

      const response = await fetch('/api/execute-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: scriptCode,
          envVariables: combinedEnvVars,
          testData: testData.inputFields, // Pasar inputFields como testData
          undefinedVariables: testData.undefinedVariables // Pasar variables no definidas
        }),
      });

      const result: ExecutionResult = await response.json();
      
      setExecutionResult(result);
      
      // Cambiar automáticamente a la pestaña de resultados
      setActiveTab('results');

    } catch (error) {
      setExecutionResult({
        success: false,
        error: `Error de red: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveScript = () => {
    // Por ahora solo guardar en localStorage
    const scripts = JSON.parse(localStorage.getItem('scripts') || '[]');
    const newScript = {
      id: Date.now().toString(),
      name: `Script ${scripts.length + 1}`,
      code: scriptCode,
      createdAt: new Date().toISOString(),
    };
    
    scripts.push(newScript);
    localStorage.setItem('scripts', JSON.stringify(scripts));
    alert('Script guardado localmente');
  };

  const handleStopScript = () => {
    // En una implementación real, esto cancelaría la ejecución
    setIsRunning(false);
  };

  const handleClearResults = () => {
    setExecutionResult(null);
  };

  const handleClearRequests = () => {
    // En una implementación completa, esto limpiaría el historial
    console.log('Clearing requests...');
  };

  const handleSelectRequest = (request: any) => {
    console.log('Frontend Debug - Selected request:', request);
    setSelectedPayload({
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: request.body,
      response: request.response,
      timestamp: request.timestamp,
      duration: request.duration,
      status: request.statusCode,
      error: request.error
    });
    setActiveTab('payload');
  };

  const handleCreateMock = async (request: any) => {
    try {
      // Extraer datos necesarios de la request
      const url = new URL(request.url);
      const originalEndpoint = url.pathname;
      
      // Solo prefijar con /api/mock/ si no lo tiene ya
      let endpoint;
      if (originalEndpoint.startsWith('/api/mock/')) {
        endpoint = originalEndpoint; // Ya tiene el prefijo
      } else {
        endpoint = `/api/mock${originalEndpoint}`; // Agregar prefijo
      }
      
      const mockData = {
        name: `Mock ${request.method} ${originalEndpoint}`,
        description: `Auto-generado desde ${request.url} (${request.duration}ms)`,
        endpoint: endpoint,
        method: request.method,
        response: request.response,
        statusCode: request.statusCode || 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        delay: Math.min(request.duration, 500), // Simular delay similar pero máximo 500ms
        enabled: true,
        tags: ['auto-generated', `${request.duration}ms`]
      };

      console.log('🔄 Creando mock automático:', mockData);

      const response = await fetch('/api/mock/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Mock creado exitosamente:', result);
        
        // Mostrar notificación de éxito
        alert(`🎉 Mock creado exitosamente!\n\nEndpoint original: ${originalEndpoint}\nEndpoint mock: ${endpoint}\nTiempo original: ${request.duration}ms\nMock delay: ${mockData.delay}ms`);
        
        // Actualizar la lista de mocks automáticamente
        if (mockConfigRef.current) {
          await mockConfigRef.current.refresh();
          console.log('✅ Lista de mocks actualizada');
        }
        
        // Opcional: cambiar a la pestaña de Mock Configuration
        // setActiveTab('mock'); // Si tuvieras esta funcionalidad
      } else {
        throw new Error('Error al crear el mock');
      }
    } catch (error) {
      console.error('❌ Error al crear mock:', error);
      alert('Error al crear el mock. Revisa la consola para más detalles.');
    }
  };

  // Obtener datos para mostrar en cada panel
  const logs = executionResult?.logs || [];
  const rawRequests = executionResult?.requests || [];
  
  // Transformar requests al formato esperado por RequestLogger
  const requests = rawRequests.map((req, index) => ({
    id: `req-${index}-${Date.now()}`,
    url: req.url,
    method: req.method,
    headers: req.headers || {},
    body: req.body ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) : undefined,
    response: req.response,
    timestamp: req.timestamp,
    duration: req.duration,
    statusCode: req.status,
    error: req.error
  }));
  
  const payload = selectedPayload || (requests.length > 0 ? requests[0] : null);
  
  // Debug: Ver qué logs y requests tenemos
  console.log('🔍 Frontend Debug - Raw ExecutionResult:', executionResult);
  console.log('🔍 Frontend Debug - Final logs for component:', logs);
  console.log('🔍 Frontend Debug - Final requests for component:', requests);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <Header 
        onRun={handleRunScript}
        onSave={handleSaveScript}
        onStop={handleStopScript}
        isRunning={isRunning}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onSelectScript={loadExampleScript}
        />
        
        {/* Main Panel Group */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Panel - Script Editor */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
              <div className="border-b p-2 bg-muted/50 flex items-center justify-between">
                <h2 className="text-sm font-medium">Script Editor</h2>
                <div className="flex items-center space-x-2">
                  {isRunning && (
                    <div className="flex items-center space-x-1 text-xs text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Ejecutando...</span>
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {scriptCode.length} caracteres
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <ScriptEditor 
                  value={scriptCode}
                  onChange={setScriptCode}
                  onRun={handleRunScript}
                  onSave={handleSaveScript}
                  isRunning={isRunning}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right Panel Group */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <ResizablePanelGroup direction="vertical">
              {/* Top Right - Inspector */}
              <ResizablePanel defaultSize={60} minSize={30}>
                <div className="h-full flex flex-col">
                  {/* Tab Headers */}
                  <div className="border-b bg-muted/50">
                    <div className="flex">
                      <button
                        onClick={() => setActiveTab('testdata')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'testdata'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Test Data
                        <span className="ml-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1 rounded">
                          AUTO
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab('payload')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'payload'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Payload Inspector
                        {payload && <span className="ml-1 text-xs bg-primary/20 px-1 rounded">1</span>}
                      </button>
                      <button
                        onClick={() => setActiveTab('requests')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'requests'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Request History
                        {requests.length > 0 && (
                          <span className="ml-1 text-xs bg-primary/20 px-1 rounded">
                            {requests.length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab('results')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'results'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Test Results
                        {logs.length > 0 && (
                          <span className="ml-1 text-xs bg-primary/20 px-1 rounded">
                            {logs.length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab('environment')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'environment'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Environment
                        <span className="ml-1 text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 px-1 rounded">
                          ENV
                        </span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Tab Content */}
                  <div className="flex-1 overflow-hidden">
                    {activeTab === 'testdata' && (
                      <div className="h-full flex flex-col">
                        {/* Contenido scrolleable */}
                        <div className="flex-1 overflow-y-auto p-4">
                          <div className="mb-6">
                            <h3 className="text-lg font-medium mb-2">{selectedScript.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4">{selectedScript.description}</p>
                            
                            {/* Mostrar variables requeridas del script */}
                            {selectedScript.requiredVariables.testData && Object.keys(selectedScript.requiredVariables.testData).length > 0 && (
                              <div className="mb-4">
                                <h4 className="font-medium text-sm mb-2">📊 Variables de Test</h4>
                                <div className="space-y-2">
                                  {Object.entries(selectedScript.requiredVariables.testData).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-2 text-sm">
                                      <span className="font-mono bg-muted px-2 py-1 rounded text-xs">{key}</span>
                                      <span>=</span>
                                      <span className="text-muted-foreground font-mono">{JSON.stringify(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Mostrar variables de environment */}
                            {selectedScript.requiredVariables.envVariables && Object.keys(selectedScript.requiredVariables.envVariables).length > 0 && (
                              <div className="mb-4">
                                <h4 className="font-medium text-sm mb-2">🌍 Variables de Entorno</h4>
                                <div className="space-y-2">
                                  {Object.entries(selectedScript.requiredVariables.envVariables).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-2 text-sm">
                                      <span className="font-mono bg-muted px-2 py-1 rounded text-xs">process.env.{key}</span>
                                      <span>=</span>
                                      <span className="text-muted-foreground font-mono">"{value}"</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Mostrar variables detectadas automáticamente */}
                            {detectedVariables.length > 0 && (
                              <div className="mb-4">
                                <h4 className="font-medium text-sm mb-2">🔍 URLs Detectadas - Configura Mock APIs</h4>
                                <div className="space-y-3">
                                  {detectedVariables.map((variable, index) => (
                                    <div key={index} className="border rounded-lg p-3 space-y-3 bg-slate-50 dark:bg-slate-900/50">
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className={`
                                          font-mono px-2 py-1 rounded text-xs font-semibold
                                          ${variable.type === 'url' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}
                                          ${variable.type === 'token' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : ''}
                                          ${variable.type === 'endpoint' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                                          ${variable.type === 'timeout' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : ''}
                                        `}>
                                          {variable.type.toUpperCase()}
                                        </span>
                                        <span className="font-medium text-foreground">{variable.description}</span>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <div className="text-xs text-muted-foreground">
                                          📍 Línea {variable.line} • Original: <span className="font-mono">{variable.originalUrl}</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                          {/* Botón para usar URL/Token original */}
                                          <button
                                            onClick={() => {
                                              setConfigurableVariables(prev => ({
                                                ...prev,
                                                [variable.name]: variable.originalUrl || variable.value
                                              }));
                                            }}
                                            className="px-3 py-2 text-xs border rounded bg-background hover:bg-accent text-left"
                                          >
                                            {variable.type === 'token' ? '🔑 Usar Token Real' : '🌐 Usar URL Real'}
                                            <div className="text-muted-foreground truncate">{variable.originalUrl}</div>
                                          </button>
                                          
                                          {/* Sugerencias inteligentes de Mock API */}
                                          {variable.type !== 'token' && variable.mockSuggestion && (
                                            <div className="space-y-2">
                                              {/* Mock existente exacto */}
                                              {variable.mockSuggestionType === 'exact' && (
                                                <button
                                                  onClick={() => {
                                                    const baseUrl = getCurrentBaseUrl();
                                                    const mockValue = `${baseUrl}${variable.mockSuggestion}`;
                                                    setConfigurableVariables(prev => ({
                                                      ...prev,
                                                      [variable.name]: mockValue
                                                    }));
                                                  }}
                                                  className="px-3 py-2 text-xs border rounded bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-left border-green-200 dark:border-green-800 w-full"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <span>✅ Usar Mock Existente</span>
                                                    <span className="text-xs bg-green-100 dark:bg-green-800 px-1 py-0.5 rounded">
                                                      100% match
                                                    </span>
                                                  </div>
                                                  <div className="text-green-700 dark:text-green-300 truncate font-mono">
                                                    {variable.mockSuggestion}
                                                  </div>
                                                </button>
                                              )}
                                              
                                              {/* Mock similar encontrado */}
                                              {variable.mockSuggestionType === 'similar' && (
                                                <button
                                                  onClick={() => {
                                                    const baseUrl = getCurrentBaseUrl();
                                                    const mockValue = `${baseUrl}${variable.mockSuggestion}`;
                                                    setConfigurableVariables(prev => ({
                                                      ...prev,
                                                      [variable.name]: mockValue
                                                    }));
                                                  }}
                                                  className="px-3 py-2 text-xs border rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-left border-blue-200 dark:border-blue-800 w-full"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <span>🔄 Usar Mock Similar</span>
                                                    <span className="text-xs bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">
                                                      {Math.round((variable.similarityScore || 0) * 100)}% match
                                                    </span>
                                                  </div>
                                                  <div className="text-blue-700 dark:text-blue-300 truncate font-mono">
                                                    {variable.mockSuggestion}
                                                  </div>
                                                </button>
                                              )}
                                              
                                              {/* Sugerencia de nuevo mock para servicio conocido */}
                                              {variable.mockSuggestionType === 'new' && (
                                                <div className="px-3 py-2 text-xs border rounded bg-yellow-50 dark:bg-yellow-900/20 text-left border-yellow-200 dark:border-yellow-800">
                                                  <div className="text-yellow-700 dark:text-yellow-300 font-medium">
                                                    💡 Servicio conocido detectado
                                                  </div>
                                                  <div className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                                                    Sugerencia: {variable.mockSuggestion}
                                                  </div>
                                                  <div className="text-yellow-500 dark:text-yellow-500 text-xs">
                                                    Créalo en Mock Configuration para usar
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          
                                          {/* Sin sugerencias para URLs desconocidas */}
                                          {variable.type !== 'token' && !variable.mockSuggestion && (
                                            <div className="px-3 py-2 text-xs border rounded bg-gray-50 dark:bg-gray-900/20 text-left border-gray-200 dark:border-gray-800">
                                              <div className="text-gray-700 dark:text-gray-300 font-medium">
                                                🌐 API Externa
                                              </div>
                                              <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                                                No hay mocks similares disponibles
                                              </div>
                                              <div className="text-gray-500 dark:text-gray-500 text-xs">
                                                Usa la URL real o crea un mock manualmente
                                              </div>
                                            </div>
                                          )}

                                          {/* Token mocks (mantener funcionalidad original) */}
                                          {variable.type === 'token' && variable.mockSuggestion && (
                                            <button
                                              onClick={() => {
                                                setConfigurableVariables(prev => ({
                                                  ...prev,
                                                  [variable.name]: variable.mockSuggestion
                                                }));
                                              }}
                                              className="px-3 py-2 text-xs border rounded bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-left border-green-200 dark:border-green-800 w-full"
                                            >
                                              🎭 Usar Token Mock
                                              <div className="text-green-700 dark:text-green-300 truncate font-mono">
                                                {variable.mockSuggestion}
                                              </div>
                                            </button>
                                          )}
                                        </div>
                                        
                                        {/* Input manual para URL personalizada */}
                                        <div className="space-y-1">
                                          <label className="text-xs font-medium text-muted-foreground">
                                            {variable.type === 'token' ? 'Token Personalizado:' : 'URL Personalizada:'}
                                          </label>
                                          <input
                                            type="text"
                                            value={configurableVariables[variable.name] || variable.value}
                                            onChange={(e) => {
                                              setConfigurableVariables(prev => ({
                                                ...prev,
                                                [variable.name]: e.target.value
                                              }));
                                            }}
                                            className="w-full px-2 py-1 text-xs font-mono border rounded bg-background focus:ring-1 focus:ring-primary focus:border-primary"
                                            placeholder={
                                              variable.type === 'token' 
                                                ? "tu-token-personalizado-123..." 
                                                : "Escribe tu URL personalizada..."
                                            }
                                          />
                                        </div>
                                        
                                        {/* Mostrar URL actual seleccionada */}
                                        {configurableVariables[variable.name] && (
                                          <div className="text-xs p-2 bg-primary/10 rounded border-l-2 border-primary">
                                            <span className="font-medium text-primary">
                                              {variable.type === 'token' ? 'Token Actual:' : 'URL Actual:'}
                                            </span>
                                            <div className="font-mono text-foreground break-all">
                                              {configurableVariables[variable.name]}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Botón fijo en la parte inferior */}
                        <div className="border-t bg-background p-4">
                          <Button 
                            onClick={handleRunScript} 
                            disabled={isRunning} 
                            className="w-full"
                          >
                            {isRunning ? 'Ejecutando...' : '▶️ Ejecutar Script'}
                          </Button>
                        </div>
                      </div>
                    )}
                    {activeTab === 'payload' && (
                      <PayloadViewer 
                        data={payload ? {
                          request: {
                            url: payload.url,
                            method: payload.method,
                            headers: payload.headers,
                            body: payload.body
                          },
                          response: {
                            status: payload.status || payload.statusCode,
                            data: payload.response,
                            error: payload.error
                          },
                          metadata: {
                            duration: payload.duration,
                            timestamp: payload.timestamp
                          }
                        } : null}
                        title={payload ? `${payload.method} ${payload.url}` : "Selecciona una request"}
                        type="request"
                      />
                    )}
                    {activeTab === 'requests' && (
                      <RequestLogger 
                        requests={requests}
                        onClear={handleClearRequests}
                        onSelectRequest={handleSelectRequest}
                        onCreateMock={handleCreateMock}
                      />
                    )}
                    {activeTab === 'results' && (
                      <TestResults 
                        logs={logs}
                        executionResult={executionResult?.result}
                        executionError={executionResult?.error}
                        isRunning={isRunning}
                        onClear={handleClearResults}
                      />
                    )}
                    {activeTab === 'environment' && (
                      <EnvironmentPanel />
                    )}
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle />

              {/* Bottom Right - Mock Configuration */}
              <ResizablePanel defaultSize={40} minSize={20}>
                <div className="h-full flex flex-col">
                  <div className="border-b p-2 bg-muted/50">
                    <h2 className="text-sm font-medium">Mock Configuration</h2>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <MockConfigPanel ref={mockConfigRef} />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}