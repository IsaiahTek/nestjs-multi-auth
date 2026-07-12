"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthEntities = void 0;
const auth_entity_1 = require("./auth.entity");
const auth_identify_entity_1 = require("./auth-identify.entity");
const oauth_provider_entity_1 = require("./oauth-provider.entity");
const otp_token_entity_1 = require("./otp-token.entity");
const mfa_method_entity_1 = require("./mfa-method.entity");
const session_entity_1 = require("./session.entity");
exports.AuthEntities = [
    auth_entity_1.Auth,
    auth_identify_entity_1.AuthIdentifier,
    oauth_provider_entity_1.OAuthProvider,
    otp_token_entity_1.OtpToken,
    session_entity_1.Session,
    mfa_method_entity_1.MfaMethod
];
//# sourceMappingURL=entities.js.map