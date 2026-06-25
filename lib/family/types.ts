export type AttendanceStatus = "present" | "absent";

export type FamilyClass = {
  id: string;
  name: string;
};

export type FamilyChild = {
  id: string;
  name: string;
  classId: string;
  birthMonth: number;
  birthDay: number;
  isActive: boolean;
};

export type AttendanceRecord = {
  status: AttendanceStatus;
  qtCompleted: boolean;
};

export type AttendanceSession = {
  sessionDate: string;
  records: Record<string, AttendanceRecord>;
  note: string;
  savedAt: string;
};

export type FamilyOpenStore = {
  version: 1;
  classes: FamilyClass[];
  children: FamilyChild[];
  attendanceByDate: Record<string, AttendanceSession>;
};

export type DashboardSummary = {
  activeChildrenCount: number;
  weeklyPresentCount: number;
  weeklyTotalCount: number;
  monthlyQtParticipants: number;
  monthlyQtCompletions: number;
  monthlyBirthdays: FamilyChild[];
};

