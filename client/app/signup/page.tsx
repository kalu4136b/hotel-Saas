import AuthCard from '@/components/AuthCard';

export const metadata = {
  title: 'Join Us — Antigravity Hotel SaaS',
  description: 'Create your hotel SaaS tenant account and property console.',
};

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#F8FAFC]">
      <AuthCard initialMode="signup" />
    </main>
  );
}
