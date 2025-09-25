import { weatherGraph } from './graphs/weather-assistant.ts';
import { weatherIntermediateGraph } from './graphs/weather-intermediate.ts';
import { project } from '@inkeep/agents-sdk';

export const myProject = project({
  id: 'weather-project',
  name: 'Weather Project',
  description: 'Weather project template',
  graphs: () => [weatherGraph, weatherIntermediateGraph],
});