import { Mk3QuizPlay } from "@/features/mk3/ui/Mk3QuizPlay";

type Props = { params: Promise<{ id: string }> };

export default async function Mk3QuizPlayPage({ params }: Props) {
  const { id } = await params;
  return <Mk3QuizPlay id={id} />;
}
