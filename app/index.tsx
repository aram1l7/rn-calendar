import React from "react";

import RnCalendar from "./RnCalendar";
import { EventProvider } from "@/state/EventContext";

export default function App() {
  return (
    <EventProvider>
      <RnCalendar />
    </EventProvider>
  );
}
