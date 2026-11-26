/** Printed class packets. Other days keep the generated sheet. */
export const DAY38_PLAN_DAY = 38;

export const DAY38_PACKET_HREF = "/eoschool/classes/dia-38.pdf";

export const DAY38_PACKET_NAME = "dia-38.pdf";

export const DAY39_PLAN_DAY = 39;

export const DAY39_PACKET_HREF = "/eoschool/classes/dia-39.pdf";

export const DAY39_PACKET_NAME = "dia-39.pdf";

export const DAY40_PLAN_DAY = 40;

export const DAY40_PACKET_HREF = "/eoschool/classes/dia-40.pdf";

export const DAY40_PACKET_NAME = "dia-40.pdf";

const DAY_PACKETS: Record<number, string> = {
  [DAY38_PLAN_DAY]: DAY38_PACKET_HREF,
  [DAY39_PLAN_DAY]: DAY39_PACKET_HREF,
  [DAY40_PLAN_DAY]: DAY40_PACKET_HREF,
};

export function dayPacketHref(planDay: number): string | null {
  return DAY_PACKETS[planDay] ?? null;
}

export function dayPacketName(href: string): string {
  const name = href.split("/").pop();
  return name && name.length > 0 ? name : DAY38_PACKET_NAME;
}
