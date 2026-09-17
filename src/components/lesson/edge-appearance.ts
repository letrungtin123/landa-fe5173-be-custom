import type { CSSProperties } from 'react';

export type DiagramEdgeLineStyle = 'solid' | 'dashed';
export type DiagramEdgeArrow = 'none' | 'end';

export type DiagramEdgeAppearance = {
  lineStyle: DiagramEdgeLineStyle;
  arrow: DiagramEdgeArrow;
  color: string;
};

const DEFAULT_EDGE_COLOR = '#64748B';
const DEFAULT_FEEDBACK_EDGE_COLOR = '#2563EB';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeEdgeColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const color = value.trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : fallback;
}

function isFeedbackRouting(routing: unknown): boolean {
  return routing === 'feedback';
}

export function getEdgeAppearance(
  edge: { data?: unknown; style?: CSSProperties; markerEnd?: unknown } | null | undefined,
  routing?: unknown,
): DiagramEdgeAppearance {
  const data = isRecord(edge?.data) ? edge.data : {};
  const persisted = isRecord(data.appearance) ? data.appearance : {};
  const effectiveRouting = routing ?? data.routing;
  const inferredLineStyle: DiagramEdgeLineStyle = typeof edge?.style?.strokeDasharray === 'string'
    && edge.style.strokeDasharray.trim().length > 0
    ? 'dashed'
    : isFeedbackRouting(effectiveRouting) ? 'dashed' : 'solid';
  const hasExplicitMarker = Boolean(edge && Object.prototype.hasOwnProperty.call(edge, 'markerEnd'));
  const inferredArrow: DiagramEdgeArrow = hasExplicitMarker && (edge?.markerEnd === null || edge?.markerEnd === false)
    ? 'none'
    : 'end';
  const markerColor = isRecord(edge?.markerEnd) ? edge.markerEnd.color : undefined;
  const fallbackColor = isFeedbackRouting(effectiveRouting) ? DEFAULT_FEEDBACK_EDGE_COLOR : DEFAULT_EDGE_COLOR;

  return {
    lineStyle: persisted.lineStyle === 'dashed' || persisted.lineStyle === 'solid'
      ? persisted.lineStyle
      : inferredLineStyle,
    arrow: persisted.arrow === 'none' || persisted.arrow === 'end'
      ? persisted.arrow
      : inferredArrow,
    color: normalizeEdgeColor(persisted.color ?? edge?.style?.stroke ?? markerColor, fallbackColor),
  };
}

export function edgeAppearanceToStyle(
  appearance: DiagramEdgeAppearance,
  baseStyle?: CSSProperties,
): CSSProperties {
  return {
    ...baseStyle,
    stroke: appearance.color,
    strokeDasharray: appearance.lineStyle === 'dashed' ? '6 4' : undefined,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
}

export function edgeAppearanceToMarkerEnd(
  appearance: DiagramEdgeAppearance,
): { type: 'arrowclosed'; color: string; width: number; height: number } | undefined {
  if (appearance.arrow === 'none') return undefined;
  return {
    type: 'arrowclosed',
    color: appearance.color,
    width: 12,
    height: 12,
  };
}
