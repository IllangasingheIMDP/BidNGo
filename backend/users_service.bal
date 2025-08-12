import ballerina/http;

service /api/users on new http:Listener(8080) {

    resource function get me() returns json|error {
        // TODO: Implement logic to retrieve current user's information based on JWT
        return { "message": "User info endpoint not implemented yet" };
    }

    resource function post me/fcm-token(@http:Payload {} json payload) returns json|error {
        // TODO: Implement logic to store FCM token for the current user
        return { "message": "FCM token update endpoint not implemented yet" };
    }
}

