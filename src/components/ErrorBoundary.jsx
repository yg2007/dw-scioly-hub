import { Component } from "react";
import { C } from "../ui";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 40, textAlign: "center", fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{
            maxWidth: 480, margin: "0 auto", background: "#FEF2F2",
            borderRadius: 16, padding: 32, border: "1px solid #FECACA",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#991B1B", marginBottom: 8 }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 14, color: "#7F1D1D", marginBottom: 20 }}>
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => this.setState({ error: null, errorInfo: null })}
              style={{
                padding: "12px 24px", borderRadius: 10, border: "none",
                background: C.navy, color: "white", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
