import TokenManager from "../Source/Tokman";
import * as jest from "jest"

test("addToken", () => { 
    let tm = new TokenManager();
    tm.addToken("test");
    expect(tm.nextToken()?.value).toBe("test");
})