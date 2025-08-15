import ballerina/http;
import backend.auth as _;

// Health check endpoint on port 9090
public listener  http:Listener healthListener = new (9090);


service / on healthListener {
    resource function get .() returns string {
        return "OK";
    }
}

