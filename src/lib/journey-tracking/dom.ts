import type { JourneyEventName, TrackedElementPayload } from "./types";

function normalize(value?: string | null) {
  return value?.trim() || undefined;
}

function inferTargetType(element: HTMLElement): string {
  const explicit = normalize(element.dataset.trackType);
  if (explicit) return explicit;

  const tag = element.tagName.toLowerCase();
  if (tag === "a") return "link";
  if (tag === "button") return "button";
  return normalize(element.getAttribute("role")) ?? tag;
}

export function getTrackedElementPayload(element: HTMLElement): TrackedElementPayload | null {
  const targetKey = normalize(element.dataset.trackId);
  if (!targetKey) return null;

  const eventName = (normalize(element.dataset.trackEvent) ?? "cta_click") as JourneyEventName;
  const eventCategory = normalize(element.dataset.trackCategory) ?? "journey";
  const flowName = normalize(element.dataset.trackFlow);
  const stepName = normalize(element.dataset.trackStep);
  const properties: Record<string, unknown> = {};

  const entityId = normalize(element.dataset.trackEntityId);
  const entityType = normalize(element.dataset.trackEntityType);
  const entityPath = normalize(element.dataset.trackEntityPath);
  if (entityId) properties.entity_id = entityId;
  if (entityType) properties.entity_type = entityType;
  if (entityPath) properties.entity_path = entityPath;

  return {
    eventName,
    eventCategory,
    targetType: inferTargetType(element),
    targetKey,
    flowName,
    stepName,
    properties: Object.keys(properties).length > 0 ? properties : undefined,
  };
}
