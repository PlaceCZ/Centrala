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
    private _max_retries: number;
    private _max_lifetime_seconds: number;

    constructor(max_token_retries: number = 3, max_token_lifetime_seconds: number = 3600*10 ) {
        this._max_retries = max_token_retries;
        this._max_lifetime_seconds = max_token_lifetime_seconds;
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

        if ((moment().unix() - tok.addedAt) > this._max_lifetime_seconds || 
            tok.failedCount >= this._max_retries) {
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
