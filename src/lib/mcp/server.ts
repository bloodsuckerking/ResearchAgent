import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function buildMcpServer(userId: string): McpServer {
  void userId;

  const server = new McpServer({
    name: "research-agent-mcp",
    version: "1.0.0",
  });

  // Register product tools here after adding files under src/lib/mcp/tools/.
  return server;
}
