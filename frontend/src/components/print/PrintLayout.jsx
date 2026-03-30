import NathkrupaBus from "../../assets/nathkrupa-bus.png";
import NathkrupaReceiptLogo from "../../assets/nathkrupa-receipt-logo.jpeg";
import { COMPANY_ADDRESS, COMPANY_CONTACT, COMPANY_EMAIL } from "../../constants/company";

export default function PrintLayout({ children, title }) {
  return (
    <div className="print-layout-container min-h-screen bg-slate-50 text-black font-sans relative p-4 print:p-0">
      <div className="w-full border-[1.5px] border-black flex flex-col bg-white text-black font-sans box-border overflow-hidden rounded-md min-h-[90vh] print:min-h-0 print:h-auto shadow-sm print:shadow-none">
        
        {/* Header spanning full width */}
        <div className="flex items-stretch border-b-[1.5px] border-black w-full bg-white print:bg-transparent print:shadow-none min-h-[90px]">
          {/* Left Half: Logo */}
          <div className="w-1/2 flex items-center justify-center p-3 border-r-[1.5px] border-black">
            <img src={NathkrupaReceiptLogo} alt="Nath Krupa Travels" className="max-h-[70px] w-auto object-contain" />
          </div>
          {/* Right Half: Address Details */}
          <div className="w-1/2 flex flex-col justify-center items-center text-center p-3 text-red-600">
            <div className="text-[14px] font-black tracking-tight leading-snug">
              {COMPANY_ADDRESS}
            </div>
            <div className="text-[12px] font-black mt-1.5 tracking-tight whitespace-nowrap">
              Phone: {COMPANY_CONTACT} | Email: {COMPANY_EMAIL}
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="content-area flex-grow flex flex-col pt-6 px-4 pb-2">
          {children}

          {/* Footer Signatures */}
          <div className="flex justify-between items-end mt-auto pt-12 pb-4 text-red-600 w-full break-inside-avoid">
            <div className="flex items-center justify-start h-[60px] w-[180px]">
              <img src={NathkrupaBus} alt="Bus" className="h-[50px] object-contain opacity-80" />
            </div>
            <div className="flex flex-col items-center justify-end h-[60px] w-[180px]">
              <span className="text-[12px] font-bold uppercase drop-shadow-sm border-t-[1.5px] border-black border-dashed w-full text-center pt-1.5 text-black">Customer Signature</span>
            </div>
            <div className="flex flex-col items-center justify-end h-[60px] w-[180px]">
              <span className="text-[12px] font-bold uppercase drop-shadow-sm border-t-[1.5px] border-black border-dashed w-full text-center pt-1.5 text-black">Authorized Signatory</span>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin: 5mm 5mm 5mm 5mm;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-layout-container {
            min-height: auto !important;
            padding: 0 !important;
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
