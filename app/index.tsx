import { Button, ButtonText } from "@/components/ui/button";
import { View, Text, TextInput, Alert } from "react-native";
import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Box } from "@/components/ui/box";
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectTrigger,
} from "@/components/ui/select";
import { Center } from "@/components/ui/center";
import { ChevronDownIcon } from "@/components/ui/icon";

export default function RnCalendar() {
  const [selectedDate, setSelectedDate] = useState("");
  const [events, setEvents] = useState({});
  const [eventName, setEventName] = useState("");
  const [repeat, setRepeat] = useState("Weekly");

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const storedEvents = await AsyncStorage.getItem("events");
    if (storedEvents) setEvents(JSON.parse(storedEvents));
  };

  const saveEvent = async () => {
    if (!selectedDate || !eventName) {
      Alert.alert("Error", "Please select a date and enter an event name");
      return;
    }

    if (new Date(selectedDate).getTime() < new Date().setHours(0, 0, 0, 0)) {
      Alert.alert("Invalid Date", "Cannot create events in the past.");
      return;
    }

    const newEvents = {
      ...events,
      [selectedDate]: { name: eventName, repeat },
    };
    setEvents(newEvents);
    await AsyncStorage.setItem("events", JSON.stringify(newEvents));
    Alert.alert("Success", "Event saved successfully!");
  };

  return (
    <Center>
      <Calendar
        onDayPress={(day: any) => setSelectedDate(day.dateString)}
        markedDates={{
          [selectedDate]: {
            selected: true,
            marked: true,
            selectedColor: "yellow",
          },
        }}
      />

      <Box className="p-10">
        <TextInput
          placeholder="Event Name"
          value={eventName}
          onChangeText={setEventName}
          style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
        />

        <Select selectedValue={repeat} onValueChange={setRepeat} placeholder="Repeat">
          <SelectTrigger className="flex h-12 justify-between" variant="outline" size="md">
            <SelectInput className="h-full" placeholder="Select option" />
            <SelectIcon className="mr-3" as={ChevronDownIcon} />
          </SelectTrigger>
          <SelectPortal>
            <SelectBackdrop />
            <SelectContent>
              <SelectDragIndicatorWrapper>
                <SelectDragIndicator />
              </SelectDragIndicatorWrapper>
              <SelectItem label="Weekly" value="weekly" />
              <SelectItem label="Bi-Weekly" value="biWeekly" />
              <SelectItem label="Monthly" value="monthly" />
            </SelectContent>
          </SelectPortal>
        </Select>

        <Button
          className="w-full text-center rounded-lg mt-3"
          onPress={saveEvent}
        >
          <ButtonText className="text-center w-full">Save Event</ButtonText>
        </Button>
      </Box>
    </Center>
  );
}
