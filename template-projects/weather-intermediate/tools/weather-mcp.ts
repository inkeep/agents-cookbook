import { mcpTool } from "@inkeep/agents-sdk";

export const weatherMcpTool = mcpTool({
  id: 'weather-mcp',
  name: 'Weather',
  serverUrl: 'https://weather-mcp-hazel.vercel.app/mcp',
});