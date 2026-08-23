import PageContainer from "../components/layout/PageContainer";
import Card from "../components/common/Card";
import Button from "../components/common/Button";

const Home = () => {
  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <PageContainer>
        <section className="mx-auto max-w-4xl text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-wider text-blue-600">
            TrustShield
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Know before you click.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            TrustShield helps you understand potential warning signs before
            interacting with unfamiliar websites and URLs.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => {
                window.location.href = "/analyze";
              }}
            >
              Analyze a URL
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Login
            </Button>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-3xl">
          <Card>
            <h2 className="text-xl font-bold text-slate-950">
              TrustShield assessment
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              TrustShield does not guarantee that a website is safe. Its
              purpose is to provide understandable security information that
              can help you make a safer decision.
            </p>
          </Card>
        </section>
      </PageContainer>
    </main>
  );
};

export default Home;