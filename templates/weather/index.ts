import { weatherGraph } from './weather.graph.ts';
import { project } from '@inkeep/agents-sdk';

export const myProject = project({
  id: 'default',
  name: 'default',
  description: 'default',
  graphs: () => [weatherGraph],
});