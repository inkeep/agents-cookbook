import { weatherBasicGraph } from './graphs/weather-basic.js';
import { weatherIntermediateGraph } from './graphs/weather-intermediate.ts';
import { weatherAdvancedGraph } from './graphs/weather-advanced.ts';
import { project } from '@inkeep/agents-sdk';

export const myProject = project({
  id: 'weather-project',
  name: 'Weather Project',
  description: 'Weather project template',
  graphs: () => [weatherBasicGraph, weatherIntermediateGraph, weatherAdvancedGraph],
});