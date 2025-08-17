import backend.db;
import ballerina/sql;
import ballerina/lang.'string as strings;

// DB mapping of trips table
public type DBTrip record {|
	int id;
	float origin_lat;
	float origin_lng;
	string origin_addr;
	float dest_lat;
	float dest_lng;
	string dest_addr;
	string departure_datetime; // kept as string similar to other timestamp usages
	int available_seats;
	decimal base_price;
	string? notes;
	string created_at;
	string updated_at;
	int driver_user_id;
|};

public type CreateTripReq record {|
	float origin_lat;
	float origin_lng;
	string origin_addr;
	float dest_lat;
	float dest_lng;
	string dest_addr;
	string departure_datetime; // ISO string expected
	int available_seats;
	decimal base_price;
	string notes = ""; // optional note
|};

public type UpdateTripReq record {|
	// Allow updating mutable fields only (no driver_user_id)
	float origin_lat;
	float origin_lng;
	string origin_addr;
	float dest_lat;
	float dest_lng;
	string dest_addr;
	string departure_datetime;
	int available_seats;
	decimal base_price;
	string notes = "";
|};

// Create trip (driver only) handled by caller via role check
public function createTrip(json data, int driverUserId) returns json|error {
	CreateTripReq req = check data.cloneWithType(CreateTripReq);
	if strings:trim(req.origin_addr) == "" || strings:trim(req.dest_addr) == "" ||
		strings:trim(req.departure_datetime) == "" {
		return error("MISSING_REQUIRED_FIELDS");
	}
	string notesVal = "";
	if strings:trim(req.notes) != "" {
		notesVal = req.notes;
	}
	sql:ParameterizedQuery q = `INSERT INTO trips (origin_lat, origin_lng, origin_addr, dest_lat, dest_lng, dest_addr, departure_datetime, available_seats, base_price, notes, driver_user_id)
		VALUES (${req.origin_lat}, ${req.origin_lng}, ${req.origin_addr}, ${req.dest_lat}, ${req.dest_lng}, ${req.dest_addr},CAST(${req.departure_datetime} AS TIMESTAMP), ${req.available_seats}, ${req.base_price}, ${notesVal}, ${driverUserId}) RETURNING id`;
	stream<record {int id;}, error?> rs = db:dbClient->query(q);
	record {record {int id;} value;}? row = check rs.next();
	check rs.close();
	if row is () { return error("CREATE_FAILED"); }
	return { message: "TRIP_CREATED", id: row.value.id };
}

// Update trip (driver only & ownership enforced in WHERE clause)
public function updateTrip(int tripId, json data, int driverUserId) returns json|error {
	UpdateTripReq req = check data.cloneWithType(UpdateTripReq);
	sql:ParameterizedQuery q = `UPDATE trips SET
		origin_lat = COALESCE(${req.origin_lat}, origin_lat),
		origin_lng = COALESCE(${req.origin_lng}, origin_lng),
		origin_addr = COALESCE(${req.origin_addr}, origin_addr),
		dest_lat = COALESCE(${req.dest_lat}, dest_lat),
		dest_lng = COALESCE(${req.dest_lng}, dest_lng),
		dest_addr = COALESCE(${req.dest_addr}, dest_addr),
		departure_datetime = COALESCE(CAST(${req.departure_datetime} AS TIMESTAMP), departure_datetime),
		available_seats = COALESCE(${req.available_seats}, available_seats),
		base_price = COALESCE(${req.base_price}, base_price),
		notes = COALESCE(${req.notes}, notes),
		updated_at = NOW()
		WHERE id = ${tripId} AND driver_user_id = ${driverUserId} RETURNING id`;
	stream<record {int id;}, error?> rs = db:dbClient->query(q);
	record {record {int id;} value;}? row = check rs.next();
	check rs.close();
	if row is () { return error("TRIP_NOT_FOUND_OR_UNAUTHORIZED"); }
	return { message: "TRIP_UPDATED", id: row.value.id };
}

public function getTrip(int id) returns DBTrip|error {
	stream<DBTrip, error?> rs = db:dbClient->query(`SELECT * FROM trips WHERE id = ${id}`);
	record {DBTrip value;}? row = check rs.next();
	check rs.close();
	if row is () { return error("TRIP_NOT_FOUND"); }
	return row.value;
}

public function listTrips() returns DBTrip[]|error {
	stream<DBTrip, error?> rs = db:dbClient->query(`SELECT * FROM trips ORDER BY departure_datetime ASC LIMIT 200`);
	DBTrip[] trips = [];
	while true {
		record {DBTrip value;}? row = check rs.next();
		if row is () { break; }
		trips.push(row.value);
	}
	check rs.close();
	return trips;
}
