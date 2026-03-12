export type ModelKind = "rocket" | "launchpad";

export type ModelSpriteProps = {
  height: number;
  kind: ModelKind;
  label?: string;
  left: number;
  rotation?: number;
  thrusting?: boolean;
  top: number;
  width: number;
};
