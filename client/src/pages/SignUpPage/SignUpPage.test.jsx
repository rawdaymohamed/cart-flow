import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignUpPage from "./SignUpPage";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../stores/useUserStore", () => ({
  useUserStore: () => ({
    user: null,
    loading: false,
    signup: vi.fn(),
  }),
}));

describe("SignUp Page", () => {
  it("Renders correctly", () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/create your account/i)).toBeInTheDocument();
    expect(screen.getByText(/full name/i)).toBeInTheDocument();
    expect(screen.getByText(/email address/i)).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
    expect(screen.getByText(/confirm password/i)).toBeInTheDocument();
  });
});
