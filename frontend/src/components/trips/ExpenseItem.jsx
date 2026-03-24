import React from "react";

export default function ExpenseItem({ expense, onUpdate, onRemove }) {
  return (
    <div className="flex gap-2 items-center animate-in fade-in slide-in-from-right-2 duration-300">
      <input
        type="text"
        placeholder="Expense Type (e.g. Food)"
        value={expense.expense_type}
        onChange={(e) => onUpdate("expense_type", e.target.value)}
        className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
      />
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
        <input
          type="number"
          placeholder="0.00"
          value={expense.amount}
          onChange={(e) => onUpdate("amount", e.target.value)}
          className="w-24 h-10 pl-7 pr-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
        />
      </div>
      <button 
        type="button"
        onClick={onRemove}
        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
  );
}
