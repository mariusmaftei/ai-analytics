import React from "react";
import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext";
import RootLayout from "./components/RootLayout/RootLayout";
import HomePage from "./pages/home/HomePage";
import LoginPage from "./pages/login/LoginPage";
import AnalysisPage from "./pages/analysis/AnalysisPage";
import SessionPage from "./pages/session/SessionPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "home",
        element: <HomePage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "analysis",
        element: <AnalysisPage />,
      },
      {
        path: "session/:sessionId",
        element: <SessionPage />,
      },
    ],
  },
]);

function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  );
}

export default App;
