import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AuthGuard } from "./components/AuthGuard";
import { DashboardPage } from "./pages/DashboardPage";
import { UploadVideoPage } from "./pages/UploadVideoPage";
import { VideoListPage } from "./pages/VideoListPage";
import { VideoDetailPage } from "./pages/VideoDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <AuthGuard>
            <DashboardPage />
          </AuthGuard>
        }
      />
      <Route
        path="/upload-video"
        element={
          <AuthGuard>
            <UploadVideoPage />
          </AuthGuard>
        }
      />
      <Route
        path="/manage-videos"
        element={
          <AuthGuard>
            <VideoListPage />
          </AuthGuard>
        }
      />
      <Route
        path="/videos/:id"
        element={
          <AuthGuard>
            <VideoDetailPage />
          </AuthGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
