import ballerina/http;

service /api/uploads on new http:Listener(8080) {

    resource function post sign(@http:Payload {} json payload) returns json|error {
        // TODO: Implement logic to return Cloudinary signed parameters
        return { "message": "Cloudinary sign endpoint not implemented yet" };
    }
}