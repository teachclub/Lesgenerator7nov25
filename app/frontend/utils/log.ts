// Bestand: app/frontend/utils/log.ts

export const log = (...args: any[]) => {
  console.log('🟢', ...args);
};

export const warn = (...args: any[]) => {
  console.warn('🟡', ...args);
};

export const error = (...args: any[]) => {
  console.error('🔴', ...args);
};

