import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { InteractiveBarChart } from "./interactive-bar-chart";
import { ReportDetailModal } from "./report-detail-modal";
import type { FamilyChild } from "@/lib/family/types";

const child: FamilyChild = {
  id: "child-report",
  name: "김새싹",
  classId: "class-seed",
  gender: "female",
  birthYear: 2018,
  birthMonth: 7,
  birthDay: 15,
  isActive: true,
};

describe("report components", () => {
  it("renders every monthly bar as an accessible button and reports its selection", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const data = Array.from({ length: 12 }, (_, index) => ({
      key: String(index + 1),
      label: `${index + 1}월`,
      value: index,
      ariaLabel: `${index + 1}월 완료자 ${index}명, 상세 보기`,
    }));

    render(
      <InteractiveBarChart
        columns="months"
        data={data}
        description="월별 현황"
        onSelect={onSelect}
        title="월별 큐티"
        tone="qt"
      />,
    );

    const chart = screen.getByRole("group", { name: "월별 큐티 막대그래프" });
    expect(within(chart).getAllByRole("button")).toHaveLength(12);
    await user.click(within(chart).getByRole("button", { name: "12월 완료자 11명, 상세 보기" }));
    expect(onSelect).toHaveBeenCalledWith("12");
  });

  it("opens in avatar mode, traps focus, toggles the list, and restores trigger focus", async () => {
    const user = userEvent.setup();

    function ModalHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            7월 상세 보기
          </button>
          {open ? (
            <ReportDetailModal
              copyText="김새싹 - 새싹반"
              emptyMessage="명단 없음"
              items={[{ id: child.id, child, meta: "새싹반 · 1회 완료" }]}
              onClose={() => setOpen(false)}
              summary="1명 · 총 1회 완료"
              title="7월 큐티 완료자"
            />
          ) : null}
        </>
      );
    }

    render(<ModalHarness />);
    const trigger = screen.getByRole("button", { name: "7월 상세 보기" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "7월 큐티 완료자" });
    expect(dialog).toHaveClass("pb-[calc(16px+var(--safe-bottom))]");
    const closeButton = within(dialog).getByRole("button", { name: "통계 상세 닫기" });
    const gridButton = within(dialog).getByRole("button", { name: "아바타" });
    const listButton = within(dialog).getByRole("button", { name: "목록" });
    await waitFor(() => expect(closeButton).toHaveFocus());
    expect(gridButton).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getByRole("img", { name: "김새싹 아바타" })).toBeVisible();
    expect(within(dialog).getByText("1명 · 총 1회 완료")).toBeVisible();

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(listButton).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(closeButton).toHaveFocus();

    await user.click(listButton);
    expect(listButton).toHaveAttribute("aria-pressed", "true");
    await user.click(closeButton);
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
