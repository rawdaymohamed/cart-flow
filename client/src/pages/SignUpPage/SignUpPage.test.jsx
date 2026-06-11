import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignUpPage from "./SignUpPage";
import { MemoryRouter } from "react-router-dom";
const { mockSignup } = vi.hoisted(() => ({
  mockSignup: vi.fn(),
}));
vi.mock("../../stores/useUserStore", () => ({
  useUserStore: () => ({
    user: null,
    loading: false,
    signup: mockSignup,
  }),
}));

describe("SignUp Page", () => {
  beforeEach(() => {
    mockSignup.mockClear();
  });
  it("renders correctly", () => {
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
  it("allows user to fill the form and submit successfully", async () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/full name/i), "Rawda");
    await user.type(screen.getByLabelText(/email/i), "rawda1@test.com");
    await user.type(screen.getByLabelText(/^password$/i), "Rawda12345");
    await user.type(screen.getByLabelText(/confirm password/i), "Rawda12345");
    await user.click(screen.getByRole("button", { name: /sign up/i }));
    expect(mockSignup).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Rawda",
        email: "rawda1@test.com",
        password: "Rawda12345",
        confirmPassword: "Rawda12345",
      }),
    );
  });
});
