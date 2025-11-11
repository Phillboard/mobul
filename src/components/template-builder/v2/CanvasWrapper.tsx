import { Canvas } from "@/components/template-builder/Canvas";

interface CanvasWrapperProps {
  data: any;
  onChange: (data: any) => void;
  onSelectLayer: (layer: any) => void;
  onDoubleClickLayer?: (layer: any) => void;
  onContextMenu?: (layer: any, e: MouseEvent) => void;
  selectedLayer: any;
  activeTool: string | null;
  onDrop: (elementType: string, position: { x: number; y: number }, elementData?: any) => void;
  showGrid: boolean;
  showRulers: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export function CanvasWrapper({
  data,
  onChange,
  onSelectLayer,
  onDoubleClickLayer,
  onContextMenu,
  selectedLayer,
  activeTool,
  onDrop,
  showGrid,
  showRulers,
  snapToGrid,
  gridSize,
}: CanvasWrapperProps) {
  return (
    <div className="flex-1 bg-builder-canvas overflow-hidden">
      {data && (
        <Canvas
          data={data}
          onChange={onChange}
          onSelectLayer={onSelectLayer}
          onDoubleClickLayer={onDoubleClickLayer}
          onContextMenu={onContextMenu}
          selectedLayer={selectedLayer}
          activeTool={activeTool}
          onDrop={onDrop}
          showGrid={showGrid}
          showRulers={showRulers}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
        />
      )}
    </div>
  );
}
