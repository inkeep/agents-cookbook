import { weatherGraph } from './weather.graph.ts';
import { weatherIntermediateGraph } from './weather-intermediate.graph.ts';
import { project } from '@inkeep/agents-sdk';

export const myProject = project({
  id: 'weather-project',
  name: 'Weather Project',
  description: 'Weather project template',
  graphs: () => [weatherGraph, weatherIntermediateGraph],
});