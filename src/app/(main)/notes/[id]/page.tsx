import { NoteDetail } from "@/features/notes/ui/NoteDetail";

type Props = { params: Promise<{ id: string }> };

export default async function NoteDetailPage({ params }: Props) {
  const { id } = await params;
  return <NoteDetail id={id} />;
}
