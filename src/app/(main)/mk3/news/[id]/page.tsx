import { Mk3NewsDetail } from "@/features/mk3/ui/Mk3NewsDetail";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
};

export default async function Mk3NewsDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { date } = await searchParams;
  return <Mk3NewsDetail id={id} dateQuery={date} />;
}
