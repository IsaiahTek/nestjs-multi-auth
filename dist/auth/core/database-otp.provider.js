"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DatabaseOtpProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseOtpProvider = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const repository_tokens_1 = require("../interfaces/repository-tokens");
const auth_module_options_interface_1 = require("../interfaces/auth-module-options.interface");
let DatabaseOtpProvider = DatabaseOtpProvider_1 = class DatabaseOtpProvider {
    constructor(otpRepo, options) {
        this.otpRepo = otpRepo;
        this.options = options;
        this.logger = new common_1.Logger(DatabaseOtpProvider_1.name);
    }
    async issue(request) {
        let code;
        let handledDelivery = false;
        console.log("DBS Issue OTP REQUEST TO ACCOUNTS:", JSON.stringify(this.options?.testAccounts));
        const testAccount = this.options.testAccounts?.find(ta => ta.identifier === request.identifier);
        if (testAccount) {
            code = testAccount.otp;
            handledDelivery = true; // Skip sending notification
        }
        else if (this.options.debugMode && this.options.defaultOtp) {
            code = this.options.defaultOtp;
        }
        else {
            code = Math.floor(100000 + Math.random() * 900000).toString();
        }
        const hash = await bcrypt.hash(code, 10);
        const expiresAt = new Date();
        const otpExpMins = request.expiresIn || this.options.otpExpiresIn || 15;
        expiresAt.setMinutes(expiresAt.getMinutes() + otpExpMins);
        await this.otpRepo.create({
            identifier: request.identifier,
            purpose: request.purpose,
            codeHash: hash,
            expiresAt,
            requestUserId: request.uid,
            requestAuthId: request.authId,
        });
        return {
            handledDelivery,
            code,
            expiresAt,
        };
    }
    async verify(request) {
        let otp;
        if (request.purpose) {
            otp = await this.otpRepo.findLatestUnusedByPurpose(request.uid, request.purpose);
        }
        else {
            otp = await this.otpRepo.findLatestUnused(request.uid);
        }
        if (!otp) {
            throw new common_1.BadRequestException('No verification code found');
        }
        if (new Date() > otp.expiresAt) {
            throw new common_1.BadRequestException('Verification code expired');
        }
        const isMatch = await bcrypt.compare(request.code, otp.codeHash);
        if (!isMatch) {
            throw new common_1.BadRequestException('Invalid verification code');
        }
        otp.isUsed = true;
        await this.otpRepo.save(otp);
        return {
            success: true,
            authId: otp.requestAuthId,
            metadata: {
                identifier: otp.identifier,
                purpose: otp.purpose,
            }
        };
    }
    async resend(request) {
        let latestOtp;
        if (request.purpose) {
            latestOtp = await this.otpRepo.findLatestUnusedByPurpose(request.uid, request.purpose);
        }
        else {
            latestOtp = await this.otpRepo.findLatestUnused(request.uid);
        }
        if (latestOtp) {
            const intervalSeconds = this.options.otpResendInterval || 60;
            const diffMs = Date.now() - latestOtp.createdAt.getTime();
            if (diffMs < intervalSeconds * 1000) {
                const wait = Math.ceil(intervalSeconds - (diffMs / 1000));
                throw new common_1.BadRequestException(`Please wait ${wait} seconds before requesting a new code.`);
            }
            // We issue a new OTP for the same identifier and purpose
            return this.issue({
                uid: request.uid,
                authId: latestOtp.requestAuthId,
                identifier: latestOtp.identifier,
                identifierType: latestOtp.identifier.includes('@') ? 'email' : 'phone', // rough heuristic, ideally should come from request
                purpose: latestOtp.purpose,
            });
        }
        throw new common_1.BadRequestException('No previous verification code found to resend.');
    }
};
exports.DatabaseOtpProvider = DatabaseOtpProvider;
exports.DatabaseOtpProvider = DatabaseOtpProvider = DatabaseOtpProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(repository_tokens_1.OTP_TOKEN_REPOSITORY_TOKEN)),
    __param(1, (0, common_1.Inject)(auth_module_options_interface_1.AUTH_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [Object, Object])
], DatabaseOtpProvider);
//# sourceMappingURL=database-otp.provider.js.map