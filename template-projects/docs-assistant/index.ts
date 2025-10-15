import { docsAssistantAgent } from "./agents/docs-assistant.js";
import { project } from "@inkeep/agents-sdk";

export const myProject = project({
  id: "docs-assistant",
  name: "Docs Assistant",
  description: "Docs assistant template",
  agents: () => [docsAssistantAgent],
});
