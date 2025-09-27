import React, { useReducer, useRef, useEffect, useCallback, useState, useLayoutEffect } from 'react';
import { Slide, SlideElement, ElementType, TextElement, TextSubtype, ImageElement, ShapeElement, ShapeType, Brand, Template, LineElement, ArrowElement, Background, Gradient } from '../types';
import { TextIcon, ImageIcon, ShapeIcon, FrameIcon, LineIcon, ArrowIcon, TriangleIcon } from './icons';

type DesignerAction =
  | { type: 'ADD_ELEMENT'; payload: SlideElement }
  | { type: 'UPDATE_ELEMENT'; payload: Partial<SlideElement> & { id: string } }
  | { type: 'DELETE_ELEMENT'; payload: { id: string } }
  | { type: 'SET_ELEMENTS'; payload: SlideElement[] }
  | { type: 'SET_SLIDE'; payload: Slide };

function slideReducer(state: Slide, action: DesignerAction): Slide {
  switch (action.type) {
    case 'ADD_ELEMENT':
      return { ...state, elements: [...state.elements, action.payload] };
    case 'UPDATE_ELEMENT':
      return {
        ...state,
        elements: state.elements.map(el =>
          el.id === action.payload.id ? ({ ...el, ...action.payload } as SlideElement) : el
        ),
      };
    case 'DELETE_ELEMENT':
      return {
        ...state,
        elements: state.elements.filter(el => el.id !== action.payload.id),
      };
    case 'SET_ELEMENTS':
        return { ...state, elements: action.payload };
    case 'SET_SLIDE':
        return action.payload;
    default:
      return state;
  }
}

