import backend.db;
import ballerina/sql;
import ballerina/lang.'string as strings;

type DBDriverProfile record {|
    int id;
    string nic_number;
    string license_number;
    string vehicle_reg_number;
    string vehicle_model;
    string[]? doc_urls;
    string verification_status;
    string submitted_at;
    string? reviewed_at;
    int user_id;
|};

type DBDriverProfileWithUser record {|
    int id;
    string nic_number;
    string license_number;
    string vehicle_reg_number;
    string vehicle_model;
    string[]? doc_urls;
    string verification_status;
    string submitted_at;
    string? reviewed_at;
    int user_id;
    string user_name;
    string user_email;
    string user_phone;
|};

public function createDriverProfile(int userId, string nicNumber, string licenseNumber, 
                                  string vehicleRegNumber, string vehicleModel, 
                                  string[]? docUrls) returns json|error {
    
    if strings:trim(nicNumber) == "" || strings:trim(licenseNumber) == "" || 
       strings:trim(vehicleRegNumber) == "" || strings:trim(vehicleModel) == "" {
        return error("REQUIRED_FIELDS_MISSING");
    }

    // Check if driver profile already exists for this user
    stream<DBDriverProfile, error?> existingStream = db:dbClient->query(
        `SELECT * FROM driver_profiles WHERE user_id = ${userId}`
    );
    record {DBDriverProfile value;}? existing = check existingStream.next();
    check existingStream.close();

    if existing is record {DBDriverProfile value;} {
        return error("DRIVER_PROFILE_ALREADY_EXISTS");
    }

    sql:ExecutionResult res = check db:dbClient->execute(
        `INSERT INTO driver_profiles (user_id, nic_number, license_number, vehicle_reg_number, vehicle_model, doc_urls, verification_status) 
         VALUES (${userId}, ${nicNumber}, ${licenseNumber}, ${vehicleRegNumber}, ${vehicleModel}, ${docUrls}, 'pending')`
    );

    if res.affectedRowCount == 0 {
        return error("DRIVER_PROFILE_CREATION_FAILED");
    }

    return { 
        message: "DRIVER_PROFILE_CREATED", 
        profileId: res.lastInsertId,
        status: "pending"
    };
}

public function getDriverProfile(int userId) returns DBDriverProfile|error {
    stream<DBDriverProfile, error?> rs = db:dbClient->query(
        `SELECT * FROM driver_profiles WHERE user_id = ${userId}`
    );
    record {DBDriverProfile value;}? row = check rs.next();
    check rs.close();
    
    if row is () {
        return error("DRIVER_PROFILE_NOT_FOUND");
    }
    return row.value;
}

public function getDriverProfileById(int profileId) returns DBDriverProfile|error {
    stream<DBDriverProfile, error?> rs = db:dbClient->query(
        `SELECT * FROM driver_profiles WHERE id = ${profileId}`
    );
    record {DBDriverProfile value;}? row = check rs.next();
    check rs.close();
    
    if row is () {
        return error("DRIVER_PROFILE_NOT_FOUND");
    }
    return row.value;
}

public function updateDriverProfile(int userId, string? nicNumber, string? licenseNumber, 
                                  string? vehicleRegNumber, string? vehicleModel, 
                                  string[]? docUrls) returns json|error {
    
    // Build dynamic update query based on provided fields
    string updateClause = "";
    sql:ParameterizedQuery query = `UPDATE driver_profiles SET `;
    boolean hasUpdates = false;

    if nicNumber is string && strings:trim(nicNumber) != "" {
        if hasUpdates {
            query = sql:queryConcat(query, `, `);
        }
        query = sql:queryConcat(query, `nic_number = ${nicNumber}`);
        hasUpdates = true;
    }

    if licenseNumber is string && strings:trim(licenseNumber) != "" {
        if hasUpdates {
            query = sql:queryConcat(query, `, `);
        }
        query = sql:queryConcat(query, `license_number = ${licenseNumber}`);
        hasUpdates = true;
    }

    if vehicleRegNumber is string && strings:trim(vehicleRegNumber) != "" {
        if hasUpdates {
            query = sql:queryConcat(query, `, `);
        }
        query = sql:queryConcat(query, `vehicle_reg_number = ${vehicleRegNumber}`);
        hasUpdates = true;
    }

    if vehicleModel is string && strings:trim(vehicleModel) != "" {
        if hasUpdates {
            query = sql:queryConcat(query, `, `);
        }
        query = sql:queryConcat(query, `vehicle_model = ${vehicleModel}`);
        hasUpdates = true;
    }

    if docUrls is string[] {
        if hasUpdates {
            query = sql:queryConcat(query, `, `);
        }
        query = sql:queryConcat(query, `doc_urls = ${docUrls}`);
        hasUpdates = true;
    }

    if !hasUpdates {
        return error("NO_FIELDS_TO_UPDATE");
    }

    // Reset verification status to pending when profile is updated
    query = sql:queryConcat(query, `, verification_status = 'pending', reviewed_at = NULL WHERE user_id = ${userId}`);

    sql:ExecutionResult res = check db:dbClient->execute(query);
    
    if res.affectedRowCount == 0 {
        return error("DRIVER_PROFILE_NOT_FOUND_OR_NO_CHANGE");
    }

    return { 
        message: "DRIVER_PROFILE_UPDATED",
        note: "Profile verification status reset to pending"
    };
}

