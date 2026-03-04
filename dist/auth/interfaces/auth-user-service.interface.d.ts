export declare const AUTH_USER_SERVICE = "AUTH_USER_SERVICE";
export declare const AUTH_MODULE_OPTIONS = "AUTH_MODULE_OPTIONS";
export interface AuthUserService {
    findById(id: string): Promise<any | null>;
    create(data: {
        email?: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
        [key: string]: any;
    }): Promise<any>;
}
