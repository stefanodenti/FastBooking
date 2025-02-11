import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Login from './pages/Login';
import Storage from './pages/Storage';
import Appointments from './pages/Appointments';
import Users from './pages/Users';
import Groups from './pages/Groups';
import Profile from './pages/Profile';
import SharedProfile from './pages/SharedProfile';
import Dashboard from './pages/Dashboard';
import Documentation from './pages/Documentation';

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <ThemeProvider>
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors flex flex-col">
              <Navigation />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/storage" element={<Storage />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/groups" element={<Groups />} />
                  <Route path="/profile/:userId" element={<Profile />} />
                  <Route path="/profile/share/:token" element={<SharedProfile />} />
                  <Route path="/documentation" element={<Documentation />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </ThemeProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;