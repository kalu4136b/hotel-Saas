import AuthCard from '@/components/AuthCard';

export const metadata = {
  title: 'Sign In — Antigravity Hotel SaaS',
  description: 'Sign in to access your hotel management console.',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#F8FAFC]">
      <AuthCard />
    </main>
  );
}
