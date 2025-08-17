import backend.db;
import ballerina/sql;

import ballerina/lang.'string as strings;
import ballerina/io;
import ballerina/jwt;
type RegisterUser record {|
    string name;
    string phone;
    string email;
    string password;
|};

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
function hashPassword(string pw) returns string|error {
    // DEV ONLY: insecure reversible encoding
    return pw.toBytes().toBase64();
}
function verifyPassword(string plain, string storedHash) returns boolean|error {
    string candidate = plain.toBytes().toBase64();
    return candidate == storedHash;

}

// Secure login
public function login(json data) returns json|error {
    string email = check data.email.ensureType(string);
    string password = check data.password.ensureType(string);

    if strings:trim(email) == "" || strings:trim(password) == "" {
        return error("EMAIL_OR_PASSWORD_MISSING");
    }

    stream<DBUser, error?> resultStream = db:dbClient->query(
        `SELECT * FROM users WHERE email = ${email}`
    );
    record {DBUser value;}? result = check resultStream.next();
    check resultStream.close();

    if result is () {
        return error("USER_NOT_FOUND");
    }
    
 
    DBUser dbUser = result.value;

    // Hash provided password and compare
    
    boolean|error ok = verifyPassword(password, dbUser.password);
    if ok is error {
        return ok;
    }
    if !ok {
        return error("INVALID_PASSWORD");
    }
    
    jwt:IssuerConfig issuerConfig = {
        
        issuer: "BIDNGO",
        audience: "users_bidngo",
        expTime: 604800, // token expiry in seconds
        
        signatureConfig: {
                    config: {
                        keyFile: "private.key" // Path to your private key
                    }
                },
                customClaims: { "role": "passenger","email":dbUser.email,"id":dbUser.id }
            };
    string token = check jwt:issue(issuerConfig);


    return { message: "Logged in Successfully", token: token };
}

// Secure registration
public function register(json data) returns json|error {
    RegisterUser user = check data.cloneWithType(RegisterUser);

    if strings:trim(user.name) == "" || strings:trim(user.phone) == "" ||
       strings:trim(user.email) == "" || strings:trim(user.password) == "" {
        return error("MISSING_REQUIRED_FIELDS");
    }

    // Hash password
    string|error hashedPassword = hashPassword(user.password);
    if hashedPassword is error {
        return hashedPassword;
    }
    sql:ParameterizedQuery insert_query=`INSERT INTO users (name, phone, email, password)
         VALUES (${user.name}, ${user.phone}, ${user.email}, ${hashedPassword})`;

    sql:ExecutionResult result = check db:dbClient->execute(insert_query);
    io:print("Inserted ${result.affectedRowCount} row(s)");

    if result.affectedRowCount == 1 {
        return { message: "User registered successfully" };
    }

    return error("REGISTRATION_FAILED");
}

public function getUserProfile(string email) returns json|error {
    if strings:trim(email) == "" {
        return error("EMAIL_MISSING");
    }

    stream<DBUser, error?> resultStream = db:dbClient->query(
        `SELECT * FROM users WHERE email = ${email}`
    );
    record {DBUser value;}? result = check resultStream.next();
    check resultStream.close();

    if result is () {
        return error("USER_NOT_FOUND");
    }
    DBUser dbUser = result.value;

    return {
        name: dbUser.name,
        phone: dbUser.phone,
        email: dbUser.email,
        role_flags: dbUser.role_flags,
        is_verified: dbUser.is_verified,
        created_at: dbUser.created_at,
        updated_at: dbUser.updated_at
    };
}
