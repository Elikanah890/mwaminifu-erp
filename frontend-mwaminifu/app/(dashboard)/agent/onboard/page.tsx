import { redirect } from 'next/navigation';

export default function AgentOnboardRedirect() {
  redirect('/agent/register');
}
