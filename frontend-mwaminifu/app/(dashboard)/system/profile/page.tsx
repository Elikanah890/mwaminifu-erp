'use client';

import PageWrapper from '@/components/PageWrapper';
import { Reveal } from '@/components/motion';

export default function SystemProfilePage() {
  return (
    <PageWrapper title="Profile" description="System owner account" breadcrumb={['System', 'Profile']}>
      <Reveal>
        <div className="surface-card p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-muted-2 text-primary flex items-center justify-center mb-4 text-xl font-semibold">SO</div>
          <h2 className="text-lg font-semibold text-foreground">System Owner Profile</h2>
          <p className="text-sm text-subtle-foreground mt-2">Profile management coming soon.</p>
        </div>
      </Reveal>
    </PageWrapper>
  );
}
