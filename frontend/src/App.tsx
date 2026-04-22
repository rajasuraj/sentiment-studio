import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppDataProvider } from "@/context/AppDataContext";
import { Layout } from "@/components/Layout";
import { UploadPage } from "@/pages/Upload";
import { CleaningPage } from "@/pages/Cleaning";
import { TrainPage } from "@/pages/Train";
import { DashboardPage } from "@/pages/Dashboard";
import { PredictPage } from "@/pages/Predict";
import { LogsPage } from "@/pages/Logs";

export default function App() {
  return (
    <BrowserRouter>
      <AppDataProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<UploadPage />} />
            <Route path="/cleaning" element={<CleaningPage />} />
            <Route path="/train" element={<TrainPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/predict" element={<PredictPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AppDataProvider>
    </BrowserRouter>
  );
}
