# Code of Conduct

- Modularize code for reusability
- Follow DRY principle
- Implement proper error handling with clear messages and correct status codes
- Consider all edge cases
- Keep it simple
- Prioritize developer experience and code readability
- Add concise JSDoc comments only when necessary (complex logic, API endpoints)
- Always add JSDoc for API endpoints (route + controller) with complete route path, expected req/res body, and samples
- Follow folder structure strictly
- Console log all errors using `console.log()` only (no warn/error, no emojis)
- Console log requests and responses for debugging
- Implement validation on all request bodies; return appropriate error message and status code on failure
- Always use `sendResponse` from `@shared/utils` for responses
- Never use long strings of "=" or "-" for visual separation in code
