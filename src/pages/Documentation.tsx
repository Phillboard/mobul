import { Layout } from "@/components/layout/Layout";
import { DocumentationLayout } from "@/components/documentation/DocumentationLayout";
import { DocumentationContent } from "@/components/documentation/DocumentationContent";

export default function Documentation() {
  return (
    <Layout>
      <DocumentationLayout>
        <DocumentationContent />
      </DocumentationLayout>
    </Layout>
  );
}
