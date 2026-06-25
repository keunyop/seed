import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PressableButton } from "./pressable-button";

describe("PressableButton", () => {
  it("renders an accessible button with the pressable token class", () => {
    render(<PressableButton>저장</PressableButton>);

    const button = screen.getByRole("button", { name: "저장" });
    expect(button).toHaveClass("pressable-shadow");
    expect(button).toHaveClass("rounded-[12px]");
  });
});

