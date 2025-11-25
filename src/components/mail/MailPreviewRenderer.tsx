interface Layer {
  id: string;
  type: string;
  text?: string;
  left?: number;
  top?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  fontWeight?: string;
  url?: string;
  src?: string;
  align?: string;
  stroke?: string;
  strokeWidth?: number;
  shape?: string;
}

interface MailPreviewRendererProps {
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
  event_name: "Annual Gala",
  event_date: "March 15, 2024",
  event_time: "7:00 PM",
  venue_name: "Grand Hotel Ballroom",
  expiry_date: "December 31, 2024",
  business_name: "Your Business Name",
  website: "www.yourbusiness.com",
  restaurant_name: "Fine Dining Restaurant",
  address: "123 Main St, San Francisco, CA 94102",
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
    .replace(/\{\{purl\}\}/g, sampleData.purl)
    .replace(/\{\{event_name\}\}/g, sampleData.event_name)
    .replace(/\{\{event_date\}\}/g, sampleData.event_date)
    .replace(/\{\{event_time\}\}/g, sampleData.event_time)
    .replace(/\{\{venue_name\}\}/g, sampleData.venue_name)
    .replace(/\{\{expiry_date\}\}/g, sampleData.expiry_date)
    .replace(/\{\{business_name\}\}/g, sampleData.business_name)
    .replace(/\{\{website\}\}/g, sampleData.website)
    .replace(/\{\{restaurant_name\}\}/g, sampleData.restaurant_name)
    .replace(/\{\{address\}\}/g, sampleData.address);
};

export function MailPreviewRenderer({
  layers,
  canvasSize,
}: MailPreviewRendererProps) {
  const scale = 0.4; // Scale down for preview
  const scaledWidth = canvasSize.width * scale;
  const scaledHeight = canvasSize.height * scale;

  return (
    <div className="border rounded-lg bg-muted/20 p-4">
      <h3 className="text-sm font-semibold mb-3">Preview with Sample Data</h3>
      <div className="flex justify-center">
        <div
          className="relative bg-white border shadow-lg"
          style={{
            width: scaledWidth,
            height: scaledHeight,
          }}
        >
          {layers.map((layer) => {
            const layerLeft = ((layer.left || layer.x) || 0) * scale;
            const layerTop = ((layer.top || layer.y) || 0) * scale;
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
                    textAlign: (layer.align as any) || "left",
                    whiteSpace: "pre-wrap",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: layer.align === "center" ? "center" : layer.align === "right" ? "flex-end" : "flex-start",
                  }}
                >
                  {displayText}
                </div>
              );
            }

            if (layer.type === "image" && (layer.url || layer.src)) {
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
                    src={layer.url || layer.src}
                    alt="Mail piece image"
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

            if (layer.type === "rectangle" || layer.type === "rect" || (layer.type === "shape" && layer.shape === "rectangle")) {
              return (
                <div
                  key={layer.id}
                  style={{
                    position: "absolute",
                    left: layerLeft,
                    top: layerTop,
                    width: layerWidth,
                    height: layerHeight,
                    backgroundColor: layer.fill && layer.fill !== "transparent" ? layer.fill : "transparent",
                    border: layer.stroke && layer.stroke !== "" ? `${(layer.strokeWidth || 1) * scale}px solid ${layer.stroke}` : "none",
                  }}
                />
              );
            }

            return null;
          })}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
        <div className="font-medium mb-2">Sample merge fields preview:</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div><span className="font-mono text-[10px]">{"{{full_name}}"}</span> → {sampleData.full_name}</div>
          <div><span className="font-mono text-[10px]">{"{{company}}"}</span> → {sampleData.company}</div>
          <div><span className="font-mono text-[10px]">{"{{address1}}"}</span> → {sampleData.address1}</div>
          <div><span className="font-mono text-[10px]">{"{{phone}}"}</span> → {sampleData.phone}</div>
        </div>
      </div>
    </div>
  );
}