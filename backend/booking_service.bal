import ballerina/http;

service /api/bookings on apiListener {
    resource function get [string bookingId]() returns http:Response {
        http:Response res = new;
        res.setJsonPayload({ message: "Get booking by ID endpoint not implemented yet", bookingId });
        return res;
    }

    // Note: hyphens are not allowed in path segments; use camelCase or underscores
    resource function post [string bookingId]/confirmPayment(@http:Payload json payload) returns http:Response {
        http:Response res = new;
        res.setJsonPayload({ message: "Confirm payment endpoint not implemented yet", bookingId });
        return res;
    }
}


