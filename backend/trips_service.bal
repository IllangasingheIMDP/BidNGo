import ballerina/http;

service /api/trips on apiListener {
    resource function get info() returns http:Response {
        http:Response res = new;
        res.setJsonPayload({ message: "Trips service placeholder" });
        return res;
    }
}

