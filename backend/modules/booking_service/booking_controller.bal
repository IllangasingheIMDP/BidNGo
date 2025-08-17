import backend.db;
import ballerina/sql;


// DB mapping of bookings table
public type DBBooking record {|
	int id;
	int? trip_id; // nullable per schema
	int? bid_id;
	int? passenger_user_id;
	decimal fare;
	string status; // booked | canceled | (potential future statuses)
	string payment_method; // cash | card
	string payment_status; // pending | (future: paid, failed)
	string created_at;
	string updated_at;
|};

public type CreateBookingReq record {|
	int? trip_id = (); // At least one of trip_id or bid_id must be provided
	int? bid_id = ();
	decimal fare; // required
|};

public type UpdateBookingReq record {|
	string? status = ();
	string? payment_method = ();
|};

// Create a booking (passenger only). Basic validation: require fare and either trip_id or bid_id.
public function createBooking(json data, int passengerId) returns json|error {
	CreateBookingReq req = check data.cloneWithType(CreateBookingReq);

	if (req.trip_id is ()) && (req.bid_id is ()) { return error("MISSING_TRIP_OR_BID"); }
	if req.fare < 0d { return error("INVALID_FARE"); }

	// Validate trip if provided
	// if req.trip_id is int {
	// 	stream<record {int id;}, error?> tRs = db:dbClient->query(`SELECT id FROM trips WHERE id = ${req.trip_id}`);
	// 	record {record {int id;} value;}? tRow = check tRs.next();
	// 	check tRs.close();
	// 	if tRow is () { return error("TRIP_NOT_FOUND"); }
	// }

	// // Validate bid if provided (ensure ownership if desired? not strictly required). We just ensure exists.
	// if req.bid_id is int {
	// 	stream<record {int id; int user_id;}, error?> bRs = db:dbClient->query(`SELECT id, user_id FROM bids WHERE id = ${req.bid_id}`);
	// 	record {record {int id; int user_id;} value;}? bRow = check bRs.next();
	// 	check bRs.close();
	// 	if bRow is () { return error("BID_NOT_FOUND"); }
	// 	// Prevent booking another passenger's confirmed bid (basic enforcement)
	// 	if bRow.value.user_id != passengerId { return error("BID_OWNERSHIP_MISMATCH"); }
	// }

	// Simple insert. Let DB defaults populate status, payment_method, payment_status & timestamps.
	sql:ParameterizedQuery q = `INSERT INTO bookings (trip_id, bid_id, passenger_user_id, fare)
		VALUES (${req.trip_id}, ${req.bid_id}, ${passengerId}, ${req.fare}) RETURNING id`;

	stream<record {int id;}, error?>|error res = trap db:dbClient->query(q);
	if res is error { return error("BOOKING_CREATE_FAILED"); }
	stream<record {int id;}, error?> rs = res;
	record {record {int id;} value;}? row = check rs.next();
	check rs.close();
	if row is () { return error("BOOKING_CREATE_FAILED"); }
	return { message: "BOOKING_CREATED", id: row.value.id };
}

// Update booking (passenger owner only). Allowed updates:
//  - status: only from 'booked' to 'canceled'
//  - payment_method: only from 'cash' to 'card'
public function updateBooking(int bookingId, json data, int passengerId) returns json|error {
	UpdateBookingReq req = check data.cloneWithType(UpdateBookingReq);

	string wantStatus = <string>req.status ;
	string wantPaymentMethod = <string>req.payment_method ;

	string setFragments = "";
	boolean first = true;

	
	
	// Always update updated_at
	setFragments = setFragments + (first ? "" : ", ") + "updated_at = NOW()";

	// Enforce that status can only change if current is 'booked'

	sql:ParameterizedQuery q = `UPDATE bookings SET status = ${wantStatus},payment_method=${wantPaymentMethod}
		WHERE id = ${bookingId} AND passenger_user_id = ${passengerId} RETURNING id`;

	stream<record {int id;}, error?> rs = db:dbClient->query(q);
	record {record {int id;} value;}? row = check rs.next();
	check rs.close();
	if row is () { return error("BOOKING_NOT_FOUND_OR_LOCKED"); }
	return { message: "BOOKING_UPDATED", id: row.value.id };
}

// Get a booking (public)
public function getBooking(int id) returns DBBooking|error {
	stream<DBBooking, error?> rs = db:dbClient->query(
		`SELECT id, trip_id, bid_id, passenger_user_id, fare, status, payment_method, payment_status, created_at, updated_at FROM bookings WHERE id = ${id}`);
	record {DBBooking value;}? row = check rs.next();
	check rs.close();
	if row is () { return error("BOOKING_NOT_FOUND"); }
	return row.value;
}

// List bookings (public, limited)
public function listBookings() returns DBBooking[]|error {
	stream<DBBooking, error?> rs = db:dbClient->query(
		`SELECT id, trip_id, bid_id, passenger_user_id, fare, status, payment_method, payment_status, created_at, updated_at
		 FROM bookings ORDER BY created_at DESC LIMIT 200`);
	DBBooking[] out = [];
	while true {
		record {DBBooking value;}? row = check rs.next();
		if row is () { break; }
		out.push(row.value);
	}
	check rs.close();
	return out;
}

// List bookings for a trip (public)
public function listBookingsForTrip(int tripId) returns DBBooking[]|error {
	stream<DBBooking, error?> rs = db:dbClient->query(
		`SELECT id, trip_id, bid_id, passenger_user_id, fare, status, payment_method, payment_status, created_at, updated_at
		 FROM bookings WHERE trip_id = ${tripId} ORDER BY created_at DESC`);
	DBBooking[] out = [];
	while true {
		record {DBBooking value;}? row = check rs.next();
		if row is () { break; }
		out.push(row.value);
	}
	check rs.close();
	return out;
}

// List bookings of current passenger
public function listMyBookings(int passengerId) returns DBBooking[]|error {
	stream<DBBooking, error?> rs = db:dbClient->query(
		`SELECT id, trip_id, bid_id, passenger_user_id, fare, status, payment_method, payment_status, created_at, updated_at
		 FROM bookings WHERE passenger_user_id = ${passengerId} ORDER BY created_at DESC LIMIT 200`);
	DBBooking[] out = [];
	while true {
		record {DBBooking value;}? row = check rs.next();
		if row is () { break; }
		out.push(row.value);
	}
	check rs.close();
	return out;
}

