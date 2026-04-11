export function calculatePercentage(level: number, plan: string): number {
  if (level >= 100) return 70.00;
  
  let baseCommission = 5;
  const planLower = plan?.toLowerCase() || 'básico';
  
  if (planLower.includes('avanzado')) baseCommission = 10;
  else if (planLower.includes('pro')) baseCommission = 20;
  else if (planLower.includes('elite') || planLower.includes('élite')) baseCommission = 30;
  
  const increment = (70 - baseCommission) / 99;
  const percentage = baseCommission + (level - 1) * increment;
  
  return Number(percentage.toFixed(2));
}
