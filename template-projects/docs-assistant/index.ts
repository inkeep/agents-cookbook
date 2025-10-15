import { docsAssistantAgent } from "./agents/docs-assistant.js";
import { project } from "@inkeep/agents-sdk";
import { inkeepRagMcpTool } from "./tools/inkeep-rag-mcp.js";

export const myProject = project({
  id: "docs-assistant",
  name: "Docs Assistant",
  description: "Docs assistant template",
  agents: () => [docsAssistantAgent],
  tools: () => [inkeepRagMcpTool],
});
