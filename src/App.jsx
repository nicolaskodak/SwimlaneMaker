import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Plus, 
  X, 
  Settings, 
  Trash2, 
  Edit3, 
  Link as LinkIcon, 
  Move, 
  MoreHorizontal,
  AlertTriangle,
  Sliders
} from 'lucide-react';

// --- Bauhaus palette ---
const LANE_PALETTES = {
  red:    { bg: '#D02020', text: '#FFFFFF' },
  blue:   { bg: '#1040C0', text: '#FFFFFF' },
  yellow: { bg: '#F0C020', text: '#121212' },
};
const LANE_COLOR_KEYS = ['red', 'blue', 'yellow'];

// --- Components ---

const App = () => {
  // --- State ---
  const [lanes, setLanes] = useState([
    { id: 'dept-1', title: '業務部', color: 'red' },
    { id: 'dept-2', title: '技術部', color: 'blue' },
    { id: 'dept-3', title: '管理部', color: 'yellow' },
  ]);

  const [nodes, setNodes] = useState([
    { id: 'node-1', laneId: 'dept-1', title: '客戶需求', content: '接收來自客戶的初步需求信件', rank: 0, type: 'process', dataIds: ['asset-1'] },
    { id: 'node-2', laneId: 'dept-2', title: '技術評估', content: '評估開發可行性與時程', rank: 0, type: 'process', dataIds: [] },
    { id: 'node-3', laneId: 'dept-1', title: '報價單製作', content: '根據評估結果製作報價單', rank: 1, type: 'process', dataIds: ['asset-2'] },
    { id: 'node-4', laneId: 'dept-3', title: '主管審核', content: '是否通過？', rank: 0, type: 'decision', dataIds: [] },
  ]);

  const [connections, setConnections] = useState([
    { from: 'node-1', to: 'node-2', id: 'c1', label: '' }, // 橫向
    { from: 'node-1', to: 'node-3', id: 'c-vertical-test', label: '' }, // 垂直測試
    { from: 'node-2', to: 'node-3', id: 'c2', label: '' }, // 橫向回流
    { from: 'node-3', to: 'node-4', id: 'c3', label: '' }, // 橫向
  ]);

  // Data Assets (Feature 1)
  const [dataAssets, setDataAssets] = useState([
    { id: 'asset-1', name: '客戶需求書', color: 'red' },
    { id: 'asset-2', name: '技術規格書', color: 'blue' },
    { id: 'asset-3', name: '報價模板', color: 'yellow' },
  ]);
  const [newAssetName, setNewAssetName] = useState('');

  // Connection label inline editing (Feature 2a)
  const [editingLabelFor, setEditingLabelFor] = useState(null);
  const [labelDraft, setLabelDraft] = useState('');

  // UI State
  const [selectedNode, setSelectedNode] = useState(null);
  const [isConnectMode, setIsConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({ title: '', content: '', type: 'process' });
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [curveIntensity, setCurveIntensity] = useState(0.25); // 預設入射角參數
  const [lineColor, setLineColor] = useState('#121212'); // 預設線條顏色
  
  // 追蹤正要被刪除的連線 ID
  const [connectionToDelete, setConnectionToDelete] = useState(null);
  // 追蹤目前滑鼠懸停的連線 ID，用於變更箭頭顏色
  const [hoveredConnectionId, setHoveredConnectionId] = useState(null);
  
  // Drag and Drop State
  const [draggedNodeId, setDraggedNodeId] = useState(null);

  // Refs for SVG calculation
  const containerRef = useRef(null);
  const [lines, setLines] = useState([]);
  // 動態追蹤 SVG 畫布尺寸
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });

  // 生成唯一的 Marker ID
  const uniqueId = useMemo(() => Math.random().toString(36).substr(2, 9), []);
  const markerId = `arrowhead-${uniqueId}`;
  const markerHoverId = `arrowhead-hover-${uniqueId}`;

  // 以拓撲排序計算每個節點的 level，用來保證「後面的步驟」一律位於「前面的步驟」下方
  const nodeLevels = useMemo(() => {
    const levels = new Map();
    const inDegree = new Map();
    const outgoing = new Map();

    nodes.forEach(n => {
      inDegree.set(n.id, 0);
      outgoing.set(n.id, []);
    });

    connections.forEach(c => {
      if (inDegree.has(c.to) && outgoing.has(c.from) && c.from !== c.to) {
        inDegree.set(c.to, inDegree.get(c.to) + 1);
        outgoing.get(c.from).push(c.to);
      }
    });

    const queue = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) {
        queue.push(id);
        levels.set(id, 0);
      }
    });

    while (queue.length > 0) {
      const id = queue.shift();
      const curLevel = levels.get(id);
      (outgoing.get(id) || []).forEach(nextId => {
        const nextLevel = curLevel + 1;
        if (!levels.has(nextId) || levels.get(nextId) < nextLevel) {
          levels.set(nextId, nextLevel);
        }
        inDegree.set(nextId, inDegree.get(nextId) - 1);
        if (inDegree.get(nextId) === 0) {
          queue.push(nextId);
        }
      });
    }

    // 若有循環連線無法拓撲排序，統一放到最末列
    const existing = Array.from(levels.values());
    const fallback = existing.length > 0 ? Math.max(...existing) + 1 : 0;
    nodes.forEach(n => {
      if (!levels.has(n.id)) levels.set(n.id, fallback);
    });

    return levels;
  }, [nodes, connections]);

  // 所有被佔用的 level，由小到大排序；用來產生 grid 列數
  const occupiedLevels = useMemo(() => {
    const s = new Set();
    nodes.forEach(n => {
      const lv = nodeLevels.get(n.id);
      if (lv !== undefined) s.add(lv);
    });
    return Array.from(s).sort((a, b) => a - b);
  }, [nodes, nodeLevels]);

  // --- Helpers ---

  // Calculate SVG paths
  const calculatePaths = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    // 取得目前的捲動偏移量
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    // 更新 SVG 尺寸以匹配內容總大小
    if (container.scrollWidth !== svgDimensions.width || container.scrollHeight !== svgDimensions.height) {
        setSvgDimensions({ width: container.scrollWidth, height: container.scrollHeight });
    }

    // 重新取得容器的 Rect，因為捲動可能會影響相對位置計算
    const containerRect = container.getBoundingClientRect();

    const newLines = connections.map(conn => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);
      
      const fromEl = document.getElementById(conn.from);
      const toEl = document.getElementById(conn.to);

      if (!fromEl || !toEl || !fromNode || !toNode) return null;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      let startX, startY, endX, endY, pathData;

      const isSameRow = Math.abs(fromRect.top - toRect.top) < 20;

      if (isSameRow) {
          if (fromRect.left < toRect.left) {
              startX = fromRect.right - containerRect.left + scrollLeft;
              startY = (fromRect.top + fromRect.height / 2) - containerRect.top + scrollTop;
              endX = toRect.left - containerRect.left + scrollLeft;
              endY = (toRect.top + toRect.height / 2) - containerRect.top + scrollTop;
          } else {
              startX = fromRect.left - containerRect.left + scrollLeft;
              startY = (fromRect.top + fromRect.height / 2) - containerRect.top + scrollTop;
              endX = toRect.right - containerRect.left + scrollLeft;
              endY = (toRect.top + toRect.height / 2) - containerRect.top + scrollTop;
          }

          const dist = Math.abs(endX - startX);
          const controlOffset = dist * 0.5;

          const cp1X = startX < endX ? startX + controlOffset : startX - controlOffset;
          const cp2X = startX < endX ? endX - controlOffset : endX + controlOffset;

          pathData = `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`;
      } 
      else {
          startX = (fromRect.left + fromRect.width / 2) - containerRect.left + scrollLeft;
          startY = fromRect.bottom - containerRect.top + scrollTop;
          
          endX = (toRect.left + toRect.width / 2) - containerRect.left + scrollLeft;
          endY = toRect.top - containerRect.top + scrollTop;

          const distY = endY - startY;
          
          let controlDistStart = Math.abs(distY) * 0.5;
          let controlDistEnd = Math.abs(distY) * 0.2;
          
          if (distY < 0) {
             controlDistStart = 80;
             controlDistEnd = 80;
          }

          const cp2X = endX - (endX - startX) * curveIntensity;

          pathData = `M ${startX} ${startY} C ${startX} ${startY + controlDistStart}, ${cp2X} ${endY - controlDistEnd}, ${endX} ${endY}`;
      }

      return {
        id: conn.id,
        path: pathData,
        midX: (startX + endX) / 2,
        midY: (startY + endY) / 2,
      };
    }).filter(Boolean);

    setLines(newLines);
  };

  useEffect(() => {
    calculatePaths();
    window.addEventListener('resize', calculatePaths);
    const container = containerRef.current;
    if (container) {
        container.addEventListener('scroll', calculatePaths);
    }
    return () => {
        window.removeEventListener('resize', calculatePaths);
        if (container) {
            container.removeEventListener('scroll', calculatePaths);
        }
    };
  }, [nodes, connections, lanes, curveIntensity]); 

  useEffect(() => {
    const timer = setTimeout(calculatePaths, 100);
    return () => clearTimeout(timer);
  }, []);


  // --- Actions ---

  const addLane = () => {
    const id = `dept-${Date.now()}`;
    setLanes([...lanes, {
      id,
      title: '新部門',
      color: LANE_COLOR_KEYS[lanes.length % LANE_COLOR_KEYS.length]
    }]);
    setTimeout(calculatePaths, 100);
  };

  const removeLane = (laneId) => {
    if (confirm('確定要刪除此泳道嗎？其中的節點也會被刪除。')) {
      setLanes(lanes.filter(l => l.id !== laneId));
      setNodes(nodes.filter(n => n.laneId !== laneId));
      setConnections(connections.filter(c => {
        const nodeIds = nodes.filter(n => n.laneId === laneId).map(n => n.id);
        return !nodeIds.includes(c.from) && !nodeIds.includes(c.to);
      }));
    }
  };

  const addNode = (laneId) => {
    const newNode = {
      id: `node-${Date.now()}`,
      laneId,
      title: '新流程',
      content: '請輸入流程描述...',
      rank: nodes.filter(n => n.laneId === laneId).length,
      type: 'process',
      dataIds: [],
    };
    setNodes([...nodes, newNode]);
  };

  // --- Data Assets (Feature 1) ---
  const addAsset = () => {
    const name = newAssetName.trim();
    if (!name) return;
    const color = LANE_COLOR_KEYS[dataAssets.length % LANE_COLOR_KEYS.length];
    setDataAssets([...dataAssets, { id: `asset-${Date.now()}`, name, color }]);
    setNewAssetName('');
  };

  const deleteAsset = (assetId) => {
    setDataAssets(dataAssets.filter(a => a.id !== assetId));
    setNodes(nodes.map(n => ({
      ...n,
      dataIds: (n.dataIds || []).filter(id => id !== assetId),
    })));
  };

  const addAssetToNode = (nodeId, assetId) => {
    setNodes(nodes.map(n => n.id === nodeId
      ? { ...n, dataIds: Array.from(new Set([...(n.dataIds || []), assetId])) }
      : n
    ));
  };

  const removeAssetFromNode = (nodeId, assetId) => {
    setNodes(nodes.map(n => n.id === nodeId
      ? { ...n, dataIds: (n.dataIds || []).filter(id => id !== assetId) }
      : n
    ));
  };

  // --- Connection labels (Feature 2a) ---
  const beginEditLabel = (connectionId) => {
    const conn = connections.find(c => c.id === connectionId);
    setLabelDraft(conn?.label || '');
    setEditingLabelFor(connectionId);
  };

  const commitLabel = () => {
    if (editingLabelFor) {
      const trimmed = labelDraft.trim();
      setConnections(connections.map(c => c.id === editingLabelFor ? { ...c, label: trimmed } : c));
    }
    setEditingLabelFor(null);
    setLabelDraft('');
  };

  const handleNodeClick = (node) => {
    if (isConnectMode) {
      if (!connectSource) {
        setConnectSource(node);
      } else {
        if (connectSource.id === node.id) {
          setConnectSource(null); 
        } else {
          const exists = connections.some(c => c.from === connectSource.id && c.to === node.id);
          if (!exists) {
            setConnections([...connections, {
              from: connectSource.id,
              to: node.id,
              id: `c-${Date.now()}`,
              label: '',
            }]);
          }
          setConnectSource(null);
        }
      }
    } else {
      setSelectedNode(node);
      setEditFormData({ title: node.title, content: node.content, type: node.type || 'process' });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, ...editFormData } : n));
    setIsEditing(false);
    setSelectedNode(null);
  };

  const deleteNode = (nodeId) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setConnections(connections.filter(c => c.from !== nodeId && c.to !== nodeId));
    setIsEditing(false);
  };

  const requestDeleteConnection = (connectionId) => {
    setConnectionToDelete(connectionId);
  };

  const confirmDeleteConnection = () => {
    if (connectionToDelete) {
      setConnections(prev => prev.filter(c => c.id !== connectionToDelete));
      setConnectionToDelete(null);
      setHoveredConnectionId(null); 
    }
  };

  // --- Drag and Drop Logic ---

  const handleDragStart = (e, nodeId) => {
    setDraggedNodeId(nodeId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = (e, targetLaneId, targetRank = null) => {
    e.preventDefault();
    // asset drops on empty lane areas are ignored (only cards accept assets)
    if (e.dataTransfer && e.dataTransfer.getData('application/x-asset')) return;
    if (!draggedNodeId) return;

    const draggedNode = nodes.find(n => n.id === draggedNodeId);
    if (!draggedNode) return;

    let newRank = targetRank;
    const laneNodes = nodes.filter(n => n.laneId === targetLaneId && n.id !== draggedNodeId).sort((a, b) => a.rank - b.rank);
    
    if (newRank === null) {
      newRank = laneNodes.length;
    }

    const newNodes = nodes.filter(n => n.id !== draggedNodeId);
    
    const updatedLaneNodes = [...laneNodes];
    updatedLaneNodes.splice(newRank, 0, { ...draggedNode, laneId: targetLaneId });
    
    updatedLaneNodes.forEach((n, idx) => n.rank = idx);

    const finalNodes = [
        ...newNodes.filter(n => n.laneId !== targetLaneId), 
        ...updatedLaneNodes 
    ];

    setNodes(finalNodes);
    setDraggedNodeId(null);
  };


  return (
    <div className="flex flex-col h-screen bg-[#F0F0F0] text-[#121212] overflow-hidden">

      {/* Header */}
      <header className="bg-white border-b-4 border-[#121212] px-6 py-4 flex items-center justify-between z-40 relative">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`w-12 h-12 rounded-none border-2 border-[#121212] flex items-center justify-center shadow-[4px_4px_0px_0px_#121212] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ${showSettings ? 'bg-[#121212] text-white' : 'bg-[#F0C020] text-[#121212]'}`}
          >
            {showSettings ? <X size={22} strokeWidth={3} /> : <Settings size={22} strokeWidth={2.5} />}
          </button>

          {/* Geometric logo marks */}
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-[#D02020] border-2 border-[#121212]"></div>
            <div className="w-4 h-4 rounded-none bg-[#1040C0] border-2 border-[#121212]"></div>
            <div className="w-4 h-4 bg-[#F0C020] border-2 border-[#121212] rotate-45"></div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#121212] uppercase tracking-tighter leading-none">FlowArchitect</h1>
            <p className="text-[10px] sm:text-xs text-[#121212] font-bold uppercase tracking-widest mt-1">工作流程 / 設計與管理</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex border-2 border-[#121212] shadow-[4px_4px_0px_0px_#121212]">
            <button
              onClick={() => { setIsConnectMode(false); setConnectSource(null); }}
              className={`px-3 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${!isConnectMode ? 'bg-[#1040C0] text-white' : 'bg-white text-[#121212] hover:bg-[#E0E0E0]'}`}
            >
              <Move size={16} className="inline mr-1.5" strokeWidth={2.5} />
              選取 / 拖曳
            </button>
            <button
              onClick={() => setIsConnectMode(true)}
              className={`px-3 py-2 text-sm font-bold uppercase tracking-wider transition-colors border-l-2 border-[#121212] ${isConnectMode ? 'bg-[#D02020] text-white' : 'bg-white text-[#121212] hover:bg-[#E0E0E0]'}`}
            >
              <LinkIcon size={16} className="inline mr-1.5" strokeWidth={2.5} />
              連接模式 {connectSource && '(目標?)'}
            </button>
          </div>

          <button
            onClick={addLane}
            className="flex items-center gap-2 px-4 py-2 bg-[#F0C020] hover:bg-[#F0C020]/90 text-[#121212] border-2 border-[#121212] text-sm font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_#121212] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <Plus size={16} strokeWidth={3} />
            新增部門
          </button>
        </div>

        {/* Global Settings Dropdown Panel */}
        {showSettings && (
          <div className="absolute top-full left-6 mt-3 w-80 bg-white rounded-none shadow-[8px_8px_0px_0px_#121212] border-4 border-[#121212] p-5 z-50 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2 mb-4 text-[#121212] font-black uppercase tracking-wider border-b-2 border-[#121212] pb-3">
              <div className="w-7 h-7 bg-[#F0C020] border-2 border-[#121212] flex items-center justify-center">
                <Sliders size={14} strokeWidth={3} />
              </div>
              <span>全域設定</span>
            </div>

            <div className="space-y-5">
              <div>
                <label className="flex justify-between text-xs font-bold text-[#121212] uppercase tracking-widest mb-2">
                  <span>曲線偏移</span>
                  <span className="text-[#D02020] font-black">{curveIntensity.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.01"
                  value={curveIntensity}
                  onChange={(e) => setCurveIntensity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#E0E0E0] rounded-none appearance-none cursor-pointer accent-[#D02020] border-2 border-[#121212]"
                />
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#121212]/60 mt-1">
                  <span>垂直</span>
                  <span>平滑</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-widest mb-2">
                  線條顏色
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={lineColor}
                    onChange={(e) => setLineColor(e.target.value)}
                    className="h-10 w-full rounded-none cursor-pointer border-2 border-[#121212] p-0"
                  />
                  <span className="text-xs font-mono bg-[#F0C020] border-2 border-[#121212] px-2 py-1 text-[#121212] font-bold">
                    {lineColor}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Workspace + Sidebar wrapper */}
      <div className="flex-1 flex overflow-hidden">

      {/* Main Workspace */}
      <main className="flex-1 overflow-auto relative" ref={containerRef}>
        
        {/* 點擊偵測層 (z-10, 卡片下方) — 只在卡片之間的空白處可觸發 hover 與刪除 */}
        <svg
          className="absolute top-0 left-0 pointer-events-none z-10 overflow-visible"
          style={{
            width: svgDimensions.width || '100%',
            height: svgDimensions.height || '100%'
          }}
        >
          {lines.map(line => (
            <path
              key={line.id}
              d={line.path}
              stroke="transparent"
              strokeWidth="15"
              fill="none"
              className="cursor-pointer pointer-events-auto"
              onMouseEnter={() => setHoveredConnectionId(line.id)}
              onMouseLeave={() => setHoveredConnectionId(null)}
              onClick={(e) => {
                e.stopPropagation();
                requestDeleteConnection(line.id);
              }}
            >
              <title>點擊以刪除連接</title>
            </path>
          ))}
        </svg>

        {/* 視覺呈現層 (z-40, 卡片上方) — 半透明，讓卡片內容透出 */}
        <svg
          className="absolute top-0 left-0 pointer-events-none z-40 overflow-visible"
          style={{
            width: svgDimensions.width || '100%',
            height: svgDimensions.height || '100%'
          }}
        >
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 14 14"
              markerWidth="10"
              markerHeight="10"
              refX="11"
              refY="6"
              orient="auto"
            >
              <path
                d="M 1 1 L 11 6 L 1 11"
                fill="none"
                stroke={lineColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </marker>

            <marker
              id={markerHoverId}
              viewBox="0 0 14 14"
              markerWidth="10"
              markerHeight="10"
              refX="11"
              refY="6"
              orient="auto"
            >
              <path
                d="M 1 1 L 11 6 L 1 11"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </marker>
          </defs>

          {lines.map(line => {
            const hovered = hoveredConnectionId === line.id;
            const conn = connections.find(c => c.id === line.id);
            const hasLabel = conn?.label && conn.label.length > 0;
            const isEditingThis = editingLabelFor === line.id;
            return (
              <React.Fragment key={line.id}>
                <path
                  d={line.path}
                  stroke={hovered ? '#ef4444' : lineColor}
                  strokeWidth={hovered ? 3 : 2}
                  fill="none"
                  markerEnd={`url(#${hovered ? markerHoverId : markerId})`}
                  style={{ opacity: hovered ? 0.95 : 0.45 }}
                  className="transition-all duration-200 ease-out drop-shadow-sm pointer-events-none"
                />
                {/* 連線標籤 (Feature 2a) — 用 foreignObject 內嵌 HTML 便於輸入 */}
                <foreignObject
                  x={(line.midX ?? 0) - 56}
                  y={(line.midY ?? 0) - 16}
                  width="112"
                  height="32"
                  style={{ overflow: 'visible', pointerEvents: 'none' }}
                >
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    className="w-full h-full flex items-center justify-center"
                    style={{ pointerEvents: 'none' }}
                  >
                    {isEditingThis ? (
                      <input
                        autoFocus
                        value={labelDraft}
                        onChange={(e) => setLabelDraft(e.target.value)}
                        onBlur={commitLabel}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitLabel(); }
                          if (e.key === 'Escape') { setEditingLabelFor(null); setLabelDraft(''); }
                        }}
                        placeholder="Y / N"
                        className="px-2 py-0.5 border-2 border-[#121212] bg-[#F0C020] text-xs font-black uppercase tracking-widest text-center w-20 outline-none"
                        style={{ pointerEvents: 'auto' }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); beginEditLabel(line.id); }}
                        className={`px-2 py-0.5 border-2 border-[#121212] text-[10px] font-black uppercase tracking-widest transition-all
                          ${hasLabel
                            ? 'bg-[#F0C020] text-[#121212] shadow-[2px_2px_0px_0px_#121212] hover:-translate-y-0.5'
                            : 'bg-white text-[#121212]/40 hover:text-[#121212] hover:bg-[#F0C020]'}`}
                        style={{ pointerEvents: 'auto' }}
                      >
                        {hasLabel ? conn.label : '+'}
                      </button>
                    )}
                  </div>
                </foreignObject>
              </React.Fragment>
            );
          })}
        </svg>

        {/* Swimlane Grid - 使用 CSS Subgrid 讓所有泳道共用同一組 row，確保跨部門連線一定由上而下 */}
        <div
          className="grid min-h-full min-w-max p-8 gap-8 relative"
          style={{
            gridTemplateColumns: `repeat(${lanes.length}, 20rem) 4rem`,
            gridTemplateRows: `auto repeat(${Math.max(occupiedLevels.length, 1)}, auto) auto`,
          }}
        >

          {lanes.map((lane, laneIdx) => {
            const palette = LANE_PALETTES[lane.color] || LANE_PALETTES.yellow;
            return (
            <div
              key={lane.id}
              className="grid bg-white rounded-none border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] transition-colors"
              style={{
                gridColumn: laneIdx + 1,
                gridRow: '1 / -1',
                gridTemplateRows: 'subgrid',
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, lane.id)}
            >
              {/* Lane Header: 第一列 */}
              <div
                style={{ gridRow: 1, backgroundColor: palette.bg, color: palette.text }}
                className="p-4 border-b-4 border-[#121212] flex justify-between items-center group"
              >
                <h3 className="font-black uppercase tracking-tighter text-lg leading-none">{lane.title}</h3>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                        const newTitle = prompt('修改部門名稱', lane.title);
                        if(newTitle) setLanes(lanes.map(l => l.id === lane.id ? {...l, title: newTitle} : l));
                    }}
                    className="w-7 h-7 flex items-center justify-center bg-white border-2 border-[#121212] text-[#121212] hover:bg-[#F0C020] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                  >
                    <Edit3 size={13} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => removeLane(lane.id)}
                    className="w-7 h-7 flex items-center justify-center bg-white border-2 border-[#121212] text-[#121212] hover:bg-[#D02020] hover:text-white active:translate-x-[1px] active:translate-y-[1px] transition-all"
                  >
                    <Trash2 size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Level slots：每個 level 對應所有泳道共用的一列 */}
              {(occupiedLevels.length > 0 ? occupiedLevels : [0]).map((level, idx) => {
                const slotNodes = nodes
                  .filter(n => n.laneId === lane.id && nodeLevels.get(n.id) === level)
                  .sort((a, b) => a.rank - b.rank);
                return (
                  <div
                    key={`slot-${lane.id}-${level}`}
                    style={{ gridRow: idx + 2 }}
                    className="px-4 py-3 flex flex-col gap-4"
                  >
                    {slotNodes.map((node, nodeIdx) => {
                      const shapeIdx = (level + nodeIdx) % 3;
                      const isDecision = node.type === 'decision';
                      const nodeDataIds = node.dataIds || [];
                      const isSource = isConnectMode && connectSource?.id === node.id;

                      const commonHandlers = {
                        draggable: !isConnectMode,
                        onDragStart: (e) => handleDragStart(e, node.id),
                        onDragOver: handleDragOver,
                        onDrop: (e) => {
                          e.stopPropagation();
                          const assetId = e.dataTransfer.getData('application/x-asset');
                          if (assetId) {
                            addAssetToNode(node.id, assetId);
                            return;
                          }
                          handleDrop(e, lane.id, node.rank);
                        },
                        onClick: () => handleNodeClick(node),
                      };

                      // Decision node — Bauhaus 菱形
                      if (isDecision) {
                        return (
                          <div
                            key={node.id}
                            id={node.id}
                            {...commonHandlers}
                            className={`relative w-[170px] h-[170px] mx-auto cursor-pointer group z-20 transition-all
                              ${isSource ? 'z-30 scale-105' : 'hover:-translate-y-1'}
                            `}
                          >
                            <div
                              className={`absolute inset-3 rotate-45 border-2 border-[#121212] transition-all
                                ${isSource
                                  ? 'bg-[#F0C020] shadow-[6px_6px_0px_0px_#D02020]'
                                  : 'bg-white shadow-[4px_4px_0px_0px_#121212] group-hover:shadow-[6px_6px_0px_0px_#121212]'}
                              `}
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                              <span className="text-[9px] font-black text-[#121212] uppercase tracking-[0.2em] bg-[#F0C020] border-2 border-[#121212] px-1.5 py-0.5 mb-1.5">STEP {level + 1}</span>
                              <h4 className="font-black text-[#121212] leading-tight text-sm line-clamp-3">{node.title}</h4>
                            </div>
                            {isSource && (
                              <span className="absolute top-0 right-0 text-[10px] bg-[#D02020] text-white border-2 border-[#121212] px-1.5 py-0.5 font-black uppercase tracking-widest z-10">來源</span>
                            )}
                            {nodeDataIds.length > 0 && (
                              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1 bg-white border-2 border-[#121212] px-1.5 py-0.5">
                                {nodeDataIds.slice(0, 4).map(id => {
                                  const a = dataAssets.find(x => x.id === id);
                                  if (!a) return null;
                                  return (
                                    <div
                                      key={id}
                                      title={a.name}
                                      className="w-2.5 h-2.5 border border-[#121212]"
                                      style={{ backgroundColor: LANE_PALETTES[a.color]?.bg }}
                                    />
                                  );
                                })}
                                {nodeDataIds.length > 4 && <span className="text-[9px] font-black leading-none">+{nodeDataIds.length - 4}</span>}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Process node — 標準方塊卡片
                      return (
                      <div
                        key={node.id}
                        id={node.id}
                        {...commonHandlers}
                        // 卡片：z-20 (最上層)
                        className={`
                          relative p-4 pr-6 rounded-none border-2 border-[#121212] transition-all cursor-pointer group bg-white z-20
                          ${isSource
                            ? 'bg-[#F0C020] shadow-[6px_6px_0px_0px_#D02020] z-30'
                            : 'shadow-[4px_4px_0px_0px_#121212] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#121212]'}
                          ${isConnectMode && connectSource && connectSource.id !== node.id ? 'hover:bg-[#F0C020]/40' : ''}
                        `}
                      >
                        {/* Corner geometric decoration */}
                        {shapeIdx === 0 && (
                          <div
                            className="absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-[#121212]"
                            style={{ backgroundColor: palette.bg }}
                          />
                        )}
                        {shapeIdx === 1 && (
                          <div
                            className="absolute top-2 right-2 w-3 h-3 rounded-none border-2 border-[#121212]"
                            style={{ backgroundColor: palette.bg }}
                          />
                        )}
                        {shapeIdx === 2 && (
                          <div
                            className="absolute top-2 right-2 w-3 h-3 border-2 border-[#121212] rotate-45"
                            style={{ backgroundColor: palette.bg }}
                          />
                        )}

                        <div className="flex justify-between items-start mb-2 gap-2">
                           <span className="text-[10px] font-black text-[#121212] uppercase tracking-[0.2em] bg-[#F0C020] border-2 border-[#121212] px-1.5 py-0.5">STEP {level + 1}</span>
                           {isSource && (
                             <span className="text-[10px] bg-[#D02020] text-white border-2 border-[#121212] px-1.5 py-0.5 font-black uppercase tracking-widest">來源</span>
                           )}
                        </div>

                        <h4 className="font-black text-[#121212] mb-1 leading-tight">{node.title}</h4>
                        <p className="text-sm text-[#121212]/75 line-clamp-2 font-medium leading-relaxed">{node.content}</p>

                        {/* Data asset chips */}
                        {nodeDataIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t-2 border-[#121212]/15">
                            {nodeDataIds.map(id => {
                              const a = dataAssets.find(x => x.id === id);
                              if (!a) return null;
                              const ap = LANE_PALETTES[a.color] || LANE_PALETTES.yellow;
                              return (
                                <span
                                  key={id}
                                  className="inline-flex items-center gap-1 pl-1.5 pr-0.5 py-0.5 border-2 border-[#121212] text-[10px] font-bold uppercase tracking-wider"
                                  style={{ backgroundColor: ap.bg, color: ap.text }}
                                >
                                  <span className="truncate max-w-[80px]">{a.name}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeAssetFromNode(node.id, id); }}
                                    className="w-3.5 h-3.5 flex items-center justify-center hover:bg-[#121212] hover:text-white transition-colors"
                                  >
                                    <X size={9} strokeWidth={3} />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <MoreHorizontal size={14} className="text-[#121212]" strokeWidth={3} />
                        </div>
                      </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Add Step：最後一列 */}
              <div
                style={{ gridRow: Math.max(occupiedLevels.length, 1) + 2 }}
                className="px-4 pb-4 pt-2"
              >
                <button
                  onClick={() => addNode(lane.id)}
                  className="w-full py-3 border-2 border-dashed border-[#121212] rounded-none text-[#121212] hover:border-solid hover:bg-[#F0C020] transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest"
                >
                  <Plus size={16} strokeWidth={3} />
                  加入步驟
                </button>
              </div>
            </div>
            );
          })}

          <button
            onClick={addLane}
            style={{
              gridColumn: lanes.length + 1,
              gridRow: '1 / -1',
            }}
            className="flex flex-col items-center justify-center gap-2 border-4 border-dashed border-[#121212] rounded-none bg-white hover:bg-[#F0C020] text-[#121212] transition-all"
          >
            <Plus size={32} strokeWidth={3} />
          </button>
        </div>
      </main>

      {/* Data Assets Sidebar (Feature 1) */}
      <aside className="w-72 bg-white border-l-4 border-[#121212] flex flex-col overflow-hidden flex-shrink-0">
        <div className="bg-[#F0C020] border-b-4 border-[#121212] p-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#121212] flex items-center justify-center">
              <div className="w-3 h-3 bg-[#F0C020]" />
            </div>
            <h2 className="font-black uppercase tracking-tighter text-lg leading-none">資料庫</h2>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-2">拖曳卡片以關聯</p>
        </div>

        <div className="p-4 border-b-2 border-[#121212]">
          <label className="block text-[10px] font-bold text-[#121212] uppercase tracking-widest mb-2">新增資料項</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newAssetName}
              onChange={(e) => setNewAssetName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addAsset(); }}
              placeholder="資料名稱..."
              className="flex-1 min-w-0 px-3 py-2 border-2 border-[#121212] rounded-none bg-white font-medium text-sm focus:outline-none focus:shadow-[3px_3px_0px_0px_#1040C0] transition-all"
            />
            <button
              onClick={addAsset}
              className="w-10 h-10 flex-shrink-0 bg-[#D02020] border-2 border-[#121212] text-white shadow-[3px_3px_0px_0px_#121212] hover:bg-[#D02020]/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center"
            >
              <Plus size={18} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {dataAssets.length === 0 ? (
            <div className="text-center text-[10px] font-bold text-[#121212]/50 uppercase tracking-widest py-8 border-2 border-dashed border-[#121212]/30">
              尚無資料項 / 請新增
            </div>
          ) : (
            dataAssets.map(asset => {
              const ap = LANE_PALETTES[asset.color] || LANE_PALETTES.yellow;
              return (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-asset', asset.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="flex items-center gap-2 p-2 pr-1 bg-white border-2 border-[#121212] shadow-[3px_3px_0px_0px_#121212] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#121212] cursor-grab active:cursor-grabbing transition-all"
                >
                  <div
                    className="w-6 h-6 border-2 border-[#121212] flex-shrink-0"
                    style={{ backgroundColor: ap.bg }}
                  />
                  <span className="flex-1 text-sm font-bold text-[#121212] truncate">{asset.name}</span>
                  <button
                    onClick={() => deleteAsset(asset.id)}
                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-[#121212] hover:bg-[#D02020] hover:text-white transition-all"
                    title="刪除資料項"
                  >
                    <Trash2 size={13} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      </div>{/* /Workspace + Sidebar wrapper */}

      {/* Delete Connection Confirmation Modal */}
      {connectionToDelete && (
        <div className="fixed inset-0 bg-[#121212]/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-none border-4 border-[#121212] shadow-[8px_8px_0px_0px_#D02020] w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-[#D02020] rounded-full border-4 border-[#121212] flex items-center justify-center mx-auto mb-4 text-white">
                <AlertTriangle size={24} strokeWidth={3} />
              </div>
              <h3 className="font-black uppercase tracking-tighter text-2xl text-[#121212] mb-2">刪除連接線</h3>
              <p className="text-sm text-[#121212]/80 font-medium mb-6 leading-relaxed">
                您確定要移除這條流程連接線嗎？此動作無法復原。
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setConnectionToDelete(null)}
                  className="px-4 py-2 bg-white border-2 border-[#121212] hover:bg-[#E0E0E0] text-[#121212] font-bold uppercase tracking-wider text-sm shadow-[3px_3px_0px_0px_#121212] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all w-full"
                >
                  取消
                </button>
                <button
                  onClick={confirmDeleteConnection}
                  className="px-4 py-2 bg-[#D02020] hover:bg-[#D02020]/90 text-white border-2 border-[#121212] font-bold uppercase tracking-wider text-sm shadow-[3px_3px_0px_0px_#121212] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all w-full"
                >
                  確認刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && selectedNode && (
        <div className="fixed inset-0 bg-[#121212]/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-none border-4 border-[#121212] shadow-[8px_8px_0px_0px_#1040C0] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-[#1040C0] text-white px-6 py-4 border-b-4 border-[#121212] flex justify-between items-center">
              <h3 className="font-black uppercase tracking-tighter text-xl leading-none">編輯節點</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="w-8 h-8 flex items-center justify-center bg-white text-[#121212] border-2 border-[#121212] hover:bg-[#D02020] hover:text-white transition-colors"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-widest mb-2">流程標題</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-[#121212] rounded-none bg-white font-medium focus:outline-none focus:shadow-[3px_3px_0px_0px_#1040C0] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121212] uppercase tracking-widest mb-2">詳細內容</label>
                <textarea
                  rows={4}
                  value={editFormData.content}
                  onChange={(e) => setEditFormData({...editFormData, content: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-[#121212] rounded-none bg-white font-medium focus:outline-none focus:shadow-[3px_3px_0px_0px_#1040C0] transition-all resize-none"
                />
              </div>

              {/* 決策節點 toggle (Feature 2b) */}
              <label className="flex items-center gap-3 p-3 bg-[#F0F0F0] border-2 border-[#121212] cursor-pointer hover:bg-[#F0C020]/30 transition-colors">
                <input
                  type="checkbox"
                  checked={editFormData.type === 'decision'}
                  onChange={(e) => setEditFormData({ ...editFormData, type: e.target.checked ? 'decision' : 'process' })}
                  className="w-4 h-4 accent-[#D02020]"
                />
                <div className="flex-1">
                  <div className="text-xs font-black text-[#121212] uppercase tracking-widest">決策節點（菱形）</div>
                  <div className="text-[10px] text-[#121212]/70 font-medium mt-0.5">啟用後此節點將以菱形顯示，用於 Y/N 分岔</div>
                </div>
                <div className="w-6 h-6 border-2 border-[#121212] rotate-45 bg-[#F0C020]" />
              </label>

              <div className="flex items-center justify-between pt-4 mt-2 border-t-2 border-[#121212]">
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  className="flex items-center gap-1.5 text-[#D02020] hover:text-white hover:bg-[#D02020] text-xs font-black uppercase tracking-widest px-3 py-2 border-2 border-[#D02020] transition-all"
                >
                  <Trash2 size={14} strokeWidth={2.5} /> 刪除節點
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-white text-[#121212] border-2 border-[#121212] hover:bg-[#E0E0E0] font-bold uppercase tracking-wider text-xs shadow-[3px_3px_0px_0px_#121212] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-[#1040C0] hover:bg-[#1040C0]/90 text-white border-2 border-[#121212] font-bold uppercase tracking-wider text-xs shadow-[3px_3px_0px_0px_#121212] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                  >
                    儲存變更
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Helper Toast for Connect Mode */}
      {isConnectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#121212] text-white px-5 py-3 rounded-none border-4 border-[#121212] shadow-[6px_6px_0px_0px_#F0C020] z-50 flex items-center gap-3">
          <div className={`w-4 h-4 border-2 border-white ${connectSource ? 'bg-[#F0C020] rounded-full animate-pulse' : 'bg-[#D02020] rounded-none'}`}></div>
          <span className="text-xs font-bold uppercase tracking-widest">
            {connectSource
              ? `來源：${connectSource.title} / 選擇目標`
              : '請選擇起點節點'}
          </span>
          <button
            onClick={() => { setIsConnectMode(false); setConnectSource(null); }}
            className="ml-2 w-6 h-6 flex items-center justify-center bg-white text-[#121212] border-2 border-white hover:bg-[#D02020] hover:text-white transition-colors"
          >
            <X size={12} strokeWidth={3} />
          </button>
        </div>
      )}

    </div>
  );
};

export default App;