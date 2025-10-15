import { eventPlannerAgent } from './agents/event-planner.js';
import { project } from '@inkeep/agents-sdk';
import { exaMcpTool } from './tools/exa-mcp.js';
import { weatherMcpTool } from './tools/weather-mcp.js';

export const myProject = project({
  id: 'event-planner',
  name: 'Event planner',
  description: 'Event planner project template',
  agents: () => [eventPlannerAgent],
  tools: () => [weatherMcpTool, exaMcpTool],
});