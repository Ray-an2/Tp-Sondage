import { BrowserRouter, Route, Routes } from "react-router-dom";

import Index from "./pages/index.tsx";
import Poll from "./pages/poll.tsx";
import Login from "./pages/login.tsx";
import Register from "./pages/register.tsx";
import UserPage from "./pages/user.tsx";
import { AuthProvider } from "./contexts/AuthProvider.tsx";
import { RestrictedRoute } from "./routes/restrictedRoute.tsx";
import CreatePoll from "./pages/createPoll.tsx";
import PollResults from "./pages/pollResults.tsx";
import "./css/global.css";
import "./css/App.css";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/polls/:selectedPoll" element={<Poll />} />
                    <Route path="/polls/:selectedPoll/results" element={<PollResults />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/polls/new"
                        element={
                            <RestrictedRoute>
                                <CreatePoll />
                            </RestrictedRoute>
                        }
                    />
                    <Route
                        path="/me"
                        element={
                            <RestrictedRoute>
                                <UserPage />
                            </RestrictedRoute>
                        }
                    />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
export default App;
