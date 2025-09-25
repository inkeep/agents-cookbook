import { weatherIntermediateGraph } from './graphs/weather-intermediate.js';
import { project } from '@inkeep/agents-sdk';

export const weather = project({
    id: 'weather-project',
    name: 'Weather Project',
    description: 'Weather project template',
    graphs: () => [weatherIntermediateGraph],
});