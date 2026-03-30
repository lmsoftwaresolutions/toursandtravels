import NathkrupaReceiptLogo from "../../assets/nathkrupa-receipt-logo.jpeg";
import { COMPANY_ADDRESS, COMPANY_CONTACT, COMPANY_EMAIL, COMPANY_NAME } from "../../constants/company";

export default function BookingReceiptLayout({ children }) {
  return (
    <div className="w-full h-full border-[1.5px] border-black flex flex-col bg-white text-red-600 font-sans receipt-red-theme box-border overflow-hidden rounded-md">
      {/* Header spanning full width */}
      <div className="flex items-stretch border-b-[1.5px] border-black w-full bg-white print:bg-transparent print:shadow-none min-h-[90px]">
        {/* Left Half: Logo */}
        <div className="w-1/2 flex items-center justify-center p-3 border-r-[1.5px] border-black">
          <img src={NathkrupaReceiptLogo} alt="Nath Krupa Travels" className="max-h-[70px] w-auto object-contain" />
        </div>
        {/* Right Half: Address Details */}
        <div className="w-1/2 flex flex-col justify-center items-center text-center p-3">
          <div className="text-[14px] font-black text-black tracking-tight leading-snug">
            {COMPANY_ADDRESS}
          </div>
          <div className="text-[12px] font-black mt-1.5 tracking-tight text-black whitespace-nowrap">
            Phone: {COMPANY_CONTACT} | Email: {COMPANY_EMAIL}
          </div>
        </div>
      </div>
      
      {/* Body containing unified fields */}
      <div className="p-4 flex-grow flex flex-col bg-white">
        {children}
      </div>
    </div>
  );
}
