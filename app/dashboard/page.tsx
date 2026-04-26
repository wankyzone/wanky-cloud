export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Wanky Cloud Dashboard</h1>

      <div className="mt-6 grid gap-4">
        <div className="p-4 border rounded-lg">
          Wallet Balance: ₦0
        </div>

        <button className="bg-black text-white px-4 py-2 rounded">
          Create VPS
        </button>
      </div>
    </div>
  );
}