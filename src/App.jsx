import { HashRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AgendaViewer from './components/AgendaViewer';
import EventBuilder from './components/EventBuilder';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/event/:eventId" element={<BuilderWrapper />} />
        <Route path="/agenda/:eventId" element={<ViewerWrapper />} />
      </Routes>
    </Router>
  );
}

// Wrappers to handle params
function BuilderWrapper() {
  const { eventId } = useParams();
  return <EventBuilder event={{ event_id: eventId }} onBack={() => window.history.back()} />;
}

function ViewerWrapper() {
  const { eventId } = useParams();
  return <AgendaViewer eventId={eventId} />;
}

export default App;
