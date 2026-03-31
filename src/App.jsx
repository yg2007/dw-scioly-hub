import { useState } from 'react';
import { C } from './ui';
import {
  LoginScreen,
  GuestBrowsePage,
  Sidebar,
  StudentDashboard,
  EventsListPage,
  EventDetailPage,
  QuizPage,
  TestUploadPage,
  StudyPathPage,
  PartnerSynergyPage,
  CoachDashboard,
  SchedulePage,
  BuildLogPage,
  TeamManagement,
  PartnershipManagement,
  StudentCapabilityMatrix,
  ErrorBoundary,
} from './components';
import { STUDENTS } from './data/mockData';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("student"); // student | coach | admin
  const [currentUser] = useState(STUDENTS[0]);
  const [page, setPage] = useState("dashboard");
  const [selectedEvent, setSelectedEvent] = useState(null);

  if (!loggedIn) {
    return <LoginScreen onLogin={(role) => { setLoggedIn(true); setUserRole(role); if (role === "guest") setPage("guest"); }} />;
  }

  const navigate = (p, ev) => {
    setPage(p);
    setSelectedEvent(ev || null);
  };

  // Guest mode — standalone browse-only experience
  if (userRole === "guest") {
    return <GuestBrowsePage onSignIn={() => { setLoggedIn(false); setUserRole("student"); setPage("dashboard"); }} />;
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: C.offWhite, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <Sidebar page={page} navigate={navigate} userRole={userRole} currentUser={currentUser}
        onLogout={() => { setLoggedIn(false); setPage("dashboard"); }} />
      <main style={{ flex: 1, overflow: "auto", padding: "28px 36px" }}>
       <ErrorBoundary>
        {page === "dashboard" && userRole === "student" && (
          <StudentDashboard user={currentUser} navigate={navigate} />
        )}
        {page === "dashboard" && (userRole === "coach" || userRole === "admin") && (
          <CoachDashboard navigate={navigate} isAdmin={userRole === "admin"} />
        )}
        {page === "events" && !selectedEvent && (
          <EventsListPage user={currentUser} navigate={navigate} userRole={userRole} />
        )}
        {page === "events" && selectedEvent && (
          <EventDetailPage event={selectedEvent} user={currentUser} navigate={navigate}
            onStartQuiz={() => setPage("quiz")} onUploadTest={() => setPage("upload")} />
        )}
        {page === "quiz" && (
          <QuizPage event={selectedEvent} user={currentUser} navigate={navigate} />
        )}
        {page === "upload" && (
          <TestUploadPage event={selectedEvent} user={currentUser} navigate={navigate} />
        )}
        {page === "studypath" && (
          <StudyPathPage event={selectedEvent} user={currentUser} navigate={navigate} />
        )}
        {page === "partners" && (
          <PartnerSynergyPage user={currentUser} navigate={navigate} />
        )}
        {page === "buildlog" && (
          <BuildLogPage event={selectedEvent} user={currentUser} navigate={navigate} />
        )}
        {page === "schedule" && (
          <SchedulePage navigate={navigate} userRole={userRole} />
        )}
        {page === "capability" && (userRole === "coach" || userRole === "admin") && (
          <StudentCapabilityMatrix navigate={navigate} />
        )}
        {page === "pairings" && (userRole === "coach" || userRole === "admin") && (
          <PartnershipManagement navigate={navigate} />
        )}
        {page === "team" && userRole === "admin" && (
          <TeamManagement navigate={navigate} />
        )}
       </ErrorBoundary>
      </main>
    </div>
  );
}
