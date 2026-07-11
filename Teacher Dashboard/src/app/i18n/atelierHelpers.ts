/** Format workshop label(s) for the active language (Atelier/Workshop). */
export function formatAtelierLabel(
  numbers: number[],
  workshopN: (n: number) => string,
  ateliersWord: string,
): string {
  if (numbers.length === 0) return "";
  if (numbers.length === 1) return workshopN(numbers[0]);
  return `${ateliersWord} ${numbers.join(", ")}`;
}

/** Workshop options 1–15 for select dropdowns. */
export function workshopOptions(workshopN: (n: number) => string): { value: number; label: string }[] {
  return Array.from({ length: 15 }, (_, i) => {
    const n = i + 1;
    return { value: n, label: workshopN(n) };
  });
}
