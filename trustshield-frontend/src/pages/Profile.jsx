import PageContainer from "../components/layout/PageContainer";
import Card from "../components/common/Card";

const Profile = () => {
  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <PageContainer>
        <div className="mx-auto max-w-2xl">
          <Card>
            <h1 className="text-2xl font-bold text-slate-950">
              Profile
            </h1>

            <p className="mt-2 text-slate-600">
              User profile functionality will be implemented after
              authentication is established.
            </p>
          </Card>
        </div>
      </PageContainer>
    </main>
  );
};

export default Profile;