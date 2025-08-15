type User record {|
    string username;
    string password;
|};

public function login(json data) returns json|error {
    User user = check data.cloneWithType(User);
    if user.username == "" || user.password == "" {
        return error("USERNAME_OR_PASSWORD_MISSING");
    }
    return { message: "Logged in", token: "abc123" };
}