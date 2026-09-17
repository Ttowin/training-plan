import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MatrixRain } from "./components/MatrixRain.js";
import { GlobalNav } from "./components/GlobalNav.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { ActiveSessionPage } from "./pages/ActiveSessionPage.js";
import { HistoryPage } from "./pages/HistoryPage.js";
import { ProgressPage } from "./pages/ProgressPage.js";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="relative min-h-screen bg-matrix-bg text-matrix-green overflow-x-hidden">
          <MatrixRain opacity={0.12} />

          {/* Content layer sits above canvas */}
          <div className="relative z-10">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/session/:id" element={<ActiveSessionPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/progress" element={<ProgressPage />} />
            </Routes>

            <GlobalNav />
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
