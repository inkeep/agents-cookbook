import { weatherIntermediateGraph } from './graphs/weather-intermediate.js';
import { weatherGraph } from './graphs/weather-simple.js';
import { project } from '@inkeep/agents-sdk';

export const myProject = project({
  id: 'weather-project',
  name: 'Weather Project',
  description: 'Weather project template',
  graphs: () => [weatherGraph, weatherIntermediateGraph],
});