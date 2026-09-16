/**
 * Mirrors the wizard's own shape — step rail, heading, then the form card beside
 * its aside. A skeleton that is a different width just moves the page twice.
 * The layout supplies the page frame, so none of it is repeated here.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-7" aria-busy="true">
      <div className="skeleton h-5 w-72 max-w-full" />

      <div className="flex flex-col gap-2">
        <div className="skeleton h-9 w-52" />
        <div className="skeleton h-4 w-96 max-w-full" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex flex-col gap-4 rounded-card bg-canvas p-5 ring-1 ring-line sm:p-6">
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

        <div className="skeleton h-64 w-full" />
      </div>
    </div>
  );
}
