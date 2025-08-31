import backend.middleware;


import ballerina/http;

type DBUser record {|
    int id;
    string name;
    string phone;
    string email;
    string password;
    int role_flags;
    boolean is_verified;
    string created_at;
    string updated_at;
|};

// Helper function to get user ID from email


public http:Service DriverService = @http:ServiceConfig {} service object {

    // Create driver profile (self only)
    resource function post profile(http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error {
            check caller->respond({"error": auth.message()});
            return;
        }

        //string email = check auth.email.ensureType(string);
        int userId = check auth.id.ensureType(int);

        json body = check req.getJsonPayload();
        string nicNumber = check body.nicNumber.ensureType(string);
        string licenseNumber = check body.licenseNumber.ensureType(string);
        string vehicleRegNumber = check body.vehicleRegNumber.ensureType(string);
        string vehicleModel = check body.vehicleModel.ensureType(string);
    
        json|error docJson = check body.docUrls; // Extract JSON value or raise error if not present
        if docJson is error {
            check caller->respond({"error": "dsds"});
            return;
        }
        string[] docUrls = <string[]> check docJson;

        json|error res = createDriverProfile(userId, nicNumber, licenseNumber,
                vehicleRegNumber, vehicleModel, docUrls);
        if res is error {
            check caller->respond({"error": res.message()});
            return;
        }
        check caller->respond(res);
    }

    // Get own driver profile
    resource function get profile(http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error {
            check caller->respond({"error": auth.message()});
            return;
        }

        //string email = check auth.email.ensureType(string);
        int userId = check auth.id.ensureType(int);

        DBDriverProfile|error profile = getDriverProfile(userId);
        if profile is error {
            check caller->respond({"error": profile.message()});
            return;
        }

        check caller->respond({
            id: profile.id,
            nicNumber: profile.nic_number,
            licenseNumber: profile.license_number,
            vehicleRegNumber: profile.vehicle_reg_number,
            vehicleModel: profile.vehicle_model,
            docUrls: profile.doc_urls,
            verificationStatus: profile.verification_status,
            submittedAt: profile.submitted_at,
            reviewedAt: profile.reviewed_at
        });
    }

    // Get driver profile by user ID (admin only)
    resource function get profile/user/[int userId](http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error {
            check caller->respond({"error": auth.message()});
            return;
        }

        string role = check auth.role.ensureType(string);
        

        DBDriverProfile|error profile = getDriverProfile(userId);
        if profile is error {
            check caller->respond({"error": profile.message()});
            return;
        }

        check caller->respond({
            id: profile.id,
            userId: profile.user_id,
            nicNumber: profile.nic_number,
            licenseNumber: profile.license_number,
            vehicleRegNumber: profile.vehicle_reg_number,
            vehicleModel: profile.vehicle_model,
            docUrls: profile.doc_urls,
            verificationStatus: profile.verification_status,
            submittedAt: profile.submitted_at,
            reviewedAt: profile.reviewed_at
        });
    }

    // Update driver profile (self only, resets verification status)
    resource function put profile(http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error {
            check caller->respond({"error": auth.message()});
            return;
        }

        //string email = check auth.email.ensureType(string);
        int userId = check auth.id.ensureType(int);

        json body = check req.getJsonPayload();
        string? nicNumber = body.nicNumber is string ? check body.nicNumber.ensureType(string) : ();
        string? licenseNumber = body.licenseNumber is string ? check body.licenseNumber.ensureType(string) : ();
        string? vehicleRegNumber = body.vehicleRegNumber is string ? check body.vehicleRegNumber.ensureType(string) : ();
        string? vehicleModel = body.vehicleModel is string ? check body.vehicleModel.ensureType(string) : ();
        // string[]? docUrls = body.docUrls is json[] ? check body.docUrls.ensureType(string[]) : ();
        json|error docJson = check body.docUrls; // Extract JSON value or raise error if not present
        if docJson is error {
            check caller->respond({"error": "dsds"});
            return;
        }
        string[] docUrls = <string[]> check docJson;
        json|error res = updateDriverProfile(userId, nicNumber, licenseNumber,
                vehicleRegNumber, vehicleModel, docUrls);
        if res is error {
            check caller->respond({"error": res.message()});
            return;
        }
        check caller->respond(res);
    }

    // Update verification status (admin only)
    resource function put profile/[int profileId]/verification(http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error {
            check caller->respond({"error": auth.message()});
            return;
        }

        string role = check auth.role.ensureType(string);
        if role != "admin" {
            check caller->respond({"error": "UNAUTHORIZED"});
            return;
        }

        json body = check req.getJsonPayload();
        string status = check body.status.ensureType(string);
        string? reviewNote = body.reviewNote is string ? check body.reviewNote.ensureType(string) : ();

        json|error res = updateVerificationStatus(profileId, status, reviewNote);
        if res is error {
            check caller->respond({"error": res.message()});
            return;
        }
        check caller->respond(res);
    }

    // Get all driver profiles (admin only)
    resource function get profiles(http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error {
            check caller->respond({"error": auth.message()});
            return;
        }

        string role = check auth.role.ensureType(string);
        if role != "admin" {
            check caller->respond({"error": "UNAUTHORIZED"});
            return;
        }

        map<string[]> queryParams = req.getQueryParams();
        string[]? statusArray = queryParams["status"];
        string status = statusArray is string[] && statusArray.length() > 0 ? statusArray[0] : "pending";

        DBDriverProfileWithUser[]|error profiles = getAllDriverProfiles(status);
        if profiles is error {
            check caller->respond({"error": profiles.message()});
            return;
        }

        json[] responseProfiles = [];
        foreach DBDriverProfileWithUser profile in profiles {
            responseProfiles.push({
                id: profile.id,
                userId: profile.user_id,
                userName: profile.user_name,
                userEmail: profile.user_email,
                userPhone: profile.user_phone,
                nicNumber: profile.nic_number,
                licenseNumber: profile.license_number,
                vehicleRegNumber: profile.vehicle_reg_number,
                vehicleModel: profile.vehicle_model,
                docUrls: profile.doc_urls,
                verificationStatus: profile.verification_status,
                submittedAt: profile.submitted_at,
                reviewedAt: profile.reviewed_at
            });
        }

        check caller->respond({
            profiles: responseProfiles,
            total: responseProfiles.length()
        });
    }

    // Delete driver profile (self or admin)
    resource function delete profile(http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error {
            check caller->respond({"error": auth.message()});
            return;
        }

        //string email = check auth.email.ensureType(string);
        //string role = check auth.role.ensureType(string);
        int userId = check auth.id.ensureType(int);

        json|error res = deleteDriverProfile(userId);
        if res is error {
            check caller->respond({"error": res.message()});
            return;
        }
        check caller->respond(res);
    }

    // Delete driver profile by user ID (admin only)
    resource function delete profile/user/[int userId](http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error {
            check caller->respond({"error": auth.message()});
            return;
        }

        string role = check auth.role.ensureType(string);
        if role != "admin" {
            check caller->respond({"error": "UNAUTHORIZED"});
            return;
        }

        json|error res = deleteDriverProfile(userId);
        if res is error {
            check caller->respond({"error": res.message()});
            return;
        }
        check caller->respond(res);
    }

    // Get driver statistics (admin only)
    resource function get stats(http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error {
            check caller->respond({"error": auth.message()});
            return;
        }

        string role = check auth.role.ensureType(string);
        if role != "admin" {
            check caller->respond({"error": "UNAUTHORIZED"});
            return;
        }

        json|error stats = getDriverStats();
        if stats is error {
            check caller->respond({"error": stats.message()});
            return;
        }
        check caller->respond(stats);
    }
};
