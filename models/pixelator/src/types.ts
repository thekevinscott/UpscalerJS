export interface ModelDefinition {
  scale: 2 | 3 | 4 | 8;
  channels: 3;
  dataset?: string;
  name?: string; // proxy for "size" (e.g., small, medium, large)
  internalWeightsPath: string;
}
