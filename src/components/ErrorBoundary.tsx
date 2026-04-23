// ============================================================
// ErrorBoundary — Bắt lỗi React không mong muốn
// Ngăn app crash trắng xóa, hiển thị UI phục hồi
// ============================================================

import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
            {/* Icon lỗi */}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <span className="text-3xl">⚠️</span>
            </div>

            <h1 className="mb-2 text-xl font-bold text-foreground">
              Đã xảy ra lỗi
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Ứng dụng gặp sự cố không mong muốn. Vui lòng thử lại hoặc quay
              về trang chính.
            </p>

            {/* Chi tiết lỗi (chỉ hiện trong development) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 rounded-lg bg-muted/50 p-4 text-left">
                <p className="text-xs font-mono text-destructive break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Nút hành động */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 active:scale-[0.98]"
              >
                Thử lại
              </button>
              <button
                onClick={this.handleGoHome}
                className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
              >
                Về trang chính
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
