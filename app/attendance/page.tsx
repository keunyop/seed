import { AttendanceClient } from "./attendance-client";

type AttendancePageProps = {
  searchParams: Promise<{
    classId?: string;
  }>;
};

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const params = await searchParams;

  return <AttendanceClient initialClassId={params.classId} />;
}

