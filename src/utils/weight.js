const KG_TO_LBS = 2.2046226218;

export function convertWeight(weight, fromUnit, toUnit) {
  if (fromUnit === toUnit) return weight;
  return fromUnit === 'kg' ? weight * KG_TO_LBS : weight / KG_TO_LBS;
}
