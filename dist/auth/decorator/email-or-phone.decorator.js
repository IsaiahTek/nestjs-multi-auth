"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsEmailOrPhone = IsEmailOrPhone;
/* eslint-disable @typescript-eslint/no-unused-vars */
const types_1 = require("class-validator/types");
function IsEmailOrPhone(validationOptions) {
    return function (object, propertyName) {
        (0, types_1.registerDecorator)({
            name: 'isEmailOrPhone',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value, args) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    const phoneRegex = /^\+?[1-9]\d{6,14}$/; // E.164 format
                    return emailRegex.test(value) || phoneRegex.test(value);
                },
                defaultMessage(args) {
                    return `${args.property} must be a valid email or phone number`;
                },
            },
        });
    };
}
//# sourceMappingURL=email-or-phone.decorator.js.map