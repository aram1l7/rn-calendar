import React from "react";

import RnCalendar from "@/components/rn-calendar";
import { EventProvider } from "@/state/EventContext";

export default function App() {
  return (
    <EventProvider>
      <RnCalendar />
    </EventProvider>
  );
}
