export interface Point {
  x: number;
  y: number;
}
export type Positions = Record<string, Point>;
export const initialPositions: Positions = {
  "pc-a": { x: 25, y: 35 },
  "switch-a": { x: 270, y: 35 },
  "router-r1": { x: 510, y: 160 },
  "switch-b": { x: 270, y: 285 },
  "pc-b": { x: 25, y: 285 },
};
