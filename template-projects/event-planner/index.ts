import { eventPlannerAgent } from './agents/event-planner.js';
import { project } from '@inkeep/agents-sdk';

export const myProject = project({
  id: 'event-planner',
  name: 'Event planner',
  description: 'Event planner project template',
  agents: () => [eventPlannerAgent],
});