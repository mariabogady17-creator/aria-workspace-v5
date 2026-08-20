import React, { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { DocumentItem } from '../types';
import { X, Network } from 'lucide-react';

interface GraphViewProps {
  documents: DocumentItem[];
  onClose: () => void;
}

export const GraphView: React.FC<GraphViewProps> = ({ documents, onClose }) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.clientWidth);
      setHeight(containerRef.current.clientHeight);
    }
  }, []);

  useEffect(() => {
    // Generate nodes and links from documents based on categories
    const nodes: any[] = [];
    const links: any[] = [];
    const categories = new Set<string>();

    documents.forEach(doc => {
      nodes.push({ id: doc.id, name: doc.name, type: 'doc', val: 20 });
      if (doc.category) {
        categories.add(doc.category);
        links.push({ source: doc.id, target: doc.category });
      }
    });

    categories.forEach(cat => {
      nodes.push({ id: cat, name: cat, type: 'category', val: 40 });
    });

    setGraphData({ nodes, links } as any);
  }, [documents]);

  return (
    <div className="fixed inset-0 z-50 bg-[#121216]/90 backdrop-blur-xl flex flex-col items-center justify-center">
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <Network className="w-8 h-8 text-[#818cf8]" />
        <h1 className="text-2xl font-light text-[#e5e2e1]">Mapa Mental de Conocimiento</h1>
      </div>
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-3 rounded-full bg-white/10 text-white hover:bg-rose-500 hover:scale-110 transition-all"
      >
        <X className="w-6 h-6" />
      </button>

      <div ref={containerRef} className="w-[90vw] h-[80vh] bg-[#1c1b1b] rounded-[40px] border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(129,140,248,0.2)]">
        <ForceGraph2D
          width={width}
          height={height}
          graphData={graphData}
          nodeLabel="name"
          nodeColor={(node: any) => node.type === 'category' ? '#818cf8' : '#e5e2e1'}
          nodeRelSize={6}
          linkColor={() => 'rgba(255,255,255,0.2)'}
          linkWidth={2}
          backgroundColor="#1c1b1b"
        />
      </div>
    </div>
  );
};
