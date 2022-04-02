import * as fs from 'fs';

enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

class Logger { 
    private WriteStream: NodeJS.WritableStream;
    /**
     *
     */
    constructor(LoggingFile: string) {
        this.WriteStream = fs.createWriteStream(LoggingFile, { flags: 'a' });
    }

    private LogToFile(message: string, level: LogLevel) { 
        const Level = EnumToString(level);
        const ConsoleMessage = `[${Level}] [${new Date().toISOString()}] ${message}`;
        this.WriteStream.write(ConsoleMessage + "\n");
    } 

    public Log(message: string, level: LogLevel) { 
        this.LogToFile(message, level);
        const Level = EnumToString(level);
        const ConsoleMessage = `[${Level}] [${new Date().toISOString()}] ${message}`;
        process.stdout.write(ConsoleMessage + '\n');
    }
}

function EnumToString(input: LogLevel): string { 
    switch (input) {
        case LogLevel.DEBUG:
            return "DEBUG";
        case LogLevel.INFO:
            return "INFO";
        case LogLevel.WARN:
            return "WARN";
        case LogLevel.ERROR:
            return "ERROR";
    }
}


export default Logger;
export { LogLevel };