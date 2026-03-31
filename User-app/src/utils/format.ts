export const digitsOnly = (input: string): string => input.replace(/\D/g, '');

export const formatMaskedIndianPhone = (phone: string): string => {
  const digits = digitsOnly(phone).slice(0, 10);
  if (digits.length < 4) {
    return `+91 ${digits}`;
  }

  const firstTwo = digits.slice(0, 2);
  const lastFour = digits.slice(-4);
  return `+91 ${firstTwo}****${lastFour}`;
};
