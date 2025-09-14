'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Save, FileText, Code2, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EXAMPLE_SCRIPTS, type ExampleScript } from '@/lib/example-scripts';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onSelectScript?: (script: ExampleScript) => void;
}

interface SavedScript {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  updatedAt?: string;
}

export function Sidebar({ collapsed, onToggle, onSelectScript }: SidebarProps) {
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [activeTab, setActiveTab] = useState<'examples' | 'saved'>('examples');

  useEffect(() => {
    // Cargar scripts guardados del localStorage
    const scripts = localStorage.getItem('scripts');
    if (scripts) {
      setSavedScripts(JSON.parse(scripts));
    }
  }, []);

  const handleSelectExample = (script: ExampleScript) => {
    onSelectScript?.(script);
  };

  const handleSelectSaved = (script: SavedScript) => {
    onSelectScript?.(script.code, script.name);
  };

  const handleDeleteSaved = (scriptId: string) => {
    const updatedScripts = savedScripts.filter(s => s.id !== scriptId);
    setSavedScripts(updatedScripts);
    localStorage.setItem('scripts', JSON.stringify(updatedScripts));
  };

  const handleCreateNew = () => {
    onSelectScript?.('// Nuevo script\nconsole.log("¡Hola desde el nuevo script!");', 'Nuevo Script');
  };

  if (collapsed) {
    return (
      <div className="w-12 border-r bg-muted/50 flex flex-col items-center py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <div className="flex flex-col gap-2">
          <Button
            variant={activeTab === 'examples' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setActiveTab('examples')}
            title="Scripts de Ejemplo"
          >
            <Code2 className="h-4 w-4" />
          </Button>
          
          <Button
            variant={activeTab === 'saved' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setActiveTab('saved')}
            title="Scripts Guardados"
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-r bg-muted/50 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <h2 className="text-sm font-medium">Scripts</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('examples')}
          className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'examples'
              ? 'border-primary text-primary bg-background'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Code2 className="h-4 w-4" />
            Ejemplos
          </div>
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'saved'
              ? 'border-primary text-primary bg-background'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-4 w-4" />
            Guardados ({savedScripts.length})
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'examples' && (
          <div className="p-2">
            <div className="mb-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Scripts de Ejemplo
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Haz clic en cualquier script para cargarlo en el editor
              </p>
            </div>

            <div className="space-y-1">
              {EXAMPLE_SCRIPTS.map((script) => (
                <div
                  key={script.id}
                  className="group p-3 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleSelectExample(script)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                        {script.name}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {script.description}
                      </p>
                    </div>
                    <Play className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="p-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Scripts Guardados
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateNew}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Nuevo
              </Button>
            </div>

            {savedScripts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  No hay scripts guardados
                </p>
                <p className="text-xs text-muted-foreground">
                  Usa Ctrl+S en el editor para guardar un script
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {savedScripts.map((script) => (
                  <div
                    key={script.id}
                    className="group p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleSelectSaved(script)}
                      >
                        <h4 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                          {script.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Creado: {new Date(script.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSaved(script);
                          }}
                          className="h-6 w-6"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSaved(script.id);
                          }}
                          className="h-6 w-6 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}