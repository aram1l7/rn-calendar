import { Button, ButtonText } from "@/components/ui/button";
import {
  TextInput,
  Alert,
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from "react-native";
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
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useEvents } from "@/state/EventContext";

export default function RnCalendar() {
  const { state, dispatch, getEventsForDate } = useEvents();
  const [selectedDate, setSelectedDate] = useState("");
  const [eventName, setEventName] = useState("");
  const [repeat, setRepeat] = useState("weekly");

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isStartPickerVisible, setStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setEndPickerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const storedEvents = await AsyncStorage.getItem("events");
    if (storedEvents) {
      dispatch({ type: "LOAD_EVENTS", payload: JSON.parse(storedEvents) });
    }
  };
  const saveEvent = async () => {
    try {
      if (!selectedDate || !eventName || !startTime || !endTime) {
        Alert.alert("Error", "Please select a date, event name, and times");
        return;
      }

      const newEvent: any = {
        name: eventName,
        startTime,
        endTime,
        date: selectedDate,
        repeat,
        id: `event-${Date.now()}`,
      };

      console.log(newEvent, "newEvent");

      if (new Date(selectedDate).getTime() < new Date().setHours(0, 0, 0, 0)) {
        console.log("Invalid Date Attempt");
        Alert.alert("Invalid Date", "Cannot create events in the past.");
        return;
      }

      const existingEvents = getEventsForDate(
        newEvent.date,
        startTime,
        endTime
      );
      console.log(existingEvents, "existingEvents");

      if (!existingEvents) {
        console.log("getEventsForDate returned undefined or null");
      }

      const hasConflict = existingEvents?.some(
        (event) =>
          newEvent.startTime < event.endTime &&
          newEvent.endTime > event.startTime
      );

      console.log(hasConflict, "hasConflict");

      if (hasConflict) {
        alert("Event time conflicts with another event!");
        return;
      }

      dispatch({ type: "ADD_EVENT", payload: newEvent });

      const updatedEvents = {
        ...state.events,
        [selectedDate]: [...(state.events[selectedDate] || []), newEvent],
      };

      await AsyncStorage.setItem("events", JSON.stringify(updatedEvents));
      Alert.alert("Success", "Event saved successfully!");
      setSelectedDate("");
      setEventName("");
      setStartTime("");
      setEndTime("");
    } catch (error) {
      console.error("Error in saveEvent:", error);
      Alert.alert("Error", "Something went wrong!");
    }
  };

  const getMarkedDates = () => {
    const marked: Record<string, any> = {};

    if (!state.events) return marked;

    Object.keys(state.events).forEach((date) => {
      marked[date] = { marked: true, dotColor: "blue" };
    });

    // Keep selectedDate highlighted as well
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate], // Preserve existing marks
        selected: true,
        selectedColor: "yellow",
      };
    }

    return marked;
  };

  const deleteEvent = async (id: string, date: string) => {
    try {
      dispatch({ type: "DELETE_EVENT", payload: { id, date } });

      const updatedEvents = {
        ...state.events,
        [selectedDate]: state.events[date]?.filter((e) => e.id !== id),
      };

      await AsyncStorage.setItem("events", JSON.stringify(updatedEvents));
      Alert.alert("Success", "Event deleted successfully!");
      setModalVisible(false);
    } catch (error) {
      console.error("Error in saveEvent:", error);
      Alert.alert("Error", "Something went wrong!");
    }
  };

  return (
    <Center>
      <Calendar
        onDayPress={(day: any) => {
          setSelectedDate(day.dateString);
          setModalVisible(true);
        }}
        markedDates={getMarkedDates()}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>
            Events for {selectedDate}
          </Text>
          <FlatList
            data={state.events[selectedDate] || []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={{
                  flexDirection: "column",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                }}
              >
                <Text>
                  {item.name} - From: {item.startTime} - To: {item.endTime} {" "}
                  {item.repeat === "weekly"
                    ? "Weekly"
                    : item.repeat === "biWeekly"
                    ? "Bi-Weekly"
                    : "Monthly"}
                </Text>

                <Box style={{ display: "flex", flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      // editEv(item.id, item.date);
                    }}
                  >
                    <Text style={{ color: "blue" }}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      deleteEvent(item.id, item.date);
                    }}
                  >
                    <Text style={{ color: "red" }}>Delete</Text>
                  </TouchableOpacity>
                </Box>
              </View>
            )}
          />
          <Button onPress={() => setModalVisible(false)}>
            <ButtonText>Close</ButtonText>
          </Button>
        </View>
      </Modal>

      <Box className="p-10">
        <TextInput
          placeholder="Event Name"
          value={eventName}
          onChangeText={setEventName}
          style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
        />
        <Button
          className="w-full mt-2"
          onPress={() => setStartPickerVisible(true)}
        >
          <ButtonText className="w-full text-center">
            Select Start Time: {startTime || "Not Set"}
          </ButtonText>
        </Button>
        <DateTimePickerModal
          isVisible={isStartPickerVisible}
          mode="time"
          onConfirm={(date: Date) => {
            setStartTime(
              date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            );
            setStartPickerVisible(false);
          }}
          onCancel={() => setStartPickerVisible(false)}
        />

        <Button
          className="w-full mt-2"
          onPress={() => setEndPickerVisible(true)}
        >
          <ButtonText className="w-full text-center">
            Select End Time: {endTime || "Not Set"}
          </ButtonText>
        </Button>
        <DateTimePickerModal
          isVisible={isEndPickerVisible}
          mode="time"
          onConfirm={(date: Date) => {
            setEndTime(
              date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            );
            setEndPickerVisible(false);
          }}
          onCancel={() => setEndPickerVisible(false)}
        />

        <Select
          selectedValue={repeat}
          onValueChange={setRepeat}
          placeholder="Repeat"
          className="mt-4"
        >
          <SelectTrigger
            className="flex h-12 justify-between"
            variant="outline"
            size="md"
          >
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
