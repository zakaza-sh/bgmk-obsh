import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TelegramProvider } from "./context/TelegramContext";
import { Toaster } from "./components/ui/sonner";

// Pages
import Login from "./pages/Login";
import FloorsList from "./pages/FloorsList";
import BlocksList from "./pages/BlocksList";
import BlockDetails from "./pages/BlockDetails";
import Transport from "./pages/Transport";
import Admin from "./pages/Admin";

// Protected Route Component - only for admin pages
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<FloorsList />} />
      <Route path="/floor/:floor" element={<BlocksList />} />
      <Route path="/floor/:floor/block/:block" element={<BlockDetails />} />
      <Route path="/transport" element={<Transport />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Admin />
          </AdminRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <TelegramProvider>
        <AuthProvider>
          <div className="App">
            <AppRoutes />
            <Toaster position="top-center" richColors />
          </div>
        </AuthProvider>
      </TelegramProvider>
    </BrowserRouter>
  );
}

export default App;
