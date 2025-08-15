import backend.db;
import ballerina/sql;
import ballerina/crypto;
import ballerina/lang.'string as strings;

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
        return "";
    }
    return hashedPassword;
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
    DBUser user = check getUser(email);
    string currentHashed = hashPassword(currentPassword);
    if currentHashed != user.password {
        return error("CURRENT_PASSWORD_INVALID");
    }
    string newHashed = hashPassword(newPassword);
    if newHashed == user.password {
        return error("PASSWORD_SAME_AS_OLD");
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