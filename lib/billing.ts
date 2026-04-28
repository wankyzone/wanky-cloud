export function calculateCost(server: any) {
  const created = new Date(server.created_at).getTime();
  const now = Date.now();

  const daysUsed = (now - created) / (1000 * 60 * 60 * 24);

  const dailyRate = server.price / 30;

  return (dailyRate * daysUsed).toFixed(2);
}