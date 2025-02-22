import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import {
  TextInput,
  Alert,
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from "react-native";

import { Button, ButtonText } from "@/components/ui/button";
import { Box } from "@/components/ui/box";
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectIcon,
  SelectItem,
  SelectPortal,
  SelectTrigger,
} from "@/components/ui/select";
import { Center } from "@/components/ui/center";
import { ChevronDownIcon } from "@/components/ui/icon";
import { CalendarEvent, useEvents } from "@/state/EventContext";

const repeatOptions: { weekly: string; biWeekly: string; monthly: string } = {
  weekly: "Weekly",
  biWeekly: "Bi-Weekly",
  monthly: "Monthly",
};

export default function RnCalendar() {
  const { state, dispatch, getEventsForDate } = useEvents();
  const [selectedDate, setSelectedDate] = useState("");
  const [eventName, setEventName] = useState("");
  const [repeat, setRepeat] = useState("weekly");

  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [isStartPickerVisible, setStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setEndPickerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const storedEvents = await AsyncStorage.getItem("events");
    if (storedEvents) {
      dispatch({ type: "LOAD_EVENTS", payload: JSON.parse(storedEvents) });
    }
  };
  const saveOrEditEvent = async () => {
    try {
      console.log(selectedDate, "selectedDate", eventName, startTime, endTime);
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

      if (new Date(selectedDate).getTime() < new Date().setHours(0, 0, 0, 0)) {
        Alert.alert("Invalid Date", "Cannot create events in the past.");
        return;
      }

      let existingEvents = getEventsForDate(newEvent.date, startTime, endTime);

      if (isEditMode && editingEventId) {
        existingEvents = existingEvents.filter(
          (ele) => ele.id !== editingEventId
        );
      }

      const hasConflict = existingEvents?.some(
        (event) =>
          newEvent.startTime < event.endTime &&
          newEvent.endTime > event.startTime
      );

      if (hasConflict) {
        alert("Event time conflicts with another event!");
        return;
      }

      if (isEditMode && editingEventId) {
        dispatch({
          type: "EDIT_EVENT",
          payload: {
            date: selectedDate,
            ...newEvent,
            id: editingEventId,
          },
        });

        const updatedEvents = {
          ...state.events,
          [selectedDate]: [
            ...state.events[selectedDate]?.map((e) => {
              if (e.id === editingEventId) {
                return {
                  ...e,
                  ...newEvent,
                };
              }

              return e;
            }),
          ],
        };

        await AsyncStorage.setItem("events", JSON.stringify(updatedEvents));
        Alert.alert("Success", "Event saved successfully!");

        onCancelEdit();
      } else {
        dispatch({ type: "ADD_EVENT", payload: newEvent });

        const updatedEvents = {
          ...state.events,
          [selectedDate]: [...(state.events[selectedDate] || []), newEvent],
        };

        await AsyncStorage.setItem("events", JSON.stringify(updatedEvents));
        Alert.alert("Success", "Event saved successfully!");
        setSelectedDate("");
        setEventName("");
        setStartTime(null);
        setEndTime(null);
      }
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

    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
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

  const editItem = (item: CalendarEvent) => {
    setIsEditMode(true);
    setEditingEventId(item.id);
    setRepeat(item.repeat);
    setEndTime(item.endTime);
    setStartTime(item.startTime);
    setModalVisible(false);
    setEventName(item.name);
  };

  const onCancelEdit = () => {
    setIsEditMode(false);
    setEditingEventId(null);
    setRepeat("weekly");
    setEndTime(null);
    setStartTime(null);
    setEventName("");
    setSelectedDate("");
  };

  const isPastEvent =
    new Date(selectedDate).getTime() < new Date().setHours(0, 0, 0, 0);

  return (
    <Center className="mt-12">
      <Calendar
        onDayPress={(day: any) => {
          setSelectedDate(day.dateString);
          setModalVisible(true);
        }}
        className='w-full'
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
                  {item.name} - From:{" "}
                  {new Date(item.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  - To:{" "}
                  {new Date(item.endTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  {repeatOptions[item.repeat]}
                </Text>

                {!isPastEvent && (
                  <Box
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        editItem(item as unknown as CalendarEvent);
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
                )}
              </View>
            )}
          />
          <Button testID="closeModalBtn" onPress={() => setModalVisible(false)}>
            <ButtonText>Close</ButtonText>
          </Button>
        </View>
      </Modal>

      <Box className="p-10">
        <TextInput
          placeholder="Event Name"
          value={eventName}
          testID="eventNameInput"
          onChangeText={setEventName}
          style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
        />
        <Button
          className="w-full mt-2"
          onPress={() => setStartPickerVisible(true)}
          testID="startTime"
        >
          <ButtonText testID="startTimeText" className="w-full text-center">
            Select Start Time:{" "}
            {startTime
              ? new Date(startTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Not set"}
          </ButtonText>
        </Button>
        <DateTimePickerModal
          isVisible={isStartPickerVisible}
          mode="time"
          onConfirm={(date: Date) => {
            setStartTime(date.getTime());
            setStartPickerVisible(false);
          }}
          onCancel={() => setStartPickerVisible(false)}
          testID="startTimePicker"
        />

        <Button
          className="w-full mt-2"
          onPress={() => setEndPickerVisible(true)}
          testID="endTime"
        >
          <ButtonText className="w-full text-center">
            Select End Time:{" "}
            {endTime
              ? new Date(endTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Not set"}
          </ButtonText>
        </Button>
        <DateTimePickerModal
          isVisible={isEndPickerVisible}
          mode="time"
          onConfirm={(date: Date) => {
            setEndTime(date.getTime());
            setEndPickerVisible(false);
          }}
          onCancel={() => setEndPickerVisible(false)}
          testID="endTimePicker"
        />

        <Select
          selectedValue={repeat}
          onValueChange={setRepeat}
          placeholder="Repeat"
          key={repeat}
          className="mt-4"
        >
          <SelectTrigger
            className="flex h-12 justify-between"
            variant="outline"
            size="md"
          >
            <Text className="pl-4">
              {repeatOptions[repeat as keyof typeof repeatOptions] ||
                "Select an option"}
            </Text>
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
        {isEditMode && (
          <Button
            className="w-full text-center rounded-lg mt-3 mb-3"
            onPress={onCancelEdit}
          >
            <ButtonText className="text-center w-full">
              Cancel changes
            </ButtonText>
          </Button>
        )}

        <Button
          className="w-full text-center rounded-lg mt-3"
          onPress={saveOrEditEvent}
          testID="saveButton"
        >
          <ButtonText className="text-center w-full">
            {isEditMode ? "Update" : "Save"} Event
          </ButtonText>
        </Button>
      </Box>
    </Center>
  );
}
