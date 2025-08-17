import ballerina/http;
import ballerina/time;
import ballerina/crypto;
import backend.middleware;
import backend.db;
import ballerina/lang.'string as strings;


configurable string CLOUDINARY_API_KEY = ?;
configurable string CLOUDINARY_API_SECRET = ?;
configurable string CLOUDINARY_CLOUD_NAME = ?;

type DriverProfileReq record {|
    string nic_number;
    string license_number;
    string vehicle_reg_number;
    string vehicle_model;
    string[] documents;
|};

type DriverProfileResp record {|
    int id;
    string nic_number;
    string license_number;
    string vehicle_reg_number;
    string vehicle_model;
    string[] doc_urls;
    string verification_status;
|};

// Manual validator to avoid opaque {ballerina/lang.value}ConversionError
function validateDriverProfile(json payload) returns DriverProfileReq|error {
    if payload is map<json> {
        map<json> obj = payload;
        function(string key) returns string|error fetchStr = function(string key) returns string|error {
            if !obj.hasKey(key) { return error("MISSING_FIELD_" + key.toUpperAscii()); }
            json v = obj[key];
            if v is string {
                if strings:trim(v) == "" { return error("EMPTY_FIELD_" + key.toUpperAscii()); }
                return v;
            }
            return error("INVALID_TYPE_" + key.toUpperAscii());
        };
        string nic = check fetchStr("nic_number");
        string lic = check fetchStr("license_number");
        string vehReg = check fetchStr("vehicle_reg_number");
        string vehModel = check fetchStr("vehicle_model");
        if !obj.hasKey("doc_urls") { return error("MISSING_FIELD_DOCUMENTS"); }
        json docsJ = obj["doc_urls"];
        if docsJ is json[] {
            string[] docs = [];
            foreach var d in docsJ {
                if d is string {
                    if strings:trim(d) == "" { return error("EMPTY_DOCUMENT_ENTRY"); }
                    docs.push(d);
                } else { return error("INVALID_DOCUMENT_ENTRY_TYPE"); }
            }
            if docs.length() == 0 { return error("NO_DOCUMENTS"); }
            return { nic_number: nic, license_number: lic, vehicle_reg_number: vehReg, vehicle_model: vehModel, documents: docs };
        }
        return error("INVALID_TYPE_DOCUMENTS");
    }
    return error("INVALID_JSON_OBJECT");
}

function uploadToCloudinary(string fileData) returns string|error {
    if CLOUDINARY_API_KEY == "" || CLOUDINARY_API_SECRET == "" || CLOUDINARY_CLOUD_NAME == "" {
        return error("CLOUDINARY_CONFIG_INVALID");
    }
    string fileParam = fileData;
    if fileParam.startsWith("data:") {
        // keep as is
    } else if strings:trim(fileParam) == "" {
        return error("EMPTY_FILE_CONTENT");
    } else {
        fileParam = "data:application/octet-stream;base64," + fileParam;
    }

    // Generate UNIX timestamp (seconds) using time:utcNow (tuple [seconds, fraction])
    time:Utc utc = time:utcNow();
    int ts = <int>utc[0];
    string tsStr = ts.toString();
    string toSign = "timestamp=" + tsStr; // only timestamp param in this simple case
    // Cloudinary signature: SHA1(param_string + api_secret) then hex lowercase
    byte[] hash = crypto:hashSha1((toSign + CLOUDINARY_API_SECRET).toBytes());
    string signature = hash.toBase16().toLowerAscii();

    http:Client c = check new ("https://api.cloudinary.com");
    map<string|string> form = {
        file: fileParam,
        api_key: CLOUDINARY_API_KEY,
        timestamp: tsStr,
        signature: signature
    };

    http:Response|error res = c->post("/v1_1/" + CLOUDINARY_CLOUD_NAME + "/auto/upload", form);
    if res is error {
        return res;
    }
    
    


    if res.statusCode != 200 {
        string msg = check res.getTextPayload();
        return error("CLOUDINARY_UPLOAD_FAILED: " + msg);
    }
    json payload = check res.getJsonPayload();
    if payload is map<json> && payload.hasKey("secure_url") {
        return check payload["secure_url"].ensureType(string);
    }
    return error("CLOUDINARY_NO_URL");
}

function upsertDriverProfile(int userId, DriverProfileReq req, string[] docUrls) returns DriverProfileResp|error {
    // Use queryRow to directly obtain the inserted/updated row
    record {int id; string verification_status;} row = check db:dbClient->queryRow(
        `INSERT INTO driver_profiles
            (nic_number, license_number, vehicle_reg_number, vehicle_model, doc_urls, user_id, verification_status)
         VALUES (${req.nic_number}, ${req.license_number}, ${req.vehicle_reg_number}, ${req.vehicle_model},
                 ${docUrls}, ${userId}, 'pending')
         ON CONFLICT (user_id) DO UPDATE SET
             nic_number = EXCLUDED.nic_number,
             license_number = EXCLUDED.license_number,
             vehicle_reg_number = EXCLUDED.vehicle_reg_number,
             vehicle_model = EXCLUDED.vehicle_model,
             doc_urls = EXCLUDED.doc_urls,
             verification_status = 'pending'
         RETURNING id, verification_status`
    );
    return {
        id: row.id,
        nic_number: req.nic_number,
        license_number: req.license_number,
        vehicle_reg_number: req.vehicle_reg_number,
        vehicle_model: req.vehicle_model,
        doc_urls: docUrls,
        verification_status: row.verification_status
    };
}

public http:Service UploadService = @http:ServiceConfig {} service object {

    resource function post upload(http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error {
            check caller->respond({ "error": "UNAUTHORIZED" });
            return;
        }
        int id;
        if auth is map<json> {
            id = check auth["id"].ensureType(int);
        } else {
            check caller->respond({ "error": "AUTH_PARSE_ERROR" });
            return;
        }

        
        int userId = id;

        // Extract JSON payload first to avoid union (json|http:ClientError) causing type incompatibility
        json|http:ClientError rawPayload = req.getJsonPayload();
        if rawPayload is http:ClientError {
            check caller->respond({ "error": "BAD_REQUEST", detail: rawPayload.message() });
            return;
        }
        DriverProfileReq|error body = validateDriverProfile(rawPayload);
        if body is error {
           
            check caller->respond({ "error": "BAD_REQUEST", detail: body.message() });
            return;
        }
        DriverProfileReq dpReq = body;

        if dpReq.documents.length() == 0 {
            check caller->respond({ "error": "NO_DOCUMENTS" });
            return;
        }

        string[] uploaded = [];
        foreach var doc in dpReq.documents {
            string|error url = uploadToCloudinary(doc);
            if url is error {
                check caller->respond({ "error": "UPLOAD_FAILED", detail: url.message(), uploaded: uploaded });
                return;
            }
            uploaded.push(url);
        }

        DriverProfileResp|error saved = upsertDriverProfile(userId, dpReq, uploaded);
        if saved is error {
            check caller->respond({ "error": "DB_ERROR", detail: saved.message() });
            return;
        }

        check caller->respond({
            message: "DRIVER_PROFILE_SUBMITTED",
            profile: saved
        });
    }
};