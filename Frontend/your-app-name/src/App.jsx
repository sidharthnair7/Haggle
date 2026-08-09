import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import Workspace from './components/Workspace'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

function App() {
  return (
    <Router>
      <Navbar />
      <div> {/* Space for sticky nav removed so background reaches top */}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/workspace" element={<Workspace />} />
        </Routes>
      </div>
      <Footer />
    </Router>
  )
}

export default App
