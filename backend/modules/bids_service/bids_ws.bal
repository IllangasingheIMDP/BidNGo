import ballerina/websocket;
import ballerina/http;
import ballerina/io;

// Registry keeping track of connected WebSocket callers.
isolated class BidClientRegistry {
    private websocket:Caller[] callers = [];

    isolated function add(websocket:Caller c) {
        lock {
            self.callers.push(c);
        }
    }

    isolated function remove(websocket:Caller c) {
        lock {
            websocket:Caller[] remaining = [];
            foreach var existing in self.callers {
                if existing !== c { // reference equality
                    remaining.push(existing);
                }
            }
            self.callers = remaining;
        }
    }

    isolated function broadcast(string msg) {
        lock {
            websocket:Caller[] alive = [];
            foreach var c in self.callers {
                var writeRes = c->writeTextMessage(msg);
                if writeRes is error {
                    io:println("[WS bids] dropping client due to write error: " + writeRes.message());
                } else {
                    alive.push(c);
                }
            }
            self.callers = alive;
        }
    }
}

final BidClientRegistry bidClientRegistry = new;

public isolated function broadcastBidEvent(json event) {
    string payload = event.toJsonString();
    bidClientRegistry.broadcast(payload);
}


service /ws on new websocket:Listener(21003) {
    resource function get .(http:Request req) returns websocket:Service|websocket:UpgradeError {
        return new BidWsService();
    }
}
  
public service class BidWsService {
    *websocket:Service;

    // Add new clients on open
    remote isolated function onOpen(websocket:Caller caller) returns websocket:Error? {
        bidClientRegistry.add(caller);
        return caller->writeTextMessage("connected");
    }

    // Optional: simple echo & test broadcast
    remote isolated function onMessage(websocket:Caller caller, string|json data) returns websocket:Error? {
        if data is string {
            if data == "ping" {
                return caller->writeTextMessage("pong");
            } else if data.startsWith("echo ") {
                return caller->writeTextMessage(data.substring(5));
            } else if data.startsWith("broadcast ") {
                bidClientRegistry.broadcast(data.substring(10));
                return;
            }
        } else {
            // If JSON, just echo it back
            return caller->writeTextMessage(data.toJsonString());
        }
        return;
    }

    remote isolated function onClose(websocket:Caller caller, int statusCode, string reason) {
        bidClientRegistry.remove(caller);
    }

    remote isolated function onError(websocket:Caller caller, error err) {
        bidClientRegistry.remove(caller);
    }
}
