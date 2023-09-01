import { useEffect } from 'react';

export default function GoogleSignIn(props) {
  useEffect(() => {
    const scriptTag = document.createElement('script');
    scriptTag.src = 'https://accounts.google.com/gsi/client';
    scriptTag.async = true;

    document.body.appendChild(scriptTag);

    return () => {
      document.body.removeChild(scriptTag);
    };
  }, []);

  return (
    <div>
      <div id="g_id_onload"
        data-client_id={props.clientId}
        data-context="signin"
        data-ux_mode="redirect"
        data-login_uri="http://localhost:3000/auth"
        data-nonce=""
        data-auto_prompt="false">
      </div>
      <div className="g_id_signin"
        data-type="standard"
        data-shape="rectangular"
        data-theme="outline"
        data-text="signin_with"
        data-size="large"
        data-logo_alignment="left"
        data-locale="en_US">
      </div>
    </div>
  );
}
