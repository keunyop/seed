import { getNearestWeekdayDate } from '@/lib/dates/service-week';

export const MINISTRY_GROUPS = ['elementary', 'awana'] as const;

export type MinistryGroup = (typeof MINISTRY_GROUPS)[number];

export const DEFAULT_MINISTRY_GROUP: MinistryGroup = 'elementary';
export const MINISTRY_GROUP_STORAGE_KEY = 'seed-ministry-group-v1';
export const AWANA_START_DATE = '2026-09-04';

const ministryGroupLabels: Record<MinistryGroup, string> = {
  elementary: '초등부',
  awana: 'AWANA',
};

export function isMinistryGroup(value: unknown): value is MinistryGroup {
  return typeof value === 'string' && MINISTRY_GROUPS.includes(value as MinistryGroup);
}

export function getMinistryGroupLabel(group: MinistryGroup) {
  return ministryGroupLabels[group];
}

export function getActivityLabel(group: MinistryGroup) {
  return group === 'awana' ? '암송' : '큐티';
}

export function getServiceWeekday(group: MinistryGroup): 0 | 5 {
  return group === 'awana' ? 5 : 0;
}

export function getDefaultAttendanceDate(group: MinistryGroup, baseDate: string) {
  const serviceDate = getNearestWeekdayDate(baseDate, getServiceWeekday(group));

  return group === 'awana' && serviceDate < AWANA_START_DATE ? AWANA_START_DATE : serviceDate;
}
