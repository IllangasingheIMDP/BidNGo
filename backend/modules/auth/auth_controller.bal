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
type DriverProfileReq record {|
    string nic_number;
    string license_number;
    string vehicle_reg_number;
    string vehicle_model;
    
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
                customClaims: { "role": dbUser.role_flags == 1 ? "passenger" : "driver","email":dbUser.email,"id":dbUser.id, "name": dbUser.name, "phone": dbUser.phone }
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

public function driver_register_as_user(json data) returns json|error {
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
    sql:ParameterizedQuery insert_query=`INSERT INTO users (name, phone, email, password,role_flags)
         VALUES (${user.name}, ${user.phone}, ${user.email}, ${hashedPassword},0)`;

    sql:ExecutionResult result = check db:dbClient->execute(insert_query);
    io:print("Inserted ${result.affectedRowCount} row(s)");

    if result.affectedRowCount == 1 {
        return { message: "User registered successfully" };
    }

    return error("REGISTRATION_FAILED");

}

public function complete_driver_registration(json data,int user_id) returns json|error {
    DriverProfileReq req = check data.cloneWithType(DriverProfileReq);

    if strings:trim(req.nic_number) == "" || strings:trim(req.license_number) == "" || strings:trim(req.vehicle_reg_number) == "" ||
       strings:trim(req.vehicle_model) == "" {
        return error("MISSING_REQUIRED_FIELDS");
    }

    sql:ParameterizedQuery insert_query=`insert into driver_profiles (user_id,nic_number, license_number, vehicle_reg_number, vehicle_model)
         VALUES (${user_id}, ${req.nic_number}, ${req.license_number}, ${req.vehicle_reg_number}, ${req.vehicle_model})`;

    sql:ExecutionResult result = check db:dbClient->execute(insert_query);
    io:print("Updated ${result.affectedRowCount} row(s)");

    if result.affectedRowCount == 1 {
        return { message: "Driver registration completed successfully" };
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

