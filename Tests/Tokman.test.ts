import TokenManager from "../Source/Tokman";
import * as jest from "jest"

test("addToken", () => { 
    let tm = new TokenManager();
    tm.addToken("testToken", "testSession");
    expect(tm.nextToken()?.value).toBe("testToken");
    expect(tm.nextToken()?.session).toBe("testSession");
})
