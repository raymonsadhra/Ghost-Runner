import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { loadSettings, saveSettings } from '../services/settingsService';
import { formatDistance as fd, formatPace as fp, formatDistanceParts, formatPaceValue } from '../utils/unitUtils';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettingsState] = useState({ distanceUnit: 'km', weekStartsOn: 'monday' });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettingsState(s);
      setLoaded(true);
    });
  }, []);

  const updateSettings = useCallback(async (patch) => {
    const next = { ...settings, ...patch };
    const saved = await saveSettings(next);
    setSettingsState(saved);
    return saved;
  }, [settings]);

  const formatDistance = useCallback((meters, unit) => {
    return fd(meters, unit ?? settings.distanceUnit);
  }, [settings.distanceUnit]);

  const formatPace = useCallback((minPerKm, unit) => {
    return fp(minPerKm, unit ?? settings.distanceUnit);
  }, [settings.distanceUnit]);

  const formatDistancePartsFn = useCallback((meters, unit) => {
    return formatDistanceParts(meters, unit ?? settings.distanceUnit);
  }, [settings.distanceUnit]);

  const formatPaceValueFn = useCallback((minPerKm, unit) => {
    return formatPaceValue(minPerKm, unit ?? settings.distanceUnit);
  }, [settings.distanceUnit]);

  const value = {
    settings,
    loaded,
    updateSettings,
    formatDistance,
    formatPace,
    formatDistanceParts: formatDistancePartsFn,
    formatPaceValue: formatPaceValueFn,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const c = useContext(SettingsContext);
  if (!c) throw new Error('useSettings must be used within SettingsProvider');
  return c;
}
