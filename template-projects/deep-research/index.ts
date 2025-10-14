import { deepResearchAgent } from "./agents/deep-research.js";
import { project } from "@inkeep/agents-sdk";

export const myProject = project({
  id: "deep-research",
  name: "Deep Research",
  description: "Deep research project template",
  agents: () => [deepResearchAgent],
});
