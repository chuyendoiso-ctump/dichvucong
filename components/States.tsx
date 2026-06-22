interface EmptyStateProps {
  icon?: string;
  title?: string;
  description?: string;
}

export function EmptyState({
  icon = "📭",
  title = "Không có dữ liệu",
  description = "Vui lòng kiểm tra lại điều kiện lọc hoặc kết nối Internet",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-slate-200/80">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm">{description}</p>
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Có lỗi xảy ra khi tải dữ liệu",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-red-50 border border-red-100 rounded-2xl">
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-3xl mb-4">
        ❌
      </div>
      <h3 className="text-lg font-semibold text-red-900 mb-2">{message}</h3>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-6 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition shadow-sm"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
