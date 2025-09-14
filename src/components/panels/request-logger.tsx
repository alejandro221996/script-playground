'use client';

import { useState } from 'react';
import { Clock, Globe, Download, Trash2, Filter, Eye, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
import { formatTimestamp, formatDuration } from '@/lib/utils';

interface RequestLog {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  response?: any;
  timestamp: string;
  duration: number;
  statusCode?: number;
  error?: string;
}

interface RequestLoggerProps {
  requests?: RequestLog[];
  onClear?: () => void;
  onSelectRequest?: (request: RequestLog) => void;
  onCreateMock?: (request: RequestLog) => void;
}

export const RequestLogger: React.FC<RequestLoggerProps> = ({
  requests = [],
  onClear,
  onSelectRequest,
  onCreateMock
}) => {
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [selectedRequest, setSelectedRequest] = useState<RequestLog | null>(null);
  
  // Datos de ejemplo para mostrar cuando no hay requests reales
  const sampleRequests: RequestLog[] = [
    {
      id: 'sample-1',
      url: 'https://jsonplaceholder.typicode.com/users',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timestamp: new Date(Date.now() - 5000).toISOString(),
      duration: 234,
      statusCode: 200,
      response: { length: 10, preview: 'Array of 10 users...' }
    },
    {
      id: 'sample-2',
      url: 'https://jsonplaceholder.typicode.com/posts',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { title: 'Test Post', userId: 1 },
      timestamp: new Date(Date.now() - 10000).toISOString(),
      duration: 445,
      statusCode: 201,
      response: { id: 101, title: 'Test Post' }
    }
  ];

  const displayRequests = requests.length > 0 ? requests : sampleRequests;
  
  const filteredRequests = filter === 'all' 
    ? displayRequests
    : filter === 'success'
    ? displayRequests.filter(req => req.statusCode && req.statusCode >= 200 && req.statusCode < 400)
    : displayRequests.filter(req => req.error || (req.statusCode && req.statusCode >= 400));

  const getStatusIcon = (request: RequestLog) => {
    if (request.error) {
      return <XCircle className="h-3 w-3 text-red-500" />;
    }
    if (request.statusCode) {
      if (request.statusCode >= 200 && request.statusCode < 300) {
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      }
      if (request.statusCode >= 300 && request.statusCode < 400) {
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
      }
      return <XCircle className="h-3 w-3 text-red-500" />;
    }
    return <Clock className="h-3 w-3 text-muted-foreground animate-spin" />;
  };

  const getStatusColor = (request: RequestLog) => {
    if (request.error) return 'text-red-600 bg-red-50 dark:bg-red-950/50';
    if (request.statusCode) {
      if (request.statusCode >= 200 && request.statusCode < 300) {
        return 'text-green-600 bg-green-50 dark:bg-green-950/50';
      }
      if (request.statusCode >= 300 && request.statusCode < 400) {
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/50';
      }
      return 'text-red-600 bg-red-50 dark:bg-red-950/50';
    }
    return 'text-muted-foreground bg-muted/50';
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
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

  const handleRequestClick = (request: RequestLog) => {
    setSelectedRequest(request);
    onSelectRequest?.(request);
  };

  const downloadLogs = () => {
    const data = filteredRequests.map(req => ({
      timestamp: req.timestamp,
      method: req.method,
      url: req.url,
      statusCode: req.statusCode,
      duration: req.duration,
      error: req.error
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `request-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRequestCounts = () => {
    const total = displayRequests.length;
    const success = displayRequests.filter(req => 
      req.statusCode && req.statusCode >= 200 && req.statusCode < 400
    ).length;
    const errors = displayRequests.filter(req => 
      req.error || (req.statusCode && req.statusCode >= 400)
    ).length;
    
    return { total, success, errors };
  };

  const counts = getRequestCounts();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <div className="flex items-center space-x-2">
          <Globe className="h-4 w-4" />
          <h3 className="text-sm font-medium">Request History</h3>
          <span className="text-xs bg-muted px-2 py-1 rounded">
            {displayRequests.length} requests
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Filter buttons */}
          <div className="flex items-center space-x-1 bg-background rounded p-1">
            <button
              onClick={() => setFilter('all')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                filter === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              Todo ({counts.total})
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                filter === 'success' ? 'bg-green-500 text-white' : 'hover:bg-muted'
              }`}
            >
              Éxito ({counts.success})
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                filter === 'error' ? 'bg-red-500 text-white' : 'hover:bg-muted'
              }`}
            >
              Error ({counts.errors})
            </button>
          </div>

          {/* Download logs */}
          <button
            onClick={downloadLogs}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Descargar logs"
          >
            <Download className="h-3 w-3" />
          </button>

          {/* Clear logs */}
          <button
            onClick={onClear}
            className="p-1 hover:bg-muted rounded transition-colors text-red-500"
            title="Limpiar historial"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Request list */}
      <div className="flex-1 overflow-auto">
        {filteredRequests.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay requests para mostrar</p>
            <p className="text-xs mt-1">
              {requests.length === 0 
                ? 'Ejecuta un script que haga peticiones HTTP'
                : 'No hay requests que coincidan con el filtro'
              }
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                onClick={() => handleRequestClick(request)}
                className={`p-3 mb-2 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                  selectedRequest?.id === request.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                } ${getStatusColor(request)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(request)}
                    <span className={`text-xs font-medium px-2 py-1 rounded ${getMethodColor(request.method)}`}>
                      {request.method}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(new Date(request.timestamp))}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs">
                    {request.statusCode && (
                      <span className={`font-medium ${
                        request.statusCode >= 200 && request.statusCode < 300 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {request.statusCode}
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {formatDuration(request.duration)}
                    </span>
                    
                    {/* Botón para crear mock */}
                    {request.response && !request.error && onCreateMock && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateMock(request);
                        }}
                        className="flex items-center space-x-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 rounded text-xs transition-colors"
                        title="Crear Mock API de esta respuesta"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Mock</span>
                      </button>
                    )}
                    
                    <Eye className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="mb-1">
                  <span className="text-sm font-mono break-all">
                    {request.url}
                  </span>
                </div>
                
                {request.error && (
                  <div className="text-xs text-red-600 mt-1">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    {request.error}
                  </div>
                )}
                
                {request.response && !request.error && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {typeof request.response === 'object' 
                      ? `Response: ${Object.keys(request.response).length} fields`
                      : `Response: ${String(request.response).substring(0, 50)}...`
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};