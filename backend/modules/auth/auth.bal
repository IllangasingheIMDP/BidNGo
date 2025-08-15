
import ballerina/http;
import backend.middleware;
listener http:Listener apiListener = new (8080);

service /api/auth on apiListener {
    resource function post login(http:Caller caller, http:Request req) returns error? {
        json body = check req.getJsonPayload();
        json res = check login(body);
        check caller->respond(res);
    }
    resource function post register(http:Caller caller, http:Request req) returns error? {
        json body = check req.getJsonPayload();
        json res = check register(body);
        check caller->respond(res);
    }
    resource function get user_profile/[string email](http:Caller caller,http:Request req) returns error? {
        json|error result = middleware:validateJWT(req);
        if result is error {
            return result;
        }
        // Fetch user profile from the database or any other source
        json profile = check getUserProfile(email);
        check caller->respond(profile);
    }
}