public function updateVerificationStatus(int profileId, string status, string? reviewNote) returns json|error {
    if status != "approved" && status != "rejected" && status != "pending" {
        return error("INVALID_VERIFICATION_STATUS");
    }

    sql:ExecutionResult res = check db:dbClient->execute(
        `UPDATE driver_profiles SET verification_status = ${status}, reviewed_at = NOW() WHERE id = ${profileId}`
    );
    
    if res.affectedRowCount == 0 {
        return error("DRIVER_PROFILE_NOT_FOUND");
    }

    return { 
        message: "VERIFICATION_STATUS_UPDATED",
        status: status,
        reviewedAt: "now"
    };
}

public function getAllDriverProfiles(string? status) returns DBDriverProfileWithUser[]|error {
    sql:ParameterizedQuery query;
    
    if status is string {
        query = `SELECT dp.*, u.name as user_name, u.email as user_email, u.phone as user_phone 
                 FROM driver_profiles dp 
                 JOIN users u ON dp.user_id = u.id 
                 WHERE dp.verification_status = ${status}
                 ORDER BY dp.submitted_at DESC`;
    } else {
        query = `SELECT dp.*, u.name as user_name, u.email as user_email, u.phone as user_phone 
                 FROM driver_profiles dp 
                 JOIN users u ON dp.user_id = u.id 
                 ORDER BY dp.submitted_at DESC`;
    }

    stream<DBDriverProfileWithUser, error?> rs = db:dbClient->query(query);
    DBDriverProfileWithUser[] profiles = [];
    
    error? e = rs.forEach(function(DBDriverProfileWithUser profile) {
        profiles.push(profile);
    });
    
    if e is error {
        return e;
    }
    
    return profiles;
}

public function deleteDriverProfile(int userId) returns json|error {
    sql:ExecutionResult res = check db:dbClient->execute(
        `DELETE FROM driver_profiles WHERE user_id = ${userId}`
    );
    
    if res.affectedRowCount == 0 {
        return error("DRIVER_PROFILE_NOT_FOUND");
    }
    
    return { message: "DRIVER_PROFILE_DELETED" };
}

public function getDriverStats() returns json|error {
    stream<record {| int count; |}, error?> pendingStream = db:dbClient->query(
        `SELECT COUNT(*) as count FROM driver_profiles WHERE verification_status = 'pending'`
    );
    record {record {| int count; |} value;}? pendingResult = check pendingStream.next();
    check pendingStream.close();

    stream<record {| int count; |}, error?> approvedStream = db:dbClient->query(
        `SELECT COUNT(*) as count FROM driver_profiles WHERE verification_status = 'approved'`
    );
    record {record {| int count; |} value;}? approvedResult = check approvedStream.next();
    check approvedStream.close();

    stream<record {| int count; |}, error?> rejectedStream = db:dbClient->query(
        `SELECT COUNT(*) as count FROM driver_profiles WHERE verification_status = 'rejected'`
    );
    record {record {| int count; |} value;}? rejectedResult = check rejectedStream.next();
    check rejectedStream.close();

    int pendingCount = pendingResult is record {record {| int count; |} value;} ? pendingResult.value.count : 0;
    int approvedCount = approvedResult is record {record {| int count; |} value;} ? approvedResult.value.count : 0;
    int rejectedCount = rejectedResult is record {record {| int count; |} value;} ? rejectedResult.value.count : 0;

    return {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        total: pendingCount + approvedCount + rejectedCount
    };
}
