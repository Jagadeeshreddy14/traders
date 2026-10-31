type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const formatLog = (level: LogLevel, message: string, meta?: any) => {
  const timestamp = new Date().toISOString();
  const metaString = meta ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
};

export const logger = {
  info: (message: string, meta?: any) => {
    console.log(formatLog('info', message, meta));
  },
  warn: (message: string, meta?: any) => {
    console.warn(formatLog('warn', message, meta));
  },
  error: (message: string, meta?: any) => {
    console.error(formatLog('error', message, meta));
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatLog('debug', message, meta));
    }
  },
};
