import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PasswordProvider } from './context/PasswordContext';
import { VideoCallProvider } from './context/VideoCallContext';
import { Toaster } from 'react-hot-toast';


// Layouts
import { DashboardLayout } from './components/layout/DashboardLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Dashboard Pages
import { EntrepreneurDashboard } from './pages/dashboard/EntrepreneurDashboard';
import { InvestorDashboard } from './pages/dashboard/InvestorDashboard';
import { DashboardRedirect } from './components/dashboard/DashboardRedirect';

// Profile Pages
import { EntrepreneurProfile } from './pages/profile/EntrepreneurProfile';
import { InvestorProfile } from './pages/profile/InvestorProfile';
import { EditProfilePage } from './pages/profile/EditProfilePage';
import { MyPortfolio } from './pages/profile/MyPortfolio';

// Feature Pages
import { InvestorsPage } from './pages/investors/InvestorsPage';
import { EntrepreneursPage } from './pages/entrepreneurs/EntrepreneursPage';
import { MessagesPage } from './pages/messages/MessagesPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { HelpPage } from './pages/help/HelpPage';
import { DealsPage } from './pages/deals/DealsPage';
import { MeetingsPage } from './pages/meetings/MeetingsPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';

// Chat Pages
import { ChatPage } from './pages/chat/ChatPage';

// Video Call Pages
import { VideoCallRoom } from './components/video/VideoCallRoom';
import { VideoCallsPage } from './pages/video/VideoCallsPage';

function App() {
  return (
    <AuthProvider>
      <PasswordProvider>
        <VideoCallProvider>
          <Router>
            <Toaster position="top-right" />
        <Routes>
          {/* Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardRedirect />} />
            <Route path="entrepreneur" element={<EntrepreneurDashboard />} />
            <Route path="investor" element={<InvestorDashboard />} />
          </Route>
          
          {/* Profile Routes */}
          <Route path="/profile" element={<DashboardLayout />}>
            <Route path="entrepreneur/:id" element={<EntrepreneurProfile />} />
            <Route path="investor/:id" element={<InvestorProfile />} />
            <Route path="edit" element={<EditProfilePage />} />
          </Route>
          
          <Route path="/my-portfolio" element={<DashboardLayout />}>
            <Route index element={<MyPortfolio />} />
          </Route>
          
          {/* Feature Routes */}
          <Route path="/investors" element={<DashboardLayout />}>
            <Route index element={<InvestorsPage />} />
          </Route>
          
          <Route path="/entrepreneurs" element={<DashboardLayout />}>
            <Route index element={<EntrepreneursPage />} />
          </Route>
          
          <Route path="/messages" element={<DashboardLayout />}>
            <Route index element={<MessagesPage />} />
          </Route>
          
          <Route path="/notifications" element={<DashboardLayout />}>
            <Route index element={<NotificationsPage />} />
          </Route>
          
          <Route path="/documents" element={<DashboardLayout />}>
            <Route index element={<DocumentsPage />} />
          </Route>
          
          <Route path="/settings" element={<DashboardLayout />}>
            <Route index element={<SettingsPage />} />
          </Route>
          
          <Route path="/help" element={<DashboardLayout />}>
            <Route index element={<HelpPage />} />
          </Route>
          
          <Route path="/deals" element={<DashboardLayout />}>
            <Route index element={<DealsPage />} />
          </Route>
          
          <Route path="/payments" element={<DashboardLayout />}>
            <Route index element={<PaymentsPage />} />
          </Route>
          
          <Route path="/meetings" element={<DashboardLayout />}>
            <Route index element={<MeetingsPage />} />
          </Route>
          
          <Route path="/video-calls" element={<DashboardLayout />}>
            <Route index element={<VideoCallsPage />} />
          </Route>
          
          {/* Chat Routes */}
          <Route path="/chat" element={<DashboardLayout />}>
            <Route index element={<ChatPage />} />
            <Route path=":userId" element={<ChatPage />} />
          </Route>
          
          {/* Video Call Routes */}
          <Route path="/video-call/:roomId" element={<VideoCallRoom />} />
          
          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Catch all other routes and redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
          </Router>
        </VideoCallProvider>
      </PasswordProvider>
    </AuthProvider>
  );
}

export default App;