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

// --- Components ---

const App = () => {
  // --- State ---
  const [lanes, setLanes] = useState([
    { id: 'dept-1', title: '業務部', color: 'bg-blue-50 border-blue-200 text-blue-800' },
    { id: 'dept-2', title: '技術部', color: 'bg-purple-50 border-purple-200 text-purple-800' },
    { id: 'dept-3', title: '管理部', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  ]);

  const [nodes, setNodes] = useState([
    { id: 'node-1', laneId: 'dept-1', title: '客戶需求', content: '接收來自客戶的初步需求信件', rank: 0 },
    { id: 'node-2', laneId: 'dept-2', title: '技術評估', content: '評估開發可行性與時程', rank: 0 },
    { id: 'node-3', laneId: 'dept-1', title: '報價單製作', content: '根據評估結果製作報價單', rank: 1 },
    { id: 'node-4', laneId: 'dept-3', title: '主管審核', content: '審核報價與合約條款', rank: 0 },
  ]);

  const [connections, setConnections] = useState([
    { from: 'node-1', to: 'node-2', id: 'c1' }, // 橫向
    { from: 'node-1', to: 'node-3', id: 'c-vertical-test' }, // 垂直測試
    { from: 'node-2', to: 'node-3', id: 'c2' }, // 橫向回流
    { from: 'node-3', to: 'node-4', id: 'c3' }, // 橫向
  ]);

  // UI State
  const [selectedNode, setSelectedNode] = useState(null);
  const [isConnectMode, setIsConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({ title: '', content: '' });
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [curveIntensity, setCurveIntensity] = useState(0.25); // 預設入射角參數
  const [lineColor, setLineColor] = useState('#94a3b8'); // 預設線條顏色
  
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

      return { id: conn.id, path: pathData };
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
    const colors = [
      'bg-blue-50 border-blue-200 text-blue-800',
      'bg-purple-50 border-purple-200 text-purple-800', 
      'bg-emerald-50 border-emerald-200 text-emerald-800',
      'bg-amber-50 border-amber-200 text-amber-800',
      'bg-rose-50 border-rose-200 text-rose-800'
    ];
    setLanes([...lanes, { 
      id, 
      title: '新部門', 
      color: colors[lanes.length % colors.length] 
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
      rank: nodes.filter(n => n.laneId === laneId).length
    };
    setNodes([...nodes, newNode]);
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
              id: `c-${Date.now()}` 
            }]);
          }
          setConnectSource(null);
        }
      }
    } else {
      setSelectedNode(node);
      setEditFormData({ title: node.title, content: node.content });
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
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-40 relative">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all shadow-md active:scale-95 ${showSettings ? 'bg-slate-800 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            {showSettings ? <X size={24} /> : <Settings size={24} />}
          </button>

          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">FlowArchitect</h1>
            <p className="text-xs text-slate-500 font-medium">工作流程設計與管理系統</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-100 rounded-lg p-1 flex gap-1 border border-slate-200">
            <button 
              onClick={() => { setIsConnectMode(false); setConnectSource(null); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${!isConnectMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              <Move size={16} className="inline mr-1.5" />
              選取 / 拖曳
            </button>
            <button 
              onClick={() => setIsConnectMode(true)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isConnectMode ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              <LinkIcon size={16} className="inline mr-1.5" />
              連接模式 {connectSource && '(選擇目標...)'}
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-2"></div>

          <button 
            onClick={addLane}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors shadow-md active:scale-95"
          >
            <Plus size={16} />
            新增部門泳道
          </button>
        </div>

        {/* Global Settings Dropdown Panel */}
        {showSettings && (
          <div className="absolute top-full left-6 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold border-b border-slate-100 pb-2">
              <Sliders size={18} />
              <span>全域設定</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="flex justify-between text-sm font-medium text-slate-600 mb-1">
                  <span>曲線偏移 (入射角)</span>
                  <span className="text-indigo-600">{curveIntensity.toFixed(2)}</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="0.8" 
                  step="0.01" 
                  value={curveIntensity}
                  onChange={(e) => setCurveIntensity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>垂直</span>
                  <span>平滑</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  線條顏色
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={lineColor}
                    onChange={(e) => setLineColor(e.target.value)}
                    className="h-10 w-full rounded cursor-pointer border-0 p-0"
                  />
                  <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
                    {lineColor}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Workspace */}
      <main className="flex-1 overflow-auto relative" ref={containerRef}>
        
        {/* SVG Connection Layer - z-10 (中間層) */}
        <svg 
          className="absolute top-0 left-0 pointer-events-none z-10 overflow-visible"
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

          {lines.map(line => (
            <g 
              key={line.id} 
              className="group"
              onMouseEnter={() => setHoveredConnectionId(line.id)}
              onMouseLeave={() => setHoveredConnectionId(null)}
            >
              <path 
                d={line.path} 
                stroke={lineColor} 
                strokeWidth="2" 
                fill="none" 
                markerEnd={`url(#${hoveredConnectionId === line.id ? markerHoverId : markerId})`}
                className="transition-all duration-200 ease-out drop-shadow-sm pointer-events-none opacity-40
                           group-hover:stroke-red-500 group-hover:stroke-[3px] group-hover:opacity-100"
              />

              <path 
                d={line.path} 
                stroke="transparent" 
                strokeWidth="15" 
                fill="none" 
                className="cursor-pointer pointer-events-auto" 
                onClick={(e) => {
                  e.stopPropagation(); 
                  requestDeleteConnection(line.id);
                }}
              >
                <title>點擊以刪除連接</title>
              </path>
            </g>
          ))}
        </svg>

        {/* Swimlane Grid - z-auto (底層背景) */}
        <div className="flex min-h-full min-w-max p-8 gap-8 relative">
          
          {lanes.map((lane) => (
            <div 
              key={lane.id} 
              // 修改：移除 backdrop-blur-sm, 改用 bg-slate-50/80, transition-colors
              // 這樣做可以防止 lane 建立獨立的 stacking context，讓卡片的 z-20 能突破出來
              className="flex flex-col w-80 bg-slate-50/80 rounded-xl border border-slate-200 shadow-sm flex-shrink-0 transition-colors hover:border-slate-300"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, lane.id)}
            >
              {/* Lane Header */}
              <div className={`p-4 border-b border-slate-100 rounded-t-xl flex justify-between items-center group ${lane.color.replace('text-', 'bg-').replace('border-', '').split(' ')[0]} bg-opacity-20`}>
                <h3 className={`font-bold ${lane.color.split(' ').pop()}`}>{lane.title}</h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                        const newTitle = prompt('修改部門名稱', lane.title);
                        if(newTitle) setLanes(lanes.map(l => l.id === lane.id ? {...l, title: newTitle} : l));
                    }}
                    className="p-1 hover:bg-black/5 rounded"
                  >
                    <Edit3 size={14} className="text-slate-600" />
                  </button>
                  <button onClick={() => removeLane(lane.id)} className="p-1 hover:bg-red-100 rounded text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Lane Content (Nodes) */}
              <div className="flex-1 p-4 flex flex-col gap-10 min-h-[400px]">
                {nodes
                  .filter(n => n.laneId === lane.id)
                  .sort((a, b) => a.rank - b.rank)
                  .map((node, index) => (
                    <div
                      key={node.id}
                      id={node.id}
                      draggable={!isConnectMode}
                      onDragStart={(e) => handleDragStart(e, node.id)}
                      onDrop={(e) => {
                        e.stopPropagation(); 
                        handleDrop(e, lane.id, index);
                      }}
                      onClick={() => handleNodeClick(node)}
                      // 卡片：z-20 (最上層)
                      className={`
                        relative p-4 rounded-lg border-2 shadow-sm transition-all cursor-pointer group bg-white z-20
                        ${isConnectMode && connectSource?.id === node.id ? 'border-indigo-500 ring-2 ring-indigo-200 scale-105 z-30' : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'}
                        ${isConnectMode && connectSource && connectSource.id !== node.id ? 'hover:ring-2 hover:ring-green-200 hover:border-green-400' : ''}
                      `}
                    >
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">STEP {index + 1}</span>
                         {isConnectMode && connectSource?.id === node.id && (
                           <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">來源</span>
                         )}
                      </div>
                      
                      <h4 className="font-bold text-slate-800 mb-1">{node.title}</h4>
                      <p className="text-sm text-slate-500 line-clamp-2">{node.content}</p>

                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <MoreHorizontal size={16} className="text-slate-400" />
                      </div>

                    </div>
                  ))}
                  
                  <button 
                    onClick={() => addNode(lane.id)}
                    className="mt-6 py-3 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Plus size={16} />
                    加入步驟
                  </button>
              </div>
            </div>
          ))}

          <button 
            onClick={addLane}
            className="w-16 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all flex-shrink-0"
          >
            <Plus size={24} />
          </button>
        </div>
      </main>

      {/* Delete Connection Confirmation Modal */}
      {connectionToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-2">刪除連接線？</h3>
              <p className="text-sm text-slate-500 mb-6">
                您確定要移除這條流程連接線嗎？此動作無法復原。
              </p>
              
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => setConnectionToDelete(null)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-sm transition-colors w-full"
                >
                  取消
                </button>
                <button 
                  onClick={confirmDeleteConnection}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm shadow-md transition-colors w-full"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">編輯節點</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">流程標題</label>
                <input 
                  type="text" 
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">詳細內容</label>
                <textarea 
                  rows={4}
                  value={editFormData.content}
                  onChange={(e) => setEditFormData({...editFormData, content: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
                <button 
                  onClick={() => deleteNode(selectedNode.id)}
                  className="flex items-center text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 hover:bg-red-50 rounded"
                >
                  <Trash2 size={16} className="mr-1.5" /> 刪除節點
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm shadow-md transition-colors"
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-3 animate-bounce-in">
          <div className={`w-3 h-3 rounded-full ${connectSource ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`}></div>
          <span className="text-sm font-medium">
            {connectSource 
              ? `已選擇「${connectSource.title}」，請點擊另一個節點進行連接` 
              : '請選擇起點節點'}
          </span>
          <button onClick={() => { setIsConnectMode(false); setConnectSource(null); }} className="ml-2 hover:bg-slate-700 rounded-full p-1">
            <X size={14} />
          </button>
        </div>
      )}

    </div>
  );
};

export default App;