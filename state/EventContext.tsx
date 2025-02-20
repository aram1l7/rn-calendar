import React, { createContext, useReducer, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CalendarEvent {
  id: string;
  name: string;
  date: string;
  startTime: number;
  endTime: number;
  repeat: "weekly" | "biWeekly" | "monthly";
}

interface EventState {
  events: Record<string, CalendarEvent[]>;
}

type EventAction =
  | { type: "ADD_EVENT"; payload: CalendarEvent }
  | { type: "EDIT_EVENT"; payload: CalendarEvent }
  | { type: "DELETE_EVENT"; payload: { id: string; date: string } }
  | { type: "LOAD_EVENTS"; payload: Record<string, CalendarEvent[]> };

const eventReducer = (state: EventState, action: EventAction): EventState => {
  switch (action.type) {
    case "ADD_EVENT":
      if (
        state.events[action.payload.date]?.some(
          (e) =>
            e.startTime < action.payload.endTime &&
            e.endTime > action.payload.startTime
        )
      ) {
        alert("Event conflicts with an existing event!");
        return state;
      }
      return {
        ...state,
        events: {
          ...state.events,
          [action.payload.date]: [
            ...(state.events[action.payload.date] || []),
            action.payload,
          ],
        },
      };

    case "EDIT_EVENT":
      return {
        ...state,
        events: {
          ...state.events,
          [action.payload.date]: state.events[action.payload.date]?.map((e) =>
            e.id === action.payload.id ? action.payload : e
          ),
        },
      };

    case "DELETE_EVENT":
      return {
        ...state,
        events: {
          ...state.events,
          [action.payload.date]: state.events[action.payload.date]?.filter(
            (e) => e.id !== action.payload.id
          ),
        },
      };

    case "LOAD_EVENTS":
      return { ...state, events: action.payload };

    default:
      return state;
  }
};

const EventContext = createContext<{
  state: EventState;
  dispatch: React.Dispatch<EventAction>;
} | null>(null);

export const EventProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(eventReducer, { events: {} });

  useEffect(() => {
    const loadEvents = async () => {
      const storedEvents = await AsyncStorage.getItem("events");
      if (storedEvents) {
        dispatch({ type: "LOAD_EVENTS", payload: JSON.parse(storedEvents) });
      }
    };
    loadEvents();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("events", JSON.stringify(state.events));
  }, [state.events]);

  return (
    <EventContext.Provider value={{ state, dispatch }}>
      {children}
    </EventContext.Provider>
  );
};

const isWeeklyRecurring = (event: CalendarEvent, date: Date) => {
  const eventDate = new Date(event.date);
  const checkDate = new Date(date);

  return checkDate >= eventDate && checkDate.getDay() === eventDate.getDay();
};

const isBiWeeklyRecurring = (event: CalendarEvent, date: Date) => {
  const eventDate = new Date(event.date).getTime();
  const checkDate = new Date(date).getTime();

  const diffDays = (checkDate - eventDate) / (1000 * 60 * 60 * 24);
  return checkDate >= eventDate && diffDays % 14 === 0;
};

const isMonthlyRecurring = (event: CalendarEvent, date: Date) => {
  const eventDate = new Date(event.date);
  const checkDate = new Date(date);

  return checkDate >= eventDate && eventDate.getDate() === checkDate.getDate();
};

export const useEvents = () => {
  const context = useContext(EventContext);

  const getEventsForDate = (date: Date, startTime: number, endTime: number) => {
    const eventsForDate =
      context?.state.events[new Date(date).toLocaleDateString("sv-SE")] || [];

    return eventsForDate.filter((event: CalendarEvent) => {
      const eventStart = event.startTime;
      const eventEnd = event.endTime;

      const timeConflict = startTime < eventEnd && endTime > eventStart;

      const isRecurring =
        (event.repeat === "weekly" && isWeeklyRecurring(event, date)) ||
        (event.repeat === "biWeekly" && isBiWeeklyRecurring(event, date)) ||
        (event.repeat === "monthly" && isMonthlyRecurring(event, date));

      return timeConflict || isRecurring;
    });
  };

  if (!context) {
    throw new Error("useEvents must be used within an EventProvider");
  }
  return { ...context, getEventsForDate };
};
