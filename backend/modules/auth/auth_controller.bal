import backend.db;
import ballerina/sql;
import ballerina/crypto;
import ballerina/lang.'string as strings;
import ballerina/io;

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
function hashPassword(string pw) returns string {

    byte[] hashedBytes = crypto:hashSha256(pw.toBytes());
    string|error hashedPassword = strings:fromBytes(hashedBytes);
    if hashedPassword is error {
        // Handle the unlikely error by returning an empty string or a custom value
        return "";
    }
    return hashedPassword; // stable ASCII string
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
    
    string hashedPassword = hashPassword(password);

    if hashedPassword != dbUser.password {
        return error("INVALID_PASSWORD");
    }

    return { message: "Logged in", token: "abc123" };
}

// Secure registration
public function register(json data) returns json|error {
    RegisterUser user = check data.cloneWithType(RegisterUser);

    if strings:trim(user.name) == "" || strings:trim(user.phone) == "" ||
       strings:trim(user.email) == "" || strings:trim(user.password) == "" {
        return error("MISSING_REQUIRED_FIELDS");
    }

    // Hash password
    string hashedPassword = hashPassword(user.password);
    sql:ParameterizedQuery insert_query=`INSERT INTO users (name, phone, email, password)
         VALUES (${user.name}, ${user.phone}, ${user.email}, ${hashedPassword})`;

    sql:ExecutionResult result = check db:dbClient->execute(insert_query);
    io:print("Inserted ${result.affectedRowCount} row(s)");

    if result.affectedRowCount == 1 {
        return { message: "User registered successfully" };
    }

    return error("REGISTRATION_FAILED");
}
