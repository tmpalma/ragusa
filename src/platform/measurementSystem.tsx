import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  MEASUREMENT_STORAGE_KEY,
  formatLength,
  formatMass,
  formatMeasurementProse,
  parseMeasurementSystem,
  type MeasurementSystem,
} from "../domain/units";

interface MeasurementContextValue {
  system: MeasurementSystem;
  setSystem: (system: MeasurementSystem) => void;
  formatLength: (feet: number, metricMeters?: number) => string;
  formatMass: (pounds: number, metricKg?: number) => string;
  formatProse: (text: string) => string;
}

const MeasurementContext = createContext<MeasurementContextValue | null>(null);

function readStoredSystem(): MeasurementSystem {
  if (typeof localStorage === "undefined") return "imperial";
  return parseMeasurementSystem(localStorage.getItem(MEASUREMENT_STORAGE_KEY));
}

export function MeasurementProvider({ children }: { children: ReactNode }) {
  const [system, setSystemState] = useState(readStoredSystem);

  const setSystem = useCallback((next: MeasurementSystem) => {
    setSystemState(next);
    localStorage.setItem(MEASUREMENT_STORAGE_KEY, next);
  }, []);

  const value = useMemo<MeasurementContextValue>(
    () => ({
      system,
      setSystem,
      formatLength: (feet, metricMeters) => formatLength(feet, system, metricMeters),
      formatMass: (pounds, metricKg) => formatMass(pounds, system, metricKg),
      formatProse: (text) => formatMeasurementProse(text, system),
    }),
    [system, setSystem],
  );

  return <MeasurementContext.Provider value={value}>{children}</MeasurementContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + its hook belong together
export function useMeasurementSystem(): MeasurementContextValue {
  const ctx = useContext(MeasurementContext);
  if (!ctx) throw new Error("useMeasurementSystem must be used within a MeasurementProvider");
  return ctx;
}
