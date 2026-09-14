import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";
import NotFoundPage from "@/app/not-found";

describe("initial route accessibility contracts", () => {
  it("provides a focusable main landmark for the skip link", () => {
    render(<HomePage />);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("offers a working recovery destination on the not-found page", () => {
    render(<NotFoundPage />);
    expect(
      screen.getByRole("link", { name: "Return to NetLearn" }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });
});
