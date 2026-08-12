import { Component } from 'react'

// Catches any uncaught rendering error anywhere in the app and shows a
// calm, on-brand fallback instead of a blank white page. This is the
// safety net for genuinely unexpected bugs — individual pages should
// still handle their own known error cases (see friendlyError.js) rather
// than relying on this as the first line of defense.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Uncaught app error:', error, info)
  }

  handleTryAgain = () => {
    this.setState({ hasError: false })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 text-center">
          <img src="/logo.png" alt="" className="w-20 h-20 mb-6 opacity-90" />
          <h1 className="font-display font-bold text-xl text-ink mb-2">
            Something went wrong
          </h1>
          <p className="text-ink/60 max-w-sm mb-6">
            This page hit an unexpected problem. Nothing you did caused this —
            try again, or head back to Home.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleTryAgain}
              className="bg-forest text-canvas px-6 py-3 rounded-lg font-medium hover:bg-forest-dark"
            >
              Try Again
            </button>
            <button
              onClick={this.handleGoHome}
              className="border border-forest/30 text-forest px-6 py-3 rounded-lg font-medium hover:bg-canvas-2"
            >
              Go to Home
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
