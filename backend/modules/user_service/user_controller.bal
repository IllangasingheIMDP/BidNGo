import backend.db;
import ballerina/sql;
import ballerina/crypto;
import ballerina/lang.'string as strings;
import ballerina/io;

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
    return crypto:hashBcrypt(pw, workFactor=12);
}

function verifyPassword(string plain, string storedHash) returns boolean|error {
    // If your Ballerina version does not have verifyBcrypt, try crypto:verifyPassword(plain, storedHash)
    return crypto:verifyBcrypt(plain, storedHash);
}

public function getUser(string email) returns DBUser|error {
    stream<DBUser, error?> rs = db:dbClient->query(
        `SELECT * FROM users WHERE email = ${email}`
    );
    record {DBUser value;}? row = check rs.next();
    check rs.close();
    if row is () {
        return error("USER_NOT_FOUND");
    }
    return row.value;
}

public function updateEmail(string currentEmail, string newEmail) returns json|error {
    if strings:trim(newEmail) == "" {
        return error("NEW_EMAIL_EMPTY");
    }
    sql:ExecutionResult res = check db:dbClient->execute(
        `UPDATE users SET email = ${newEmail}, updated_at = NOW() WHERE email = ${currentEmail}`
    );
    if res.affectedRowCount == 0 {
        return error("USER_NOT_FOUND_OR_NO_CHANGE");
    }
    return { message: "EMAIL_UPDATED", newEmail, note: "Re-login to get a token with new email." };
}

public function updatePhone(string email, string newPhone) returns json|error {
    if strings:trim(newPhone) == "" {
        return error("NEW_PHONE_EMPTY");
    }
    sql:ExecutionResult res = check db:dbClient->execute(
        `UPDATE users SET phone = ${newPhone}, updated_at = NOW() WHERE email = ${email}`
    );
    if res.affectedRowCount == 0 {
        return error("USER_NOT_FOUND_OR_NO_CHANGE");
    }
    return { message: "PHONE_UPDATED", phone: newPhone };
}

public function updatePassword(string email, string currentPassword, string newPassword) returns json|error {
    if strings:trim(currentPassword) == "" || strings:trim(newPassword) == "" {
        return error("PASSWORD_FIELDS_EMPTY");
    }
    io:println("New hashed password: ", currentPassword);
    
    DBUser user = check getUser(email);
    string currentHashed = check hashPassword(currentPassword);
    io:println("current hashed password: ", currentHashed);
    boolean ok = check verifyPassword(currentPassword, user.password);
    if !ok {
        return error("CURRENT_PASSWORD_INVALID");
    }
    string newHashed = check hashPassword(newPassword);

    ok = check verifyPassword(newPassword, currentHashed);
    if !ok {
        return error("NEW_PASSWORD_INVALID");
    }
    sql:ExecutionResult res = check db:dbClient->execute(
        `UPDATE users SET password = ${newHashed}, updated_at = NOW() WHERE email = ${email}`
    );
    if res.affectedRowCount == 0 {
        return error("PASSWORD_UPDATE_FAILED");
    }
    return { message: "PASSWORD_UPDATED" };
}

public function deleteUser(string email) returns json|error {
    sql:ExecutionResult res = check db:dbClient->execute(
        `DELETE FROM users WHERE email = ${email}`
    );
    if res.affectedRowCount == 0 {
        return error("USER_NOT_FOUND");
    }
    return { message: "USER_DELETED" };
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