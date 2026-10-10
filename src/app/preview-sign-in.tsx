import { Redirect } from 'expo-router';

import { config } from '@/state/config';

import SignIn from './sign-in';

/** The sign-in screen while signed in, for store screenshots of the mock build only. */
export default function PreviewSignIn() {
  if (!config.mock) return <Redirect href="/" />;
  return <SignIn />;
}
