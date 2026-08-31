'use client';

import { useFamilyOpenStore } from '@/components/domain/use-family-open-store';
import { MINISTRY_GROUPS, getMinistryGroupLabel } from '@/lib/family/ministry-group';

export function AppBrandHeader() {
  const { ministryGroup, setMinistryGroup } = useFamilyOpenStore();

  return (
    <header className='sticky top-0 z-20 border-b-2 border-cloud-gray bg-white/95 backdrop-blur'>
      <div className='mx-auto flex min-h-16 w-full max-w-[720px] items-center gap-2 px-4 py-2 sm:gap-3 sm:px-6'>
        <span
          aria-hidden='true'
          className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-duo-green-light'
        >
          <svg className='h-7 w-7 text-duo-green' fill='none' viewBox='0 0 32 32'>
            <path d='M16 27V15' stroke='currentColor' strokeLinecap='round' strokeWidth='3' />
            <path
              d='M15.5 16.5C9 16.4 5.6 12.2 6.2 6.2c6-.6 10.2 2.8 10.3 9.3 0 .6-.4 1-1 1Z'
              fill='currentColor'
            />
            <path
              d='M17.5 19.5c6.1-.1 9.7-3.8 9.5-9.5-5.7-.2-9.4 3.4-9.5 9.5Z'
              fill='currentColor'
              opacity='.82'
            />
          </svg>
        </span>
        <h1 className='font-ui-latin shrink-0 text-3xl font-bold leading-none text-almost-black'>Seed</h1>

        <div
          aria-label='그룹 선택'
          className='ml-auto grid grid-cols-2 rounded-[12px] bg-cloud-gray p-1'
          role='group'
        >
          {MINISTRY_GROUPS.map((group) => {
            const isSelected = ministryGroup === group;

            return (
              <button
                aria-pressed={isSelected}
                className={`min-h-11 rounded-[9px] px-2.5 text-sm font-extrabold transition sm:px-4 ${
                  isSelected
                    ? 'bg-white text-duo-green-dark shadow-sm'
                    : 'text-graphite hover:text-almost-black'
                }`}
                key={group}
                onClick={() => setMinistryGroup(group)}
                type='button'
              >
                {getMinistryGroupLabel(group)}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
