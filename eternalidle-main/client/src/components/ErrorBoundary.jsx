import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div style={{
                    padding: '20px',
                    color: '#fff',
                    background: '#1a1a1a',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    fontFamily: 'monospace'
                }}>
                    <h1 style={{ color: '#ff4444' }}>Something went wrong.</h1>
                    <p>Please take a screenshot of this and send it to support.</p>
                    <div style={{
                        background: '#000',
                        padding: '10px',
                        borderRadius: '5px',
                        marginTop: '20px',
                        maxWidth: '90%',
                        overflow: 'auto',
                        border: '1px solid #333',
                        textAlign: 'left'
                    }}>
                        <p style={{ color: '#ff8888', margin: 0 }}>{this.state.error && this.state.error.toString()}</p>
                        <details style={{ marginTop: '10px', whiteSpace: 'pre-wrap', cursor: 'pointer' }}>
                            <summary>Stack Trace</summary>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </details>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            background: '#444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Reload Game
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
