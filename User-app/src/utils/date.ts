export function formatOrderDate(iso: string): string {
  const timestamp = new Date(iso).getTime();

  if (Number.isNaN(timestamp)) {
    return 'Invalid date';
  }

  const date = new Date(timestamp);

  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
