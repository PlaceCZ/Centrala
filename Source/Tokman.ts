const moment = require('moment');

const ENABLE_LOG = true;

function log(...args: any[]){
    if(ENABLE_LOG) console.log("[TOKEN MANAGER] ", ...args);
}


class Token {
    value: string | null = null;
    addedAt: number;

    failedCount: number = 0;

    constructor(value: string) {
        this.value = value;
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

    addToken(token: string){
        let tok = new Token(token);
        tokenMemory.push(tok);
        log("Added new token: ", tok);
    }

    nextToken(): Token | null {
        let tok: Token | undefined = tokenMemory.shift();

        if (!tok) {
            log("Token memory empty")
            return null;
        }

        if ((moment().unix() - tok.addedAt) > this._maxLifetimeSeconds || 
            tok.failedCount >= this._maxRetries) {
            // token is not pushed back to array - removed
            log("Token removed: ", tok);
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
