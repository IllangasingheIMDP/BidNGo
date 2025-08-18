import ballerinax/postgresql;

// Load from environment variable (set in .env or shell)

// Mark as required configurable (no silent fallback)
configurable string DB_PASSWORD = ?;
configurable string host = "db.wkjheqsekenkoowlqecy.supabase.co";
configurable string dbUsername = "postgres";
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
