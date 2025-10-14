import { customerSupport } from "./agents/customer-support.js";
import { project } from "@inkeep/agents-sdk";

export const myProject = project({
  id: "customer-support",
  name: "Customer Support",
  description: "Customer support template",
  agents: () => [customerSupport],
});
