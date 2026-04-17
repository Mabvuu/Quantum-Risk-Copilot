import ScannerForm from "@/components/ScannerForm";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Quantum Risk Copilot</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Audit full software systems to discover cryptographic touchpoints,
            identify quantum-vulnerable usage, and map migration paths to
            post-quantum cryptography.
          </p>
        </div>

        <ScannerForm />
      </div>
    </main>
  );
}