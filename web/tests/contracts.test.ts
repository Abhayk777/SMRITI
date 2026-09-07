import assert from 'node:assert/strict'
import test from 'node:test'

import { SUPPORTED_LANGUAGES } from '../src/lib/languages.ts'
import { fillDailyReportRange, groupDailyReportWeeks } from '../src/lib/reporting.ts'
import {
  EVERY_DAY,
  addIsoDays,
  calendarDayRangeInZone,
  calendarMonthRangeInZone,
  describeDays,
  isDayOn,
  isoDateDaysAgoInZone,
  minutesOfDayInZone,
  normaliseDaysOfWeek,
  parseDaysOfWeek,
  toggleDay,
} from '../src/lib/utils.ts'

test('weekday schedules read legacy bitmasks and write canonical ISO CSV', () => {
  assert.deepEqual(parseDaysOfWeek('1010100'), [1, 3, 5])
  assert.equal(normaliseDaysOfWeek('1010100'), '1,3,5')
  assert.equal(normaliseDaysOfWeek('7, 1,3,3'), '1,3,7')
  assert.equal(normaliseDaysOfWeek('1111111'), EVERY_DAY)
  assert.equal(describeDays('1111100'), 'Weekdays')
  assert.equal(isDayOn('1,3,5', 2), true)
  assert.equal(toggleDay(toggleDay('1,3,5', 1), 1), '1,3,5')
})

test('selectable language codes match the supported delivery matrix', () => {
  assert.deepEqual(
    SUPPORTED_LANGUAGES.map(({ code }) => code),
    ['hi', 'as', 'mni', 'kha', 'lus', 'en'],
  )
  assert.match(SUPPORTED_LANGUAGES.find(({ code }) => code === 'hi')!.delivery, /Conversational/)
  assert.doesNotMatch(
    SUPPORTED_LANGUAGES.find(({ code }) => code === 'en')!.delivery,
    /Conversational/,
  )
})

test('patient-local date and clock differ correctly from the caregiver zone', () => {
  const instant = new Date('2026-01-01T00:30:00.000Z')
  assert.equal(isoDateDaysAgoInZone('Asia/Kolkata', 0, instant), '2026-01-01')
  assert.equal(isoDateDaysAgoInZone('America/Los_Angeles', 0, instant), '2025-12-31')
  assert.equal(minutesOfDayInZone('Asia/Kolkata', instant), 360)
  assert.equal(minutesOfDayInZone('America/Los_Angeles', instant), 990)
})

test('30-day and 90-day ranges contain exactly the requested calendar days', () => {
  const instant = new Date('2026-03-08T12:00:00.000Z')
  const thirty = calendarDayRangeInZone('America/New_York', 30, instant)
  const ninety = calendarDayRangeInZone('America/New_York', 90, instant)
  assert.deepEqual(thirty, { fromDate: '2026-02-07', toDateExclusive: '2026-03-09' })
  assert.deepEqual(ninety, { fromDate: '2025-12-09', toDateExclusive: '2026-03-09' })
  assert.equal(addIsoDays(thirty.fromDate, 30), thirty.toDateExclusive)
  assert.equal(addIsoDays(ninety.fromDate, 90), ninety.toDateExclusive)
})

test('calendar-month ranges clamp month ends without millisecond arithmetic', () => {
  const instant = new Date('2026-03-31T12:00:00.000Z')
  assert.deepEqual(calendarMonthRangeInZone('UTC', 1, instant), {
    fromDate: '2026-03-01',
    toDateExclusive: '2026-04-01',
  })
})

test('zero-activity days are included and weeks align to Monday', () => {
  const range = { fromDate: '2026-03-28', toDateExclusive: '2026-04-07' }
  const rows = fillDailyReportRange([], 'patient-1', range)
  assert.equal(rows.length, 10)
  assert.ok(rows.every((row) => row.played === false))
  assert.deepEqual(
    groupDailyReportWeeks(rows).map((week) => week.map((row) => row.day)),
    [
      ['2026-03-28', '2026-03-29'],
      ['2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05'],
      ['2026-04-06'],
    ],
  )
})
