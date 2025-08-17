import backend.db;
import ballerina/sql;
import ballerina/lang.'string as strings;

public type DBBid record {|
    int id;
    int trip_id;
    int user_id;
    decimal bid_price;
    float pickup_lat;
    float pickup_lng;
    string pickup_addr;
    string status;
    string created_at;
    string updated_at;
|};

public type CreateBidReq record {|
    int trip_id;
    decimal bid_price;
    float pickup_lat;
    float pickup_lng;
    string pickup_addr;
|};

public type UpdateBidReq record {|
    decimal bid_price;
    float pickup_lat;
    float pickup_lng;
    string pickup_addr;
|};

// Create bid (passenger only). One bid per (trip, user).
public function createBid(json data, int passengerId) returns json|error {
    CreateBidReq req = check data.cloneWithType(CreateBidReq);
    if strings:trim(req.pickup_addr) == "" { return error("MISSING_REQUIRED_FIELDS"); }

    // Ensure trip exists & departure not past (basic)
    stream<record {int id; int driver_user_id; int available_seats;}, error?> tRs =
        db:dbClient->query(`SELECT id, driver_user_id, available_seats FROM trips WHERE id = ${req.trip_id}`);
    record {record {int id; int driver_user_id; int available_seats;} value;}? tRow = check tRs.next();
    check tRs.close();
    if tRow is () { return error("TRIP_NOT_FOUND"); }
    if tRow.value.driver_user_id == passengerId { return error("CANNOT_BID_OWN_TRIP"); }

    // ...existing code...
    sql:ParameterizedQuery q = `INSERT INTO bids
        (trip_id, user_id, bid_price, pickup_lat, pickup_lng, pickup_addr)
        VALUES (${req.trip_id}, ${passengerId}, ${req.bid_price}, ${req.pickup_lat}, ${req.pickup_lng}, ${req.pickup_addr})
        RETURNING id`;

    // Explicitly give the expected type so the client query can infer the rowType.
    stream<record {int id;}, error?>|error res = trap db:dbClient->query(q);
    if res is error {
        string msg = res.message();
        if strings:includes(msg, "duplicate key") {
            return error("BID_ALREADY_EXISTS");
        }
        return error("BID_CREATE_FAILED");
    }
    stream<record {int id;}, error?> rs = res;
    record {record {int id;} value;}? row = check rs.next();
    check rs.close();
    if row is () { return error("BID_CREATE_FAILED"); }
    return { message: "BID_CREATED", id: row.value.id };
// ...existing code...
}

// Update bid (owner only) if not confirmed/closed
public function updateBid(int bidId, json data, int passengerId) returns json|error {
    UpdateBidReq req = check data.cloneWithType(UpdateBidReq);

    sql:ParameterizedQuery q = `UPDATE bids SET
        bid_price = ${req.bid_price},
        pickup_lat = ${req.pickup_lat},
        pickup_lng = ${req.pickup_lng},
        pickup_addr = ${req.pickup_addr},
        updated_at = NOW()
        WHERE id = ${bidId} AND user_id = ${passengerId} AND status = 'open'
        RETURNING id`;

    stream<record {int id;}, error?> rs = db:dbClient->query(q);
    record {record {int id;} value;}? row = check rs.next();
    check rs.close();
    if row is () { return error("BID_NOT_FOUND_OR_LOCKED"); }
    return { message: "BID_UPDATED", id: row.value.id };
}

// Delete bid (owner only) if not confirmed
public function deleteBid(int bidId, int passengerId) returns json|error {
    sql:ParameterizedQuery q = `DELETE FROM bids
        WHERE id = ${bidId} AND user_id = ${passengerId} AND status != 'confirmed'
        RETURNING id`;
    stream<record {int id;}, error?> rs = db:dbClient->query(q);
    record {record {int id;} value;}? row = check rs.next();
    check rs.close();
    if row is () { return error("BID_NOT_FOUND_OR_CONFIRMED"); }
    return { message: "BID_DELETED", id: row.value.id };
}

