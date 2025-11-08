import React from "react";
import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext";
import RootLayout from "./components/RootLayout/RootLayout";
import HomePage from "./pages/home/HomePage";
import AnalysisPage from "./pages/analysis/AnalysisPage";
import SessionPage from "./pages/session/SessionPage";
import ComingSoonPage from "./pages/comingsoon/ComingSoonPage";
import NotFoundPage from "./pages/notfound/NotFoundPage";

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
        path: "features",
        element: <ComingSoonPage />,
      },
      {
        path: "pricing",
        element: <ComingSoonPage />,
      },
      {
        path: "login",
        element: <ComingSoonPage />,
      },
      {
        path: "analysis",
        element: <AnalysisPage />,
      },
      {
        path: "session/:sessionId",
        element: <SessionPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
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
