export const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return "";
  const [datePart] = String(dateStr).split("T");
  const [year, month, day] = (datePart || "").split("-");
  if (!year || !month || !day) return String(dateStr);
  return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
};

export const MIN_REASONABLE_DATE = "1900-01-01";

export const getTodayISODate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const isReasonablePastOrTodayDate = (value) => {
  if (!value) return false;
  return value >= MIN_REASONABLE_DATE && value <= getTodayISODate();
};
