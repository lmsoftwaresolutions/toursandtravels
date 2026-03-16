export const numberToWords = (num) => {
  if (num === 0) return "Zero";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertLessThanOneThousand = (n) => {
    let res = "";
    if (n >= 100) {
      res += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      res += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n >= 10) {
      res += teens[n - 10] + " ";
      n = 0;
    }
    if (n > 0) {
      res += ones[n] + " ";
    }
    return res;
  };

  let res = "";
  let n = Math.floor(num);

  if (n >= 10000000) {
    res += convertLessThanOneThousand(Math.floor(n / 10000000)) + "Crore ";
    n %= 10000000;
  }
  if (n >= 100000) {
    res += convertLessThanOneThousand(Math.floor(n / 100000)) + "Lakh ";
    n %= 100000;
  }
  if (n >= 1000) {
    res += convertLessThanOneThousand(Math.floor(n / 1000)) + "Thousand ";
    n %= 1000;
  }
  res += convertLessThanOneThousand(n);

  return res.trim() + " Only";
};
