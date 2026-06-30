# v0.2.0
## Force Verification on Google
1. This release splits the Google verification force option into `forceVerificationOnGoogleSignup` and `forceVerificationOnGoogleLogin` in `AuthModuleOptions` for finer control.

## Debug Mode and Default OTP
1. This release adds support for `debugMode` and `defaultOtp` options in `AuthModuleOptions`.

## Deprecations
1. `CookieNameConfig` is deprecated in favour of `AuthContext`
2. `cookieNameResolver` is deprecated in favour of `authContextResolver`

## Features
1. Scoped sessions are now supported. See README.md for more information about this feature

# v0.1.11
## Phone Auth Regex Validation
1. This release fixes an issue where the phone auth regex was not working as expected.

# v0.1.10
## Phone Auth with Internationalized Numbers
1. This release fixed bugs and issues around phone auth and support for internationalized phone numbers.

# v0.1.9
## Cookie Path Configuration
1. This release adds support for configuring the refresh token cookie path via the `refreshTokenPath` option in `AuthModuleOptions`. The default value is now set to '/auth/refresh' instead of '/'.
2. This release adds support for configuring the same-site policy for auth cookies via the `cookieSameSite` option in `AuthModuleOptions`. The default value is now set to 'lax' in production and 'none' in development.
3. This release adds support for explicitly setting the Secure flag on cookies via the `cookieSecure` option in `AuthModuleOptions`. The default value is now set to true in production and false in development. Note that `sameSite` option being set to 'none' automatically sets the Secure flag to true.

---

# v0.1.8
## Extra Data in Signup Event
This release adds support for passing extra data in signup events. The extraData field can be used to pass any additional data that may be needed for other purposes. The extraData field is optional and can be omitted if no extra data is needed.

---

# v0.1.7
## Cookie Dependency Fix
This release addresses `UnknownDependenciesException [Error]: Nest can't resolve dependencies of the AuthCookieService (?). Please make sure that the argument at index [0] is available in the current module.` and fixed the issue.

---

# v0.1.6
## Cookie Scoping
This release adds subdomain-aware cookie scoping for authentication. Cookies are now isolated per subdomain, enabling multiple accounts to be securely maintained in the same browser session across different tenant or vendor domains without session collision.

