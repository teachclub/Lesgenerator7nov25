// src/utils/groupBronvragenBySourceId.ts
// Groepeert bronvragen per sourceId voor nette presentatie in step2.

import type { Step2Bronvraag } from "../types/lessonV2";

export function groupBronvragenBySourceId(
  bronvragen: Step2Bronvraag[] | undefined | null
): Record<string, Step2Bronvraag[]> {
  if (!bronvragen || bronvragen.length === 0) return {};

  return bronvragen.reduce((acc, vraag) => {
    const key = vraag.sourceId;
    if (!key) return acc;

    if (!acc[key]) acc[key] = [];
    acc[key].push(vraag);
    return acc;
  }, {} as Record<string, Step2Bronvraag[]>);
}

