import { getDevices } from "@/lib/api";
import RegisterForm from "./RegisterForm";

export default async function RegisterEnclosurePage({ searchParams }: { searchParams: { box?: string } }) {
  const devices = await getDevices();

  return (
    <div className="animate-rise mx-auto max-w-xl">
      <div className="label">Register box</div>
      <h1 className="mt-1 font-display text-5xl sm:text-6xl font-bold uppercase leading-none tracking-tight">
        Bring a box online
      </h1>
      <p className="mt-4 text-lg text-ink/75 leading-snug">
        NestGuard has three sensor boxes, one per enclosure. Pick the box you&apos;re installing. Its readings start
        showing up the moment it connects to Wi-Fi.
      </p>
      <RegisterForm devices={devices} preselect={searchParams.box} />
    </div>
  );
}
