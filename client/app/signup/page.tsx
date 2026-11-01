import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Sign In — Antigravity Hotel SaaS',
  description: 'Self-registration is disabled. Please sign in with your authorized credentials.',
};

export default function SignupPage() {
  redirect('/login');
}
