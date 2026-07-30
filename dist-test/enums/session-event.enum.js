"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionEvent = void 0;
var SessionEvent;
(function (SessionEvent) {
    SessionEvent[SessionEvent["LOGIN"] = 0] = "LOGIN";
    SessionEvent[SessionEvent["LOGOUT"] = 1] = "LOGOUT";
    SessionEvent[SessionEvent["REVOKE"] = 2] = "REVOKE";
    SessionEvent[SessionEvent["EXPIRE"] = 3] = "EXPIRE";
    SessionEvent[SessionEvent["DELETE"] = 4] = "DELETE";
})(SessionEvent || (exports.SessionEvent = SessionEvent = {}));
