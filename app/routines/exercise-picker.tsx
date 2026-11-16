import { Plus, Search, X } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppAlertModal } from "../../components/AppAlertModal";
import { AppTextInput } from "../../components/AppTextInput";
import { ExerciseFormSheet } from "../../components/ExerciseFormSheet";
import { PlanLimitSheet } from "../../components/PlanLimitSheet";
import { PlanLimit } from "../../lib/api/planLimit";
import { dismissThen, keyboardScrollProps } from "../../components/KeyboardDismissView";
import { ScreenBackground } from "../../components/ScreenBackground";
import { PressableScale } from "../../components/ui/PressableScale";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { colors, radius, space } from "../../constants/theme";
import { useExercisePickerFilterStore } from "../../store/exercisePickerFilterStore";
import { SCREEN_HORIZONTAL_MARGIN } from "../../constants/layout";
import {
  BODY_REGION_KOREAN,
  BODY_REGION_MUSCLE_GROUPS,
  isBodyweightExercise,
  BodyRegion,
  EQUIPMENT_KOREAN,
  ExerciseEquipment,
  ExerciseMuscleGroup,
  MUSCLE_GROUP_KOREAN,
} from "../../constants/exercises";
import { appAlert } from "../../lib/alert";
import { useRoutineBuilderStore } from "../../store/routineBuilderStore";
import { TemplateCategory } from "../../store/templatesStore";
import { ApiExercise, formatExerciseName, isCardioExercise, useExercises } from "../../hooks/api/useExercises";
import { toItemsPayload, useTemplate, useUpdateTemplate } from "../../hooks/api/useTemplates";
import { useSession, usePatchSession } from "../../hooks/api/useSessions";

const DEFAULT_CARDIO_DURATION_SECONDS = 20 * 60;

// 운동 종류(유산소/기능성/근력)에 따라 세션·템플릿에 addItems로 보낼 목표값 필드가
// 다르다 — 세 곳(세션 즉흥 추가, 템플릿 추가, 빌더 스토어)에서 반복하지 않게 공용화.
function buildTargetFields(exercise: ApiExercise) {
  // 서버 검증은 exercise.type 기준 — CARDIO는 duration만, 그 외(기능성 포함)는 sets/reps/weight만 보낸다.
  if (isCardioExercise(exercise)) {
    return { targetDurationSeconds: DEFAULT_CARDIO_DURATION_SECONDS };
  }
  // 맨몸 종목은 무게 개념이 없어 weight=0
  return { targetSets: 3, targetReps: 15, targetWeight: isBodyweightExercise(exercise) ? 0 : 20 };
}

// CARDIO는 별도 분류(전체 필터 숨김 + 직행 목록)로 처리하므로 근력 운동용 근육군
// 필터 칩 목록에서는 뺀다.
const MUSCLE_GROUPS: ExerciseMuscleGroup[] = [
  "CHEST",
  "BACK",
  "SHOULDER",
  "BICEPS",
  "TRICEPS",
  "LEGS",
  "ABS",
  "FUNCTIONAL",
];

const EQUIPMENTS: ExerciseEquipment[] = ["FREE_WEIGHT", "MACHINE", "CABLE", "SMITH", "BODYWEIGHT"];

