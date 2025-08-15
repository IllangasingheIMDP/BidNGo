import ballerina/http;

// Simple in-memory user store (replace with DB later)
type User record {
    string username;
    string password; // NOTE: For demo only. Hash in production.
    int roleFlags;
};

type RegisterPayload record {| string username; string password; |};
type LoginPayload record {| string username; string password; |};

map<User> users = {};

service /api/auth on apiListener {

    resource function post register(@http:Payload RegisterPayload payload) returns json|error {
        string username = payload.username;
        string password = payload.password;

        if (users.hasKey(username)) {
            return error ("User already exists");
        }

        users[username] = {username, password, roleFlags: 1};
        return { "message": "User registered successfully" };
    }

    resource function post login(@http:Payload LoginPayload payload) returns json|error {
        string username = payload.username;
        string password = payload.password;

        if !users.hasKey(username) {
            return error ("User not found");
        }

        // Narrow the optional map value before accessing fields
        var maybeUser = users[username];
        if !(maybeUser is User) {
            return error ("User not found");
        }
        User user = maybeUser;
        if user.password != password {
            return error ("Invalid credentials");
        }

        // Stub token; replace with real JWT later
        string token = "dummy-token";
        return { "message": "User logged in successfully", "token": token };
    }

    resource function post refresh() returns json {
        return { "message": "Token refresh not implemented yet" };
    }
}

