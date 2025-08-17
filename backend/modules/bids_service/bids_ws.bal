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

// Client connects: ws://<host>:8082/ws/bids
service /ws/bids on new websocket:Listener(8082) {
    resource isolated function get .(http:Request req) returns websocket:Service|websocket:UpgradeError {
        return new BidWsService();
    }
}

service class BidWsService {
    *websocket:Service;

    

    remote isolated function onMessage(websocket:Caller caller, string|json data) returns websocket:Error? {
        if data is string {
            if data == "ping" { return caller->writeTextMessage("pong"); }
        }
        return ();
    }

    remote isolated function onClose(websocket:Caller caller, int statusCode, string reason) {
        bidClientRegistry.remove(caller);
    }

    remote isolated function onError(websocket:Caller caller, error err) {
        bidClientRegistry.remove(caller);
    }
}
