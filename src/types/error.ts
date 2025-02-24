// src/types/error.ts
export interface AppError extends Error {
    status?: number;
  }