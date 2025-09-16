import { weatherGraph } from './weather.graph.ts';
import { project } from '@inkeep/agents-sdk';

export const myProject = project({
  id: 'weather-graph',
  name: 'Weather Graph',
  description: 'Weather graph template',
  graphs: () => [weatherGraph],
});