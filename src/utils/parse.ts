import { HttpError } from "./http-error";

const MAX_INT = 2_147_483_647;

export const parseInteger = (value: unknown, field: string, minimum = 0): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > MAX_INT) {
    throw new HttpError(400, `${field} harus berupa bilangan bulat antara ${minimum} dan ${MAX_INT}`);
  }
  return value;
};

export const parseId = (value: unknown): number => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new HttpError(400, "ID harus berupa bilangan bulat positif");
  }
  return parseInteger(Number(value), "ID", 1);
};

export const parsePagination = (query: Record<string, unknown>) => {
  const positiveInteger = (value: unknown, fallback: number, field: string): number => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^\d+$/.test(value)) {
      throw new HttpError(400, `${field} harus berupa bilangan bulat positif`);
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number <= 0) {
      throw new HttpError(400, `${field} harus berupa bilangan bulat positif`);
    }
    return number;
  };
  const page = positiveInteger(query.page, 1, "page");
  const limit = Math.min(positiveInteger(query.limit, 10, "limit"), 100);
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip) || skip > MAX_INT) {
    throw new HttpError(400, "Offset pagination terlalu besar");
  }
  return { page, limit, skip };
};

export const parseEnum = <T extends Record<string, string>>(
  value: unknown, values: T, field: string,
): T[keyof T] => {
  if (typeof value !== "string" || !Object.values(values).includes(value)) {
    throw new HttpError(400, `${field} harus salah satu dari: ${Object.values(values).join(", ")}`);
  }
  return value as T[keyof T];
};

export const parseBody = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpError(400, "Body harus berupa object JSON");
  }
  return value as Record<string, unknown>;
};

export const requiredText = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${field} wajib diisi dengan string tidak kosong`);
  }
  return value.trim();
};

export const parsePrice = (value: unknown, field: string): number | null => {
  if (value === undefined || value === null) return null;
  return parseInteger(value, field);
};
