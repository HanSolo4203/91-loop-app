'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, Bug, Mail } from 'lucide-react';
import Link from 'next/link';
import { AppError, ErrorCode, getUserFriendlyMessage, getErrorSuggestions, isAppError } from '@/lib/errors/custom-errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

/**
 * Error Boundary component for catching and handling React errors
 */
export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service (you can integrate with services like Sentry here)
    this.logErrorToService(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.children !== this.props.children) {
      if (resetOnPropsChange) {
        this.resetError();
      }
    }

    if (hasError && resetKeys && prevProps.resetKeys) {
      if (JSON.stringify(resetKeys) !== JSON.stringify(prevProps.resetKeys)) {
        this.resetError();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Here you can integrate with error reporting services like Sentry, LogRocket, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: 'anonymous' // You can get this from your auth context
    };

    // Example: Send to external service
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorReport)
    // }).catch(console.error);

    console.error('Error report:', errorReport);
  };

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  private handleRetry = () => {
    this.resetError();
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;
    const bugReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Open email client with pre-filled bug report
    const subject = encodeURIComponent(`Bug Report - Error ID: ${errorId}`);
    const body = encodeURIComponent(`
Error ID: ${errorId}
URL: ${window.location.href}
Time: ${new Date().toISOString()}

Error Details:
${JSON.stringify(bugReport, null, 2)}

Please describe what you were doing when this error occurred:
`);
    
    window.open(`mailto:support@rslexpress.co.za?subject=${subject}&body=${body}`);
  };

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <Card className="border-red-200">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                </div>
                <CardTitle className="text-xl text-red-800">
                  Something went wrong
                </CardTitle>
                <CardDescription className="text-red-600">
                  We&apos;re sorry, but something unexpected happened. Our team has been notified.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Error Details */}
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Error ID:</strong> {errorId}
                  </AlertDescription>
                </Alert>

                {/* User-friendly message */}
                <div className="text-center">
                  <p className="text-slate-700 mb-4">
                    {isAppError(error) ? getUserFriendlyMessage(error) : 'An unexpected error occurred. Please try again.'}
                  </p>
                  
                  {/* Suggestions */}
                  {isAppError(error) && (
                    <div className="text-left">
                      <h4 className="font-medium text-slate-900 mb-2">Try these steps:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                        {getErrorSuggestions(error).map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={this.handleRetry}
                    className="flex-1 flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Try Again</span>
                  </Button>
                  
                  <Button 
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="flex-1 flex items-center justify-center space-x-2"
                  >
                    <Home className="w-4 h-4" />
                    <span>Go Home</span>
                  </Button>
                </div>

                {/* Additional Actions */}
                <div className="flex justify-center space-x-4 pt-4 border-t border-slate-200">
                  <Button 
                    onClick={this.handleReportBug}
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-2 text-slate-600 hover:text-slate-900"
                  >
                    <Bug className="w-4 h-4" />
                    <span>Report Bug</span>
                  </Button>
                  
                  <Button 
                    onClick={this.handleReload}
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-2 text-slate-600 hover:text-slate-900"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reload Page</span>
                  </Button>
                </div>

                {/* Development Error Details */}
                {process.env.NODE_ENV === 'development' && error && (
                  <details className="mt-6">
                    <summary className="cursor-pointer text-sm font-medium text-slate-700 mb-2">
                      Development Error Details
                    </summary>
                    <div className="bg-slate-100 rounded-lg p-4 text-xs">
                      <div className="space-y-2">
                        <div>
                          <strong>Error:</strong> {error.message}
                        </div>
                        {error.stack && (
                          <div>
                            <strong>Stack:</strong>
                            <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                          </div>
                        )}
                        {errorInfo?.componentStack && (
                          <div>
                            <strong>Component Stack:</strong>
                            <pre className="whitespace-pre-wrap mt-1">{errorInfo.componentStack}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for programmatically triggering error boundary
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    // This will trigger the error boundary if called during render
    throw error;
  };
}

export default ErrorBoundary;
