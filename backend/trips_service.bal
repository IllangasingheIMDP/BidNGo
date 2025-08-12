import ballerina/http;
import ballerina/io;
import .auth_service;

service / on new http:Listener(9090) {
    resource function get / () returns string {
        return "Hello, World!";
    }
}

service auth_service on new http:Listener(8080) {
    // This service is defined in auth_service.bal
}



import .users_service;

service users_service on new http:Listener(8080) {
    // This service is defined in users_service.bal
}



import .drivers_service;

service drivers_service on new http:Listener(8080) {
    // This service is defined in drivers_service.bal
}



import .trips_service;

service trips_service on new http:Listener(8080) {
    // This service is defined in trips_service.bal
}



import .bids_service;

service bids_service on new http:Listener(8080) {
    // This service is defined in bids_service.bal
}



import .bookings_service;

service bookings_service on new http:Listener(8080) {
    // This service is defined in bookings_service.bal
}



import .uploads_service;

service uploads_service on new http:Listener(8080) {
    // This service is defined in uploads_service.bal
}

