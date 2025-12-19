import { useCallback } from "react";

export type QuestionGenPayload = {
  invoer?: string;

  vraagType?: string;
  richting?: string;
  presentisme?: boolean;

  level?: "mavo" | "havo" | "vwo" | string;
  nuance?: number; // 1-5
  tv?: string[]; // ["8","9"]
  prikkelText?: string;
};

export function useQuestionGen() {
  const genereerHoofdvraagEnDeelvragen = useCallback(
    async (payloadOrInvoer: QuestionGenPayload | string) => {
      const payload: QuestionGenPayload =
        typeof payloadOrInvoer === "string" ? { invoer: payloadOrInvoer } : (payloadOrInvoer || {});

      const res = await fetch("/api/question-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        const msg = data?.message || data?.error || `question-gen faalde (${res.status})`;
        throw new Error(msg);
      }
      return data;
    },
    []
  );

  return { genereerHoofdvraagEnDeelvragen };
}

