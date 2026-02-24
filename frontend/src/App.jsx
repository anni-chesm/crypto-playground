import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Welcome from './pages/Welcome'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import BotDetail from './pages/BotDetail'
import Crypto from './pages/Crypto'
import Docs from './pages/Docs'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/bots/:id" element={
          <ProtectedRoute>
            <BotDetail />
          </ProtectedRoute>
        } />
        <Route path="/crypto" element={<Crypto />} />
        <Route path="/docs" element={<Docs />} />
      </Routes>
    </BrowserRouter>
  )
}
