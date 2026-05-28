import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";

import Home from "./components/Home";
import Login from "./pages/LoginPage";

function AppLayout() {
  const location = useLocation();
  const hideNav = ["/login", "/register"].includes(location.pathname);

  return (
    <>
      {!hideNav && (
        <nav style={{ padding: "12px 24px", borderBottom: "1px solid #e5e4e7" }}>
          <Link to="/">Home</Link> |{" "}
          <Link to="/login">Login</Link>
        </nav>
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;