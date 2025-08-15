
import ballerina/http;

listener http:Listener apiListener = new (8080);

service /api/auth on apiListener {
    resource function post login(http:Caller caller, http:Request req) returns error? {
        json body = check req.getJsonPayload();
        json res = check login(body);
        check caller->respond(res);
    }
}