import ballerina/http;

service /api/bids on apiListener {
    // Create/update a bid for a trip
    resource function post trips/[string tripId](@http:Payload json payload) returns http:Response {
        http:Response res = new;
        res.setJsonPayload({ message: "Bid creation/update endpoint not implemented yet", tripId });
        res.statusCode = 201;
        return res;
    }

    // Get bids or bid summary for a trip
    resource function get trips/[string tripId]() returns http:Response {
        http:Response res = new;
        res.setJsonPayload({ message: "Bid view endpoint not implemented yet", tripId });
        return res;
    }

    // Accept a bid
    resource function post [string bidId]/accept() returns http:Response {
        http:Response res = new;
        res.setJsonPayload({ message: "Bid accept endpoint not implemented yet", bidId });
        return res;
    }
}