export default function ExercisePickerScreen() {
  const { templateId, sessionId } = useLocalSearchParams<{ templateId?: string; sessionId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addItems = useRoutineBuilderStore((state) => state.addItems);
  const { data: template } = useTemplate(templateId);
  const updateTemplate = useUpdateTemplate();
  const { data: session } = useSession(sessionId);
  const patchSession = usePatchSession();
  const { data: exercises = [] } = useExercises();
  // "+ 직접 추가" 시트와 한도 초과(403 PERSONAL_EXERCISE_COUNT) 안내 시트 상태
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [limitSheet, setLimitSheet] = useState<PlanLimit | null>(null);
  const routineCategory = useRoutineBuilderStore((state) => state.category);
  // 이미 루틴 "분류"에서 선택된 값을 운동 추가 화면이 그대로 활용한다 —
  // 세션 중 즉흥 추가(sessionId)는 분류 개념이 없어서 대상에서 뺀다.
  const effectiveCategory: TemplateCategory | undefined = sessionId
    ? undefined
    : templateId
      ? template?.category
      : routineCategory;
  const isCardioCategory = effectiveCategory === "CARDIO";
  const [query, setQuery] = useState("");
  // 필터 칩은 화면을 다시 열어도 유지되게 스토어에 둔다(연달아 운동을 추가할 때 매번 초기화되던 문제).
  const storedBodyRegion = useExercisePickerFilterStore((state) => state.bodyRegion);
  const bodyRegionFilter: BodyRegion | null =
    storedBodyRegion !== undefined ? storedBodyRegion : effectiveCategory === "LEGS" ? "LOWER" : null;
  const filter = useExercisePickerFilterStore((state) => state.muscleGroup);
  const equipmentFilter = useExercisePickerFilterStore((state) => state.equipment);
  const setBodyRegionFilter = useExercisePickerFilterStore((state) => state.setBodyRegion);
  const setFilter = useExercisePickerFilterStore((state) => state.setMuscleGroup);
  const setEquipmentFilter = useExercisePickerFilterStore((state) => state.setEquipment);
  const cardioExercises = useMemo(
    () => exercises.filter((exercise) => isCardioExercise(exercise)),
    [exercises]
  );

  const trimmedQuery = query.trim().toLowerCase();
  const matched = useMemo(
    () =>
      trimmedQuery
        ? exercises.filter((exercise) =>
            formatExerciseName(exercise).toLowerCase().includes(trimmedQuery)
          )
        : exercises,
    [exercises, trimmedQuery]
  );
  const byBodyRegion = useMemo(
    () =>
      bodyRegionFilter
        ? matched.filter((exercise) => BODY_REGION_MUSCLE_GROUPS[bodyRegionFilter].includes(exercise.muscleGroup))
        : matched,
    [matched, bodyRegionFilter]
  );
  // 실제 결과가 있는 근육군만 칩으로 보여준다 — 상체/하체 선택 시 후보가 1개뿐이면
  // (예: 하체 → LEGS 하나) "전체"/그 1개 뿐인 토글이 상위 부위 토글과 똑같은 선택지라
  // 의미가 없으므로 행 자체를 숨긴다.
  const availableMuscleGroups = useMemo(() => {
    const candidates = MUSCLE_GROUPS.filter(
      (group) => !bodyRegionFilter || BODY_REGION_MUSCLE_GROUPS[bodyRegionFilter].includes(group)
    );
    const present = new Set(byBodyRegion.map((exercise) => exercise.muscleGroup));
    return candidates.filter((group) => present.has(group));
  }, [byBodyRegion, bodyRegionFilter]);
  const byMuscleGroup = useMemo(
    () => (filter ? byBodyRegion.filter((exercise) => exercise.muscleGroup === filter) : byBodyRegion),
    [byBodyRegion, filter]
  );
  // 장비도 마찬가지 — 상위 필터 기준으로 결과가 0개인 장비 칩(예: 하체 · 케이블/스미스)은 가린다.
  const availableEquipments = useMemo(() => {
    const present = new Set(byMuscleGroup.map((exercise) => exercise.equipment));
    return EQUIPMENTS.filter((equipment) => present.has(equipment));
  }, [byMuscleGroup]);
  const results = useMemo(
    () => (equipmentFilter ? byMuscleGroup.filter((exercise) => exercise.equipment === equipmentFilter) : byMuscleGroup),
    [byMuscleGroup, equipmentFilter]
  );

  // 상위 필터가 바뀌어 현재 선택된 하위 필터가 더 이상 유효하지 않게 되면(칩이 사라지면)
  // 보이지 않는 필터가 계속 적용된 채로 남지 않도록 초기화한다.
  useEffect(() => {
    if (filter && !availableMuscleGroups.includes(filter)) setFilter(null);
  }, [filter, availableMuscleGroups]);
  useEffect(() => {
    if (equipmentFilter && !availableEquipments.includes(equipmentFilter)) setEquipmentFilter(null);
  }, [equipmentFilter, availableEquipments]);

  // 새 종목이 목록에서 필터에 가려지지 않도록 필터를 풀고, 이름으로 검색어를 채워 바로 찾게 한다.
  const handleCreated = (name: string) => {
    setBodyRegionFilter(null);
    setFilter(null);
    setEquipmentFilter(null);
    if (!isCardioCategory) setQuery(name);
  };

  // 여러 운동을 고른 뒤 한 번에 추가한다 — 하나 고를 때마다 창이 닫히면 5종목 루틴에 창을 5번 열어야 한다.
  // 고른 순서가 루틴의 순서가 되도록 id를 배열로 둔다. 필터나 검색어를 바꿔도 고른 것은 유지된다.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleSelect = (exerciseId: string) =>
    setSelectedIds((ids) => (ids.includes(exerciseId) ? ids.filter((id) => id !== exerciseId) : [...ids, exerciseId]));

  // "N개 추가"를 빠르게 두 번 누르면 같은 운동이 두 번 추가되고 화면이 두 번 닫히던 문제를 막는다.
  // 성공하면 이 화면은 닫히므로, 실패했을 때만 다시 누를 수 있게 풀어 준다.
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const handleAddSelected = async () => {
    if (submittingRef.current) return;
    const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
    const selected = selectedIds
      .map((id) => exerciseById.get(id))
      .filter((exercise): exercise is ApiExercise => exercise != null);
    if (selected.length === 0) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (sessionId && session) {
        await patchSession.mutateAsync({
          sessionId,
          addItems: selected.map((exercise, index) => ({
            exerciseId: exercise.id,
            sortOrder: session.logs.length + index,
            ...buildTargetFields(exercise),
          })),
        });
      } else if (templateId && template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          payload: {
            name: template.name,
            category: template.category,
            items: [
              ...toItemsPayload(template.items),
              ...selected.map((exercise, index) => ({
                exerciseId: exercise.id,
                sortOrder: template.items.length + index,
                ...buildTargetFields(exercise),
              })),
            ],
          },
        });
      } else {
        addItems(
          selected.map((exercise) => ({
            exerciseId: exercise.id,
            kind: isCardioExercise(exercise) ? ("CARDIO" as const) : ("STRENGTH" as const),
          }))
        );
      }
      router.back();
    } catch {
      // 실패하면 화면이 닫히지 않으므로 고른 것은 그대로 두고 다시 누를 수 있게 한다.
      submittingRef.current = false;
      setSubmitting(false);
      appAlert("운동을 추가하지 못했어요. 다시 시도해주세요.");
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <PressableScale style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <X size={20} color={colors.text} />
          </PressableScale>
          <Text style={styles.headerTitle}>운동 추가하기</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* 분류가 "유산소"면 이미 뭘 고를지 정해진 것과 같다 — 달리기/걷기 2개뿐이라
            검색/필터 UI를 띄우는 게 오히려 불필요한 단계라 통째로 생략하고 바로 목록만 보여준다. */}
        {!isCardioCategory && (
          <>
            <View style={styles.searchWrap}>
              <Search size={16} color={colors.text3} />
              <AppTextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="운동 이름 검색"
                placeholderTextColor={colors.text3}
              />
            </View>

            <View style={styles.filterRow}>
              <PressableScale
                style={[styles.filterChip, bodyRegionFilter === null && styles.filterChipActive]}
                onPress={dismissThen(() => {
                  setBodyRegionFilter(null);
                  setFilter(null);
                })}
              >
                <Text
                  style={[styles.filterChipText, bodyRegionFilter === null && styles.filterChipTextActive]}
                >
                  전체
                </Text>
              </PressableScale>
              {(["UPPER", "LOWER"] as BodyRegion[]).map((region) => (
                <PressableScale
                  key={region}
                  style={[styles.filterChip, bodyRegionFilter === region && styles.filterChipActive]}
                  onPress={dismissThen(() => {
                    setBodyRegionFilter(bodyRegionFilter === region ? null : region);
                    setFilter(null);
                  })}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      bodyRegionFilter === region && styles.filterChipTextActive,
                    ]}
                  >
                    {BODY_REGION_KOREAN[region]}
                  </Text>
                </PressableScale>
              ))}
            </View>

            {availableMuscleGroups.length > 1 && (
              <View style={styles.filterRow}>
                <PressableScale
                  style={[styles.filterChip, filter === null && styles.filterChipActive]}
                  onPress={dismissThen(() => setFilter(null))}
                >
                  <Text style={[styles.filterChipText, filter === null && styles.filterChipTextActive]}>
                    전체
                  </Text>
                </PressableScale>
                {availableMuscleGroups.map((group) => (
                  <PressableScale
                    key={group}
                    style={[styles.filterChip, filter === group && styles.filterChipActive]}
                    onPress={dismissThen(() => setFilter(filter === group ? null : group))}
                  >
                    <Text
                      style={[styles.filterChipText, filter === group && styles.filterChipTextActive]}
                    >
                      {MUSCLE_GROUP_KOREAN[group]}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            )}

            <View style={styles.filterRow}>
              <PressableScale
                style={[styles.filterChip, equipmentFilter === null && styles.filterChipActive]}
                onPress={dismissThen(() => setEquipmentFilter(null))}
              >
                <Text
                  style={[styles.filterChipText, equipmentFilter === null && styles.filterChipTextActive]}
                >
                  전체 장비
                </Text>
              </PressableScale>
              {availableEquipments.map((equipment) => (
                <PressableScale
                  key={equipment}
                  style={[styles.filterChip, equipmentFilter === equipment && styles.filterChipActive]}
                  onPress={dismissThen(() => setEquipmentFilter(equipmentFilter === equipment ? null : equipment))}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      equipmentFilter === equipment && styles.filterChipTextActive,
                    ]}
                  >
                    {EQUIPMENT_KOREAN[equipment]}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </>
        )}

        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          {...keyboardScrollProps}
        >
          {(isCardioCategory ? cardioExercises : results).map((exercise) => {
            const selectedIndex = selectedIds.indexOf(exercise.id);
            const isSelected = selectedIndex !== -1;
            return (
            <PressableScale
              key={exercise.id}
              style={styles.exerciseRow}
              onPress={() => toggleSelect(exercise.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <View style={styles.exerciseInfo}>
                <View style={styles.exerciseNameRow}>
                  <Text style={styles.exerciseName} numberOfLines={2}>
                    {formatExerciseName(exercise)}
                  </Text>
                  {exercise.scope === "PERSONAL" && (
                    <View style={styles.ownBadge}>
                      <Text style={styles.ownBadgeText}>내 운동</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.exerciseGroup}>
                  {exercise.equipment
                    ? `${MUSCLE_GROUP_KOREAN[exercise.muscleGroup]} · ${EQUIPMENT_KOREAN[exercise.equipment]}`
                    : MUSCLE_GROUP_KOREAN[exercise.muscleGroup]}
                </Text>
              </View>
              {/* 고르면 흰 원에 고른 순서가 적힌다 — 이 순서대로 루틴에 들어간다. */}
              <View style={[styles.selectMark, isSelected && styles.selectMarkOn]}>
                {isSelected ? (
                  <Text style={styles.selectMarkText}>{selectedIndex + 1}</Text>
                ) : (
                  <Plus size={16} color={colors.text2} />
                )}
              </View>
            </PressableScale>
            );
          })}
          {(isCardioCategory ? cardioExercises : results).length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>검색 결과가 없어요.</Text>
              <PressableScale style={styles.addOwnButton} onPress={dismissThen(() => setShowCreateSheet(true))}>
                <Text style={styles.addOwnButtonText}>
                  {query.trim() ? `'${query.trim()}' 직접 추가하기` : "직접 추가하기"}
                </Text>
              </PressableScale>
            </View>
          ) : (
            <PressableScale style={styles.footerLink} onPress={dismissThen(() => setShowCreateSheet(true))} hitSlop={8}>
              <Text style={styles.footerLinkText}>찾는 운동이 없나요? 직접 추가</Text>
            </PressableScale>
          )}
        </ScrollView>
        {/* 하나라도 고르면 아래에 뜨는 추가 버튼. 목록 위에 겹쳐 놓아서 나타나도 목록이 밀리지 않는다
            (가려지는 만큼은 listContent의 아래 여백으로 미리 비워 두었다). */}
        {selectedIds.length > 0 && (
          <View style={[styles.addBar, { paddingBottom: insets.bottom + space.s12 }]}>
            <PrimaryButton
              title={submitting ? "추가하는 중" : `${selectedIds.length}개 추가`}
              onPress={handleAddSelected}
              disabled={submitting}
            />
          </View>
        )}
      </SafeAreaView>
      {/* 이 화면은 presentation:"modal"로 뜨는 네이티브 모달이라, app/_layout.tsx의 전역
          AppAlertModal이 뒤로 깔린다 — 같은 화면 안에 하나 더 마운트해서 위로 뜨게 한다. */}
      <ExerciseFormSheet
        visible={showCreateSheet}
        initialName={query.trim()}
        onClose={() => setShowCreateSheet(false)}
        onCreated={handleCreated}
        onLimit={setLimitSheet}
      />
      <PlanLimitSheet limit={limitSheet} onClose={() => setLimitSheet(null)} />
      <AppAlertModal />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.s8,
    marginHorizontal: SCREEN_HORIZONTAL_MARGIN,
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingVertical: space.s8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.text,
  },
  filterChipText: {
    color: colors.text2,
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: colors.onAccent,
  },
  listContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    // 아래에 겹쳐 뜨는 "N개 추가" 버튼(높이 52 + 여백)에 마지막 운동이 가려지지 않게 비워 둔다.
    paddingBottom: 140,
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 60,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.16)",
  },
  emptyWrap: {
    alignItems: "center",
    gap: 16,
    marginTop: 40,
  },
  addOwnButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.control,
    paddingVertical: space.s12,
    paddingHorizontal: space.s20,
  },
  addOwnButtonText: {
    color: colors.onAccent,
    fontSize: 14,
    fontWeight: "800",
  },
  footerLink: {
    alignSelf: "center",
    paddingVertical: 12,
  },
  footerLinkText: {
    color: colors.text2,
    fontSize: 13,
    textDecorationLine: "underline",
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  exerciseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ownBadge: {
    paddingVertical: 2,
  },
  ownBadgeText: {
    color: colors.text3,
    fontSize: 10,
    fontWeight: "600",
  },
  selectMark: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  selectMarkOn: {
    backgroundColor: colors.text,
  },
  selectMarkText: {
    color: colors.onAccent,
    fontSize: 13,
    fontWeight: "800",
  },
  addBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SCREEN_HORIZONTAL_MARGIN,
    paddingTop: space.s12,
    backgroundColor: colors.bg,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  exerciseName: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  exerciseGroup: {
    color: colors.text2,
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: colors.text2,
    fontSize: 13,
    textAlign: "center",
  },
});
