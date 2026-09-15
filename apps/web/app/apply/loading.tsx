export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8" aria-busy="true">
      <div className="skeleton h-5 w-72 max-w-full" />
      <div className="flex flex-col gap-2">
        <div className="skeleton h-9 w-52" />
        <div className="skeleton h-4 w-96 max-w-full" />
      </div>
      <div className="flex flex-col gap-4 rounded-card bg-canvas p-6 ring-1 ring-line">
        <div className="grid gap-4 sm:grid-cols-2">
          {["name", "pan", "dob", "salary"].map((field) => (
            <div key={field} className="flex flex-col gap-2">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-9 w-full" />
            </div>
          ))}
        </div>
        <div className="skeleton h-40 w-full" />
      </div>
    </div>
  );
}
