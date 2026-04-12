import ScannerForm from "@/components/ScannerForm";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Quantum Risk Copilot</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Scan a blockchain system across multiple contracts, modules, and
            trust touchpoints to spot security risks, quantum risks, and
            cross-module weaknesses.
          </p>
        </div>

        <ScannerForm />
      </div>
    </main>
  );
}