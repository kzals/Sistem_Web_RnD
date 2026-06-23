import UserDetailClient from './UserDetailClient';

export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <UserDetailClient id={id} />
    </div>
  );
}
