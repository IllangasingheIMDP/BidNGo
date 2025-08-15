
import ballerina/http;



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
   
};