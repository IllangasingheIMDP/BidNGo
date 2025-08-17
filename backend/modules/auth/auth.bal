
import ballerina/http;
import backend.middleware;
import ballerina/io;



public http:Service AuthService = @http:ServiceConfig {} service object {

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
    resource function post driver_register_as_user(http:Caller caller, http:Request req) returns error? {
        json body = check req.getJsonPayload();
        json res = check driver_register_as_user(body);
        check caller->respond(res);
    }

    resource function post driver_complete_register(http:Caller caller, http:Request req) returns error? {
         json|error auth = middleware:validateJWT(req);
        if auth is error {
            check caller->respond({ "error": "UNAUTHORIZED" });
            return;
        }
        int id;
        if auth is map<json> {
            id = check auth["id"].ensureType(int);
        } else {
            check caller->respond({ "error": "AUTH_PARSE_ERROR" });
            return;
        }
        json body = check req.getJsonPayload();
        int user_id = check id.ensureType(int);
        io:println("User ID: ", user_id);
        json res = check complete_driver_registration(body, user_id);
        check caller->respond(res);
    }

};