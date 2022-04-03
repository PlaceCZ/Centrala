import * as fs from 'fs';
import moment from "moment";


enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

class Logger { 
    public static Instance: Logger;

    private WriteStream: fs.WriteStream;
    /**
     *
     */
    constructor(LoggingFile: string) {
        this.WriteStream = fs.createWriteStream(LoggingFile, { flags: 'a' });
        Logger.Instance = this;
    }

    private LogToFile(message: string, level: LogLevel) { 
        const Level = EnumToString(level);
        const FileMessage = `[${Level}] [${moment().format("DD/HH:MM:SS")}] ${message}`;
        this.WriteStream.write(FileMessage + "\n");
    } 

    public Log(message: string, level: LogLevel) { 
        this.LogToFile(message, level);
        const Level = EnumToString(level);
        const ConsoleMessage = `[${Level}] [${moment().format(
            "DD/HH:MM:SS"
        )}] ${message}`;
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