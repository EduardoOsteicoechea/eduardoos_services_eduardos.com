import { describe, expect, it } from "vitest";
import { DAY38_PACKET_HREF, DAY38_PLAN_DAY, dayPacketHref } from "./eoschool-day38-packet";

describe("day 38 class packet", () => {
  it("opens the printed packet only on plan day 38", () => {
    expect(DAY38_PLAN_DAY).toBe(38);
    expect(dayPacketHref(38)).toBe(DAY38_PACKET_HREF);
    expect(dayPacketHref(37)).toBeNull();
    expect(dayPacketHref(39)).toBeNull();
    expect(dayPacketHref(0)).toBeNull();
  });
});
