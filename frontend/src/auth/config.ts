import { env } from "../config/env";

export const cognitoConfig = {
  userPoolId: env.cognitoUserPoolId,
  clientId: env.cognitoClientId,
  region: env.cognitoRegion,
  domain: env.cognitoDomain,
  redirectUri: env.cognitoRedirectUri,
  responseType: env.responseType,
  scope: env.scope,
};
