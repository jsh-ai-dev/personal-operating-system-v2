import { Mk3AiServiceForm } from "@/features/mk3/ui/Mk3AiServiceForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Mk3EditAiServicePage({ params }: Props) {
  const { id } = await params;
  return <Mk3AiServiceForm serviceId={id} />;
}
