import ballerina/http;

service /api/users on apiListener {
    resource function get me() returns json|error {
        return { "message": "User info endpoint not implemented yet" };
    }

    resource function post me/fcmToken(@http:Payload json payload) returns json|error {
        return { "message": "FCM token update endpoint not implemented yet" };
    }
}

