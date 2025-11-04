// const isProduction = process.env.NODE_ENV === 'production';
const isProduction = false;

const formatTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};


export const Logger = {
    log: (...args) => {
        if (!isProduction) {
            const modifiedArgs = args.map((arg, index) => index === 0 && typeof arg === 'string' ? `\n${arg}` : arg);
            
        }
    },
    error: (...args) => {
        if (!isProduction) {
            const modifiedArgs = args.map((arg, index) => index === 0 && typeof arg === 'string' ? `\n${arg}` : arg);
            console.error(`[ERROR] [${formatTime()}] `, ...modifiedArgs);
        }
    },
    warn: (...args) => {
        if (!isProduction) {
            const modifiedArgs = args.map((arg, index) => index === 0 && typeof arg === 'string' ? `\n${arg}` : arg);
            console.warn(`[WARN] [${formatTime()}]`, ...modifiedArgs);
        }
    },
    trace: (message) => {
        console.trace(`[TRACE] [${formatTime()}] ${message}`);
    }
};
