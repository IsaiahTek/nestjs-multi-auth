export const AUTH_USER_SERVICE = 'AUTH_USER_SERVICE';
export const AUTH_MODULE_OPTIONS = 'AUTH_MODULE_OPTIONS';

export interface AuthUserService {
    /**
     * Find a user by ID
     */
    findById(id: string): Promise<any | null>;

    /**
     * Create a new user based on signup details
     */
    create(data: {
        email?: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
        [key: string]: any; // Allow consuming app to receive additional details
    }): Promise<any>;
}
