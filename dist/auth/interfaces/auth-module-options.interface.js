"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionCreationPolicy = exports.AUTH_MODULE_OPTIONS = void 0;
exports.AUTH_MODULE_OPTIONS = 'AUTH_MODULE_OPTIONS';
/**
 * How session creation is done. Default is create session for every login without reusing old/existing session.
 */
var SessionCreationPolicy;
(function (SessionCreationPolicy) {
    SessionCreationPolicy[SessionCreationPolicy["ALWAYS_NEW"] = 0] = "ALWAYS_NEW";
    SessionCreationPolicy[SessionCreationPolicy["REUSE_DEVICE"] = 1] = "REUSE_DEVICE";
})(SessionCreationPolicy || (exports.SessionCreationPolicy = SessionCreationPolicy = {}));
//# sourceMappingURL=auth-module-options.interface.js.map