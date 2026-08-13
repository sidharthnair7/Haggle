import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import LandingPage from './components/LandingPage'
import Workspace from './components/Workspace'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollProgressBar from './components/ScrollProgressBar'
import Preloader from './components/Preloader'
// import CustomCursor from './components/CustomCursor' // disabled — see below

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

/**
 * The workspace is a full-height tool, not a marketing page — a landing-page
 * footer under it just adds dead space below the three columns.
 */
function SiteFooter() {
  const { pathname } = useLocation()
  return pathname.startsWith('/workspace') ? null : <Footer />
}

/** Smooth scroll is for the landing page only. On /workspace it fights the
 *  inner overflow columns and makes the negotiation list feel sticky. */
function SmoothScroll() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname.startsWith('/workspace')) {
      window.__lenis = null
      return undefined
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    })

    const onTick = (time) => {
      lenis.raf(time * 1000)
    }

    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)
    window.__lenis = lenis

    return () => {
      gsap.ticker.remove(onTick)
      gsap.ticker.lagSmoothing(500)
      lenis.destroy()
      window.__lenis = null
    }
  }, [pathname])
  return null
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('React Error Boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'monospace', background: '#FAFAFA', color: '#08080F', minHeight: '100vh' }}>
          <h2 style={{ color: '#f43f5e', marginBottom: '16px' }}>Runtime Error</h2>
          <pre style={{ background: 'rgba(0,0,0,0.05)', padding: '16px', borderRadius: '8px', fontSize: '0.85rem', overflow: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [loaded, setLoaded] = useState(false);

  return (
    <ErrorBoundary>
      {/* Preloader */}
      {!loaded && <Preloader onComplete={() => setLoaded(true)} />}

      {/* Custom cursor disabled: it sets `body { cursor: none }`, so any render
          failure leaves the user with no pointer at all, and screen recorders
          composite the OS cursor separately — which shows up in a demo video as
          a missing or desynced cursor. Component kept for later. */}
      {/* <CustomCursor /> */}

      {/* Scroll progress bar */}
      <ScrollProgressBar />

      <Router>
        <SmoothScroll />
        <Navbar />
        <div>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/workspace" element={<Workspace />} />
          </Routes>
        </div>
        <SiteFooter />
      </Router>
    </ErrorBoundary>
  )
}

export default App

