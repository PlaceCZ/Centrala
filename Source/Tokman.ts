import Logger, { LogLevel } from "./Logger";
import moment from 'moment';

const ENABLE_LOG = true;

const log = Logger.Instance ? Logger.Instance.Log : (arg: string, level: LogLevel) => { 
    console.log(`[${moment().format()}] ${arg}`);
}

class Token {
    value: string | null = null;
    session: string;
    addedAt: number;

    failedCount: number = 0;

    constructor(value: string, session: string) {
        this.value = value;
        this.session = session;
        this.addedAt = moment().unix();
    }
}

let tokenMemory: Token[] = [];


class TokenManager
{
    private _maxRetries: number;
    private _maxLifetimeSeconds: number;

    constructor(maxTokenRetries: number = 3, maxTokenLifetimeSeconds: number = 3600*10 ) {
        this._maxRetries = maxTokenRetries;
        this._maxLifetimeSeconds = maxTokenLifetimeSeconds;
    }

    addToken(token: string, session: string){
        let tok = new Token(token, session);
        tokenMemory.push(tok);
        log("Added new token: " + tok, LogLevel.INFO);
    }

    nextToken(): Token | null {
        let tok: Token | undefined = tokenMemory.shift();

        if (!tok) {
            log("Token memory empty", LogLevel.WARN);
            return null;
        }

        if ((moment().unix() - tok.addedAt) > this._maxLifetimeSeconds || 
            tok.failedCount >= this._maxRetries) {
            // token is not pushed back to array - removed
            log("Token removed: " + tok, LogLevel.INFO);
            return this.nextToken();
        }

        tokenMemory.push(tok);
        return tok || null;
    }

    loadSavedState(filename: string) {
    }

    saveState(filename: string) {
    }
}

export default TokenManager;
export { Token };