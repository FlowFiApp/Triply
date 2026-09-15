"use client";

import { Clipboard } from "@nimiq/utils/clipboard";
import { FormattableNumber } from "@nimiq/utils/formattable-number";
import { ValidationUtils } from "@nimiq/utils/validation-utils";

export function normalizeNimiqAddress(address?: string): string | undefined {
  if (!address) return undefined;
  try {
    const normalized = ValidationUtils.normalizeAddress(address);
    return normalized || address;
  } catch {
    return address;
  }
}

export function isValidNimiqAddress(address?: string): boolean {
  if (!address) return false;
  try {
    return ValidationUtils.isValidAddress(address);
  } catch {
    return false;
  }
}

export function copyText(text: string): boolean {
  try {
    return Clipboard.copy(text);
  } catch {
    return false;
  }
}

export function copyNimiqAddress(address?: string): boolean {
  const normalized = normalizeNimiqAddress(address);
  return normalized ? copyText(normalized) : false;
}

export function formatAmount(value: number, maxDecimals = 2): string {
  try {
    return new FormattableNumber(String(value)).toString({
      maxDecimals,
      useGrouping: true,
    });
  } catch {
    return value.toFixed(maxDecimals);
  }
}

/** Formats NIM points: whole numbers without decimals, fractions with one. */
export function formatNim(value: number): string {
  return Number.isInteger(value) ? formatAmount(value, 0) : formatAmount(value, 1);
}