import NathkrupaLogo from "../../assets/nathkrupa-logo.png";
import NathkrupaBus from "../../assets/nathkrupa-bus.png";
import { COMPANY_ADDRESS, COMPANY_CONTACT, COMPANY_EMAIL, COMPANY_NAME, COMPANY_WEB } from "../../constants/company";

export default function PrintLayout({ children, title }) {
  return (
    <div className="print-layout-container min-h-screen bg-white text-slate-900 font-sans relative">
      {/* Vertical Text on Far Right */}
      <div className="fixed right-2 top-1/2 -translate-y-1/2 vertical-text text-[60px] font-black text-slate-100/50 select-none no-print">
        NATH KRUPA
      </div>
      <div className="print:fixed print:right-[-40px] print:top-1/2 print:-translate-y-1/2 print:vertical-text print:text-[80px] print:font-black print:text-slate-100 print:opacity-30 print:block hidden uppercase">
        NATH KRUPA
      </div>

      <div className="max-w-4xl mx-auto px-6 print:px-2 print:py-0 relative z-10 flex flex-col min-h-0 print:min-h-0 print:h-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-red-600 pb-3 mb-6">
          <div className="flex flex-col items-start gap-1">
            <img src={NathkrupaLogo} alt="Logo" className="h-20 w-auto object-contain" />
            <div className="bg-yellow-50 px-2 py-0.5 rounded border border-yellow-100">
              <p className="text-[9px] font-bold text-red-600 uppercase italic">
                All type of Sleeper Coach and Seating busses available for marriage picnics and package tours
              </p>
            </div>
          </div>
          <div className="text-right text-[10px] font-bold space-y-0.5 text-slate-700">
            <div className="flex items-center justify-end gap-1">
              <span className="text-blue-600">📍</span>
              <span>{COMPANY_ADDRESS}</span>
            </div>
            <div className="flex items-center justify-end gap-1 font-black">
              <span className="text-blue-600">☎️</span>
              <span>Ph.: {COMPANY_CONTACT.split('/')[0]}</span>
            </div>
            <div className="flex items-center justify-end gap-1 font-black">
              <span className="text-blue-600">📱</span>
              <span>Mob.: {COMPANY_CONTACT.split('Mob.:')[1]?.trim() || "95 95 95 0 930"}</span>
            </div>
            <div className="flex items-center justify-end gap-1">
              <span className="text-blue-600">✉️</span>
              <span>Email: {COMPANY_EMAIL}</span>
            </div>
            <div className="flex items-center justify-end gap-1">
              <span className="text-blue-600">🌐</span>
              <span>Web : {COMPANY_WEB}</span>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="content-area flex-grow">
          {children}
        </div>

        {/* Footer */}
        <div className="mt-8 print:mt-4 flex justify-between items-end border-t border-slate-100 pt-4 print:pt-2 pb-2">
          <div className="w-1/4 opacity-90">
             <img src={NathkrupaBus} alt="Bus" className="w-full h-auto object-contain" />
          </div>
          <div className="text-right">
            <div className="flex flex-col items-end mb-8">
               <div className="w-40 border-b border-slate-300 mb-1 h-8"></div>
               <p className="text-[10px] font-black uppercase text-blue-900 tracking-widest">Authorized Signatory</p>
            </div>
            <div className="flex flex-col items-end">
               <div className="font-extrabold text-blue-800 text-sm uppercase tracking-tighter">=NATH KRUPA TRAVELS</div>
               <div className="text-[8px] font-bold text-slate-400 -mt-0.5">PREMIUM TRAVEL SOLUTIONS</div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .vertical-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          letter-spacing: 0.2em;
        }
        @media print {
          @page {
            size: A4;
            margin: 5mm 10mm 5mm 10mm;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-layout-container {
            min-height: auto !important;
            transform: scale(0.94);
            transform-origin: top left;
            width: calc(100% / 0.94);
          }
          .no-print {
            display: none !important;
          }
          .content-area {
            min-height: auto !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
  );
}
