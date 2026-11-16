import { useEffect, useState } from 'react';

export interface ExportPrefs {
  excel: boolean;
  print: boolean;
}

const STORAGE_KEY = 'bom_export_prefs';

const DEFAULT_PREFS: ExportPrefs = {
  excel: true,
  print: true,
};

const CHANGE_EVENT = 'bom_export_prefs_change';

export function loadExportPrefs(): ExportPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<ExportPrefs>;
    return {
      excel: parsed.excel ?? DEFAULT_PREFS.excel,
      print: parsed.print ?? DEFAULT_PREFS.print,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveExportPrefs(prefs: ExportPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useExportPrefs(): ExportPrefs {
  const [prefs, setPrefs] = useState<ExportPrefs>(loadExportPrefs);

  useEffect(() => {
    const onChange = () => setPrefs(loadExportPrefs());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  return prefs;
}
