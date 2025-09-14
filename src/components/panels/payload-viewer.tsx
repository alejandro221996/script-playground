'use client';

import { useState } from 'react';
import JSONPretty from 'react-json-pretty';
import 'react-json-pretty/themes/monikai.css';
import { useTheme } from 'next-themes';
import { Copy, Download, Search } from 'lucide-react';

interface PayloadViewerProps {
  data?: any;
  title?: string;
  type?: 'request' | 'response' | 'data';
}

export const PayloadViewer: React.FC<PayloadViewerProps> = ({ 
  data = null, 
  title = "Payload Data",
  type = 'data'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { theme } = useTheme();

  // Si no hay datos, mostrar mensaje vacío
  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No hay datos para mostrar</h3>
          <p className="text-sm text-muted-foreground">
            Los datos aparecerán aquí cuando ejecutes un script
          </p>
        </div>
      </div>
    );
  }

  // Filtrar datos basado en búsqueda
  const displayData = searchTerm ? 
    JSON.parse(JSON.stringify(data, (key, value) => {
      if (typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase())) {
        return value;
      }
      if (typeof key === 'string' && key.toLowerCase().includes(searchTerm.toLowerCase())) {
        return value;
      }
      return value;
    })) : data;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    // Aquí podrías agregar una notificación
  };

  const handleDownload = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payload-${type}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-background/50">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {type === 'request' ? '📤 Request Data' : type === 'response' ? '📥 Response Data' : '📊 Data'}
          </p>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Search */}
          <div className="flex items-center space-x-1 mr-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 pr-2 py-1 text-xs border rounded w-32 bg-background/50"
              />
            </div>
          </div>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Copiar JSON"
          >
            <Copy className="h-3 w-3" />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Descargar JSON"
          >
            <Download className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* JSON Viewer */}
      <div className="flex-1 overflow-auto p-2">
        <div className="bg-background rounded border p-3">
          <JSONPretty 
            id="json-pretty" 
            data={displayData}
            theme={{
              main: theme === 'dark' ? 'line-height:1.3;color:#f8f8f2;background:transparent;overflow:auto;' : 'line-height:1.3;color:#24292e;background:transparent;overflow:auto;',
              error: 'line-height:1.3;color:#ff6c6b;background:transparent;overflow:auto;',
              key: `color:${theme === 'dark' ? '#ff79c6' : '#005cc5'};`,
              string: `color:${theme === 'dark' ? '#f1fa8c' : '#032f62'};`,
              value: `color:${theme === 'dark' ? '#8be9fd' : '#e36209'};`,
              boolean: `color:${theme === 'dark' ? '#bd93f9' : '#0969da'};`,
            }}
            space={2}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-2 bg-background/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Tamaño: {JSON.stringify(data).length} caracteres
          </span>
          <span>
            Tipo: {Array.isArray(data) ? 'Array' : typeof data}
          </span>
        </div>
      </div>
    </div>
  );
};