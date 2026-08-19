export type SetRecord = {
  setNumber: number;
  weight: number;
  reps: number;
  inProgress?: boolean;
};

export type ExerciseRecord = {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  sets: SetRecord[];
};

export type SessionRecord = {
  id: string;
  date: string;
  category: "근력 운동" | "유산소";
  status: "완료" | "진행중";
  exercises: ExerciseRecord[];
};

export type UpcomingWorkout = {
  id: string;
  date: string;
  name: string;
  level: string;
  duration: string;
  muscleGroup: import("./muscleGroups").MuscleGroup;
  templateId: string;
};

export const UPCOMING_WORKOUTS: UpcomingWorkout[] = [
  {
    id: "u1",
    date: "내일",
    name: "등 운동",
    level: "중급",
    duration: "45분",
    muscleGroup: "back",
    templateId: "t2",
  },
  {
    id: "u2",
    date: "5월 20일",
    name: "하체 운동",
    level: "중급",
    duration: "50분",
    muscleGroup: "legs",
    templateId: "t3",
  },
];

export const SESSION_RECORDS: SessionRecord[] = [
  {
    id: "1",
    date: "2024년 5월 18일",
    category: "근력 운동",
    status: "진행중",
    exercises: [
      {
        id: "1-1",
        name: "벤치 프레스",
        targetSets: 3,
        targetReps: 10,
        targetWeight: 20,
        sets: [
          { setNumber: 1, weight: 20, reps: 10 },
          { setNumber: 2, weight: 20, reps: 8, inProgress: true },
          { setNumber: 3, weight: 20, reps: 10 },
        ],
      },
      {
        id: "1-2",
        name: "덤벨 플라이",
        targetSets: 3,
        targetReps: 12,
        targetWeight: 12,
        sets: [
          { setNumber: 1, weight: 12, reps: 12 },
          { setNumber: 2, weight: 12, reps: 12 },
          { setNumber: 3, weight: 12, reps: 10 },
        ],
      },
      {
        id: "1-3",
        name: "스쿼트",
        targetSets: 4,
        targetReps: 8,
        targetWeight: 80,
        sets: [
          { setNumber: 1, weight: 80, reps: 8 },
          { setNumber: 2, weight: 80, reps: 8 },
          { setNumber: 3, weight: 80, reps: 8 },
          { setNumber: 4, weight: 80, reps: 6 },
        ],
      },
      {
        id: "1-4",
        name: "렉 프레스",
        targetSets: 3,
        targetReps: 12,
        targetWeight: 100,
        sets: [
          { setNumber: 1, weight: 100, reps: 12 },
          { setNumber: 2, weight: 100, reps: 12 },
          { setNumber: 3, weight: 100, reps: 10 },
        ],
      },
      {
        id: "1-5",
        name: "바이셉스 컬",
        targetSets: 3,
        targetReps: 12,
        targetWeight: 14,
        sets: [
          { setNumber: 1, weight: 14, reps: 12 },
          { setNumber: 2, weight: 14, reps: 12 },
          { setNumber: 3, weight: 14, reps: 10 },
        ],
      },
      {
        id: "1-6",
        name: "트라이셉스",
        targetSets: 3,
        targetReps: 12,
        targetWeight: 16,
        sets: [
          { setNumber: 1, weight: 16, reps: 12 },
          { setNumber: 2, weight: 16, reps: 12 },
          { setNumber: 3, weight: 16, reps: 10 },
        ],
      },
    ],
  },
  {
    id: "2",
    date: "2024년 5월 17일",
    category: "근력 운동",
    status: "완료",
    exercises: [
      {
        id: "2-1",
        name: "벤치 프레스",
        targetSets: 4,
        targetReps: 10,
        targetWeight: 60,
        sets: [
          { setNumber: 1, weight: 60, reps: 10 },
          { setNumber: 2, weight: 60, reps: 10 },
          { setNumber: 3, weight: 60, reps: 8 },
          { setNumber: 4, weight: 60, reps: 8 },
        ],
      },
      {
        id: "2-2",
        name: "스쿼트",
        targetSets: 4,
        targetReps: 8,
        targetWeight: 80,
        sets: [
          { setNumber: 1, weight: 80, reps: 8 },
          { setNumber: 2, weight: 80, reps: 8 },
          { setNumber: 3, weight: 80, reps: 8 },
          { setNumber: 4, weight: 80, reps: 8 },
        ],
      },
      {
        id: "2-3",
        name: "데드리프트",
        targetSets: 3,
        targetReps: 6,
        targetWeight: 100,
        sets: [
          { setNumber: 1, weight: 100, reps: 6 },
          { setNumber: 2, weight: 100, reps: 6 },
          { setNumber: 3, weight: 100, reps: 6 },
        ],
      },
    ],
  },
  {
    id: "3",
    date: "2024년 5월 16일",
    category: "유산소",
    status: "완료",
    exercises: [
      {
        id: "3-1",
        name: "러닝",
        targetSets: 1,
        targetReps: 0,
        targetWeight: 0,
        sets: [{ setNumber: 1, weight: 0, reps: 0 }],
      },
    ],
  },
];
