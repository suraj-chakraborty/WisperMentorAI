import React, { useState, useEffect, useRef } from 'react';
// import ForceGraph2D from 'react-force-graph-2d';

interface Node {
    id: string;
    label: string;
    label_translated?: string;
    definition?: string;
    definition_translated?: string;
    type: string;
}

interface Link {
    source: string;
    target: string;
    label: string;
}

interface GraphData {
    nodes: Node[];
    links: Link[];
}

interface KnowledgeGraphViewProps {
    sessionId: string | null;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({ sessionId }) => {
    const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchGraph = async () => {
            if (!sessionId) return;
            setLoading(true);
            try {
                const res = await fetch(`http://localhost:3001/sessions/${sessionId}/graph`);
                if (res.ok) {
                    const graphData = await res.json();
                    setData(graphData);
                }
            } catch (e) {
                console.error("Failed to fetch graph", e);
            } finally {
                setLoading(false);
            }
        };

        fetchGraph();
    }, [sessionId]);

    return (
        <div className="h-full flex flex-col bg-slate-950 overflow-hidden" ref={containerRef}>
            <header className="p-6 pb-2">
                <h2 className="text-2xl font-bold text-white mb-2">🕸️ Knowledge Graph</h2>
                <p className="text-slate-400">Semantic map of insights and concepts from your session.</p>
            </header>

            <div className="flex-1 relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                ) : data.nodes.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                        No graph data available for this session.
                    </div>
                ) : (
                    // <ForceGraph2D
                    //     graphData={data}
                    //     width={dimensions.width}
                    //     height={dimensions.height}
                    //     backgroundColor="#020617"
                    //     nodeLabel={(node: any) => `
                    //         <div style="background: #1e293b; padding: 10px; border-radius: 8px; border: 1px solid #334155; color: white; max-width: 250px;">
                    //             <div style="font-weight: bold; color: #818cf8; margin-bottom: 4px;">${node.label} ${node.label_translated ? `(${node.label_translated})` : ''}</div>
                    //             <div style="font-size: 11px; color: #94a3b8; line-height: 1.4;">${node.definition || 'No definition'}</div>
                    //             ${node.definition_translated ? `<div style="font-size: 11px; color: #a5b4fc; margin-top: 4px; font-style: italic;">${node.definition_translated}</div>` : ''}
                    //         </div>
                    //     `}
                    //     nodeColor={() => '#6366f1'}
                    //     nodeCanvasObject={(node: any, ctx, globalScale) => {
                    //         const label = node.label;
                    //         const fontSize = 12 / globalScale;
                    //         ctx.font = `${fontSize}px Inter, sans-serif`;
                    //         const textWidth = ctx.measureText(label).width;
                    //         const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

                    //         ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
                    //         ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions as [number, number]);

                    //         ctx.textAlign = 'center';
                    //         ctx.textBaseline = 'middle';
                    //         ctx.fillStyle = '#c7d2fe';
                    //         ctx.fillText(label, node.x, node.y);

                    //         node.__bckgDimensions = bckgDimensions; // to use in nodePointerAreaPaint
                    //     }}
                    //     linkColor={() => '#334155'}
                    //     linkDirectionalParticles={2}
                    //     linkDirectionalParticleSpeed={0.005}
                    // />
                    <></>
                )}
            </div>
        </div>
    );
};
