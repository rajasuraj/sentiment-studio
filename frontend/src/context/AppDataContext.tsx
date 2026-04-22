import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UploadState = {
  columnsA: string[];
  columnsB: string[];
  rowsA: number;
  rowsB: number;
  mode: "single" | "dual";
} | null;

type Ctx = {
  upload: UploadState;
  setUpload: (u: UploadState) => void;
};

const AppDataContext = createContext<Ctx | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [upload, setUpload] = useState<UploadState>(null);
  const value = useMemo(() => ({ upload, setUpload }), [upload]);
  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const v = useContext(AppDataContext);
  if (!v) throw new Error("useAppData outside provider");
  return v;
}

export function useSetUpload() {
  const { setUpload } = useAppData();
  return useCallback((u: UploadState) => setUpload(u), [setUpload]);
}
