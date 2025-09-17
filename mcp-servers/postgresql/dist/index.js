#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { Pool } from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../../.env.local') });
class PostgreSQLMCPServer {
    server;
    pool;
    constructor() {
        this.server = new Server({
            name: "postgresql-mcp-server",
            version: "1.0.0",
        }, {
            capabilities: {
                tools: {},
            },
        });
        // Initialize PostgreSQL connection pool
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
        });
        this.setupToolHandlers();
        this.setupErrorHandling();
    }
    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error("[MCP Error]", error);
        };
        process.on('SIGINT', async () => {
            await this.cleanup();
            process.exit(0);
        });
    }
    async cleanup() {
        await this.pool.end();
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "execute_query",
                        description: "Execute a SQL query against the PostgreSQL database",
                        inputSchema: {
                            type: "object",
                            properties: {
                                query: {
                                    type: "string",
                                    description: "The SQL query to execute"
                                },
                                params: {
                                    type: "array",
                                    description: "Optional parameters for parameterized queries",
                                    items: { type: "string" }
                                }
                            },
                            required: ["query"]
                        }
                    },
                    {
                        name: "describe_table",
                        description: "Get detailed information about a table structure",
                        inputSchema: {
                            type: "object",
                            properties: {
                                table_name: {
                                    type: "string",
                                    description: "Name of the table to describe"
                                },
                                schema: {
                                    type: "string",
                                    description: "Schema name (default: public)",
                                    default: "public"
                                }
                            },
                            required: ["table_name"]
                        }
                    },
                    {
                        name: "list_tables",
                        description: "List all tables in the database",
                        inputSchema: {
                            type: "object",
                            properties: {
                                schema: {
                                    type: "string",
                                    description: "Schema name (default: public)",
                                    default: "public"
                                }
                            }
                        }
                    },
                    {
                        name: "list_mock_configs",
                        description: "List all mock configurations with their details",
                        inputSchema: {
                            type: "object",
                            properties: {
                                enabled_only: {
                                    type: "boolean",
                                    description: "Show only enabled configurations",
                                    default: false
                                }
                            }
                        }
                    },
                    {
                        name: "get_mock_stats",
                        description: "Get statistics about mock configurations",
                        inputSchema: {
                            type: "object",
                            properties: {}
                        }
                    },
                    {
                        name: "search_mocks",
                        description: "Search mock configurations by endpoint, method, or tags",
                        inputSchema: {
                            type: "object",
                            properties: {
                                search_term: {
                                    type: "string",
                                    description: "Term to search for in endpoints, methods, or tags"
                                }
                            },
                            required: ["search_term"]
                        }
                    }
                ]
            };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            if (!args || typeof args !== 'object') {
                throw new Error('Invalid arguments provided');
            }
            try {
                switch (name) {
                    case "execute_query":
                        return await this.executeQuery(args.query, args.params);
                    case "describe_table":
                        return await this.describeTable(args.table_name, args.schema || 'public');
                    case "list_tables":
                        return await this.listTables(args.schema || 'public');
                    case "list_mock_configs":
                        return await this.listMockConfigs(args.enabled_only || false);
                    case "get_mock_stats":
                        return await this.getMockStats();
                    case "search_mocks":
                        return await this.searchMocks(args.search_term);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error executing ${name}: ${errorMessage}`
                        }
                    ]
                };
            }
        });
    }
    async executeQuery(query, params) {
        try {
            const client = await this.pool.connect();
            const result = await client.query(query, params);
            client.release();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            rowCount: result.rowCount,
                            command: result.command,
                            rows: result.rows,
                            success: true
                        }, null, 2)
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async describeTable(tableName, schema = 'public') {
        const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position;
    `;
        const result = await this.executeQuery(query, [schema, tableName]);
        return result;
    }
    async listTables(schema = 'public') {
        const query = `
      SELECT 
        table_name,
        table_type,
        CASE 
          WHEN table_type = 'BASE TABLE' THEN 'table'
          WHEN table_type = 'VIEW' THEN 'view'
          ELSE LOWER(table_type)
        END as type
      FROM information_schema.tables 
      WHERE table_schema = $1
      ORDER BY table_name;
    `;
        const result = await this.executeQuery(query, [schema]);
        return result;
    }
    async listMockConfigs(enabledOnly = false) {
        let query = `
      SELECT 
        id,
        name,
        endpoint,
        method,
        status_code as "statusCode",
        enabled,
        delay,
        tags,
        created_at as "createdAt",
        updated_at as "updatedAt",
        description
      FROM mock_configs
    `;
        if (enabledOnly) {
            query += ' WHERE enabled = true';
        }
        query += ' ORDER BY created_at DESC';
        const result = await this.executeQuery(query);
        return result;
    }
    async getMockStats() {
        const statsQuery = `
      SELECT 
        COUNT(*) as total_configs,
        COUNT(CASE WHEN enabled = true THEN 1 END) as enabled_configs,
        COUNT(CASE WHEN enabled = false THEN 1 END) as disabled_configs,
        COUNT(DISTINCT method) as unique_methods,
        AVG(delay) as avg_delay,
        MAX(delay) as max_delay,
        MIN(delay) as min_delay
      FROM mock_configs;
    `;
        const methodsQuery = `
      SELECT method, COUNT(*) as count 
      FROM mock_configs 
      GROUP BY method 
      ORDER BY count DESC;
    `;
        const [statsResult, methodsResult] = await Promise.all([
            this.executeQuery(statsQuery),
            this.executeQuery(methodsQuery)
        ]);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        stats: JSON.parse(statsResult.content[0].text).rows[0],
                        methods_breakdown: JSON.parse(methodsResult.content[0].text).rows,
                        success: true
                    }, null, 2)
                }
            ]
        };
    }
    async searchMocks(searchTerm) {
        const query = `
      SELECT 
        id,
        name,
        endpoint,
        method,
        status_code as "statusCode",
        enabled,
        delay,
        tags,
        created_at as "createdAt",
        description
      FROM mock_configs
      WHERE 
        LOWER(endpoint) LIKE LOWER($1) OR
        LOWER(method) LIKE LOWER($1) OR
        LOWER(name) LIKE LOWER($1) OR
        LOWER(description) LIKE LOWER($1) OR
        EXISTS (
          SELECT 1 FROM unnest(tags) as tag 
          WHERE LOWER(tag) LIKE LOWER($1)
        )
      ORDER BY created_at DESC;
    `;
        const result = await this.executeQuery(query, [`%${searchTerm}%`]);
        return result;
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("PostgreSQL MCP server running on stdio");
    }
}
const server = new PostgreSQLMCPServer();
server.run().catch(console.error);
//# sourceMappingURL=index.js.map