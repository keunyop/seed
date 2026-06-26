export type AttendanceStatus = "present" | "absent";

export type FamilyTeacher = {
  id: string;
  name: string;
  photoDataUrl?: string;
  birthDate?: string;
  birthMonth?: number;
  birthDay?: number;
  phone?: string;
  isActive: boolean;
};

export type FamilyClass = {
  id: string;
  name: string;
  teacherId?: string;
};

export type ChildGender = "male" | "female" | "unspecified";

export type ParentRelation = "father" | "mother" | "other";

export type ParentContact = {
  id: string;
  relation: ParentRelation;
  name: string;
  phone: string;
};

export type FamilyChild = {
  id: string;
  name: string;
  classId: string;
  photoDataUrl?: string;
  gender?: ChildGender;
  birthDate?: string;
  birthYear?: number;
  birthMonth: number;
  birthDay: number;
  parents?: ParentContact[];
  address?: string;
  email?: string;
  registeredAt?: string;
  notes?: string;
  isActive: boolean;
};

export type AttendanceRecord = {
  status?: AttendanceStatus;
  qtCompleted: boolean;
};

export type AttendanceSession = {
  sessionDate: string;
  records: Record<string, AttendanceRecord>;
  note: string;
  shareWithPastor?: boolean;
  savedAt: string;
};

export type FamilyOpenStore = {
  version: 1;
  teachers: FamilyTeacher[];
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

export type WeeklyAttendanceDetail = {
  child: FamilyChild;
  className: string;
  status?: AttendanceStatus;
  qtCompleted: boolean;
};

export type MonthlyQtDetail = {
  child: FamilyChild;
  className: string;
  completions: number;
};
