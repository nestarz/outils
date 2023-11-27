import addSeconds from "https://esm.sh/date-fns@2.30.0/addSeconds.js";
import isWithinInterval from "https://esm.sh/date-fns@2.30.0/isWithinInterval.js";
import compareAsc from "https://esm.sh/date-fns@2.30.0/compareAsc.js";

export interface Period {
  free: boolean;
  start: Date;
  end: Date;
};

export const getNonOverlappingFreePeriods = (periods: Period[]): Period[] => {
  const sortedPeriods = periods.sort((a, b) =>
    compareAsc(new Date(a.start), new Date(b.start))
  );
  let freePeriods: Period[] = sortedPeriods
    .filter((p) => p.free)
    .map((p) => ({ ...p }));
  const busyPeriods = sortedPeriods.filter((p) => !p.free);

  busyPeriods.forEach((busyPeriod) => {
    freePeriods = freePeriods.reduce<Period[]>((acc, freePeriod) => {
      const overlapStart = isWithinInterval(new Date(busyPeriod.start), {
        start: new Date(freePeriod.start),
        end: new Date(freePeriod.end),
      });
      const overlapEnd = isWithinInterval(new Date(busyPeriod.end), {
        start: new Date(freePeriod.start),
        end: new Date(freePeriod.end),
      });

      if (!overlapStart && !overlapEnd) {
        return [...acc, freePeriod];
      } else if (overlapStart && overlapEnd) {
        if (
          compareAsc(new Date(freePeriod.start), new Date(busyPeriod.start)) < 0
        ) {
          acc.push({ ...freePeriod, end: addSeconds(busyPeriod.start, -1) });
        }
        if (
          compareAsc(new Date(busyPeriod.end), new Date(freePeriod.end)) < 0
        ) {
          acc.push({ ...freePeriod, start: busyPeriod.end });
        }
        return acc;
      } else if (overlapStart) {
        return [
          ...acc,
          { ...freePeriod, end: addSeconds(busyPeriod.start, -1) },
        ];
      } else if (overlapEnd) {
        return [...acc, { ...freePeriod, start: busyPeriod.end }];
      }
      return acc;
    }, []);

export default getNonOverlappingFreePeriods;    
  });

  return freePeriods;
};
