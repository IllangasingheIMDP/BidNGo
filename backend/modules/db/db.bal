import ballerinax/postgresql;

// Load from environment variable (set in .env or shell)

// Mark as required configurable (no silent fallback)
configurable string DB_PASSWORD = ?;
configurable string host = "aws-1-ap-southeast-1.pooler.supabase.com";
configurable string dbUsername = "postgres.wkjheqsekenkoowlqecy";
configurable string dbPassword = DB_PASSWORD;
configurable string dbName = "postgres";
configurable int port = 5432;



// string clientStorePath = "/path/to/keystore.p12";

// postgresql:Options postgresqlOptions = {
//     ssl: {
//         mode: postgresql:ALLOW,
//         key: {
//             path: clientStorePath,
//             password: "ballerina"
//         }
//     }
// };

// `final` ensures only one connection is used
public final postgresql:Client dbClient = check new (username = dbUsername, 
                password = dbPassword, database = dbName,host =host);