const generateId = () => `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const FloatingToolbar: React.FC<{ onAddElement: (type: ElementType) => void; onAddFrame: () => void; }> = ({ onAddElement, onAddFrame }) => {
    const commonButtonClass = "p-3 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer";
    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-md flex items-center gap-2 p-1 z-20">
            <button onClick={onAddFrame} className={commonButtonClass} title="Frame"><FrameIcon /></button>
            <div className="w-px h-6 bg-gray-200" />
            <button onClick={() => onAddElement(ElementType.TEXT)} className={commonButtonClass} title="Text"><TextIcon /></button>
            <button onClick={() => onAddElement(ElementType.IMAGE)} className={commonButtonClass} title="Image"><ImageIcon /></button>
            <button onClick={() => onAddElement(ElementType.SHAPE)} className={commonButtonClass} title="Rectangle"><ShapeIcon /></button>
            <button onClick={() => onAddElement(ElementType.LINE)} className={commonButtonClass} title="Line"><LineIcon /></button>
            <button onClick={() => onAddElement(ElementType.ARROW)} className={commonButtonClass} title="Arrow"><ArrowIcon /></button>
        </div>
    );
};

const TextEditor: React.FC<{
    element: TextElement;
    onUpdate: (update: Partial<TextElement> & { id: string }) => void;
    onStopEditing: () => void;
}> = ({ element, onUpdate, onStopEditing }) => {
    const [value, setValue] = useState(element.text);
    const ref = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.focus();
            ref.current.select();
            // Auto-resize height to fit content
            ref.current.style.height = 'auto';
            ref.current.style.height = `${ref.current.scrollHeight}px`;
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
        if (ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = `${ref.current.scrollHeight}px`;
        }
    };

    const handleCommit = () => {
        if (value !== element.text) {
            onUpdate({ id: element.id, text: value });
        }
    };

    const handleBlur = () => {
        handleCommit();
        onStopEditing();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onStopEditing(); // Cancel edit without saving
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            handleCommit();
            onStopEditing(); // Save and exit
        }
    };

    const editorStyle: React.CSSProperties = {
        width: '100%',
        height: 'auto',
        minHeight: '100%',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        resize: 'none',
        overflow: 'hidden',
        color: element.color,
        fontFamily: element.fontFamily,
        fontSize: `${element.fontSize}px`,
        fontWeight: element.fontWeight,
        textAlign: element.textAlign,
        lineHeight: element.lineHeight,
        letterSpacing: `${element.letterSpacing}px`,
        fontStyle: element.fontStyle,
        textDecoration: element.textDecoration,
        textTransform: element.textTransform,
        padding: 0,
        boxSizing: 'border-box',
    };
    
    return (
        <textarea
            ref={ref}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={editorStyle}
            spellCheck={false}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
        />
    );
};


const RenderedElement: React.FC<{
    element: SlideElement;
    isSelected: boolean;
    onSelect: (e: React.MouseEvent, id: string) => void;
    onResizeStart: (e: React.MouseEvent, id: string, direction: string) => void;
    scale: number;
    isEditing: boolean;
    onDoubleClick: (id: string) => void;
    onUpdateElement: (update: Partial<SlideElement> & { id: string }) => void;
    onStopEditing: () => void;
    isResizing: boolean;
}> = ({ element, isSelected, onSelect, onResizeStart, scale, isEditing, onDoubleClick, onUpdateElement, onStopEditing, isResizing }) => {
    const textContentRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (element.type === ElementType.TEXT && textContentRef.current && !isResizing && !isEditing) {
            const requiredHeight = textContentRef.current.scrollHeight;
            if (requiredHeight > 0 && Math.abs(requiredHeight - element.height) > 1) {
                onUpdateElement({ id: element.id, height: requiredHeight });
            }
        }
    }, [element, isResizing, onUpdateElement, isEditing]);
    
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        transform: `rotate(${element.rotation}deg)`,
        zIndex: element.zIndex,
        cursor: 'move',
        opacity: element.opacity,
        boxShadow: element.type !== ElementType.TEXT && element.shadow ? `${element.shadow.x}px ${element.shadow.y}px ${element.shadow.blur}px ${element.shadow.spread}px ${element.shadow.color}` : 'none',
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isEditing) onSelect(e, element.id);
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (element.type === ElementType.TEXT) {
        onDoubleClick(element.id);
      }
    }

    const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
        e.stopPropagation();
        onResizeStart(e, element.id, direction);
    };
    
    const resizeHandles = ['tl', 't', 'tr', 'l', 'r', 'bl', 'b', 'br'];

    const getHandleStyle = (handle: string): React.CSSProperties => {
        const handleSize = 8 / scale;
        const style: React.CSSProperties = {
            position: 'absolute',
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            backgroundColor: '#3b82f6',
            border: `${1 / scale}px solid white`,
            borderRadius: '50%',
            zIndex: 10000,
        };

        if (handle.includes('t')) style.top = `${-handleSize / 2}px`;
        if (handle.includes('b')) style.bottom = `${-handleSize / 2}px`;
        if (handle.includes('l')) style.left = `${-handleSize / 2}px`;
        if (handle.includes('r')) style.right = `${-handleSize / 2}px`;
        if (handle === 't' || handle === 'b') style.left = `calc(50% - ${handleSize / 2}px)`;
        if (handle === 'l' || handle === 'r') style.top = `calc(50% - ${handleSize / 2}px)`;

        const cursors: { [key: string]: string } = {
            t: 'ns-resize', b: 'ns-resize', l: 'ew-resize', r: 'ew-resize',
            tl: 'nwse-resize', br: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize'
        };
        style.cursor = cursors[handle];
        return style;
    };
    
    const renderContent = () => {
        const borderStyle = isSelected ? { outline: `${2 / scale}px solid #3b82f6` } : {};
        const commonStyle: React.CSSProperties = { width: '100%', height: '100%', ...borderStyle, boxSizing: 'border-box' };

        switch (element.type) {
            case ElementType.TEXT:
                const textEl = element as TextElement;
                return <div ref={textContentRef} style={{
                    ...commonStyle,
                    height: 'auto',
                    color: textEl.color, 
                    fontFamily: textEl.fontFamily, 
                    fontSize: `${textEl.fontSize}px`, 
                    fontWeight: textEl.fontWeight, 
                    overflow: 'visible', 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    textAlign: textEl.textAlign, 
                    lineHeight: textEl.lineHeight, 
                    letterSpacing: `${textEl.letterSpacing}px`,
                    fontStyle: textEl.fontStyle,
                    textDecoration: textEl.textDecoration,
                    textTransform: textEl.textTransform,
                    backgroundColor: textEl.backgroundColor,
                    border: `${textEl.strokeWidth}px solid ${textEl.strokeColor}`,
                    borderRadius: `${textEl.borderRadius}px`,
                    padding: `${textEl.padding}px`,
                    textShadow: textEl.textShadow ? `${textEl.textShadow.x}px ${textEl.textShadow.y}px ${textEl.textShadow.blur}px ${textEl.textShadow.color}` : 'none',
                }}>{isEditing ? <TextEditor element={textEl} onUpdate={onUpdateElement} onStopEditing={onStopEditing} /> : textEl.text}</div>;
            case ElementType.IMAGE:
                 const imageEl = element as ImageElement;
                 const imageContainerStyle: React.CSSProperties = {
                    ...commonStyle,
                    overflow: 'hidden',
                    borderRadius: `${imageEl.borderRadius}px`,
                 };
        
                 if (imageEl.border && imageEl.border.width > 0) {
                    imageContainerStyle.border = `${imageEl.border.width}px ${imageEl.border.style} ${imageEl.border.color}`;
                    if (imageEl.border.offset) {
                        imageContainerStyle.padding = `${imageEl.border.offset}px`;
                    }
                 }
                 
                 const imgStyle: React.CSSProperties = {
                    width: '100%',
                    height: '100%',
                    objectFit: imageEl.objectFit,
                    objectPosition: `${imageEl.crop.x}% ${imageEl.crop.y}%`,
                    transform: `scale(${imageEl.crop.zoom})`
                 };
                 if (imageEl.borderRadius > 0) {
                    const innerRadius = Math.max(0, imageEl.borderRadius - (imageEl.border?.width || 0));
                    imgStyle.borderRadius = `${innerRadius}px`;
                 }

                 return <div style={imageContainerStyle}>
                    <img src={imageEl.src} alt={imageEl.alt} style={imgStyle} draggable={false} />
                 </div>;
            case ElementType.SHAPE:
                const shapeEl = element as ShapeElement;
                const shapeStyle: React.CSSProperties = {
                    ...commonStyle,
                    ...getBackgroundStyle(shapeEl.fill),
                    border: `${shapeEl.strokeWidth}px solid ${shapeEl.strokeColor}`,
                    borderRadius: `${shapeEl.borderRadius}px`
                };

                if (shapeEl.shapeType === ShapeType.ELLIPSE) {
                    shapeStyle.borderRadius = '50%';
                }
                if (shapeEl.shapeType === ShapeType.TRIANGLE) {
                    shapeStyle.clipPath = 'polygon(50% 0, 0 100%, 100% 100%)';
                    shapeStyle.borderRadius = '0';
                    shapeStyle.border = 'none'; // Stroke border doesn't work with clip-path
                }
                return <div style={shapeStyle} />;
            case ElementType.LINE:
                const lineEl = element as LineElement;
                return <div style={commonStyle}><div style={{width: '100%', height: '100%', backgroundColor: lineEl.strokeColor}}></div></div>;
            case ElementType.ARROW:
                 const arrowEl = element as ArrowElement;
                 return (
                    <div style={commonStyle} className="overflow-visible">
                        <div style={{ position: 'absolute', left: 0, top: `calc(50% - ${arrowEl.strokeWidth / 2}px)`, width: '100%', height: `${arrowEl.strokeWidth}px`, backgroundColor: arrowEl.strokeColor }} />
                        <div style={{
                            position: 'absolute', right: `-${arrowEl.strokeWidth * 2}px`, top: `calc(50% - ${arrowEl.strokeWidth * 2}px)`,
                            width: 0, height: 0,
                            borderTop: `${arrowEl.strokeWidth * 2}px solid transparent`,
                            borderBottom: `${arrowEl.strokeWidth * 2}px solid transparent`,
                            borderLeft: `${arrowEl.strokeWidth * 3}px solid ${arrowEl.strokeColor}`,
                        }} />
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div style={style} onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick}>
            {renderContent()}
            {isSelected && !isEditing && resizeHandles.map(handle => ( <div key={handle} style={getHandleStyle(handle)} onMouseDown={(e) => handleResizeMouseDown(e, handle)} /> ))}
        </div>
    );
};


