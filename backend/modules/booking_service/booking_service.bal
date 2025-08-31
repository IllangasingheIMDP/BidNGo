import ballerina/http;
import backend.middleware;

public http:Service BookingService = @http:ServiceConfig {} service object {

	// Public: list all bookings (limited)
	resource function get bookings(http:Caller caller, http:Request req) returns error? {
		DBBooking[]|error res = listBookings();
		if res is error { check caller->respond({ "error": res.message() }); return; }
		check caller->respond(res);
	}

	// Public: get a booking by id
	resource function get bookings/[int id](http:Caller caller, http:Request req) returns error? {
		DBBooking|error res = getBooking(id);
		if res is error { check caller->respond({ "error": res.message() }); return; }
		check caller->respond(res);
	}

	// Public: list bookings for a trip
	resource function get bookings/trip/[int tripId](http:Caller caller, http:Request req) returns error? {
		DBBooking[]|error res = listBookingsForTrip(tripId);
		if res is error { check caller->respond({ "error": res.message() }); return; }
		check caller->respond(res);
	}

	// Passenger: list own bookings
	resource function get bookings/mine(http:Caller caller, http:Request req) returns error? {
		json|error auth = middleware:validateJWT(req);
		if auth is error { check caller->respond({ "error": "UNAUTHORIZED" }); return; }
		string role = ""; int uid = -1;
		if auth is map<json> {
			role = check auth["role"].ensureType(string);
			uid = check auth["id"].ensureType(int);
		}
		if role != "passenger" { check caller->respond({ "error": "FORBIDDEN" }); return; }
	DBBooking[]|error res = listMyBookings(uid);
		if res is error { check caller->respond({ "error": res.message() }); return; }
		check caller->respond(res);
	}

	// Passenger: create booking
	resource function post bookings(http:Caller caller, http:Request req) returns error? {
		json|error auth = middleware:validateJWT(req);
		if auth is error { check caller->respond({ "error": "UNAUTHORIZED" }); return; }
		string role = ""; 
		if auth is map<json> {
			role = check auth["role"].ensureType(string);
			
		}
		if !(role == "passenger" || role == "driver") { check caller->respond({ "error": "FORBIDDEN" }); return; }
		json body = check req.getJsonPayload();
	json|error res = createBooking(body);
		if res is error { check caller->respond({ "error": res.message() }); return; }
		check caller->respond(res);
	}

	// Passenger: update booking (status, payment_method)
	resource function put bookings/[int id](http:Caller caller, http:Request req) returns error? {
		json|error auth = middleware:validateJWT(req);
		if auth is error { check caller->respond({ "error": "UNAUTHORIZED" }); return; }
		string role = ""; int uid = -1;
		if auth is map<json> {
			role = check auth["role"].ensureType(string);
			uid = check auth["id"].ensureType(int);
		}
		if role != "passenger" { check caller->respond({ "error": "FORBIDDEN" }); return; }
		json body = check req.getJsonPayload();
	json|error res = updateBooking(id, body, uid);
		if res is error { check caller->respond({ "error": res.message() }); return; }
		check caller->respond(res);
	}
};
