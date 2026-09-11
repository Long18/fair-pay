/**
 * Send a tracking batch. If the whole request fails, retry events one-by-one
 * so a single rejected event_name cannot block page_view / the rest.
 */
export async function sendTrackingEventsWithSplitRetry<T>(
  events: T[],
  send: (batch: T[]) => Promise<void>,
): Promise<{ dropped: T[] }> {
  if (events.length === 0) {
    return { dropped: [] };
  }

  try {
    await send(events);
    return { dropped: [] };
  } catch {
    if (events.length === 1) {
      return { dropped: events };
    }

    const dropped: T[] = [];
    for (const event of events) {
      try {
        await send([event]);
      } catch {
        dropped.push(event);
      }
    }
    return { dropped };
  }
}