interface DesignerProps {
    currentSlide: Slide;
    onSlideUpdate: (slide: Slide) => void;
    brand: Brand;
    zoom: number;
    canvasPosition: { top: number; left: number; };
    selectedElementId: string | null;
    setSelectedElementId: (id: string | null) => void;
    onAddFrame: () => void;
    onContainerReady: (element: HTMLDivElement) => void;
    editingElementId: string | null;
    setEditingElementId: (id: string | null) => void;
}

const getBackgroundStyle = (background: Background): React.CSSProperties => {
    switch (background.type) {
        case 'color':
            return { backgroundColor: background.color };
        case 'image':
            let backgroundSize = 'cover';
            if (background.fit === 'fit') backgroundSize = 'contain';
            else if (background.fit === 'tile') backgroundSize = `${background.zoom}%`;
            else if (background.fit === 'manual') backgroundSize = `${background.zoom}%`;
            
            return {
                backgroundImage: `url(${background.src})`,
                backgroundSize: backgroundSize,
                backgroundPosition: `${background.position.x}% ${background.position.y}%`,
                backgroundRepeat: background.fit === 'tile' ? 'repeat' : 'no-repeat',
            };
        case 'gradient':
            const generateGradientString = (gradient: Gradient) => {
                const stops = gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ');
                switch(gradient.type) {
                    case 'linear': return `linear-gradient(${gradient.angle}deg, ${stops})`;
                    case 'radial': return `radial-gradient(${gradient.shape} at ${gradient.position}, ${stops})`;
                    case 'conic': return `conic-gradient(from ${gradient.angle}deg at ${gradient.position}, ${stops})`;
                }
            };
            return { backgroundImage: generateGradientString(background.gradient) };
    }
    return {};
};

