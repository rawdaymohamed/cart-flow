import { getByText, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignUpPage from "./SignUpPage";
import { MemoryRouter } from "react-router-dom";

const { mockSignup, storeState } = vi.hoisted(() => ({
  mockSignup: vi.fn(),
  storeState: { user: null, loading: true },
}));

vi.mock("../../stores/useUserStore", () => ({
  useUserStore: () => ({
    user: storeState.user,
    loading: storeState.loading,
    signup: mockSignup,
  }),
}));

describe("SignUp Page", () => {
  beforeEach(() => {
    mockSignup.mockClear();
    storeState.loading = false;
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
  it("disables the submit button and shows loading indicator when submission in progress", async () => {
    storeState.loading = true;
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>,
    );
    const submitButton = screen.getByRole("button");
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/loading.../i)).toBeInTheDocument();
    expect(screen.queryByText(/sign up/i)).not.toBeInTheDocument();
  });
});
describe("SignUp Page Frontend Validation", () => {
  beforeEach(() => {
    mockSignup.mockClear();
    storeState.loading = false;
  });
  it("displays validation errors for invalid email format and short password", async () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    // Type bad data
    await user.type(screen.getByLabelText(/full name/i), "Rawda");
    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.type(screen.getByLabelText(/^password$/i), "123"); // Too short
    await user.type(screen.getByLabelText(/confirm password/i), "123");

    await user.click(screen.getByRole("button", { name: /sign up/i }));

    // Assert Zod error messages appear on screen
    expect(
      await screen.findByText(/invalid email address/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/password must be at least 6 characters/i),
    ).toBeInTheDocument();

    // CRUCIAL: Assert that the store was NEVER called because validation blocked it
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it("displays validation error when passwords do not match", async () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/full name/i), "Rawda");
    await user.type(screen.getByLabelText(/email/i), "rawda@test.com");
    await user.type(screen.getByLabelText(/^password$/i), "Rawda12345");
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "WrongPassword123",
    ); // Mismatch

    await user.click(screen.getByRole("button", { name: /sign up/i }));

    // Assert matching error message appears
    expect(
      await screen.findByText(/passwords must match/i),
    ).toBeInTheDocument();

    // Assert the store was blocked
    expect(mockSignup).not.toHaveBeenCalled();
  });
});
