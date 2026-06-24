// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { setLocale } = vi.hoisted(() => ({ setLocale: vi.fn() }));
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
const locale = vi.hoisted(() => ({ value: "es" as "es" | "en" }));

vi.mock("@/features/profile/actions/set-locale", () => ({ setLocale }));

vi.mock("@/i18n/dictionary-provider", () => ({
  useDictionary: () => ({
    language: {
      label: "Idioma",
      select: "Elegir idioma",
      spanish: "Español",
      english: "English",
      current: "Idioma actual",
    },
  }),
  useLocale: () => locale.value,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/matches",
  useRouter: () => ({ refresh }),
}));

import { LanguageMenu } from "../language-menu";

afterEach(cleanup);
beforeEach(() => {
  setLocale.mockReset().mockResolvedValue({ success: true, locale: "en" });
  refresh.mockReset();
  locale.value = "es";
});

describe("LanguageMenu", () => {
  it("exposes an accessible trigger", () => {
    render(<LanguageMenu />);
    expect(screen.getByTestId("language-menu")).toHaveAttribute("aria-label", "Elegir idioma");
  });

  it("marks the active locale and disables it", async () => {
    render(<LanguageMenu />);
    screen.getByTestId("language-menu").click();
    const active = await screen.findByTestId("language-menu-es");
    expect(active).toHaveAttribute("aria-pressed", "true");
    expect(active).toBeDisabled();
  });

  it("switches locale through the server action", async () => {
    render(<LanguageMenu />);
    screen.getByTestId("language-menu").click();
    const other = await screen.findByTestId("language-menu-en");
    other.click();
    expect(setLocale).toHaveBeenCalledWith("en", "/matches");
  });
});
