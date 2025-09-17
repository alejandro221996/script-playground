'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Plus, Edit, Trash2, Play, Square, Settings, Globe, Clock, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MockConfig {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  response: any;
  statusCode: number;
  headers?: Record<string, string>;
  delay?: number;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface MockConfigPanelProps {
  onRefresh?: () => void;
}

export interface MockConfigPanelRef {
  refresh: () => Promise<void>;
  getMockConfigs: () => MockConfig[];
  mockExists: (endpoint: string, method?: string) => boolean;
}

export const MockConfigPanel = forwardRef<MockConfigPanelRef, MockConfigPanelProps>(
  ({ onRefresh }, ref) => {
  const [configs, setConfigs] = useState<MockConfig[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<MockConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar configuraciones al montar el componente
  useEffect(() => {
    loadConfigs();
  }, []);

  // Exponer función para refresh externo
  useImperativeHandle(ref, () => ({
    refresh: loadConfigs,
    getMockConfigs: () => configs,
    mockExists: (endpoint: string, method?: string) => {
      return configs.some(config => 
        config.endpoint === endpoint && 
        (!method || config.method === method) &&
        config.enabled
      );
    }
  }));

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mock/config');
      const result = await response.json();
      
      if (result.success) {
        setConfigs(result.data);
      } else {
        setError('Error loading mock configurations');
      }
    } catch (err) {
      setError('Failed to connect to mock API');
      console.error('Error loading configs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (configData: Omit<MockConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/mock/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConfigs([...configs, result.data]);
        setShowAddForm(false);
      } else {
        setError(result.error || 'Failed to create mock configuration');
      }
    } catch (err) {
      setError('Failed to create mock configuration');
      console.error('Error creating config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updatedConfig: MockConfig) => {
    setLoading(true);
    try {
      const response = await fetch('/api/mock/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConfigs(configs.map(config => 
          config.id === updatedConfig.id ? result.data : config
        ));
        setEditingConfig(null);
      } else {
        setError(result.error || 'Failed to update mock configuration');
      }
    } catch (err) {
      setError('Failed to update mock configuration');
      console.error('Error updating config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/mock/config?id=${id}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConfigs(configs.filter(config => config.id !== id));
      } else {
        setError(result.error || 'Failed to delete mock configuration');
      }
    } catch (err) {
      setError('Failed to delete mock configuration');
      console.error('Error deleting config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    const configToToggle = configs.find(config => config.id === id);
    if (!configToToggle) return;

    const updatedConfig = { ...configToToggle, enabled: !configToToggle.enabled };
    await handleUpdate(updatedConfig);
  };

  const testEndpoint = async (config: MockConfig) => {
    try {
      const response = await fetch(config.endpoint, {
        method: config.method,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      alert(`Mock endpoint test successful!\nStatus: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      alert(`Mock endpoint test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const [newConfig, setNewConfig] = useState<Partial<MockConfig>>({
    endpoint: '',
    method: 'GET',
    response: '{\n  "message": "Hello World"\n}',
    statusCode: 200,
    delay: 0,
    enabled: true
  });

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'POST':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300';
      case 'PUT':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300';
      case 'DELETE':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
      case 'PATCH':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300';
    }
  };

  const handleToggleConfig = (id: string) => {
    handleToggle(id);
  };

  // Helper function to validate JSON
  const isValidJSON = (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddConfig = async () => {
    if (newConfig.endpoint && newConfig.response) {
      try {
        const parsedResponse = JSON.parse(newConfig.response as string);
        const config: Omit<MockConfig, 'id' | 'createdAt' | 'updatedAt'> = {
          endpoint: newConfig.endpoint!,
          method: newConfig.method!,
          response: parsedResponse,
          statusCode: newConfig.statusCode!,
          headers: newConfig.headers || { 'Content-Type': 'application/json' },
          delay: newConfig.delay || 0,
          enabled: newConfig.enabled!
        };
        
        await handleAdd(config);
        setNewConfig({
          endpoint: '',
          method: 'GET',
          response: '{\n  "message": "Hello World"\n}',
          statusCode: 200,
          delay: 0,
          enabled: true
        });
        setShowAddForm(false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown JSON error';
        alert(`Invalid JSON in response field: ${errorMessage}`);
        console.error('JSON parsing error:', error);
      }
    } else {
      alert('Please fill in endpoint and response fields');
    }
  };

  const enabledCount = configs.filter(c => c.enabled).length;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <div className="flex items-center space-x-2">
          <Settings className="h-4 w-4" />
          <h3 className="text-sm font-medium">Mock APIs</h3>
          <span className="text-xs bg-muted px-2 py-1 rounded">
            {enabledCount}/{configs.length} activos
          </span>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-1 text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3 w-3" />
          <span>Nuevo</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {/* Add form */}
        {showAddForm && (
          <div className="mb-4 p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Nuevo Mock API</h4>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex space-x-2">
                <select
                  value={newConfig.method}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, method: e.target.value as any }))}
                  className="text-xs px-2 py-1 border rounded bg-background"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
                
                <input
                  type="text"
                  placeholder="/api/endpoint"
                  value={newConfig.endpoint}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                  className="flex-1 text-xs px-2 py-1 border rounded bg-background"
                />
              </div>
              
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Status Code"
                  value={newConfig.statusCode}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, statusCode: parseInt(e.target.value) }))}
                  className="w-20 text-xs px-2 py-1 border rounded bg-background"
                />
                
                <input
                  type="number"
                  placeholder="Delay (ms)"
                  value={newConfig.delay}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, delay: parseInt(e.target.value) }))}
                  className="w-20 text-xs px-2 py-1 border rounded bg-background"
                />
              </div>
              
              <div className="relative">
                <textarea
                  placeholder='{"message": "Response data"}'
                  value={newConfig.response}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, response: e.target.value }))}
                  rows={4}
                  className={`w-full text-xs px-2 py-1 border rounded bg-background font-mono ${
                    newConfig.response && !isValidJSON(newConfig.response as string)
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                      : newConfig.response && isValidJSON(newConfig.response as string)
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                      : 'border-border'
                  }`}
                />
                {newConfig.response && (
                  <div className="absolute top-1 right-1">
                    {isValidJSON(newConfig.response as string) ? (
                      <span className="text-green-500 text-xs">✓ Valid JSON</span>
                    ) : (
                      <span className="text-red-500 text-xs">✗ Invalid JSON</span>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={handleAddConfig}
                className="w-full text-xs py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                Crear Mock API
              </button>
            </div>
          </div>
        )}

        {/* Config list */}
        {configs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay mocks configurados</p>
            <p className="text-xs mt-1">Crea un mock API para simular respuestas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {configs.map((config) => (
              <div
                key={config.id}
                className={`p-3 border rounded-lg transition-all ${
                  config.enabled 
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50' 
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-950/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleConfig(config.id)}
                      className={`p-1 rounded transition-colors ${
                        config.enabled 
                          ? 'bg-green-200 text-green-800 hover:bg-green-300' 
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                      title={config.enabled ? 'Desactivar' : 'Activar'}
                    >
                      {config.enabled ? (
                        <Play className="h-3 w-3" />
                      ) : (
                        <Square className="h-3 w-3" />
                      )}
                    </button>
                    
                    <span className={`text-xs font-medium px-2 py-1 rounded ${getMethodColor(config.method)}`}>
                      {config.method}
                    </span>
                    
                    <span className="text-sm font-mono">
                      {config.endpoint}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {config.delay && config.delay > 0 && (
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{config.delay}ms</span>
                      </div>
                    )}
                    
                    <span className={`text-xs font-medium ${
                      config.statusCode >= 200 && config.statusCode < 300 
                        ? 'text-green-600' 
                        : config.statusCode >= 400 
                        ? 'text-red-600' 
                        : 'text-yellow-600'
                    }`}>
                      {config.statusCode}
                    </span>
                    
                    <button
                      onClick={() => setEditingConfig(config)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="Editar"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="p-1 hover:bg-muted rounded transition-colors text-red-500"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <div className="mb-1">
                    <Globe className="h-3 w-3 inline mr-1" />
                    Response: {typeof config.response === 'object' 
                      ? `${Object.keys(config.response).length} fields`
                      : `${String(config.response).length} chars`
                    }
                  </div>
                  
                  {config.headers && (
                    <div>
                      Headers: {Object.keys(config.headers).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-2 bg-muted/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {configs.length === 0 ? 'Mostrando ejemplos' : `${configs.length} configuraciones`}
          </span>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Activo</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>Inactivo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});