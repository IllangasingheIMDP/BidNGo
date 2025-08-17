import ballerina/http;
import backend.auth;
import backend.middleware as _;
import backend.user_service as user_service;
import backend.upload_service as upload_service;
// Health check endpoint on port 9090
public listener  http:Listener healthListener = new (9090);

final http:Service userService = user_service:UserService;
listener http:Listener apiListener = new (8080);
// Main

error? err1 = apiListener.attach(auth:AuthService, "/api/auth/");

error? err2 = apiListener.attach(user_service:UserService, "/api/users/");

error? err3 = apiListener.attach(upload_service:UploadService, "/api/uploads/");

service / on healthListener {
    resource function get .() returns string {
        return "OK";
    }
}

