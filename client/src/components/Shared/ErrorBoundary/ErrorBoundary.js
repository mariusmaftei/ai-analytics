import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle, faRedo } from "@fortawesome/free-solid-svg-icons";
import { errorLog } from "../../../utils/debugLogger";
import { logErrorToSentry } from "../../../utils/sentryConfig";
import styles from "./ErrorBoundary.module.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const componentName = this.props.componentName || "ErrorBoundary";
    
    errorLog(componentName, "Caught error:", error);
    errorLog(componentName, "Error info:", errorInfo);

    // Send to Sentry for error tracking
    logErrorToSentry(error, {
      tags: {
        component: componentName,
        errorBoundary: true,
      },
      extra: {
        componentName,
        errorInfo: errorInfo?.componentStack || errorInfo,
        props: this.props,
      },
      level: 'error',
    });

    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <div className={styles.errorBoundary}>
          <div className={styles.errorContent}>
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className={styles.errorIcon}
            />
            <h3 className={styles.errorTitle}>
              {this.props.title || "Something went wrong"}
            </h3>
            <p className={styles.errorMessage}>
              {this.props.message ||
                "An error occurred while processing this analysis. Please try again."}
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className={styles.errorDetails}>
                <summary>Error Details (Development Only)</summary>
                <pre className={styles.errorStack}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className={styles.errorActions}>
              <button
                onClick={this.handleReset}
                className={styles.retryButton}
                type="button"
              >
                <FontAwesomeIcon icon={faRedo} />
                Try Again
              </button>
              {this.props.onRetry && (
                <button
                  onClick={() => {
                    this.handleReset();
                    this.props.onRetry();
                  }}
                  className={styles.retryButton}
                  type="button"
                >
                  Reload Data
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

