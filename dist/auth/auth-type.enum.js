"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthTransport = exports.OAuthProviderType = exports.AuthStrategy = void 0;
var AuthStrategy;
(function (AuthStrategy) {
    AuthStrategy["LOCAL"] = "LOCAL";
    AuthStrategy["OAUTH"] = "OAUTH";
})(AuthStrategy || (exports.AuthStrategy = AuthStrategy = {}));
var OAuthProviderType;
(function (OAuthProviderType) {
    OAuthProviderType["GOOGLE"] = "GOOGLE";
    OAuthProviderType["FACEBOOK"] = "FACEBOOK";
    OAuthProviderType["APPLE"] = "APPLE";
})(OAuthProviderType || (exports.OAuthProviderType = OAuthProviderType = {}));
var AuthTransport;
(function (AuthTransport) {
    AuthTransport["COOKIE"] = "cookie";
    AuthTransport["BEARER"] = "bearer";
    AuthTransport["BOTH"] = "both";
})(AuthTransport || (exports.AuthTransport = AuthTransport = {}));
//# sourceMappingURL=auth-type.enum.js.map