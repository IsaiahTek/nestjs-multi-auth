
# v0.1.8
## Extra Data in Signup Event
This release adds support for passing extra data in signup events. The extraData field can be used to pass any additional data that may be needed for other purposes. The extraData field is optional and can be omitted if no extra data is needed.

# v0.1.7
## Cookie Dependency Fix
This release addresses `UnknownDependenciesException [Error]: Nest can't resolve dependencies of the AuthCookieService (?). Please make sure that the argument at index [0] is available in the current module.` and fixed the issue.

# v0.1.6
## Cookie Scoping
This release adds subdomain-aware cookie scoping for authentication. Cookies are now isolated per subdomain, enabling multiple accounts to be securely maintained in the same browser session across different tenant or vendor domains without session collision.

