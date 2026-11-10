import { LayoutEditorPage } from "../../../../../components/layout-editor";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <LayoutEditorPage warehouseId={(await params).id} />;
}
