import ballerina/http;

import backend.middleware;

public http:Service TripService = @http:ServiceConfig {} service object {

	// Public list of trips
	resource function get trips(http:Caller caller, http:Request req) returns error? {
		json|error res = listTrips();
		if res is error { check caller->respond({ "error": res.message() }); return; }
		check caller->respond(res);
	}

	// Public get one trip
	resource function get trips/[int id](http:Caller caller, http:Request req) returns error? {
		DBTrip|error t = getTrip(id);
		if t is error { check caller->respond({ "error": t.message() }); return; }
		check caller->respond(t);
	}

	// Driver create trip
	resource function post trips(http:Caller caller, http:Request req) returns error? {
		json|error auth = middleware:validateJWT(req);
		if auth is error { check caller->respond({ "error": "UNAUTHORIZED" }); return; }
		string role = "";
		int driverId = -1;
		if auth is map<json> {
			role = check auth["role"].ensureType(string);
			driverId = check auth["id"].ensureType(int);
		}
		if role != "driver" { check caller->respond({ "error": "FORBIDDEN" }); return; }
		json body = check req.getJsonPayload();
		json|error res = createTrip(body, driverId);
		if res is error { check caller->respond({ "error": res.message() }); return; }
		check caller->respond(res);
	}

	// Driver update own trip
	resource function put trips/[int id](http:Caller caller, http:Request req) returns error? {
		json|error auth = middleware:validateJWT(req);
		if auth is error { check caller->respond({ "error": "UNAUTHORIZED" }); return; }
		string role = "";
		int driverId = -1;
		if auth is map<json> {
			role = check auth["role"].ensureType(string);
			driverId = check auth["id"].ensureType(int);
		}
		if role != "driver" { check caller->respond({ "error": "FORBIDDEN" }); return; }
		json body = check req.getJsonPayload();
		json|error res = updateTrip(id, body, driverId);
		if res is error { check caller->respond({ "error": res.message() }); return; }
		check caller->respond(res);
	}

	// Public search endpoint for trips with geospatial matching & ranking
	resource function post trips/search(http:Caller caller, http:Request req) returns error? {
		json body = check req.getJsonPayload();
		TripWithScores[]|error res = searchTrips(body);
		if res is error { check caller->respond({ "error": res.message() }); return; }
		check caller->respond(res);
	}
};