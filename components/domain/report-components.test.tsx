import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { InteractiveBarChart } from "./interactive-bar-chart";
import { ReportChartCard } from "./report-chart-card";
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

  it("toggles each chart card independently and keeps the full line graph noninteractive", async () => {
    const user = userEvent.setup();
    const onAttendanceSelect = vi.fn();
    const recentData = Array.from({ length: 4 }, (_, index) => ({
      key: `recent-${index}`,
      label: `${index + 1}주`,
      value: index + 1,
      ariaLabel: `${index + 1}주 출석 ${index + 1}명, 상세 보기`,
    }));
    const allData = Array.from({ length: 12 }, (_, index) => ({
      key: `all-${index}`,
      label: `${index + 1}월`,
      value: index,
      ariaLabel: `${index + 1}월 출석 ${index}명`,
    }));

    render(
      <>
        <ReportChartCard
          allData={allData}
          columns="weeks"
          onSelect={onAttendanceSelect}
          recentData={recentData}
          title="주별 출석수"
          tone="attendance"
        />
        <ReportChartCard
          allData={allData}
          columns="months"
          onSelect={vi.fn()}
          recentData={recentData}
          title="월별 큐티 완료자"
          tone="qt"
        />
      </>,
    );

    const attendanceCard = screen.getByRole("heading", { name: "주별 출석수" }).closest("section");
    const qtCard = screen.getByRole("heading", { name: "월별 큐티 완료자" }).closest("section");
    expect(attendanceCard).not.toBeNull();
    expect(qtCard).not.toBeNull();

    expect(within(attendanceCard!).getByRole("group", { name: "주별 출석수 막대그래프" })).toBeVisible();
    expect(within(attendanceCard!).getAllByRole("button")).toHaveLength(6);
    await user.click(within(attendanceCard!).getByRole("button", { name: "전체" }));

    const lineGraph = within(attendanceCard!).getByRole("img", { name: "주별 출석수 라인 그래프" });
    expect(lineGraph).toBeVisible();
    expect(within(lineGraph).getByText("11")).toBeVisible();
    expect(within(lineGraph).getByText("0")).toBeVisible();
    expect(within(attendanceCard!).getAllByRole("button")).toHaveLength(2);
    expect(onAttendanceSelect).not.toHaveBeenCalled();
    expect(within(qtCard!).getByRole("group", { name: "월별 큐티 완료자 막대그래프" })).toBeVisible();
    expect(within(qtCard!).getByRole("button", { name: "최근" })).toHaveAttribute("aria-pressed", "true");
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
    expect(within(dialog).queryByText("김새싹")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("새싹반 · 1회 완료")).not.toBeInTheDocument();

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(listButton).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(closeButton).toHaveFocus();

    await user.click(listButton);
    expect(listButton).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getByText("김새싹")).toBeVisible();
    expect(within(dialog).getByText("새싹반 · 1회 완료")).toBeVisible();
    await user.click(closeButton);
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("can open in list mode and reports a selected person", async () => {
    const user = userEvent.setup();
    const onItemSelect = vi.fn();

    render(
      <ReportDetailModal
        copyText="김새싹 - 새싹반"
        emptyMessage="명단 없음"
        initialViewMode="list"
        items={[{ id: child.id, child, meta: "새싹반" }]}
        onClose={vi.fn()}
        onItemSelect={onItemSelect}
        title="생일 미입력 아이"
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "생일 미입력 아이" });
    expect(within(dialog).getByRole("button", { name: "목록" })).toHaveAttribute("aria-pressed", "true");
    await user.click(within(dialog).getByRole("button", { name: /김새싹/ }));
    expect(onItemSelect).toHaveBeenCalledWith(expect.objectContaining({ id: child.id, child }));
  });
});
