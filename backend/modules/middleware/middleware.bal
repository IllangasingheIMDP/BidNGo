import ballerina/jwt;
import ballerina/http;
public function validateJWT(http:Request req) returns json|error {
    string|error authHeader = req.getHeader("Authorization");
        if authHeader is error || !authHeader.startsWith("Bearer ") {
            return { "error": "Missing or invalid Authorization header" };
        }
        string token = authHeader.substring(7);
    
    jwt:ValidatorConfig valConfig = {
            issuer: "BIDNGO",
            audience: "users_bidngo",
            signatureConfig: {
                certFile: "public.cert" // path to your public key cert for signature validation
            }
        };
  // Validate the JWT token and get the payload
    jwt:Payload|error result = jwt:validate(token, valConfig);
    if result is error {
        return result;
    }
    jwt:Payload payload = result;

        // You can now use the payload claims
        // Access claims directly from the payload record
        string username = <string>payload["email"];
        string role = <string>payload["role"];
        return { email: username, role: role };
}