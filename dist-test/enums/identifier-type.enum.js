"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentifierSource = exports.IdentifierType = void 0;
var IdentifierType;
(function (IdentifierType) {
    IdentifierType["EMAIL"] = "EMAIL";
    IdentifierType["PHONE"] = "PHONE";
    IdentifierType["USERNAME"] = "USERNAME";
})(IdentifierType || (exports.IdentifierType = IdentifierType = {}));
var IdentifierSource;
(function (IdentifierSource) {
    IdentifierSource["APPLE"] = "APPLE";
    IdentifierSource["FACEBOOK"] = "FACEBOOK";
    IdentifierSource["GOOGLE"] = "GOOGLE";
    IdentifierSource["LOCAL"] = "LOCAL";
})(IdentifierSource || (exports.IdentifierSource = IdentifierSource = {}));
