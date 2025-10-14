import { eventPlannerAgent } from './agents/event-planner.js';
import { project } from '@inkeep/agents-sdk';

export const myProject = project({
  id: 'event-planner-project',
  name: 'Event planner Project',
  description: 'Event planner project template',
  agents: () => [eventPlannerAgent],
});