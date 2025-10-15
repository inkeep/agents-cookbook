import { weatherBasic } from './agents/weather-basic.js';
import { weatherIntermediate } from './agents/weather-intermediate.js';
import { weatherAdvanced } from './agents/weather-advanced.js';
import { project } from '@inkeep/agents-sdk';
import { weatherMcpTool } from './tools/weather-mcp.js';

export const myProject = project({
  id: 'weather',
  name: 'Weather',
  description: 'Weather project template',
  agents: () => [weatherBasic, weatherIntermediate, weatherAdvanced],
  tools: () => [weatherMcpTool],
});