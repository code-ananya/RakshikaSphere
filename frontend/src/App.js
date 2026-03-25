import {BrowserRouter as Router, Route, Routes} from 'react-router-dom'
import { Toaster } from 'react-hot-toast';
import './App.css';
import { DarkModeProvider } from './context/DarkModeContext';
import "./styles/darkmode.css";
import NotFound from './Components/Errors/404';
import Home from './pages/Home'
import Profile from './pages/Profile';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Emergency from './pages/Emergency';
import Report from './pages/Report';
import Dashboard from './pages/Dashboard';
import Incident from './pages/IncidentReport'
import CloseFile from './pages/CloseFile'
import AboutUs2 from './pages/AboutUs2';
import ContactUs from './Components/ContactUs';
import ChatScreen from './pages/ChatScreen'
import HeroCaro from './pages/HeroCaro';
import DangerZoneMap from './pages/DangerZoneMap';
import IncidentClassifier from "./pages/IncidentClassifier";
import SafeRoute from "./pages/SafeRoute";
import ViolenceDetector from "./pages/ViolenceDetector";
import FakeCall from "./pages/FakeCall";
import SOS from "./pages/SOS";
import SafePlaces from "./pages/SafePlaces";
import LiveLocation from "./pages/LiveLocation";
import VoiceSOS from "./pages/VoiceSOS";
import SafeWalk from "./pages/SafeWalk";
import SafetyDashboard from "./pages/SafetyDashboard";
import EmotionDetection from "./pages/EmotionDetection";
import ScreamDetection from "./pages/ScreamDetection";

function App() {
  return (
    <DarkModeProvider>
      <Router>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/caro' element={<HeroCaro />} />
          <Route path='/about' element={<AboutUs2 />} />
          <Route path='/*' element={<NotFound/>} />
          <Route path='/dashboard/profile' element={<Profile/>} />
          <Route path='/contact' element={<ContactUs/>} />
          <Route path='/login' element={<Login/>} />
          <Route path='/register' element={<Register/>} />
          <Route path='/report' element={<Report/>} />
          <Route path='/emergency' element={<Emergency/>} />
          <Route path='/dashboard' element={<Dashboard/>} />
          <Route path='/incident' element={<Incident/>} />
          <Route path='/closedreport' element={<CloseFile/>} />
          <Route path='/chat' element={<ChatScreen/>} />
          <Route path="/dangerzones" element={<DangerZoneMap />} />
          <Route path="/classifier" element={<IncidentClassifier />} />
          <Route path="/saferoute" element={<SafeRoute />} />
          <Route path="/violence" element={<ViolenceDetector />} />
          <Route path="/fakecall" element={<FakeCall />} />
          <Route path="/sos" element={<SOS />} />
          <Route path="/safeplaces" element={<SafePlaces />} />
          <Route path="/live-location" element={<LiveLocation />} />
          <Route path="/voice-sos" element={<VoiceSOS />} />
          <Route path="/safe-walk" element={<SafeWalk />} />
          <Route path="/analytics" element={<SafetyDashboard />} />
          <Route path="/emotion-sos" element={<EmotionDetection />} />
<Route path="/scream-sos" element={<ScreamDetection />} />
        </Routes>
        <Toaster />
      </Router>
    </DarkModeProvider>
  );
}

export default App;
