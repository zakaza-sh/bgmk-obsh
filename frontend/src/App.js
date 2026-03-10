import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";

// Pages
import Login from "./pages/Login";
import FloorsList from "./pages/FloorsList";
import BlocksList from "./pages/BlocksList";
import BlockDetails from "./pages/BlockDetails";
import Transport from "./pages/Transport";
import Admin from "./pages/Admin";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <FloorsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/floor/:floor"
        element={
          <ProtectedRoute>
            <BlocksList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/floor/:floor/block/:block"
        element={
          <ProtectedRoute>
            <BlockDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transport"
        element={
          <ProtectedRoute>
            <Transport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="App">
          <AppRoutes />
          <Toaster position="top-center" richColors />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
