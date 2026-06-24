// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// `getRequestLocale` reaches into next/headers + prisma + supabase; mock it so
// the new server sections can be rendered standalone with a chosen locale.
vi.mock("@/lib/locale", () => ({
  getRequestLocale: vi.fn(async () => "es"),
}));

import { getRequestLocale } from "@/lib/locale";
import { FeatureGrid } from "../feature-grid";
import { FinalCta } from "../final-cta";
import { HowItWorks } from "../how-it-works";
import { LandingFaq } from "../landing-faq";
import { LandingFooter } from "../landing-footer";
import { LeagueTypes } from "../league-types";

const setLocale = (locale: "es" | "en") => vi.mocked(getRequestLocale).mockResolvedValue(locale);

afterEach(() => {
  cleanup();
  setLocale("es");
});

describe("Landing marketing sections (FR-REFINE-67.1)", () => {
  it("HowItWorks renders the four steps", async () => {
    render(await HowItWorks());
    expect(screen.getByRole("heading", { name: "Cómo funciona" })).toBeInTheDocument();
    expect(screen.getByText("Crea o únete a una liga")).toBeInTheDocument();
    expect(screen.getByText("Escala el ranking")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("LeagueTypes explains public vs. private pools, incl. the 100-member cap", async () => {
    render(await LeagueTypes());
    expect(screen.getByText("Pública")).toBeInTheDocument();
    expect(screen.getByText("Privada")).toBeInTheDocument();
    expect(screen.getByText(/100 miembros/)).toBeInTheDocument();
    expect(screen.getByText(/token/i)).toBeInTheDocument();
  });

  it("FeatureGrid lists the product features", async () => {
    render(await FeatureGrid());
    expect(screen.getByText("Invitaciones simples")).toBeInTheDocument();
    expect(screen.getByText("Ranking en vivo")).toBeInTheDocument();
  });

  it("LandingFaq renders the questions", async () => {
    render(await LandingFaq());
    expect(screen.getByText("¿Cuánto cuesta jugar?")).toBeInTheDocument();
    expect(screen.getByText("¿Cómo funcionan las invitaciones?")).toBeInTheDocument();
  });

  it("FinalCta shows the sign-up call to action", async () => {
    render(await FinalCta());
    const cta = screen.getByRole("link", { name: "Crear cuenta gratis" });
    expect(cta).toHaveAttribute("href", "/sign-up");
  });

  it("LandingFooter shows the app name and only public links", async () => {
    render(await LandingFooter());
    expect(screen.getByText("Liga Mundial 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });

  it("renders in English when the locale is en", async () => {
    setLocale("en");
    render(await HowItWorks());
    expect(screen.getByRole("heading", { name: "How it works" })).toBeInTheDocument();
    expect(screen.getByText("Create or join a league")).toBeInTheDocument();
  });
});
