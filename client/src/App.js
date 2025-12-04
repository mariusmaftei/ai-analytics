import React from "react";
import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext";
import RootLayout from "./components/RootLayout/RootLayout";
import HomePage from "./pages/home/HomePage";
import AnalysisPage from "./pages/analysis/AnalysisPage";
import SessionPage from "./pages/session/SessionPage";
import AuthPage from "./pages/auth/AuthPage";
import ComingSoonPage from "./pages/comingsoon/ComingSoonPage";
import NotFoundPage from "./pages/notfound/NotFoundPage";

const routes = [
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
        element: <AuthPage />,
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
];

const router = createBrowserRouter(routes, {
  future: {
    v7_startTransition: true,
  },
});

function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  );
}

export default App;
