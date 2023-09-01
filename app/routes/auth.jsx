import { redirect } from "@shopify/remix-oxygen";
import * as jose from 'jose';

import { Multipass } from '~/lib/multipass';

// This is the GraphQL mutation to create a new customer
const LOGINWITHMULTIPASS_MUTATION = `#graphql
  mutation customerAccessTokenCreateWithMultipass($multipassToken: String!) {
    customerAccessTokenCreateWithMultipass(multipassToken: $multipassToken) {
      customerUserErrors {
        code
        field
        message
      }
      customerAccessToken {
        accessToken
        expiresAt
      }
    }
  }
`;

// Parses a cookie
function parseCookie(cookie) {
  const segments = cookie.split(';');
  return segments.reduce(
    (accumulator, currentValue) => {
      const keyValue = currentValue.split('=');
      const key = keyValue[0].trim();
      const value = keyValue[1].trim();
      accumulator[key] = value;
      return accumulator;
    },
    {});
}

// Verifies Google ID token
async function verifyIdToken(oAuthClientId, idToken) {
  try {
    const JWKS = jose.createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
    const { payload, protectedHeader } = await jose.jwtVerify(idToken, JWKS, {
      issuer: 'https://accounts.google.com',
      audience: oAuthClientId,
    });

    return payload;
  } catch (exception) {
    console.log(`Error verifying ID token: ${exception}`);

    return null;
  }
}

// Redirects to login page with error message
async function loginAgain(session, errorMessage) {
  session.flash('error', errorMessage);

  return redirect('/account/googlelogin', {
    headers: {
      "Set-Cookie": await session.commit(),
    },
  });
}

// Creates a new customer using multipass
async function loginWithMultipass(storefront, multipassToken) {
  const { customerAccessTokenCreateWithMultipass } =
      await storefront.mutate(LOGINWITHMULTIPASS_MUTATION, {
    variables: { multipassToken },
    cache: storefront.CacheNone(),
  });

  if (customerAccessTokenCreateWithMultipass?.customerAccessToken?.accessToken) {
    return customerAccessTokenCreateWithMultipass.customerAccessToken;
  }

  return null;
}

export const action = async ({ request, context }) => {
  const { cart, env, session, storefront } = context;

  // Verify CSRF token
  const cookie = request.headers.get('Cookie');
  const parsedCookie = parseCookie(cookie);
  const csrfTokenCookie = parsedCookie?.g_csrf_token;

  const body = await request.formData();
  const csrfTokenBody = body.get('g_csrf_token');

  if (csrfTokenCookie !== csrfTokenBody) {
    return await loginAgain(session, 'CSRF token did not match');
  }

  // Verify Google ID token
  const credential = body.get('credential');
  const payload = await verifyIdToken(env.GOOGLE_OAUTH_CLIENT_ID, credential);

  if (payload === null) {
    return await loginAgain(session, 'Failed to verify the ID token');
  }

  // Login with multipass
  const multipass = new Multipass(env.SHOPIFY_STORE_MULTIPASS_SECRET);
  const customerData = { email: payload.email };
  const multipassToken = multipass.generateToken(customerData);
  const customerAccessToken = await loginWithMultipass(storefront, multipassToken);

  // Set customerAccessToken to session so the customer will be treated as
  // logged in
  session.set('customerAccessToken', customerAccessToken);

  return redirect("/account", {
    headers: {
      "Set-Cookie": await session.commit(),
    },
  });
};
