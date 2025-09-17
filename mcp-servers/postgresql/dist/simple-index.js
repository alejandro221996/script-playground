// MCP Server Simplificado - Solo para GitHub Copilot Context
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { Pool } from 'pg';
// Configuración de la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
class SimpleMCPServer {
    server;
    constructor() {
        this.server = new Server({
            name: 'postgresql-context',
            version: '2.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
        this.setupErrorHandling();
    }
    setupToolHandlers() {
        // Lista de herramientas disponibles
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'get_mock_context',
                        description: 'Get comprehensive context about mock configurations for Copilot suggestions',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                filter: {
                                    type: 'string',
                                    description: 'Optional filter for specific mocks (endpoint, method, or tag)',
                                },
                            },
                        },
                    },
                    {
                        name: 'analyze_endpoint',
                        description: 'Analyze an endpoint to provide context about existing mocks and suggestions',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                url: {
                                    type: 'string',
                                    description: 'The URL/endpoint to analyze',
                                },
                                method: {
                                    type: 'string',
                                    description: 'HTTP method (optional)',
                                },
                            },
                            required: ['url'],
                        },
                    },
                    {
                        name: 'get_usage_patterns',
                        description: 'Get usage patterns and statistics to help with optimization suggestions',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                        },
                    },
                ],
            };
        });
        // Manejo de herramientas
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'get_mock_context':
                        return await this.getMockContext(args?.filter);
                    case 'analyze_endpoint':
                        return await this.analyzeEndpoint(args?.url, args?.method);
                    case 'get_usage_patterns':
                        return await this.getUsagePatterns();
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error executing ${name}: ${error.message}`,
                        },
                    ],
                };
            }
        });
    }
    async getMockContext(filter) {
        let query = `
      SELECT 
        id, name, description, endpoint, method, 
        enabled, tags, created_at, updated_at,
        CASE 
          WHEN response IS NOT NULL THEN true 
          ELSE false 
        END as has_response
      FROM "MockConfig" 
      ORDER BY created_at DESC
    `;
        const params = [];
        if (filter) {
            query = `
        SELECT 
          id, name, description, endpoint, method, 
          enabled, tags, created_at, updated_at,
          CASE 
            WHEN response IS NOT NULL THEN true 
            ELSE false 
          END as has_response
        FROM "MockConfig" 
        WHERE 
          endpoint ILIKE $1 OR 
          method ILIKE $1 OR 
          $1 = ANY(tags) OR
          name ILIKE $1 OR
          description ILIKE $1
        ORDER BY created_at DESC
      `;
            params.push(`%${filter}%`);
        }
        const result = await pool.query(query, params);
        const stats = await this.getMockStats();
        return {
            content: [
                {
                    type: 'text',
                    text: `## Mock Configuration Context

### Overview
- **Total Mocks**: ${stats.total}
- **Enabled**: ${stats.enabled}
- **Disabled**: ${stats.disabled}
- **Recently Created**: ${stats.recentlyCreated}

### HTTP Methods Distribution
${Object.entries(stats.byMethod)
                        .map(([method, count]) => `- **${method}**: ${count} mocks`)
                        .join('\n')}

### Available Mock Endpoints
${result.rows.map(row => `- **${row.method} ${row.endpoint}** ${row.enabled ? '✅' : '❌'}
    - Name: ${row.name || 'Unnamed'}
    - Description: ${row.description || 'No description'}
    - Tags: ${row.tags?.join(', ') || 'None'}
    - Created: ${row.created_at?.toLocaleDateString()}
    - Has Response: ${row.has_response ? 'Yes' : 'No'}`).join('\n\n')}

### Usage Tips for Copilot
- Use existing mock endpoints when possible
- Follow naming pattern: /api/mock/[service-name]
- Include relevant tags for better categorization
- Enable/disable mocks based on testing needs`,
                },
            ],
        };
    }
    async analyzeEndpoint(url, method) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const hostname = urlObj.hostname;
            // Buscar mocks similares
            const similarQuery = `
        SELECT endpoint, method, name, enabled, tags
        FROM "MockConfig"
        WHERE endpoint ILIKE $1 OR endpoint ILIKE $2
        ORDER BY enabled DESC, created_at DESC
        LIMIT 5
      `;
            const similar = await pool.query(similarQuery, [
                `%${pathname}%`,
                `%${hostname.split('.')[0]}%`
            ]);
            return {
                content: [
                    {
                        type: 'text',
                        text: `## Endpoint Analysis: ${url}

### Parsed URL Components
- **Host**: ${hostname}
- **Path**: ${pathname}
- **Service**: ${hostname.split('.')[0]}
- **Method**: ${method || 'Not specified'}

