import { dataComponent } from "@inkeep/agents-sdk";
import { schema } from "./schema";
import { activitiesData } from "./ui/mock-data";

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export const readCode = (filename: string): string => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return readFileSync(join(__dirname, filename), "utf-8");
};

export const activities = dataComponent({
  id: "activities",
  name: `Activities`,
  description: `A list of activities`,
  props: schema,
  render: {
    component: readCode("ui/component.tsx"),
    mockData: activitiesData,
  },
});
