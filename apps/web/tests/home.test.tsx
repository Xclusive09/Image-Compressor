import { fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/page";

describe("Homepage", () => {
  it("renders the title", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "NYSC Image Compressor" })
    ).toBeInTheDocument();
  });

  it("target preset button updates target size", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "7KB" }));

    expect(screen.getByLabelText("Target size in KB")).toHaveValue(7);
  });

  it("upload input exists", () => {
    render(<Home />);

    expect(screen.getByLabelText("Upload image")).toBeInTheDocument();
  });

  it("compress button is disabled before image upload", () => {
    render(<Home />);

    expect(screen.getByRole("button", { name: "Compress Image" })).toBeDisabled();
  });
});
