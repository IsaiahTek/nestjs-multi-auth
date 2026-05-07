# v0.1.6
## Cookie Scoping
This release adds subdomain-aware cookie scoping for authentication. Cookies are now isolated per subdomain, enabling multiple accounts to be securely maintained in the same browser session across different tenant or vendor domains without session collision.

# v0.1.7
## Cookie Dependency Fix
This release addresses `UnknownDependenciesException [Error]: Nest can't resolve dependencies of the AuthCookieService (?). Please make sure that the argument at index [0] is available in the current module.` and fixed the issue