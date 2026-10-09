import { redirect } from 'next/navigation';

// Plan management now lives on the Subscriptions page (as a "Plans" tab).
export default function PricingRedirect() {
  redirect('/system/subscriptions');
}
