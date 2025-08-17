import ballerina/http;
import backend.middleware;

public http:Service BidService = @http:ServiceConfig {} service object {

    // Public list bids for a trip
    resource function get bids/trip/[int tripId](http:Caller caller, http:Request req) returns error? {
        DBBid[]|error res = listBidsForTrip(tripId);
        if res is error { check caller->respond({ "error": res.message() }); return; }
        check caller->respond(res);
    }

    // Authenticated passenger: list own bids
    resource function get bids/mine(http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error { check caller->respond({ "error": "UNAUTHORIZED" }); return; }
        string role = "";
        int uid = -1;
        if auth is map<json> {
            role = check auth["role"].ensureType(string);
            uid = check auth["id"].ensureType(int);
        }
        if role != "passenger" { check caller->respond({ "error": "FORBIDDEN" }); return; }
        DBBid[]|error res = listMyBids(uid);
        if res is error { check caller->respond({ "error": res.message() }); return; }
        check caller->respond(res);
    }

    // Passenger create bid
    resource function post bids(http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error { check caller->respond({ "error": "UNAUTHORIZED" }); return; }
        string role = "";
        int uid = -1;
        if auth is map<json> {
            role = check auth["role"].ensureType(string);
            uid = check auth["id"].ensureType(int);
        }
        if role != "passenger" { check caller->respond({ "error": "FORBIDDEN" }); return; }
        json body = check req.getJsonPayload();
        json|error res = createBid(body, uid);
        if res is error { check caller->respond({ "error": res.message() }); return; }
        check caller->respond(res);
    }

    // Passenger update bid
    resource function put bids/[int id](http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error { check caller->respond({ "error": "UNAUTHORIZED" }); return; }
        string role = "";
        int uid = -1;
        if auth is map<json> {
            role = check auth["role"].ensureType(string);
            uid = check auth["id"].ensureType(int);
        }
        if role != "passenger" { check caller->respond({ "error": "FORBIDDEN" }); return; }
        json body = check req.getJsonPayload();
        json|error res = updateBid(id, body, uid);
        if res is error { check caller->respond({ "error": res.message() }); return; }
        check caller->respond(res);
    }

    // Passenger delete bid
    resource function delete bids/[int id](http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error { check caller->respond({ "error": "UNAUTHORIZED" }); return; }
        string role = "";
        int uid = -1;
        if auth is map<json> {
            role = check auth["role"].ensureType(string);
            uid = check auth["id"].ensureType(int);
        }
        if role != "passenger" { check caller->respond({ "error": "FORBIDDEN" }); return; }
        json|error res = deleteBid(id, uid);
        if res is error { check caller->respond({ "error": res.message() }); return; }
        check caller->respond(res);
    }

    // Driver confirm top bids
    resource function post bids/confirm/[int tripId](http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error { check caller->respond({ "error": "UNAUTHORIZED" }); return; }
        string role = "";
        int uid = -1;
        if auth is map<json> {
            role = check auth["role"].ensureType(string);
            uid = check auth["id"].ensureType(int);
        }
        if role != "driver" { check caller->respond({ "error": "FORBIDDEN" }); return; }
        json|error res = confirmTopBids(tripId, uid);
        if res is error { check caller->respond({ "error": res.message() }); return; }
        check caller->respond(res);
    }
};