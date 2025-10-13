import { weatherBasic } from './agents/weather-basic.js';
import { weatherIntermediate } from './agents/weather-intermediate.js';
import { weatherAdvanced } from './agents/weather-advanced.js';
import { project } from '@inkeep/agents-sdk';

export const myProject = project({
  id: 'weather-project',
  name: 'Weather Project',
  description: 'Weather project template',
  agents: () => [weatherBasic, weatherIntermediate, weatherAdvanced],
});