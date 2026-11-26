import { describe, expect, it } from "vitest";
import {
  DAY38_PACKET_HREF,
  DAY38_PLAN_DAY,
  DAY39_PACKET_HREF,
  DAY39_PACKET_NAME,
  DAY40_PACKET_HREF,
  DAY40_PACKET_NAME,
  dayPacketHref,
  dayPacketName,
} from "./eoschool-day38-packet";

describe("printed class packets", () => {
  it("opens the printed packet on plan days 38 and 39", () => {
    expect(DAY38_PLAN_DAY).toBe(38);
    expect(dayPacketHref(38)).toBe(DAY38_PACKET_HREF);
    expect(dayPacketHref(39)).toBe(DAY39_PACKET_HREF);
    expect(dayPacketName(DAY39_PACKET_HREF)).toBe(DAY39_PACKET_NAME);
    expect(dayPacketHref(40)).toBe(DAY40_PACKET_HREF);
    expect(dayPacketName(DAY40_PACKET_HREF)).toBe(DAY40_PACKET_NAME);
    expect(dayPacketHref(37)).toBeNull();
    expect(dayPacketHref(41)).toBeNull();
    expect(dayPacketHref(0)).toBeNull();
  });
});
