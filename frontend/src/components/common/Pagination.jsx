import { useMemo } from "react";

export default function Pagination({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(totalItems, currentPage * pageSize);

  if (totalItems <= pageSize) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-white/60">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        Showing {start}-{end} of {totalItems}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          disabled={currentPage === 1}
        >
          Prev
        </button>
        {pageNumbers.map((page, idx) => {
          const prev = pageNumbers[idx - 1];
          const needsGap = prev && page - prev > 1;
          return (
            <div key={page} className="flex items-center gap-2">
              {needsGap && <span className="text-slate-300 text-xs font-black">...</span>}
              <button
                onClick={() => onPageChange(page)}
                className={`w-9 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                  page === currentPage
                    ? "bg-slate-900 text-white border-slate-900"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            </div>
          );
        })}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