### Similar Existing Mocks
${similar.rows.length > 0 ?
                            similar.rows.map(row => `- **${row.method} ${row.endpoint}** ${row.enabled ? '✅' : '❌'}
      - Name: ${row.name}
      - Tags: ${row.tags?.join(', ') || 'None'}`).join('\n')
                            : '- No similar mocks found'}

### Recommendations
${this.getEndpointRecommendations(hostname, pathname, similar.rows)}`,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error analyzing endpoint: ${error.message}`,
                    },
                ],
            };
        }
    }
    getEndpointRecommendations(hostname, pathname, similar) {
        const recommendations = [];
        // Recomendar crear mock si no hay similares
        if (similar.length === 0) {
            const suggestedEndpoint = `/api/mock/${hostname.split('.')[0]}${pathname}`;
            recommendations.push(`- **Create new mock**: ${suggestedEndpoint}`);
            recommendations.push(`- **Use tags**: ['${hostname.split('.')[0]}', 'auto-generated']`);
        }
        // Si hay similares deshabilitados
        const disabled = similar.filter(s => !s.enabled);
        if (disabled.length > 0) {
            recommendations.push(`- **Enable existing mocks**: ${disabled.length} similar mocks are disabled`);
        }
        // Recomendaciones generales
        recommendations.push(`- **Follow naming convention**: /api/mock/[service-name][original-path]`);
        recommendations.push(`- **Add meaningful description** and tags for better organization`);
        return recommendations.join('\n');
    }
    async getUsagePatterns() {
        const stats = await this.getMockStats();
        const recentActivity = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as mocks_created
      FROM "MockConfig"
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 10
    `);
        const popularTags = await pool.query(`
      SELECT 
        unnest(tags) as tag,
        COUNT(*) as usage_count
      FROM "MockConfig"
      WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      GROUP BY unnest(tags)
      ORDER BY usage_count DESC
      LIMIT 10
    `);
        return {
            content: [
                {
                    type: 'text',
                    text: `## Usage Patterns & Statistics

### Mock Creation Activity (Last 30 days)
${recentActivity.rows.map(row => `- **${row.date}**: ${row.mocks_created} mocks created`).join('\n')}

### Popular Tags
${popularTags.rows.map(row => `- **${row.tag}**: Used in ${row.usage_count} mocks`).join('\n')}

### Overall Statistics
- **Total Mocks**: ${stats.total}
- **Enabled**: ${stats.enabled} (${Math.round(stats.enabled / stats.total * 100)}%)
- **Average per Method**: ${(stats.total / Object.keys(stats.byMethod).length).toFixed(1)}
- **Most Used Method**: ${Object.entries(stats.byMethod).sort(([, a], [, b]) => b - a)[0]?.[0] || 'None'}

### Optimization Suggestions
${this.getOptimizationSuggestions(stats)}`,
                },
            ],
        };
    }
    getOptimizationSuggestions(stats) {
        const suggestions = [];
        if (stats.disabled > stats.enabled) {
            suggestions.push('- **High disabled mock ratio**: Consider cleaning up unused mocks');
        }
        if (stats.total === 0) {
            suggestions.push('- **No mocks configured**: Create your first mock to start testing');
        }
        if (Object.keys(stats.byMethod).length === 1) {
            suggestions.push('- **Limited method coverage**: Consider adding mocks for other HTTP methods');
        }
        if (suggestions.length === 0) {
            suggestions.push('- **Configuration looks good**: Mock setup is well balanced');
        }
        return suggestions.join('\n');
    }
    async getMockStats() {
        const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE enabled = true) as enabled,
        COUNT(*) FILTER (WHERE enabled = false) as disabled,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recently_created
      FROM "MockConfig"
    `);
        const methodStats = await pool.query(`
      SELECT method, COUNT(*) as count
      FROM "MockConfig"
      GROUP BY method
    `);
        const stats = result.rows[0];
        const byMethod = {};
        methodStats.rows.forEach(row => {
            byMethod[row.method] = parseInt(row.count);
        });
        return {
            total: parseInt(stats.total),
            enabled: parseInt(stats.enabled),
            disabled: parseInt(stats.disabled),
            recentlyCreated: parseInt(stats.recently_created),
            byMethod
        };
    }
    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error('[MCP Error]', error);
        };
        process.on('SIGINT', async () => {
            await pool.end();
            process.exit(0);
        });
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Simple MCP Server running on stdio');
    }
}
// Iniciar servidor
const server = new SimpleMCPServer();
server.start().catch(console.error);
//# sourceMappingURL=simple-index.js.map