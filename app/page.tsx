import ScannerForm from "@/components/ScannerForm";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Blockchain Security Scanner</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Paste smart contract code, scan it, and view a simple security report.
          </p>
        </div>

        <ScannerForm />
      </div>
    </main>
  );
}