// List bids for a trip (ordered by price desc)
public function listBidsForTrip(int tripId) returns DBBid[]|error {
    stream<DBBid, error?> rs = db:dbClient->query(
        `SELECT id, trip_id, user_id, bid_price, pickup_lat, pickup_lng, pickup_addr, status, created_at, updated_at
         FROM bids WHERE trip_id = ${tripId} ORDER BY bid_price DESC, created_at ASC`);
    DBBid[] bids = [];
    while true {
        record {DBBid value;}? row = check rs.next();
        if row is () { break; }
        bids.push(row.value);
    }
    check rs.close();
    return bids;
}

// List bids of current passenger
public function listMyBids(int passengerId) returns DBBid[]|error {
    stream<DBBid, error?> rs = db:dbClient->query(
        `SELECT id, trip_id, user_id, bid_price, pickup_lat, pickup_lng, pickup_addr, status, created_at, updated_at
         FROM bids WHERE user_id = ${passengerId} ORDER BY created_at DESC LIMIT 200`);
    DBBid[] bids = [];
    while true {
        record {DBBid value;}? row = check rs.next();
        if row is () { break; }
        bids.push(row.value);
    }
    check rs.close();
    return bids;
}

// Driver confirms top bids up to available seats.
// Sets selected to 'confirmed', others (still open) to 'closed'.
public function confirmTopBids(int tripId, int driverUserId) returns json|error {
    json result = {};
    // Wrapped in a transaction with an `on fail` clause for clearer rollback semantics.
    transaction {
        // 1. Lock trip row (SELECT .. FOR UPDATE) to prevent concurrent confirmations.
        stream<record {int id; int driver_user_id; int available_seats;}, error?> tRs =
            db:dbClient->query(`SELECT id, driver_user_id, available_seats FROM trips WHERE id = ${tripId} FOR UPDATE`);
        record {record {int id; int driver_user_id; int available_seats;} value;}? tRow = check tRs.next();
        check tRs.close();
    if tRow is () { fail error("TRIP_NOT_FOUND"); }
    if tRow.value.driver_user_id != driverUserId { fail error("FORBIDDEN"); }

        int seatCount = tRow.value.available_seats;
    if seatCount <= 0 { fail error("NO_AVAILABLE_SEATS"); }

        // 2. Prevent re-confirmation if any bid already confirmed.
        stream<record {int c;}, error?> cRs = db:dbClient->query(
            `SELECT COUNT(*) AS c FROM bids WHERE trip_id = ${tripId} AND status = 'confirmed'`);
        record {record {int c;} value;}? cRow = check cRs.next();
        check cRs.close();
    if cRow is () { fail error("BID_CONFIRM_QUERY_FAILED"); }
    if cRow.value.c > 0 { fail error("ALREADY_CONFIRMED"); }

        // 3. Rank open bids and update their statuses in one statement.
        sql:ParameterizedQuery updateQ = `WITH ranked AS (
              SELECT id, row_number() OVER (ORDER BY bid_price DESC, created_at ASC) rn
              FROM bids
              WHERE trip_id = ${tripId} AND status = 'open'
            )
            UPDATE bids b SET status = CASE WHEN r.rn <= ${seatCount} THEN 'confirmed' ELSE 'closed' END,
                updated_at = NOW()
            FROM ranked r
            WHERE b.id = r.id
            RETURNING b.status`;

        stream<record {string status;}, error?> uRs = db:dbClient->query(updateQ);
        int confirmed = 0;
        int closed = 0;
        while true {
            record {record {string status;} value;}? row = check uRs.next();
            if row is () { break; }
            if row.value.status == "confirmed" { confirmed += 1; }
            else if row.value.status == "closed" { closed += 1; }
        }
        check uRs.close();

        if confirmed == 0 { // No bids to confirm
            fail error("NO_OPEN_BIDS");
        }

    // 4. Explicit commit then set result.
    check commit;
        result = <json>{ message: "BIDS_CONFIRMED", confirmed: confirmed, closed: closed };
    } on fail var e {
        // Automatic rollback already performed. Provide a domain-friendly error mapping.
        if e is sql:DatabaseError {
            // You can inspect e.detail() for more granular codes if needed.
            return error("BID_CONFIRM_DB_ERROR");
        }
        return e; // Propagate original error for non-DB failures.
    }
    return result;
}