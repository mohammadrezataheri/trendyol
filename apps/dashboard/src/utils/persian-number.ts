/**
 * تبدیل اعداد انگلیسی به فارسی
 */
export function toPersianNumber(num: number | string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let str = String(num);
  
  for (let i = 0; i < englishDigits.length; i++) {
    str = str.replace(new RegExp(englishDigits[i], 'g'), persianDigits[i]);
  }
  
  return str;
}

/**
 * تبدیل اعداد فارسی به انگلیسی
 */
export function toEnglishNumber(str: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  for (let i = 0; i < persianDigits.length; i++) {
    str = str.replace(new RegExp(persianDigits[i], 'g'), englishDigits[i]);
  }
  
  return str;
}

/**
 * فرمت کردن اعداد با جداکننده هزارگان فارسی
 */
export function formatPersianNumber(num: number | string): string {
  const numStr = String(num);
  const persianNum = toPersianNumber(numStr);
  
  // اضافه کردن جداکننده هزارگان
  return persianNum.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
}