export const Designer: React.FC<DesignerProps> = ({ currentSlide, onSlideUpdate, brand, zoom, canvasPosition, selectedElementId, setSelectedElementId, onAddFrame, onContainerReady, editingElementId, setEditingElementId }) => {
    const [slide, dispatch] = useReducer(slideReducer, currentSlide);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const designerAreaRef = useRef<HTMLDivElement>(null);
    const actionRef = useRef<{ type: 'move' | 'resize' | null; direction?: string; startX: number; startY: number; startElX: number; startElY: number; startElW: number; startElH: number; startFontSize?: number; }>({ type: null, startX: 0, startY: 0, startElX: 0, startElY: 0, startElW: 0, startElH: 0 });
    const [isInteracting, setIsInteracting] = useState(false);

    useEffect(() => {
        if (designerAreaRef.current) {
            onContainerReady(designerAreaRef.current);
        }
    }, [onContainerReady]);

    useEffect(() => {
        dispatch({type: 'SET_SLIDE', payload: currentSlide });
    }, [currentSlide]);

    const timeoutRef = useRef<number | null>(null);
    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => { if(JSON.stringify(slide) !== JSON.stringify(currentSlide)) onSlideUpdate(slide); }, 300);
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, [slide, onSlideUpdate]);

    const updateElement = useCallback((update: Partial<SlideElement> & { id: string }) => {
        dispatch({ type: 'UPDATE_ELEMENT', payload: update });
    }, []);
    
    const addElement = (type: ElementType) => {
        if (!slide.width || !slide.height) return;
        let newElement: SlideElement;
        const common = { id: generateId(), x: slide.width / 2 - 100, y: slide.height / 2 - 50, width: 200, height: 100, rotation: 0, zIndex: slide.elements.length, opacity: 1 };

        switch (type) {
            case ElementType.TEXT:
                newElement = { ...common, type: ElementType.TEXT, text: 'New Text', fontFamily: brand.fonts.body, fontSize: 32, fontWeight: 400, color: brand.colors.text, subtype: TextSubtype.PARAGRAPH, width: 250, height: 50, textAlign: 'left', lineHeight: 1.5, letterSpacing: 0, name: 'Text', fontStyle: 'normal', textDecoration: 'none', textTransform: 'none', backgroundColor: 'transparent', strokeColor: 'transparent', strokeWidth: 0, padding: 0, borderRadius: 0 };
                break;
            case ElementType.IMAGE:
                newElement = { ...common, type: ElementType.IMAGE, src: `https://picsum.photos/400/200?random=${Date.now()}`, alt: 'Placeholder', width: 400, height: 200, objectFit: 'cover', crop: { x: 50, y: 50, zoom: 1 }, borderRadius: 0, name: 'Image', source: 'upload' };
                break;
             case ElementType.LINE:
                newElement = { ...common, type: ElementType.LINE, strokeColor: brand.colors.text, strokeWidth: 4, height: 4, name: 'Line' };
                break;
            case ElementType.ARROW:
                newElement = { ...common, type: ElementType.ARROW, strokeColor: brand.colors.text, strokeWidth: 4, height: 4, name: 'Arrow' };
                break;
            case ElementType.SHAPE:
            default:
                newElement = { ...common, type: ElementType.SHAPE, shapeType: ShapeType.RECTANGLE, fill: { type: 'color', color: brand.colors.accent }, strokeColor: 'transparent', strokeWidth: 0, width: 150, height: 150, borderRadius: 0, name: 'Shape' };
                break;
        }
        dispatch({ type: 'ADD_ELEMENT', payload: newElement });
        setSelectedElementId(newElement.id);
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            setSelectedElementId(null);
            setEditingElementId(null);
        }
    };
    
    const handleElementSelect = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedElementId(id);
        setEditingElementId(null);
        const selectedEl = slide.elements.find(el => el.id === id);
        if (!selectedEl) return;

        actionRef.current = { type: 'move', startX: e.clientX, startY: e.clientY, startElX: selectedEl.x, startElY: selectedEl.y, startElW: selectedEl.width, startElH: selectedEl.height };
        setIsInteracting(true);

        if (e.altKey) {
            const newEl = { ...selectedEl, id: generateId(), x: selectedEl.x + 20, y: selectedEl.y + 20 };
            dispatch({ type: 'ADD_ELEMENT', payload: newEl });
            setSelectedElementId(newEl.id);
        }
    };
    
    const handleResizeStart = (e: React.MouseEvent, id: string, direction: string) => {
        e.stopPropagation();
        const selectedEl = slide.elements.find(el => el.id === id);
        if (!selectedEl) return;
        actionRef.current = { type: 'resize', direction, startX: e.clientX, startY: e.clientY, startElX: selectedEl.x, startElY: selectedEl.y, startElW: selectedEl.width, startElH: selectedEl.height, startFontSize: selectedEl.type === 'text' ? (selectedEl as TextElement).fontSize : undefined };
        setIsInteracting(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!actionRef.current.type || !selectedElementId || editingElementId) return;
        
        const selectedEl = slide.elements.find(el => el.id === selectedElementId);
        if (!selectedEl) return;

        const { type, startX, startY, startElX, startElY, startElW, startElH, direction } = actionRef.current;
        const dx = (e.clientX - startX) / zoom;
        const dy = (e.clientY - startY) / zoom;

        if (type === 'move') {
            updateElement({ id: selectedElementId, x: startElX + dx, y: startElY + dy });
        } else if (type === 'resize' && direction) {
             // Proportional resize for text and image on corner drag
            if ((selectedEl.type === ElementType.TEXT || selectedEl.type === ElementType.IMAGE) && ['tl', 'tr', 'bl', 'br'].includes(direction)) {
                const newProposedW = direction.includes('l') ? startElW - dx : startElW + dx;
                
                if (startElW > 0 && newProposedW > 10) {
                    const scaleFactor = newProposedW / startElW;
                    const newW = startElW * scaleFactor;
                    const newH = startElH * scaleFactor;
                    
                    let newX = startElX;
                    let newY = startElY;

                    if (direction.includes('l')) newX = startElX + startElW - newW;
                    if (direction.includes('t')) newY = startElY + startElH - newH;
                    
                    const update: Partial<SlideElement> & { id: string } = { 
                        id: selectedElementId, 
                        x: newX, 
                        y: newY, 
                        width: newW, 
                        height: newH,
                    };
                    
                    if (selectedEl.type === ElementType.TEXT) {
                        const { startFontSize } = actionRef.current;
                        if (typeof startFontSize !== 'undefined') {
                            (update as Partial<TextElement>).fontSize = Math.max(8, startFontSize * scaleFactor);
                        }
                    }
                    
                    updateElement(update);
                }
            } else {
                // Generic resize logic for side handles (and other elements)
                let newX = startElX, newY = startElY, newW = startElW, newH = startElH;
                const MIN_SIZE = 10;
                if (direction.includes('r')) newW = Math.max(MIN_SIZE, startElW + dx);
                if (direction.includes('l')) { 
                    newW = Math.max(MIN_SIZE, startElW - dx); 
                    newX = startElX + (startElW - newW); 
                }
                if (direction.includes('b')) newH = Math.max(MIN_SIZE, startElH + dy);
                if (direction.includes('t')) { 
                    newH = Math.max(MIN_SIZE, startElH - dy); 
                    newY = startElY + (startElH - newH); 
                }
                updateElement({ id: selectedElementId, x: newX, y: newY, width: newW, height: newH });
            }
        }
    };

    const handleMouseUp = () => { 
        actionRef.current.type = null; 
        setIsInteracting(false);
    };

    const canvasHasFrame = slide.width && slide.height;

    return (
        <div ref={designerAreaRef} className="flex-1 dot-grid relative" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            {canvasHasFrame ? (
                <div
                    ref={canvasContainerRef}
                    className="shadow-2xl bg-white overflow-hidden"
                    style={{
                        position: 'absolute',
                        top: `${canvasPosition.top}px`,
                        left: `${canvasPosition.left}px`,
                        width: `${slide.width}px`,
                        height: `${slide.height}px`,
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                        ...getBackgroundStyle(slide.background)
                    }}
                    onMouseDown={handleCanvasMouseDown}
                >
                    {slide.elements.sort((a, b) => a.zIndex - b.zIndex).map(el => (
                        <RenderedElement
                            key={el.id}
                            element={el}
                            isSelected={el.id === selectedElementId}
                            onSelect={handleElementSelect}
                            onResizeStart={handleResizeStart}
                            scale={zoom}
                            isEditing={el.id === editingElementId}
                            onDoubleClick={setEditingElementId}
                            onUpdateElement={updateElement}
                            onStopEditing={() => setEditingElementId(null)}
                            isResizing={isInteracting && actionRef.current.type === 'resize'}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-500">Your canvas is empty</h2>
                    <p className="text-gray-400 mt-2">Click the Frame icon below or on the left to add a canvas and start designing.</p>
                </div>
            )}
            <FloatingToolbar onAddElement={addElement} onAddFrame={onAddFrame} />
        </div>
    );
};