interface Layer {
  id: string;
  type: string;
  text?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  fontWeight?: string;
  url?: string;
}

interface TemplatePreviewRendererProps {
  layers: Layer[];
  canvasSize: { width: number; height: number };
}

const sampleData = {
  first_name: "John",
  last_name: "Smith",
  full_name: "John Smith",
  company: "Acme Corp",
  address1: "123 Main Street",
  address2: "Suite 100",
  city: "San Francisco",
  state: "CA",
  zip: "94102",
  phone: "(555) 123-4567",
  email: "john.smith@example.com",
  purl: "https://example.com/p/abc123",
};

const replaceMergeFields = (text: string) => {
  return text
    .replace(/\{\{first_name\}\}/g, sampleData.first_name)
    .replace(/\{\{last_name\}\}/g, sampleData.last_name)
    .replace(/\{\{full_name\}\}/g, sampleData.full_name)
    .replace(/\{\{company\}\}/g, sampleData.company)
    .replace(/\{\{address1\}\}/g, sampleData.address1)
    .replace(/\{\{address2\}\}/g, sampleData.address2)
    .replace(/\{\{city\}\}/g, sampleData.city)
    .replace(/\{\{state\}\}/g, sampleData.state)
    .replace(/\{\{zip\}\}/g, sampleData.zip)
    .replace(/\{\{phone\}\}/g, sampleData.phone)
    .replace(/\{\{email\}\}/g, sampleData.email)
    .replace(/\{\{purl\}\}/g, sampleData.purl);
};

export function TemplatePreviewRenderer({
  layers,
  canvasSize,
}: TemplatePreviewRendererProps) {
  const scale = 0.5; // Scale down for preview
  const scaledWidth = canvasSize.width * scale;
  const scaledHeight = canvasSize.height * scale;

  return (
    <div className="border rounded-lg bg-muted/20 p-4">
      <h3 className="text-sm font-semibold mb-3">Preview with Sample Data</h3>
      <div className="flex justify-center">
        <div
          className="relative bg-background border shadow-sm"
          style={{
            width: scaledWidth,
            height: scaledHeight,
          }}
        >
          {layers.map((layer) => {
            const layerLeft = (layer.left || 0) * scale;
            const layerTop = (layer.top || 0) * scale;
            const layerWidth = (layer.width || 100) * scale;
            const layerHeight = (layer.height || 50) * scale;

            if (layer.type === "text") {
              const displayText = replaceMergeFields(layer.text || "");
              return (
                <div
                  key={layer.id}
                  style={{
                    position: "absolute",
                    left: layerLeft,
                    top: layerTop,
                    width: layerWidth,
                    height: layerHeight,
                    fontSize: (layer.fontSize || 14) * scale,
                    fontFamily: layer.fontFamily || "Arial",
                    color: layer.fill || "#000000",
                    fontWeight: layer.fontWeight || "normal",
                    whiteSpace: "pre-wrap",
                    overflow: "hidden",
                  }}
                >
                  {displayText}
                </div>
              );
            }

            if (layer.type === "image" && layer.url) {
              return (
                <div
                  key={layer.id}
                  style={{
                    position: "absolute",
                    left: layerLeft,
                    top: layerTop,
                    width: layerWidth,
                    height: layerHeight,
                  }}
                >
                  <img
                    src={layer.url}
                    alt="Template image"
                    className="w-full h-full object-cover"
                  />
                </div>
              );
            }

            if (layer.type === "qr_code") {
              return (
                <div
                  key={layer.id}
                  style={{
                    position: "absolute",
                    left: layerLeft,
                    top: layerTop,
                    width: layerWidth,
                    height: layerHeight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px dashed currentColor",
                    fontSize: (layer.fontSize || 12) * scale,
                  }}
                  className="text-muted-foreground"
                >
                  <div className="text-center">
                    <div className="font-mono text-xs">QR CODE</div>
                    <div className="text-[8px] mt-1">
                      {replaceMergeFields("{{purl}}")}
                    </div>
                  </div>
                </div>
              );
            }

            if (layer.type === "rectangle") {
              return (
                <div
                  key={layer.id}
                  style={{
                    position: "absolute",
                    left: layerLeft,
                    top: layerTop,
                    width: layerWidth,
                    height: layerHeight,
                    backgroundColor: layer.fill || "#cccccc",
                  }}
                />
              );
            }

            return null;
          })}
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        <div className="font-medium mb-1">Sample Data Used:</div>
        <div className="grid grid-cols-2 gap-1">
          <div>Name: {sampleData.full_name}</div>
          <div>Company: {sampleData.company}</div>
          <div>Address: {sampleData.address1}</div>
          <div>City: {sampleData.city}, {sampleData.state}</div>
        </div>
      </div>
    </div>
  );
}
