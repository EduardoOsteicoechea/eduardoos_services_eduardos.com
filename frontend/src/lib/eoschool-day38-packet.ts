/** Printed class packet for plan day 38 only. Other days keep the generated sheet. */
export const DAY38_PLAN_DAY = 38;

export const DAY38_PACKET_HREF = "/eoschool/classes/dia-38.pdf";

export const DAY38_PACKET_NAME = "dia-38.pdf";

export function dayPacketHref(planDay: number): string | null {
  if (planDay !== DAY38_PLAN_DAY) return null;
  return DAY38_PACKET_HREF;
}
