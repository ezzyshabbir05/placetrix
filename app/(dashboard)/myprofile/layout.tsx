import { IncompleteProfileToast } from "./IncompleteProfileToast";

export default function MyProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <IncompleteProfileToast />
      {children}
    </>
  );
}
