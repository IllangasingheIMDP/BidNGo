import ballerina/http;
import ballerina/crypto;
import ballerina/jwt;
import ballerina/time;

// Placeholder for user data (will be replaced by DB interaction)
map<json> users = {};

service /api/auth on new http:Listener(8080) {

    resource function post register(@http:Payload {} json payload) returns json|error {
        string username = payload.username.toString();
        string password = payload.password.toString();

        if (users.hasKey(username)) {
            return error http:Conflict("User already exists");
        }

        // Hash password with bcrypt
        string hashedPassword = crypto:bcryptHash(password);

        // Store user (placeholder)
        users[username] = {"username": username, "password_hash": hashedPassword, "role_flags": 1};

        return { "message": "User registered successfully" };
    }

    resource function post login(@http:Payload {} json payload) returns json|error {
        string username = payload.username.toString();
        string password = payload.password.toString();

        if (!users.hasKey(username)) {
            return error http:NotFound("User not found");
        }

        json user = users[username];
        string storedPasswordHash = user.password_hash.toString();

        // Verify password
        if (!crypto:bcryptCompare(password, storedPasswordHash)) {
            return error http:Unauthorized("Invalid credentials");
        }

        // Generate JWT token (placeholder)
        jwt:Audience aud = ["http://localhost:9090"];
        time:Utc currentTime = time:utcNow();
        time:Utc expiryTime = time:utcAddSeconds(currentTime, 3600); // 1 hour expiry

        jwt:Claims claims = {
            "sub": username,
            "iss": "ballerina-auth-service",
            "aud": aud,
            "exp": expiryTime.unixSeconds,
            "iat": currentTime.unixSeconds,
            "role_flags": user.role_flags
        };

        string jwtSecret = "your_jwt_secret"; // TODO: Get from environment variable
        string token = jwt:encode(jwt:HS256, jwtSecret.toBytes(), claims);

        return { "message": "User logged in successfully", "token": token };
    }

    resource function post refresh(@http:Payload {} json payload) returns json|error {
        // TODO: Implement token refresh logic (requires refresh token in DB)
        return { "message": "Token refresh not implemented yet" };
    }
}

