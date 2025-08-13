import ballerina/http;

// Shared listeners for all services in this package
listener http:Listener apiListener = new (8080);
listener http:Listener healthListener = new (9090);

// Simple health endpoint
service / on healthListener {
    resource function get ping() returns string {
        return "OK";
    }
}

