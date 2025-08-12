import ballerina/http;
import ballerina/io;
import .auth_service;

service / on new http:Listener(9090) {
    resource function get / () returns string {
        return "Hello, World!";
    }
}

service auth_service on new http:Listener(8080) {
    
}

import .users_service;

service users_service on new http:Listener(8080) {
}

import .drivers_service;

service drivers_service on new http:Listener(8080) {
}

import .trips_service;

service trips_service on new http:Listener(8080) {
}

import .bids_service;

service bids_service on new http:Listener(8080) {
}

import .bookings_service;

service bookings_service on new http:Listener(8080) {
    
}

