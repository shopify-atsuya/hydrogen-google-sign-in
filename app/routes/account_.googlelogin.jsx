import { useLoaderData } from "@remix-run/react";
import { json, redirect } from "@shopify/remix-oxygen";

import GoogleSignIn from '../components/GoogleSignIn';

export const meta = () => {
  return [
    { title: "Login - Index" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader = async ({ request, context }) => {
  const { env, session } = context;

  // Redirects to account page if already logged in
  if (session.has('customerAccessToken')) {
    return redirect('/account');
  }

  const data = {
    googleClientId: env.GOOGLE_OAUTH_CLIENT_ID,
    error: session.get('error')
  };

  return json(data, {
    headers: {
      "Set-Cookie": await session.commit(),
    },
  });
};

export default function GoogleLogin() {
  const { error, googleClientId } = useLoaderData();

  return (
    <>
      {error ? <div className="error">{error}</div> : null}
      <GoogleSignIn clientId={googleClientId} />
    </>
  );
}
