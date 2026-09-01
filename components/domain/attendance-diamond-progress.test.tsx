import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AttendanceDiamondProgress } from "./attendance-diamond-progress";

function getFillWidths() {
  return Array.from(screen.getByRole("img").querySelectorAll<HTMLElement>("span[style]")).map(
    (element) => element.style.width,
  );
}

describe("AttendanceDiamondProgress", () => {
  it("fills one quarter of the next diamond for each attendance", () => {
    const { rerender } = render(<AttendanceDiamondProgress childName="테스트" progress={3} />);

    expect(screen.getByRole("img", { name: "테스트 출석 3회, 다이아몬드 0개 완성, 다음 다이아몬드 3/4" })).toBeVisible();
    expect(getFillWidths()).toEqual(["75%"]);

    rerender(<AttendanceDiamondProgress childName="테스트" progress={5} />);
    expect(screen.getByRole("img", { name: "테스트 출석 5회, 다이아몬드 1개 완성, 다음 다이아몬드 1/4" })).toBeVisible();
    expect(getFillWidths()).toEqual(["100%", "25%"]);
  });

  it("caps progress at four completed diamonds", () => {
    render(<AttendanceDiamondProgress childName="테스트" progress={17} />);

    expect(screen.getByRole("img", { name: "테스트 출석 16회, 다이아몬드 4개 완성" })).toBeVisible();
    expect(getFillWidths()).toEqual(["100%", "100%", "100%", "100%"]);
  });
});
