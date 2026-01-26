import { getLandingPageConfig } from '@/config/landing-pages';
import { ServiceLandingLayout } from '@/components/landing';

const SERVICE_ID = 'junk-removal';

export default async function JunkRemovalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const config = getLandingPageConfig(SERVICE_ID);

  if (!config) {
    return <div>Service not found</div>;
  }

  return (
    <ServiceLandingLayout
      service={config.service}
      sections={[
        { type: 'hero', enabled: true, config: config.hero },
        { type: 'benefits', enabled: true, config: config.benefits },
        { type: 'process', enabled: true, config: config.process },
        { type: 'testimonials', enabled: true, config: config.testimonials },
        { type: 'faq', enabled: true, config: config.faq },
        { type: 'cta', enabled: true, config: config.form },
      ]}
    />
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const config = getLandingPageConfig(SERVICE_ID);
  return {
    title: config?.seo.title,
    description: config?.seo.description,
    keywords: config?.seo.keywords,
  };
}
