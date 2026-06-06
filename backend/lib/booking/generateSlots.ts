export interface ExistingBooking {
  startTime: string; // "10:30"
  endTime: string;   // "11:00"
}

export function generateSlots(
  openTime: string,
  closeTime: string,
  durationMinutes: number,
  existingBookings: ExistingBooking[]
): string[] {
  const startMins = toMinutes(openTime);
  const endMins = toMinutes(closeTime);
  
  const bookedRanges = existingBookings.map((b) => ({
    start: toMinutes(b.startTime),
    end: toMinutes(b.endTime),
  }));

  const slots: string[] = [];

  for (let mins = startMins; mins + durationMinutes <= endMins; mins += durationMinutes) {
    const slotStart = mins;
    const slotEnd = mins + durationMinutes;

    // Check overlap: slot starts before booking ends AND slot ends after booking starts
    const isBooked = bookedRanges.some((range) => {
      return slotStart < range.end && slotEnd > range.start;
    });

    if (!isBooked) {
      slots.push(toTimeStr(slotStart));
    }
  }

  return slots;
}

function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function toTimeStr(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}
