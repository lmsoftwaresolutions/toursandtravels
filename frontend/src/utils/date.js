export const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return "";
  const [datePart] = String(dateStr).split("T");
  const [year, month, day] = (datePart || "").split("-");
  if (!year || !month || !day) return String(dateStr);
  return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
};

