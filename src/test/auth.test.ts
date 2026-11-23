import { describe, expect, it } from "vitest";
import { authErrorMessage, authReturnUrl, panelForRole, signedOutUrl } from "@/lib/auth";

describe("authErrorMessage", () => {
  it("translates invalid credentials", () => {
    expect(authErrorMessage("Invalid login credentials")).toBe("E-mail ou senha incorretos.");
  });

  it("translates an existing account", () => {
    expect(authErrorMessage("User already registered")).toBe("Já existe uma conta com esse e-mail.");
  });
});

describe("panelForRole", () => {
  it("opens the client panel for every role", () => {
    expect(panelForRole("client")).toBe("/cliente");
    expect(panelForRole("reseller")).toBe("/cliente");
    expect(panelForRole("admin")).toBe("/cliente");
  });
});

describe("auth redirects", () => {
  it("returns Google and logout to the origin that is open", () => {
    expect(authReturnUrl()).toBe(`${window.location.origin}/cliente`);
    expect(signedOutUrl()).toBe(`${window.location.origin}/entrar`);
  });
});
