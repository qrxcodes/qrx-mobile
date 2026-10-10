import { Redirect } from 'expo-router';

/**
 * The OAuth redirect (`<scheme>://oauth?code=…`). The sign-in browser session consumes it; on Android the same link
 * also reaches the router, which lands here and goes home.
 */
export default function OAuthRedirect() {
  return <Redirect href="/" />;
}
