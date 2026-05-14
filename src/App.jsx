import { useState } from "react";

import { AcademicMobileApp } from "./components/AcademicMobileApp.jsx";
import { AuthFlow } from "./components/AuthFlow.jsx";
import { useAcademicDashboard } from "./hooks/useAcademicDashboard.js";
import initialAcademicHistory from "./data/mock-academic-history.json";

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [academicHistory, setAcademicHistory] = useState(initialAcademicHistory);
  const dashboard = useAcademicDashboard(academicHistory);

  if (!authenticated) {
    return <AuthFlow onAuthenticated={() => setAuthenticated(true)} />;
  }

  return (
    <AcademicMobileApp
      dashboard={dashboard}
      academicHistory={academicHistory}
      fallbackAcademicHistories={[initialAcademicHistory]}
      onAcademicHistoryLoaded={setAcademicHistory}
    />
  );
}
