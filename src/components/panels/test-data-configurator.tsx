'use client';

import { useState, useEffect } from 'react';
import { Play, AlertTriangle, CheckCircle, Settings, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { analyzeScript, generateTestData, type ScriptAnalysis, type DetectedField } from '@/lib/script-analyzer';

interface TestDataConfiguratorProps {
  scriptCode: string;
  onRun: (testData: { 
    inputFields: Record<string, any>; 
    envVariables: Record<string, string>;
    undefinedVariables: Record<string, any>;
  }) => void;
  isRunning: boolean;
}

export const TestDataConfigurator: React.FC<TestDataConfiguratorProps> = ({ 
  scriptCode, 
  onRun, 
  isRunning 
}) => {
  const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(null);
  const [inputFields, setInputFields] = useState<Record<string, any>>({});
  const [envVariables, setEnvVariables] = useState<Record<string, string>>({});
  const [undefinedVariables, setUndefinedVariables] = useState<Record<string, any>>({});
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showInputValues, setShowInputValues] = useState<Record<string, boolean>>({});

  // Analizar el script cuando cambie
  useEffect(() => {
    if (scriptCode.trim()) {
      const newAnalysis = analyzeScript(scriptCode);
      setAnalysis(newAnalysis);
      
      // Generar datos de prueba por defecto
      const testData = generateTestData(newAnalysis);
      setInputFields(testData.inputFields);
      setEnvVariables(testData.envVariables);
      setUndefinedVariables(testData.undefinedVariables);
      
      // Mostrar automáticamente si hay datos que configurar
      const hasData = newAnalysis.inputFields.length > 0 || 
                     newAnalysis.envVariables.length > 0 || 
                     newAnalysis.undefinedVariables.length > 0;
      setShowAnalysis(hasData);
    } else {
      setAnalysis(null);
      setShowAnalysis(false);
    }
  }, [scriptCode]);

  const handleRunWithData = () => {
    onRun({ inputFields, envVariables, undefinedVariables });
  };

  const resetToDefaults = () => {
    if (analysis) {
      const testData = generateTestData(analysis);
      setInputFields(testData.inputFields);
      setEnvVariables(testData.envVariables);
      setUndefinedVariables(testData.undefinedVariables);
    }
  };

  const updateInputField = (name: string, value: any) => {
    setInputFields(prev => ({ ...prev, [name]: value }));
  };

  const updateEnvVariable = (name: string, value: string) => {
    setEnvVariables(prev => ({ ...prev, [name]: value }));
  };

  const updateUndefinedVariable = (name: string, value: any) => {
    setUndefinedVariables(prev => ({ ...prev, [name]: value }));
  };

  const toggleValueVisibility = (fieldName: string) => {
    setShowInputValues(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  if (!analysis) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Escribe código para analizar los datos requeridos</p>
      </div>
    );
  }

  const totalFields = analysis.inputFields.length + analysis.envVariables.length + analysis.undefinedVariables.length;
  const requiredFields = [...analysis.inputFields, ...analysis.envVariables, ...analysis.undefinedVariables].filter(f => f.required).length;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-3 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="flex items-center space-x-2 hover:bg-muted rounded px-2 py-1 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <h3 className="text-sm font-medium">Test Data</h3>
              {totalFields > 0 && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1 rounded">
                  {totalFields} campos
                </span>
              )}
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            {requiredFields > 0 && (
              <div className="flex items-center space-x-1 text-orange-600">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs">{requiredFields} requeridos</span>
              </div>
            )}
            
            <Button
              onClick={resetToDefaults}
              variant="outline"
              size="sm"
              className="h-7 px-2"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>

            <Button
              onClick={handleRunWithData}
              disabled={isRunning}
              size="sm"
              className="h-7 px-3"
            >
              {isRunning ? (
                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              Ejecutar
            </Button>
          </div>
        </div>

        {/* Análisis Summary */}
        {analysis.suggestions.length > 0 && (
          <div className="mt-2 space-y-1">
            {analysis.suggestions.map((suggestion, index) => (
              <div key={index} className="text-xs text-muted-foreground">
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {showAnalysis && (
        <div className="flex-1 overflow-auto p-3 space-y-4">
          
          {/* Input Fields */}
          {analysis.inputFields.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Input Fields ({analysis.inputFields.length})
              </h4>
              <div className="space-y-2">
                {analysis.inputFields.map((field) => (
                  <FieldConfigCard
                    key={field.name}
                    field={field}
                    value={inputFields[field.name] || ''}
                    showValue={showInputValues[field.name]}
                    onChange={(value) => updateInputField(field.name, value)}
                    onToggleVisibility={() => toggleValueVisibility(field.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Environment Variables */}
          {analysis.envVariables.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Environment Variables ({analysis.envVariables.length})
              </h4>
              <div className="space-y-2">
                {analysis.envVariables.map((field) => (
                  <FieldConfigCard
                    key={field.name}
                    field={field}
                    value={envVariables[field.name] || ''}
                    showValue={showInputValues[field.name]}
                    onChange={(value) => updateEnvVariable(field.name, value)}
                    onToggleVisibility={() => toggleValueVisibility(field.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Undefined Variables */}
          {analysis.undefinedVariables.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                Variables No Definidas ({analysis.undefinedVariables.length})
              </h4>
              <div className="space-y-2">
                {analysis.undefinedVariables.map((field) => (
                  <FieldConfigCard
                    key={field.name}
                    field={field}
                    value={undefinedVariables[field.name] || ''}
                    showValue={showInputValues[field.name]}
                    onChange={(value) => updateUndefinedVariable(field.name, value)}
                    onToggleVisibility={() => toggleValueVisibility(field.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Mensaje si no hay campos */}
          {totalFields === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm">No se detectaron datos de entrada requeridos</p>
              <p className="text-xs">El script puede ejecutarse directamente</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Componente para cada campo configurable
const FieldConfigCard: React.FC<{
  field: DetectedField;
  value: any;
  showValue?: boolean;
  onChange: (value: any) => void;
  onToggleVisibility: () => void;
}> = ({ field, value, showValue = true, onChange, onToggleVisibility }) => {
  const isRequired = field.required;
  const isSensitive = field.name.toLowerCase().includes('key') || 
                     field.name.toLowerCase().includes('secret') ||
                     field.name.toLowerCase().includes('password');

  return (
    <div className={`p-3 border rounded-lg hover:bg-muted/30 transition-colors ${
      isRequired ? 'border-orange-300 dark:border-orange-700' : ''
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <code className="text-sm font-mono font-medium text-blue-600 dark:text-blue-400">
              {field.name}
            </code>
            {isRequired && (
              <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 px-1 rounded">
                Required
              </span>
            )}
            {isSensitive && (
              <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-1 rounded">
                Sensitive
              </span>
            )}
          </div>
          
          {field.context && (
            <div className="mt-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              <code>{field.context.length > 60 ? field.context.substring(0, 60) + '...' : field.context}</code>
            </div>
          )}
        </div>
        
        {isSensitive && (
          <button
            onClick={onToggleVisibility}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
          >
            {showValue ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        )}
      </div>
      
      <input
        type={isSensitive && !showValue ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.suggestedValue}
        className="w-full px-2 py-1 text-xs border rounded bg-background"
      />
      
      <div className="mt-1 text-xs text-muted-foreground">
        Usado en: <code className="bg-muted px-1 rounded">{field.path}</code>
      </div>
    </div>
  );
};