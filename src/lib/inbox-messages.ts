type ThreadMessage = { id: string; thread_id: string; created_at: string };

export function mergeThreadMessages<T extends ThreadMessage>(
  threadId: string,
  fetched: readonly T[],
  received: readonly T[],
): T[] {
  const byId = new Map<string, T>();
  for (const message of [...fetched, ...received]) {
    if (message.thread_id === threadId) byId.set(message.id, message);
  }
  return [...byId.values()].sort((a, b) =>
    Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id),
  );
}
