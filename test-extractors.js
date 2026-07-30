const { ExtractJwt } = require('passport-jwt');
const req = {
  cookies: { access_token: 'cookie_token' },
  headers: { authorization: 'Bearer bearer_token' }
};

const cookieExtractor = (req) => req.cookies.access_token;
const bearerExtractor = ExtractJwt.fromAuthHeaderAsBearerToken();

const extractor = ExtractJwt.fromExtractors([cookieExtractor, bearerExtractor]);
console.log('Result:', extractor(req));
