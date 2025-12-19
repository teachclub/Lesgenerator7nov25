type Level = 'info' | 'warn' | 'error';

const kleur = {
  info: 'color: #3498db',
  warn: 'color: #f39c12',
  error: 'color: #e74c3c'
};

export function log(msg: string, data?: any, level: Level = 'info') {
  if (data) {
    console.log(`%c[${level.toUpperCase()}] ${msg}`, kleur[level], data);
  } else {
    console.log(`%c[${level.toUpperCase()}] ${msg}`, kleur[level]);
  }
}

export function warn(msg: string, data?: any) {
  log(msg, data, 'warn');
}

export function error(msg: string, data?: any) {
  log(msg, data, 'error');
}

