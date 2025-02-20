import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import RnCalendar from ".";
import { Alert } from "react-native";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(() => Promise.resolve(null)),
}));

jest.mock("../../state/EventContext", () => ({
  useEvents: () => ({
    state: { events: {} },
    dispatch: jest.fn(),
    getEventsForDate: jest.fn(() => []),
  }),
}));

jest.mock("react-native-modal-datetime-picker", () => {
  return ({ isVisible, onConfirm, testID }: any) => {
    if (!isVisible) return null;
    setTimeout(() => {
      if (testID === "startTimePicker") {
        onConfirm(new Date(2025, 1, 18, 15, 30)); // Start Time → 03:30 PM
      } else {
        onConfirm(new Date(2025, 1, 18, 16, 30)); // End Time → 04:30 PM
      }
    }, 0);

    return null;
  };
});
describe("RnCalendar Component", () => {
  test("renders correctly", () => {
    const { getByPlaceholderText } = render(<RnCalendar />);
    expect(getByPlaceholderText("Event Name")).toBeTruthy();
  });

  test("opens and closes modal on date press", async () => {
    const { getByText, queryByText } = render(<RnCalendar />);
    expect(queryByText(/Events for/)).toBeNull();

    fireEvent.press(getByText("18"));

    expect(getByText(/Events for\s+\d{4}-\d{2}-\d{2}/)).toBeTruthy();
  });

  test("opens and selects a time from the DateTimePicker", async () => {
    const { getByText, getByTestId, queryByText } = render(<RnCalendar />);

    fireEvent.press(getByText(/Select Start Time/i));

    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));

    expect(getByTestId("startTimeText").props.children).toContain("03:30 PM");
  });

  test("shows an error alert when submitting an empty form", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");

    const { getByTestId } = render(<RnCalendar />);

    fireEvent.press(getByTestId("saveButton"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Error",
        "Please select a date, event name, and times"
      );
    });

    alertSpy.mockRestore();
  });

  test("shows an error alert when trying to save an event with a past date", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");

    const { getByTestId, findByText, getByText } = render(<RnCalendar />);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const pastDateStr = pastDate.getDate().toString();

    fireEvent.press(await findByText(pastDateStr));

    fireEvent.press(getByTestId("closeModalBtn"));

    fireEvent.changeText(getByTestId("eventNameInput"), "Test Event");

    fireEvent.press(getByTestId("startTime"));
    await waitFor(() => expect(getByText(/03:30 PM/i)).toBeTruthy()); 

    fireEvent.press(getByTestId("endTime")); 
    await waitFor(() => expect(getByText(/04:30 PM/i)).toBeTruthy()); 

    fireEvent.press(getByTestId("saveButton"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Invalid Date",
        "Cannot create events in the past."
      );
    });

    alertSpy.mockRestore();
  });
});
