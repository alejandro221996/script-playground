'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Eye, EyeOff, Save, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EnvVariable {
  id: string;
  key: string;
  value: string;
  description?: string;
  isSecret: boolean;
}

export const EnvironmentPanel: React.FC = () => {
  const [variables, setVariables] = useState<EnvVariable[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVar, setEditingVar] = useState<EnvVariable | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Cargar variables del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('scriptplayground-env-vars');
    if (saved) {
      try {
        setVariables(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading env vars:', error);
      }
    } else {
      // Variables por defecto
      setVariables([
        {
          id: '1',
          key: 'API_BASE_URL',
          value: 'https://jsonplaceholder.typicode.com',
          description: 'URL base para JSONPlaceholder API',
          isSecret: false
        },
        {
          id: '2',
          key: 'API_KEY',
          value: 'demo-key-123',
          description: 'API Key para autenticación',
          isSecret: true
        },
        {
          id: '3',
          key: 'TIMEOUT',
          value: '5000',
          description: 'Timeout en milisegundos para requests',
          isSecret: false
        },
        {
          id: '4',
          key: 'SHOW_USER_DETAILS',
          value: 'true',
          description: 'Mostrar detalles adicionales de usuarios',
          isSecret: false
        }
      ]);
    }
  }, []);

  // Guardar variables en localStorage
  useEffect(() => {
    if (variables.length > 0) {
      localStorage.setItem('scriptplayground-env-vars', JSON.stringify(variables));
    }
  }, [variables]);

  const addVariable = (newVar: Omit<EnvVariable, 'id'>) => {
    const variable: EnvVariable = {
      ...newVar,
      id: Date.now().toString()
    };
    setVariables(prev => [...prev, variable]);
    setShowAddForm(false);
  };

  const updateVariable = (id: string, updates: Partial<EnvVariable>) => {
    setVariables(prev => 
      prev.map(v => v.id === id ? { ...v, ...updates } : v)
    );
    setEditingVar(null);
  };

  const deleteVariable = (id: string) => {
    setVariables(prev => prev.filter(v => v.id !== id));
  };

  const toggleSecretVisibility = (id: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <div className="flex items-center space-x-2">
          <Settings className="h-4 w-4" />
          <h3 className="text-sm font-medium">Environment Variables</h3>
          <span className="text-xs bg-muted px-2 py-1 rounded">
            {variables.length} variables
          </span>
        </div>
        
        <Button
          onClick={() => setShowAddForm(true)}
          size="sm"
          className="h-7 px-2"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Variable
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {/* Add Form */}
        {showAddForm && (
          <AddVariableForm
            onAdd={addVariable}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Variables List */}
        <div className="space-y-2">
          {variables.map((variable) => (
            <VariableCard
              key={variable.id}
              variable={variable}
              isEditing={editingVar?.id === variable.id}
              showSecret={showSecrets[variable.id]}
              onEdit={() => setEditingVar(variable)}
              onSave={(updates) => updateVariable(variable.id, updates)}
              onCancel={() => setEditingVar(null)}
              onDelete={() => deleteVariable(variable.id)}
              onToggleSecret={() => toggleSecretVisibility(variable.id)}
            />
          ))}
        </div>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            📝 Cómo usar en tus scripts:
          </h4>
          <div className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
            <div>• <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">process.env.API_BASE_URL</code></div>
            <div>• <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">process.env.API_KEY</code></div>
            <div>• <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">process.env.TIMEOUT</code></div>
            <div>• <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">process.env.SHOW_USER_DETAILS</code></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Form para agregar nueva variable
const AddVariableForm: React.FC<{
  onAdd: (variable: Omit<EnvVariable, 'id'>) => void;
  onCancel: () => void;
}> = ({ onAdd, onCancel }) => {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [isSecret, setIsSecret] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key && value) {
      onAdd({ key, value, description, isSecret });
    }
  };

  return (
    <div className="mb-4 p-3 border rounded-lg bg-muted/30">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="VARIABLE_NAME"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            className="flex-1 px-2 py-1 text-xs border rounded bg-background"
          />
          <input
            type={isSecret ? 'password' : 'text'}
            placeholder="value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 px-2 py-1 text-xs border rounded bg-background"
          />
        </div>
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-2 py-1 text-xs border rounded bg-background"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 text-xs">
            <input
              type="checkbox"
              checked={isSecret}
              onChange={(e) => setIsSecret(e.target.checked)}
            />
            <span>Secret variable</span>
          </label>
          <div className="flex items-center space-x-1">
            <Button type="submit" size="sm" className="h-6 px-2">
              <Check className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              size="sm"
              className="h-6 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

// Card para cada variable
const VariableCard: React.FC<{
  variable: EnvVariable;
  isEditing: boolean;
  showSecret: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<EnvVariable>) => void;
  onCancel: () => void;
  onDelete: () => void;
  onToggleSecret: () => void;
}> = ({ variable, isEditing, showSecret, onEdit, onSave, onCancel, onDelete, onToggleSecret }) => {
  const [editKey, setEditKey] = useState(variable.key);
  const [editValue, setEditValue] = useState(variable.value);
  const [editDescription, setEditDescription] = useState(variable.description || '');

  if (isEditing) {
    return (
      <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
        <div className="space-y-2">
          <input
            type="text"
            value={editKey}
            onChange={(e) => setEditKey(e.target.value.toUpperCase())}
            className="w-full px-2 py-1 text-xs border rounded bg-background"
          />
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-2 py-1 text-xs border rounded bg-background"
          />
          <input
            type="text"
            placeholder="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full px-2 py-1 text-xs border rounded bg-background"
          />
          <div className="flex justify-end space-x-1">
            <Button
              onClick={() => onSave({
                key: editKey,
                value: editValue,
                description: editDescription
              })}
              size="sm"
              className="h-6 px-2"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              size="sm"
              className="h-6 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <code className="text-sm font-mono font-medium text-blue-600 dark:text-blue-400">
              {variable.key}
            </code>
            {variable.isSecret && (
              <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 px-1 rounded">
                SECRET
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center space-x-2">
            <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
              {variable.isSecret && !showSecret 
                ? '●●●●●●●●' 
                : variable.value
              }
            </span>
            {variable.isSecret && (
              <button
                onClick={onToggleSecret}
                className="text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            )}
          </div>
          {variable.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {variable.description}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onEdit}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
          >
            <Settings className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-muted-foreground hover:text-red-600 rounded"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};