import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SCREEN_HORIZONTAL_MARGIN, TAB_BAR_BOTTOM_MARGIN, TAB_BAR_HEIGHT } from "../../constants/layout";
import { MUSCLE_GROUP_IMAGES } from "../../constants/muscleGroups";
import { SESSION_RECORDS, UPCOMING_WORKOUTS } from "../../constants/sessionRecords";
import { CARD_SHADOW } from "../../constants/shadow";

export default function TemplatesScreen() {
  const router = useRouter();

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleRow}>
            <Text style={styles.screenTitle}>기록</Text>
            <Pressable
              style={styles.addButton}
              onPress={() => router.push("/routines")}
              hitSlop={8}
            >
              <Ionicons name="add" size={22} color="#0B0B0F" />
            </Pressable>
          </View>

          <View>
            <Text style={styles.sectionTitle}>예정된 운동</Text>
            <View style={styles.list}>
              {UPCOMING_WORKOUTS.map((workout) => (
                <Pressable
                  key={workout.id}
                  style={styles.upcomingRow}
                  onPress={() => router.push(`/upcoming/${workout.id}`)}
                >
                  <Image source={MUSCLE_GROUP_IMAGES[workout.muscleGroup]} style={styles.thumbnail} />
                  <View style={styles.upcomingInfo}>
                    <Text style={styles.upcomingDate}>{workout.date}</Text>
                    <Text style={styles.upcomingName}>{workout.name}</Text>
                    <Text style={styles.upcomingMeta}>
                      {workout.level} · {workout.duration}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#6B6B6B" />
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.sectionTitle}>지난 기록</Text>
            <View style={styles.list}>
              {SESSION_RECORDS.map((session) => {
                const exerciseNames = session.exercises.map((exercise) => exercise.name).join(", ");
                const isInProgress = session.status === "진행중";
                return (
                  <Pressable
                    key={session.id}
                    style={styles.recordCard}
                    onPress={() => router.push(`/records/${session.id}`)}
                  >
                    <View style={styles.recordHeader}>
                      <View>
                        <Text style={styles.recordDate}>{session.date}</Text>
                        <Text style={styles.recordCategory}>{session.category}</Text>
                      </View>
                      <View style={[styles.statusBadge, isInProgress && styles.statusBadgeActive]}>
                        <Text
                          style={[styles.statusBadgeText, isInProgress && styles.statusBadgeTextActive]}
                        >
                          {session.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.recordExercises} numberOfLines={2}>
                      {exerciseNames}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingTop: 12,
    paddingBottom: TAB_BAR_BOTTOM_MARGIN + TAB_BAR_HEIGHT + 24,
    gap: 24,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  screenTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2DD4BF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  upcomingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 12,
    ...CARD_SHADOW,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingDate: {
    color: "#2DD4BF",
    fontSize: 11,
    fontWeight: "600",
  },
  upcomingName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  upcomingMeta: {
    color: "#A0A0A0",
    fontSize: 12,
    marginTop: 2,
  },
  recordCard: {
    backgroundColor: "#1C1C25",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    padding: 16,
    gap: 8,
    ...CARD_SHADOW,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  recordDate: {
    color: "#A0A0A0",
    fontSize: 12,
  },
  recordCategory: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(45, 212, 191, 0.15)",
  },
  statusBadgeActive: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
  },
  statusBadgeText: {
    color: "#2DD4BF",
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadgeTextActive: {
    color: "#FBBF24",
  },
  recordExercises: {
    color: "#A0A0A0",
    fontSize: 13,
  },
});
