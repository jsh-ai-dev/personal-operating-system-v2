import { Mk3ChatRoom } from "@/features/mk3/ui/Mk3ChatRoom";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Mk3ChatRoomPage({ params }: Props) {
  const { id } = await params;
  return <Mk3ChatRoom initialId={id} />;
}
