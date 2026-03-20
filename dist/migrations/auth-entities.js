"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthEntities = void 0;
const auth_entity_1 = require("../auth/entities/auth.entity");
const auth_identify_entity_1 = require("../auth/entities/auth-identify.entity");
const oauth_provider_entity_1 = require("../auth/entities/oauth-provider.entity");
const mfa_method_entity_1 = require("../auth/entities/mfa-method.entity");
const otp_token_entity_1 = require("../auth/entities/otp-token.entity");
const session_entity_1 = require("../auth/entities/session.entity");
exports.AuthEntities = [
    auth_entity_1.Auth,
    auth_identify_entity_1.AuthIdentifier,
    oauth_provider_entity_1.OAuthProvider,
    mfa_method_entity_1.MfaMethod,
    otp_token_entity_1.OtpToken,
    session_entity_1.Session,
];
//# sourceMappingURL=auth-entities.js.map