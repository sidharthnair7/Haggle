import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
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

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    // Connect Lenis to GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    // Store lenis instance on window for access from other components
    window.__lenis = lenis;

    return () => {
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);

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
        <Navbar />
        <div>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/workspace" element={<Workspace />} />
          </Routes>
        </div>
        <Footer />
      </Router>
    </ErrorBoundary>
  )
}

export default App

