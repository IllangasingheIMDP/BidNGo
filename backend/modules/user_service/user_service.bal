import ballerina/http;
import backend.middleware;


// Helper authorization: allow self or admin
function authorized(string tokenEmail, string tokenRole, string targetEmail) returns boolean {
    return tokenEmail == targetEmail || tokenRole == "admin";
}

public http:Service UserService = @http:ServiceConfig {} service object {

    // Get own profile
    resource function get me(http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error {
            check caller->respond({ "error":"UNAUTHORIZED" });
            return;
        }
        string email;
        if auth is map<json>{
            email = check auth["email"];
        }
        else {
             email = "";
        }

        json|error user = getUserProfile(email); // reuse existing auth controller function via module path if needed
        if user is error {
            check caller->respond({ "error": "getting user error" });
            return;
        }
        check caller->respond(user);
    }

    // Get any user (self or admin)
    resource function get user/[string email](http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error {
            json errBody = { "error": auth.message() };
            check caller->respond(errBody);
            return;
        }
        

        json|error user = getUser(email);
        if user is error {
            json errBody = { "error": user.message() };
            check caller->respond(errBody);
            return;
        }
        DBUser u = <DBUser>user;
        check caller->respond({
            name: u.name,
            phone: u.phone,
            email: u.email,
            role_flags: u.role_flags,
            is_verified: u.is_verified,
            created_at: u.created_at,
            updated_at: u.updated_at
        });
    }

    // Update email (self only or admin for others)
    resource function put email(http:Caller caller, http:Request req) returns error? {
        json body = check req.getJsonPayload();
        string targetEmail = check body.currentEmail.ensureType(string);
        string newEmail = check body.newEmail.ensureType(string);

        json|error auth = middleware:validateJWT(req);
        if auth is error {
            json errBody = { "error": auth.message() };
            check caller->respond(errBody);
            return;
        }
        string tokenEmail = check auth.email.ensureType(string);
        string role = check auth.role.ensureType(string);
        if !authorized(tokenEmail, role, targetEmail) {
            check caller->respond({ "error": "UNAUTHORIZED" });
            return;
        }
        json|error res = updateEmail(targetEmail, newEmail);
        if res is error {
            check caller->respond({ "error": res.message() });
            return;
        }
        check caller->respond(res);
    }

    // Update phone
    resource function put phone(http:Caller caller, http:Request req) returns error? {
        json body = check req.getJsonPayload();
        string newPhone = check body.newPhone.ensureType(string);

        json|error auth = middleware:validateJWT(req);
        if auth is error {
            check caller->respond({ "error": auth.message() });
            return;
        }
        string email = check auth.email.ensureType(string);
        json|error res = updatePhone(email, newPhone);
        if res is error {
            check caller->respond({ "error": res.message() });
            return;
        }
        check caller->respond(res);
    }

    // Update password
    resource function put password(http:Caller caller, http:Request req) returns error? {
        json body = check req.getJsonPayload();
        string currentPassword = check body.currentPassword.ensureType(string);
        string newPassword = check body.newPassword.ensureType(string);

        json|error auth = middleware:validateJWT(req);
        if auth is error {
            check caller->respond({ "error": auth.message() });
            return;
        }
        string email = check auth.email.ensureType(string);
        json|error res = updatePassword(email, currentPassword, newPassword);
        if res is error {
            check caller->respond({ "error": res.message() });
            return;
        }
        check caller->respond(res);
    }

    // Delete user (self or admin)
    resource function delete [string email](http:Caller caller, http:Request req) returns error? {
        json|error auth = middleware:validateJWT(req);
        if auth is error {
            check caller->respond({ "error": auth.message() });
            return;
        }
        string tokenEmail = check auth.email.ensureType(string);
        string role = check auth.role.ensureType(string);
        if !authorized(tokenEmail, role, email) {
            check caller->respond({ "error": "UNAUTHORIZED" });
            return;
        }
        json|error res = deleteUser(email);
        if res is error {
            check caller->respond({ "error": res.message() });
            return;
        }
        check caller->respond(res);
    }
};