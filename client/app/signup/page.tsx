import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Sign In — Hotelia',
  description: 'Self-registration is disabled. Please sign in with your authorized credentials.',
};

export default function SignupPage() {
  redirect('/login');
}
