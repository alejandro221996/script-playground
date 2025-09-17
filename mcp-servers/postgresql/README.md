# PostgreSQL MCP Server

Un servidor MCP (Model Context Protocol) para gestión de base de datos PostgreSQL, diseñado específicamente para el proyecto Script Playground.

## Características

### 🔧 Herramientas Generales de Base de Datos
- **execute_query**: Ejecutar consultas SQL personalizadas
- **describe_table**: Obtener información detallada de estructura de tablas
- **list_tables**: Listar todas las tablas en el esquema

### 🎯 Herramientas Específicas para Mocks
- **list_mock_configs**: Listar todas las configuraciones de mock
- **get_mock_stats**: Obtener estadísticas sobre configuraciones de mock
- **search_mocks**: Buscar mocks por endpoint, método o tags

## Instalación

```bash
cd mcp-servers/postgresql
npm install
```

## Configuración

El servidor utiliza las mismas variables de entorno que el proyecto principal:

- `DATABASE_URL`: URL de conexión a PostgreSQL

## Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

## Configuración en VS Code

Agregar al archivo `settings.json` de VS Code:

```json
{
  "mcp.mcpServers": {
    "postgresql": {
      "command": "node",
      "args": ["/ruta/al/proyecto/mcp-servers/postgresql/dist/index.js"]
    }
  }
}
```

## Ejemplos de Uso

### Consultar Mock Configs
```sql
SELECT * FROM mock_configs WHERE enabled = true;
```

### Obtener Estadísticas
Usar la herramienta `get_mock_stats` para ver:
- Total de configuraciones
- Configuraciones habilitadas/deshabilitadas
- Métodos HTTP únicos
- Delays promedio/máximo/mínimo

### Buscar Mocks
Usar `search_mocks` con términos como:
- "hubspot" - buscar mocks relacionados con HubSpot
- "POST" - buscar todos los mocks POST
- "users" - buscar endpoints que contengan "users"

## Estructura de Datos

El servidor trabaja principalmente con la tabla `mock_configs`:

```sql
CREATE TABLE mock_configs (
  id VARCHAR PRIMARY KEY,
  name VARCHAR,
  endpoint VARCHAR NOT NULL,
  method VARCHAR NOT NULL,
  response JSON NOT NULL,
  status_code INTEGER DEFAULT 200,
  headers JSON DEFAULT '{}',
  delay INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  description VARCHAR,
  tags VARCHAR[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```