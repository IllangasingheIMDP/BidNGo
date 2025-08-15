import ballerina/http;

service /api/uploads on apiListener {
    resource function post sign(@http:Payload json payload) returns json|error {
        return { "message": "Cloudinary sign endpoint not implemented yet" };
    }
}