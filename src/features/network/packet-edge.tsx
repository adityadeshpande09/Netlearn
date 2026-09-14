import {
  BaseEdge,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
export type PacketEdgeType = Edge<
  {
    active: boolean;
    playing: boolean;
    duration: number;
    reverse: boolean;
    reduce: boolean;
    eventId: string;
  },
  "packet"
>;
export function PacketEdge(props: EdgeProps<PacketEdgeType>) {
  const [path] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 14,
  });
  const data = props.data;
  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        style={{
          stroke: data?.active ? "var(--accent)" : "var(--network-line)",
          strokeWidth: data?.active ? 2.5 : 1.5,
        }}
      />
      {data?.active &&
        (data.reduce ? (
          <circle
            cx={data.reverse ? props.sourceX : props.targetX}
            cy={data.reverse ? props.sourceY : props.targetY}
            r={5}
            fill="var(--accent)"
          />
        ) : (
          <circle
            key={data.eventId}
            className="topology-packet"
            r={5}
            fill="var(--accent)"
            style={{
              offsetPath: 'path("' + path + '")',
              animationDuration: data.duration + "ms",
              animationPlayState: data.playing ? "running" : "paused",
              animationDirection: data.reverse ? "reverse" : "normal",
            }}
          />
        ))}
    </>
  );
}
