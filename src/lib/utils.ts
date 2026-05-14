import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge tailwind classes safely, with later values winning over earlier ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a German phone number for `tel:` links — strips spaces and parens. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** Build a wa.me URL with prefilled text. */
export function whatsappHref(phone: string, text?: string): string {
  const num = phone.replace(/[^\d]/g, '');
  const t = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${num}${t}`;
}
