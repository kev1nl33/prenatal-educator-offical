import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "@/pages/Home";
import FeatureFlags from "@/pages/FeatureFlags";
import ApiDebug from "@/pages/ApiDebug";
import DebugLogs from "@/pages/DebugLogs";
import Dashboard from "@/pages/Dashboard";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings/feature-flags" element={<FeatureFlags />} />
        <Route path="/debug/api" element={<ApiDebug />} />
        <Route path="/api-debug" element={<Navigate to="/debug/api" replace />} />
        <Route path="/debug/logs" element={<DebugLogs />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
      </Routes>
    </Router>
  );
}
