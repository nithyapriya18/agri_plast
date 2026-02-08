import GoogleMapsProvider from '@/components/GoogleMapsProvider';

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GoogleMapsProvider>
      <div className="h-screen w-screen overflow-hidden">
        {children}
      </div>
    </GoogleMapsProvider>
  );
}
