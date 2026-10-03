export function formatCurrency(minor: number): string {
  const isNegative = minor < 0;
  const absMinor = Math.abs(minor);
  const rupees = Math.floor(absMinor / 100);
  const paise = absMinor % 100;
  const formatted = `₹${rupees.toLocaleString('en-IN')}.${paise.toString().padStart(2, '0')}`;
  return isNegative ? `-${formatted}` : formatted;
}

export function minorToAmountString(minor: number): string {
  const abs = Math.abs(minor);
  const intPart = Math.floor(abs / 100);
  const decPart = abs % 100;
  return `${intPart}.${decPart.toString().padStart(2, '0')}`;
}

export function amountStringToMinor(amountStr: string): number {
  const num = parseFloat(amountStr);
  if (isNaN(num) || num < 0) return 0;
  return Math.round(num * 100);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  return formatDate(dateStr);
}
