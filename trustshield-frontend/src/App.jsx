import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Analyzer from "./pages/Analyzer";
import Results from "./pages/Results";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Profile from "./pages/Profile";


const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/analyze" element={<Analyzer />} />

        <Route path="/results/:id" element={<Results />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/history" element={<History />} />

        <Route path="/profile" element={<Profile />} />

        
      </Routes>
    </BrowserRouter>
  );
};

export default App;