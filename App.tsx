
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GoogleGenAI } from "@google/genai";
import { Designer } from './components/Designer';
import { Presenter } from './components/Presenter';
// FIX: Import LinearGradient, RadialGradient, and ConicGradient types.
import { Presentation, Slide, Brand, Template, SlideElement, ElementType, TextElement, ImageElement, ShapeElement, ShapeType, Background, ColorBackground, ImageBackground, GradientBackground, BackgroundFit, GradientStop, Gradient, TextSubtype, LinearGradient, RadialGradient, ConicGradient } from './types';
import { AddIcon, PresentIcon, TextIcon, ImageIcon, ShapeIcon, TrashIcon, ChevronDownIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, FacebookIcon, InstagramIcon, TikTokIcon, LinkedInIcon, FontBoldIcon, FontItalicIcon, FontUnderlineIcon, TextTransformIcon } from './components/icons';

type View = 'designer' | 'presenter';
type LeftPanelMode = 'layers' | 'frames';

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const defaultSlide: Omit<Slide, 'id'> = { elements: [], background: { type: 'color', color: '#FFFFFF' } };
const defaultBrand: Brand = {
    logo: '',
    colors: { primary: '#3b82f6', secondary: '#10b981', accent: '#ef4444', text: '#111827' },
    fonts: { heading: 'Roboto Slab', body: 'Inter' }
};

const textSubtypeStyles: { [key in TextSubtype]: Partial<TextElement> } = {
    [TextSubtype.H1]: { fontSize: 64, fontWeight: 700, letterSpacing: -1, fontStyle: 'normal' },
    [TextSubtype.H2]: { fontSize: 48, fontWeight: 700, letterSpacing: -0.5, fontStyle: 'normal' },
    [TextSubtype.H3]: { fontSize: 36, fontWeight: 700, fontStyle: 'normal' },
    [TextSubtype.H4]: { fontSize: 28, fontWeight: 700, fontStyle: 'normal' },
    [TextSubtype.PARAGRAPH]: { fontSize: 18, fontWeight: 400, fontStyle: 'normal' },
    [TextSubtype.QUOTE]: { fontSize: 24, fontWeight: 400, fontStyle: 'italic' },
};

const frameOptions = [
    { 
        name: 'Instagram', 
        icon: InstagramIcon,
        formats: [
            { name: 'Square Post (1:1)', width: 1080, height: 1080 },
            { name: 'Vertical Post (4:5)', width: 1080, height: 1350 },
            { name: 'Horizontal Post (1.91:1)', width: 1080, height: 566 },
            { name: 'Story/Reels (9:16)', width: 1080, height: 1920 },
        ]
    },
    { 
        name: 'Facebook', 
        icon: FacebookIcon,
        formats: [
            { name: 'Square Post (1:1)', width: 1200, height: 1200 },
            { name: 'Landscape Post (1.91:1)', width: 1200, height: 630 },
            { name: 'Story (9:16)', width: 1080, height: 1920 },
            { name: 'Profile Picture (1:1)', width: 400, height: 400 },
            { name: 'Cover Photo', width: 851, height: 315 },
            { name: 'Event Cover', width: 1200, height: 628 },
            { name: 'Group Cover', width: 1640, height: 856 },
            { name: 'Ad (4:5)', width: 1440, height: 1800 },
        ]
    },
    {
        name: 'TikTok',
        icon: TikTokIcon,
        formats: [
            { name: 'Vertical Video (9:16)', width: 1080, height: 1920 },
            { name: 'Square Video (1:1)', width: 1080, height: 1080 },
            { name: 'Landscape Video (16:9)', width: 1920, height: 1080 },
        ]
    },
    {
        name: 'LinkedIn',
        icon: LinkedInIcon,
        formats: [
            { name: 'Square Post (1:1)', width: 1080, height: 1080 },
            { name: 'Landscape Post (1.91:1)', width: 1200, height: 628 },
            { name: 'Article Image (1.91:1)', width: 1200, height: 644 },
            { name: 'Profile Photo (1:1)', width: 400, height: 400 },
            { name: 'Profile Banner', width: 1584, height: 396 },
            { name: 'Company Logo (1:1)', width: 300, height: 300 },
            { name: 'Company Banner', width: 1536, height: 768 },
            { name: 'Video (16:9)', width: 1920, height: 1080 },
        ]
    }
];

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  return useState<T>(initialValue);
};

const Header: React.FC<{zoom: number, setZoom: (z:number) => void, onPresent: ()=>void, title: string, onTitleChange: (t:string)=>void}> = ({zoom, setZoom, onPresent, title, onTitleChange}) => (
    <header className="bg-white p-2 flex justify-between items-center border-b border-gray-200 h-14 z-10">
        <div className="pl-2">
             <input 
                type="text" 
                value={title}
                onChange={e => onTitleChange(e.target.value)}
                className="bg-transparent text-gray-800 text-md font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-md px-2 py-1"
            />
        </div>
        <div className="flex items-center gap-4 text-gray-600">
            <div className="text-sm">{Math.round(zoom * 100)}%</div>
            <button onClick={onPresent} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors flex items-center gap-2">
                <PresentIcon /> Present
            </button>
        </div>
    </header>
);

const FramePanel: React.FC<{ onFrameSelect: (width: number, height: number) => void }> = ({ onFrameSelect }) => {
    return (
        <aside className="w-64 bg-white flex flex-col border-r border-gray-200">
            <div className="p-2 border-b border-gray-200 h-10 flex items-center px-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Frames</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <button onClick={() => onFrameSelect(1280, 720)} className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-left">
                    <PresentIcon size={20}/>
                    <span className="text-sm font-medium text-gray-700">Presentation</span>
                </button>
                 <div className="border-b border-gray-200 my-2" />
                {frameOptions.map(option => (
                    <details key={option.name} className="group">
                        <summary className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer list-none">
                            <option.icon />
                            <span className="text-sm font-medium text-gray-700 flex-1">{option.name}</span>
                            <ChevronDownIcon />
                        </summary>
                        <div className="pl-8 space-y-1 pt-1">
                            {option.formats.map(format => (
                                <button key={format.name} onClick={() => onFrameSelect(format.width, format.height)} className="w-full text-left text-sm text-gray-600 p-2 rounded-md hover:bg-gray-100">
                                    {format.name}
                                </button>
                            ))}
                        </div>
                    </details>
                ))}
            </div>
        </aside>
    );
};

const LayersPanel: React.FC<{
    slides: Slide[],
    currentSlideIndex: number,
    setCurrentSlideIndex: (i:number) => void,
    addSlide: () => void,
    selectedElementId: string | null,
    setSelectedElementId: (id: string | null) => void;
    reorderElements: (draggedId: string, targetId: string) => void;
    updateElement: (update: Partial<SlideElement> & { id: string }) => void;
}> = ({ slides, currentSlideIndex, setCurrentSlideIndex, addSlide, selectedElementId, setSelectedElementId, reorderElements, updateElement }) => {
    const currentSlide = slides[currentSlideIndex];
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingId]);

    const handleNameChange = (id: string, newName: string) => {
        updateElement({ id, name: newName });
        setEditingId(null);
    };

    const getLayerIcon = (element: SlideElement) => {
        switch (element.type) {
            case ElementType.TEXT: return <TextIcon size={16} />;
            case ElementType.IMAGE: return <ImageIcon size={16} />;
            case ElementType.SHAPE: return <ShapeIcon size={16} />;
            default: return <div className="w-4 h-4 bg-gray-400 rounded-sm" />;
        }
    };
    
    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("application/element-id", id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        setDragOverId(id);
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData("application/element-id");
        if (draggedId && draggedId !== targetId) {
            reorderElements(draggedId, targetId);
        }
        setDragOverId(null);
    };

    const sortedElements = currentSlide?.elements.slice().sort((a, b) => b.zIndex - a.zIndex) || [];

    return (
        <aside className="w-64 bg-white flex flex-col border-r border-gray-200">
            <div className="p-2 border-b border-gray-200 h-10 flex items-center px-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pages</h2>
            </div>
            <div className="flex-grow overflow-y-auto py-2">
                {slides.map((slide, index) => (
                    <div key={slide.id} onClick={() => setCurrentSlideIndex(index)}
                        className={`mx-2 px-3 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${index === currentSlideIndex ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}>
                       Slide {index + 1}
                    </div>
                ))}
            </div>
            <div className="p-2 border-b border-t border-gray-200 h-10 flex items-center px-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Layers</h2>
            </div>
             <div className="flex-grow overflow-y-auto py-2" onDragLeave={() => setDragOverId(null)}>
                {sortedElements.map(el => (
                    <div 
                        key={el.id}
                        draggable={!editingId}
                        onDragStart={(e) => handleDragStart(e, el.id)}
                        onDragOver={(e) => handleDragOver(e, el.id)}
                        onDrop={(e) => handleDrop(e, el.id)}
                        onClick={() => setSelectedElementId(el.id)}
                        onDoubleClick={() => setEditingId(el.id)}
                        className={`relative flex items-center gap-2 mx-2 px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${selectedElementId === el.id ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        {dragOverId === el.id && <div className="absolute top-0 left-2 right-2 h-0.5 bg-blue-500 z-10" />}
                        {getLayerIcon(el)}
                        {editingId === el.id ? (
                            <input
                                ref={inputRef}
                                type="text"
                                defaultValue={el.name || ''}
                                onBlur={(e) => handleNameChange(el.id, (e.currentTarget as HTMLInputElement).value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleNameChange(el.id, (e.currentTarget as HTMLInputElement).value);
                                    if (e.key === 'Escape') setEditingId(null);
                                }}
                                onClick={e => e.stopPropagation()}
                                className="flex-1 bg-blue-50 text-blue-800 focus:outline-none -ml-1 px-1 rounded-sm w-full"
                            />
                        ) : (
                           <span className="truncate flex-1">{el.name || (el.type === 'text' ? (el as TextElement).text : el.type)}</span>
                        )}
                    </div>
                ))}
            </div>
        </aside>
    );
};

// #region New UI Components
const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mounted, setMounted] = useState(false);
    const elRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        elRef.current = document.createElement('div');
        document.body.appendChild(elRef.current);
        setMounted(true);
        return () => {
            if (elRef.current) {
                document.body.removeChild(elRef.current);
            }
        };
    }, []);

    return mounted && elRef.current ? createPortal(children, elRef.current) : null;
};

const Popover: React.FC<{
    anchorEl: HTMLElement | null;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}> = ({ anchorEl, isOpen, onClose, children }) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
                anchorEl && !anchorEl.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleOutsideClick);
        }
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [isOpen, onClose, anchorEl]);

    if (!isOpen || !anchorEl) return null;

    const rect = anchorEl.getBoundingClientRect();
    const style: React.CSSProperties = {
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
    };

    return (
        <Portal>
            <div ref={popoverRef} style={style} className="popover bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-56">
                {children}
            </div>
        </Portal>
    );
};

const PRESET_COLORS = ['#FFFFFF', '#E2E8F0', '#94A3B8', '#334155', '#000000', '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

// #region Color Picker Logic
type HSV = { h: number; s: number; v: number };

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHsv({ r, g, b }: { r: number; g: number; b: number }): HSV {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s, v };
}

function hsvToRgb({ h, s, v }: HSV): { r: number; g: number; b: number } {
    let r = 0, g = 0, b = 0, i = Math.floor(h / 60), f = h / 60 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

const AdvancedColorPicker: React.FC<{ color: string, onChange: (c: string) => void }> = ({ color, onChange }) => {
    const [hsv, setHsv] = useState(() => {
        const rgb = hexToRgb(color);
        return rgb ? rgbToHsv(rgb) : { h: 0, s: 1, v: 1 };
    });
    const saturationRef = useRef<HTMLDivElement>(null);
    const hueRef = useRef<HTMLDivElement>(null);
    const internalColorRef = useRef(color);
    
    useEffect(() => {
        if (color.toUpperCase() !== internalColorRef.current.toUpperCase()) {
            const rgb = hexToRgb(color);
            if (rgb) setHsv(rgbToHsv(rgb));
        }
    }, [color]);

    const handleHsvChange = (newHsv: Partial<HSV>) => {
        const updatedHsv = { ...hsv, ...newHsv };
        setHsv(updatedHsv);
        const newHex = rgbToHex(hsvToRgb(updatedHsv));
        internalColorRef.current = newHex;
        onChange(newHex);
    };

    const handleSaturationMouseDown = (e: React.MouseEvent) => {
        if (!saturationRef.current) return;
        const rect = saturationRef.current.getBoundingClientRect();
        const update = (evt: MouseEvent) => {
            const x = Math.max(0, Math.min(rect.width, evt.clientX - rect.left));
            const y = Math.max(0, Math.min(rect.height, evt.clientY - rect.top));
            handleHsvChange({ s: x / rect.width, v: 1 - (y / rect.height) });
        };
        update(e.nativeEvent);

        const onMouseMove = (evt: MouseEvent) => update(evt);
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const handleHueMouseDown = (e: React.MouseEvent) => {
        if (!hueRef.current) return;
        const rect = hueRef.current.getBoundingClientRect();
        const update = (evt: MouseEvent) => {
            const x = Math.max(0, Math.min(rect.width, evt.clientX - rect.left));
            handleHsvChange({ h: (x / rect.width) * 360 });
        };
        update(e.nativeEvent);
        const onMouseMove = (evt: MouseEvent) => update(evt);
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div className="space-y-3">
            <div
                ref={saturationRef}
                className="color-picker-saturation"
                style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
                onMouseDown={handleSaturationMouseDown}
            >
                <div className="color-picker-handle" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} />
            </div>
            <div ref={hueRef} className="hue-slider" onMouseDown={handleHueMouseDown}>
                 <div className="hue-slider-handle" style={{ left: `${(hsv.h / 360) * 100}%` }}/>
            </div>
        </div>
    );
}
// #endregion

const CustomColorPicker: React.FC<{ color: string; onChange: (c: string) => void; }> = ({ color, onChange }) => (
    <div className="space-y-3">
        <AdvancedColorPicker color={color} onChange={onChange} />
        <div>
            <label className="text-xs text-gray-500 mb-1 block">Presets</label>
            <div className="grid grid-cols-6 gap-2">
                {PRESET_COLORS.map(c => (
                    <button key={c} style={{ backgroundColor: c }} onClick={() => onChange(c)} className={`w-full h-7 rounded-md border ${c === '#FFFFFF' ? 'border-gray-300' : 'border-transparent'}`} />
                ))}
            </div>
        </div>
        <Input label="Hex" type="text" value={color} onChange={onChange} />
    </div>
);
// #endregion

// #region Background Editor Components

const BackgroundEditor: React.FC<{
    slide: Slide;
    updateCurrentSlide: (slide: Slide) => void;
    generateImage: (prompt: string) => Promise<string | null>;
    isGenerating: boolean;
}> = ({ slide, updateCurrentSlide, generateImage, isGenerating }) => {
    const [activeTab, setActiveTab] = useState(slide.background.type);
    
    const updateBackground = (newBg: Background) => updateCurrentSlide({ ...slide, background: newBg });

    const handleTabChange = (tab: 'color' | 'image' | 'gradient') => {
        setActiveTab(tab);
        if (tab === 'color' && slide.background.type !== 'color') {
            updateBackground({ type: 'color', color: '#FFFFFF' });
        } else if (tab === 'image' && slide.background.type !== 'image') {
            updateBackground({ type: 'image', source: 'upload', src: '', fit: 'fill', zoom: 100, position: { x: 50, y: 50 } });
        } else if (tab === 'gradient' && slide.background.type !== 'gradient') {
            updateBackground({ type: 'gradient', gradient: { type: 'linear', angle: 90, stops: [{ id: generateId(), color: '#FFFFFF', position: 0 }, { id: generateId(), color: '#000000', position: 100 }] } });
        }
    };

    return (
        <div>
            <SegmentedControl
                options={[{value: 'color', label: 'Color'}, {value: 'image', label: 'Image'}, {value: 'gradient', label: 'Gradient'}]}
                value={activeTab}
                onChange={handleTabChange}
            />
            <div className="mt-4">
                {activeTab === 'color' && slide.background.type === 'color' && <ColorBackgroundEditor background={slide.background} onUpdate={updateBackground} />}
                {activeTab === 'image' && slide.background.type === 'image' && <ImageBackgroundEditor background={slide.background} onUpdate={updateBackground} generateImage={generateImage} isGenerating={isGenerating} />}
                {activeTab === 'gradient' && slide.background.type === 'gradient' && <GradientBackgroundEditor background={slide.background} onUpdate={updateBackground} />}
            </div>
        </div>
    );
};

const ColorBackgroundEditor: React.FC<{background: ColorBackground, onUpdate: (bg: ColorBackground) => void}> = ({ background, onUpdate }) => {
    return (
        <div className="space-y-4">
            <ColorInput label="Color" value={background.color} onChange={color => onUpdate({ ...background, color })} />
        </div>
    );
};

const ImageBackgroundEditor: React.FC<{background: ImageBackground, onUpdate: (bg: ImageBackground) => void, generateImage: (prompt: string) => Promise<string | null>, isGenerating: boolean}> = ({ background, onUpdate, generateImage, isGenerating }) => {
    const [imageTab, setImageTab] = useState(background.source);
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                onUpdate({ ...background, src: event.target?.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-4">
            <SegmentedControl options={[{value: 'upload', label: 'Upload'}, {value: 'generated', label: 'Generate'}]} value={imageTab} onChange={setImageTab} />

            {imageTab === 'upload' && (
                <div>
                    <label className="w-full text-center cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 block">
                        <span>Upload Image</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                </div>
            )}
            
            {imageTab === 'generated' && (
                <ImageGenerator background={background} onUpdate={onUpdate} generateImage={generateImage} isGenerating={isGenerating} />
            )}
            
            {background.src && (
                <>
                    <FocusPicker src={background.src} position={background.position} onUpdate={pos => onUpdate({...background, position: pos})} />
                    <Input label="Zoom" type="range" min={10} max={300} value={background.zoom} onChange={zoom => onUpdate({...background, zoom })} />
                    <SegmentedControl options={[{value: 'fill', label: 'Fill'}, {value: 'fit', label: 'Fit'}, {value: 'tile', label: 'Tile'}, {value: 'manual', label: 'Manual'}]} value={background.fit} onChange={fit => onUpdate({...background, fit })} />
                </>
            )}
        </div>
    );
};

const ImageGenerator: React.FC<{background: ImageBackground, onUpdate: (bg: ImageBackground) => void, generateImage: (prompt: string) => Promise<string | null>, isGenerating: boolean}> = ({ background, onUpdate, generateImage, isGenerating }) => {
    const [prompt, setPrompt] = useState(background.prompt || '');
    
    const handleGenerate = async () => {
        const newSrc = await generateImage(prompt);
        if (newSrc) {
            onUpdate({ ...background, src: newSrc, prompt, source: 'generated' });
        }
    };
    
    return (
        <div className="space-y-2">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="A cat wearing a superhero cape..." className="w-full bg-gray-50 text-gray-800 px-2 py-1.5 rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm" rows={3}></textarea>
            <button onClick={handleGenerate} disabled={isGenerating || !prompt} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md disabled:bg-blue-300">
                {isGenerating ? 'Generating...' : 'Generate Image'}
            </button>
        </div>
    );
};

const FocusPicker: React.FC<{src: string, position: {x:number, y:number}, onUpdate: (pos: {x:number, y:number}) => void}> = ({src, position, onUpdate}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = containerRef.current!.getBoundingClientRect();
        const updatePosition = (clientX: number, clientY: number) => {
            let x = ((clientX - rect.left) / rect.width) * 100;
            let y = ((clientY - rect.top) / rect.height) * 100;
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));
            onUpdate({ x, y });
        };
        
        updatePosition(e.clientX, e.clientY);

        const onMouseMove = (moveEvent: MouseEvent) => updatePosition(moveEvent.clientX, moveEvent.clientY);
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div ref={containerRef} onMouseDown={handleMouseDown} className="w-full aspect-video rounded-md bg-gray-200 relative cursor-pointer overflow-hidden">
            <img src={src} className="w-full h-full object-contain" />
            <div style={{left: `${position.x}%`, top: `${position.y}%`}} className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow-lg pointer-events-none" />
        </div>
    );
};

const generateGradientCss = (gradient: Gradient) => {
    const stops = [...gradient.stops].sort((a, b) => a.position - b.position).map(s => `${s.color} ${s.position}%`).join(', ');
    switch (gradient.type) {
        case 'linear': return `linear-gradient(${gradient.angle}deg, ${stops})`;
        case 'radial': return `radial-gradient(${gradient.shape} at ${gradient.position}, ${stops})`;
        case 'conic': return `conic-gradient(from ${gradient.angle}deg at ${gradient.position}, ${stops})`;
    }
};

const GradientSlider: React.FC<{ gradient: Gradient, onUpdate: (g: Gradient) => void, activeStopId: string | null, setActiveStopId: (id: string) => void }> = ({ gradient, onUpdate, activeStopId, setActiveStopId }) => {
    const sliderRef = useRef<HTMLDivElement>(null);

    const handleStopDrag = (e: React.MouseEvent, stopId: string) => {
        e.preventDefault();
        setActiveStopId(stopId);
        const slider = sliderRef.current;
        if (!slider) return;

        const rect = slider.getBoundingClientRect();
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
            let newPosition = ((moveEvent.clientX - rect.left) / rect.width) * 100;
            newPosition = Math.max(0, Math.min(100, newPosition));
            onUpdate({ ...gradient, stops: gradient.stops.map(s => s.id === stopId ? { ...s, position: Math.round(newPosition) } : s) });
        };
        
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const addStop = (e: React.MouseEvent) => {
        const slider = sliderRef.current;
        if (!slider || (e.target as HTMLElement) !== slider) return;
        const rect = slider.getBoundingClientRect();
        let position = ((e.clientX - rect.left) / rect.width) * 100;
        position = Math.round(Math.max(0, Math.min(100, position)));
        
        const newStop: GradientStop = { id: generateId(), color: '#000000', position };
        const newStops = [...gradient.stops, newStop].sort((a,b) => a.position - b.position);
        
        onUpdate({ ...gradient, stops: newStops });
        setActiveStopId(newStop.id);
    };
    
    return (
        <div ref={sliderRef} onClick={addStop} className="h-6 w-full rounded relative cursor-pointer" style={{ background: generateGradientCss(gradient) }}>
            {gradient.stops.map(stop => (
                <div key={stop.id} onMouseDown={e => handleStopDrag(e, stop.id)} style={{ left: `${stop.position}%` }} className={`gradient-slider-handle ${activeStopId === stop.id ? 'active' : ''}`}>
                    <div className="gradient-slider-handle-inner" style={{ backgroundColor: stop.color }} />
                </div>
            ))}
        </div>
    );
};

const PositionPicker: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
    const positions = [
        'top left', 'top', 'top right',
        'left', 'center', 'right',
        'bottom left', 'bottom', 'bottom right'
    ];

    const getCoords = (pos: string) => ({
        cx: pos.includes('left') ? 7 : (pos.includes('right') ? 17 : 12),
        cy: pos.includes('top') ? 7 : (pos.includes('bottom') ? 17 : 12),
    });

    return (
        <div>
            <label className="text-xs text-gray-500 mb-1 block">Position</label>
            <div className="grid grid-cols-3 gap-1">
                {positions.map(pos => {
                    const { cx, cy } = getCoords(pos);
                    return (
                        <button
                            key={pos}
                            onClick={() => onChange(pos)}
                            title={pos.charAt(0).toUpperCase() + pos.slice(1)}
                            className={`p-2 rounded-md transition-colors text-xs font-medium flex items-center justify-center capitalize aspect-square ${value === pos ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                        >
                            <span className="sr-only">{pos}</span>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="2" y="2" width="20" height="20" rx="2" className={value === pos ? "stroke-white/30" : "stroke-gray-300"} strokeWidth="1.5"/>
                                <circle cx={cx} cy={cy} r="3" className="fill-current"/>
                            </svg>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const GradientBackgroundEditor: React.FC<{ background: GradientBackground, onUpdate: (bg: GradientBackground) => void }> = ({ background, onUpdate }) => {
    const [activeStopId, setActiveStopId] = useState<string | null>(background.gradient.stops[0]?.id || null);
    const { gradient } = background;

    const updateGradient = (newGradient: Partial<Gradient>) => onUpdate({ ...background, gradient: { ...background.gradient, ...newGradient } as Gradient });
    
    const handleTypeChange = (type: 'linear' | 'radial' | 'conic') => {
        const currentGradient = background.gradient;
        // FIX: Change `update` type to `any` to allow adding properties dynamically based on gradient type.
        let update: any = { type };
        if (type === 'linear') {
            update.angle = (currentGradient as LinearGradient).angle ?? 90;
        } else if (type === 'radial') {
            update.shape = (currentGradient as RadialGradient).shape ?? 'ellipse';
            update.position = (currentGradient as RadialGradient).position ?? 'center';
        } else if (type === 'conic') {
            update.angle = (currentGradient as ConicGradient).angle ?? 0;
            update.position = (currentGradient as ConicGradient).position ?? 'center';
        }
        updateGradient(update);
    };
    
    const updateActiveStop = (newStop: Partial<GradientStop>) => {
        updateGradient({ stops: gradient.stops.map(s => s.id === activeStopId ? { ...s, ...newStop } : s) });
    };

    const removeActiveStop = () => {
        if (gradient.stops.length > 2) {
            const activeIndex = gradient.stops.findIndex(s => s.id === activeStopId);
            const newStops = gradient.stops.filter(s => s.id !== activeStopId);
            updateGradient({ stops: newStops });
            const newActiveIndex = Math.max(0, activeIndex - 1);
            setActiveStopId(newStops[newActiveIndex]?.id || null);
        }
    };
    
    const activeStop = gradient.stops.find(s => s.id === activeStopId);

    return (
        <div className="space-y-4">
             <SegmentedControl options={[{value: 'linear', label: 'Linear'}, {value: 'radial', label: 'Radial'}, {value: 'conic', label: 'Conic'}]} value={gradient.type} onChange={handleTypeChange} />
            
            {(gradient.type === 'linear' || gradient.type === 'conic') && <Input label="Angle" type="number" value={gradient.angle} onChange={angle => updateGradient({ angle })} />}
            {(gradient.type === 'radial' || gradient.type === 'conic') && <PositionPicker value={gradient.position} onChange={position => updateGradient({ position })} />}
            {gradient.type === 'radial' && <SegmentedControl options={[{value: 'circle', label: 'Circle'}, {value: 'ellipse', label: 'Ellipse'}]} value={gradient.shape} onChange={shape => updateGradient({shape})} />}
            
            <div className="space-y-2">
                <label className="text-xs text-gray-500 block">Stops</label>
                <GradientSlider gradient={gradient} onUpdate={g => onUpdate({...background, gradient: g})} activeStopId={activeStopId} setActiveStopId={setActiveStopId} />
            </div>
            
            {activeStop && (
                <div className="p-3 border border-gray-200 rounded-lg space-y-4">
                    <ColorInput label="Color" value={activeStop.color} onChange={color => updateActiveStop({ color })} />
                    <Input label="Position" type="range" min={0} max={100} value={activeStop.position} onChange={position => updateActiveStop({ position })}/>
                     <button onClick={removeActiveStop} disabled={gradient.stops.length <= 2} className="w-full text-sm text-red-600 font-semibold hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed">Remove Color Stop</button>
                </div>
            )}
        </div>
    );
};
// #endregion

const PropertiesSidebar: React.FC<{
    selectedElement: SlideElement | null;
    updateElement: (update: Partial<SlideElement> & { id: string }) => void;
    deleteElement: (id: string) => void;
    updateCurrentSlide: (slide: Slide) => void;
    slide: Slide;
    onFrameSelect: (width: number, height: number) => void;
    deleteCanvasFrame: () => void;
    generateImage: (prompt: string) => Promise<string | null>;
    isGenerating: boolean;
}> = ({ selectedElement, updateElement, deleteElement, slide, updateCurrentSlide, onFrameSelect, deleteCanvasFrame, generateImage, isGenerating }) => {
    
    if (!selectedElement) {
        if (!slide.width || !slide.height) {
             return (
                <aside className="w-64 bg-white p-3 overflow-y-auto border-l border-gray-200 flex items-center justify-center">
                    <p className="text-sm text-gray-500 text-center px-4">Select a frame from the left panel to begin.</p>
                </aside>
            );
        }

        return (
            <aside className="w-64 bg-white p-3 overflow-y-auto border-l border-gray-200 flex flex-col">
                <div className="flex-grow space-y-4">
                    <PropertySection title="Canvas" defaultOpen>
                        <div className="grid grid-cols-2 gap-2">
                            <Input label="W" type="text" value={slide.width} readOnly />
                            <Input label="H" type="text" value={slide.height} readOnly />
                        </div>
                    </PropertySection>
                     <PropertySection title="Frame Size" defaultOpen>
                        <div className="space-y-1">
                             <button onClick={() => onFrameSelect(1280, 720)} className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-left">
                                <PresentIcon size={20}/>
                                <span className="text-sm font-medium text-gray-700">Presentation</span>
                            </button>
                            <div className="border-b border-gray-200 my-2" />
                            {frameOptions.map(option => (
                                <details key={option.name} className="group">
                                    <summary className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer list-none">
                                        <option.icon />
                                        <span className="text-sm font-medium text-gray-700 flex-1">{option.name}</span>
                                        <ChevronDownIcon />
                                    </summary>
                                    <div className="pl-8 space-y-1 pt-1">
                                        {option.formats.map(format => (
                                            <button key={format.name} onClick={() => onFrameSelect(format.width, format.height)} className="w-full text-left text-sm text-gray-600 p-2 rounded-md hover:bg-gray-100">
                                                {format.name}
                                            </button>
                                        ))}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </PropertySection>
                    <PropertySection title="Background" defaultOpen>
                        <BackgroundEditor slide={slide} updateCurrentSlide={updateCurrentSlide} generateImage={generateImage} isGenerating={isGenerating} />
                    </PropertySection>
                </div>
                <button onClick={deleteCanvasFrame} className="w-full mt-4 flex items-center justify-center gap-2 bg-white hover:bg-red-500 text-red-600 hover:text-white font-semibold py-2 px-4 border border-red-300 rounded-md transition-colors text-sm">
                    <TrashIcon /> Delete Canvas
                </button>
            </aside>
        );
    }
    
    const isTextElement = selectedElement.type === ElementType.TEXT;

    const updateShadow = (key: string, value: any) => {
        if (isTextElement) {
            const textEl = selectedElement as TextElement;
            const newShadow = {
                x: 0, y: 1, blur: 2, color: '#00000033',
                ...textEl.textShadow,
                [key]: value,
            };
            updateElement({ id: selectedElement.id, textShadow: newShadow });
        } else {
            const newShadow = {
                x: 0, y: 1, blur: 2, spread: 0, color: '#00000033',
                ...selectedElement.shadow,
                [key]: value
            };
            updateElement({ id: selectedElement.id, shadow: newShadow });
        }
    };

    const textEl = selectedElement.type === ElementType.TEXT ? selectedElement as TextElement : null;
    const imageEl = selectedElement.type === ElementType.IMAGE ? selectedElement as ImageElement : null;
    const shapeEl = selectedElement.type === ElementType.SHAPE ? selectedElement as ShapeElement : null;

    const updateBorder = (key: string, value: any) => {
        if (!imageEl) return;
        const newBorder = {
            width: 0,
            style: 'solid' as 'solid' | 'dashed' | 'dotted',
            color: '#000000',
            ...imageEl.border,
            [key]: value
        };
        updateElement({ id: selectedElement.id, border: newBorder });
    };

    const [imageTab, setImageTab] = useState(imageEl?.source || 'upload');
    const [imagePrompt, setImagePrompt] = useState(imageEl?.prompt || '');

    useEffect(() => {
        if (imageEl) {
            setImageTab(imageEl.source || 'upload');
            setImagePrompt(imageEl.prompt || '');
        }
    }, [imageEl]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!imageEl) return;
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imgSrc = event.target?.result as string;
                const img = new Image();
                img.onload = () => {
                    const { naturalWidth, naturalHeight } = img;
                    const currentWidth = imageEl.width;
                    const newHeight = (currentWidth * naturalHeight) / naturalWidth;
                    updateElement({
                        id: imageEl.id,
                        src: imgSrc,
                        source: 'upload',
                        height: newHeight
                    });
                };
                img.src = imgSrc;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateImage = async () => {
        if (!imageEl) return;
        const newSrc = await generateImage(imagePrompt);
        if (newSrc) {
            const img = new Image();
            img.onload = () => {
                const { naturalWidth, naturalHeight } = img;
                const currentWidth = imageEl.width;
                const newHeight = (currentWidth * naturalHeight) / naturalWidth;
                updateElement({
                    id: imageEl.id,
                    src: newSrc,
                    prompt: imagePrompt,
                    source: 'generated',
                    height: newHeight
                });
            };
            img.src = newSrc;
        }
    };

    const handleSubtypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const subtype = e.target.value as TextSubtype;
        const styles = textSubtypeStyles[subtype];
        updateElement({id: textEl!.id, subtype, ...styles});
    };
    
    const shadow = isTextElement ? (selectedElement as TextElement).textShadow : selectedElement.shadow;

    return (
        <aside className="w-64 bg-white p-3 overflow-y-auto flex flex-col border-l border-gray-200">
            <div className="space-y-4 flex-grow">
                <PropertySection title="Transform" defaultOpen>
                    <div className="grid grid-cols-2 gap-2">
                        <Input label="X" type="number" value={Math.round(selectedElement.x)} onChange={v => updateElement({ id: selectedElement.id, x: v })} />
                        <Input label="Y" type="number" value={Math.round(selectedElement.y)} onChange={v => updateElement({ id: selectedElement.id, y: v })} />
                        <Input label="W" type="number" min={1} value={Math.round(selectedElement.width)} onChange={v => updateElement({ id: selectedElement.id, width: v })} />
                        <Input label="H" type="number" min={1} value={Math.round(selectedElement.height)} onChange={v => updateElement({ id: selectedElement.id, height: v })} />
                    </div>
                    <Input label="Rotation" type="number" value={selectedElement.rotation} onChange={v => updateElement({ id: selectedElement.id, rotation: v })} />
                </PropertySection>

                <PropertySection title="Appearance">
                    <Input label="Opacity" type="range" min={0} max={1} step={0.01} value={selectedElement.opacity} onChange={v => updateElement({ id: selectedElement.id, opacity: v })} />
                    {(imageEl || (shapeEl && shapeEl.shapeType === ShapeType.RECTANGLE)) && <Input label="Corner Radius" type="number" min={0} value={(imageEl || shapeEl)!.borderRadius} onChange={v => updateElement({ id: selectedElement.id, borderRadius: v })} />}
                </PropertySection>
                
                {textEl && (
                    <>
                    <PropertySection title="Text" defaultOpen>
                        <textarea value={textEl.text} onChange={e => updateElement({ id: textEl.id, text: e.target.value })} className="w-full bg-gray-50 text-gray-800 px-2 py-1.5 rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm" rows={3}></textarea>
                        
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Style</label>
                            <select value={textEl.subtype} onChange={handleSubtypeChange} className="w-full bg-gray-50 text-gray-800 px-2 py-1.5 rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm">
                                <option value={TextSubtype.H1}>Heading 1</option>
                                <option value={TextSubtype.H2}>Heading 2</option>
                                <option value={TextSubtype.H3}>Heading 3</option>
                                <option value={TextSubtype.H4}>Heading 4</option>
                                <option value={TextSubtype.PARAGRAPH}>Paragraph</option>
                                <option value={TextSubtype.QUOTE}>Quote</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-md">
                            <button onClick={() => updateElement({id: textEl.id, fontWeight: textEl.fontWeight > 400 ? 400 : 700})} title="Bold" className={`p-1.5 rounded flex-1 ${textEl.fontWeight > 400 ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}><FontBoldIcon /></button>
                            <button onClick={() => updateElement({id: textEl.id, fontStyle: textEl.fontStyle === 'italic' ? 'normal' : 'italic'})} title="Italic" className={`p-1.5 rounded flex-1 ${textEl.fontStyle === 'italic' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}><FontItalicIcon /></button>
                            <button onClick={() => updateElement({id: textEl.id, textDecoration: textEl.textDecoration === 'underline' ? 'none' : 'underline'})} title="Underline" className={`p-1.5 rounded flex-1 ${textEl.textDecoration === 'underline' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}><FontUnderlineIcon /></button>
                            <div className="w-px h-5 bg-gray-300 mx-1" />
                            <button onClick={() => updateElement({id: textEl.id, textTransform: textEl.textTransform === 'uppercase' ? 'none' : 'uppercase'})} title="Uppercase" className={`p-1.5 rounded flex-1 ${textEl.textTransform === 'uppercase' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}><TextTransformIcon /></button>
                        </div>

                        <ColorInput label="Color" value={textEl.color} onChange={v => updateElement({ id: textEl.id, color: v })} />
                        <div className="grid grid-cols-2 gap-2">
                            <Input label="Size" type="number" value={Math.round(textEl.fontSize)} onChange={v => updateElement({ id: textEl.id, fontSize: v })} />
                            <Input label="Weight" type="number" step={100} min={100} max={900} value={textEl.fontWeight} onChange={v => updateElement({ id: textEl.id, fontWeight: v })} />
                        </div>
                         <div className="grid grid-cols-2 gap-2">
                            <Input label="Line H" type="number" step={0.1} min={0} value={textEl.lineHeight} onChange={v => updateElement({ id: textEl.id, lineHeight: v })} />
                            <Input label="Spacing" type="number" step={0.1} value={textEl.letterSpacing} onChange={v => updateElement({ id: textEl.id, letterSpacing: v })} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Align</label>
                            <SegmentedControl
                                options={[{value: 'left', icon: AlignLeftIcon}, {value: 'center', icon: AlignCenterIcon}, {value: 'right', icon: AlignRightIcon}]}
                                value={textEl.textAlign}
                                onChange={v => updateElement({ id: textEl.id, textAlign: v })}
                            />
                        </div>
                    </PropertySection>
                    <PropertySection title="Container">
                        <ColorInput label="Background" value={textEl.backgroundColor} onChange={v => updateElement({ id: textEl.id, backgroundColor: v })} />
                        <Input label="Padding" type="number" min={0} value={textEl.padding} onChange={v => updateElement({ id: textEl.id, padding: v })} />
                        <Input label="Corner Radius" type="number" min={0} value={textEl.borderRadius} onChange={v => updateElement({ id: textEl.id, borderRadius: v })} />
                        <ColorInput label="Border" value={textEl.strokeColor} onChange={v => updateElement({ id: textEl.id, strokeColor: v })} />
                        <Input label="Border width" type="number" min={0} value={textEl.strokeWidth} onChange={v => updateElement({ id: textEl.id, strokeWidth: v })} />
                    </PropertySection>
                    </>
                )}
                
                {shapeEl && (
                    <>
                        <PropertySection title="Fill" defaultOpen>
                            <BackgroundEditor
                                slide={{ ...slide, background: shapeEl.fill }}
                                updateCurrentSlide={(s) => updateElement({ id: shapeEl.id, fill: s.background })}
                                generateImage={generateImage}
                                isGenerating={isGenerating}
                            />
                        </PropertySection>
                        {shapeEl.shapeType !== ShapeType.TRIANGLE && (
                             <PropertySection title="Stroke">
                                <ColorInput label="Color" value={shapeEl.strokeColor} onChange={v => updateElement({ id: shapeEl.id, strokeColor: v })} />
                                <Input label="Width" type="number" min={0} value={shapeEl.strokeWidth} onChange={v => updateElement({ id: shapeEl.id, strokeWidth: v })} />
                            </PropertySection>
                        )}
                    </>
                )}

                {imageEl && (
                    <>
                    <PropertySection title="Border">
                        <div className="grid grid-cols-2 gap-2">
                            <Input 
                                label="Width" 
                                type="number" 
                                min={0} 
                                value={imageEl.border?.width ?? 0} 
                                onChange={v => updateBorder('width', v)} 
                            />
                            <Input 
                                label="Offset" 
                                type="number" 
                                min={0} 
                                value={imageEl.border?.offset ?? 0} 
                                onChange={v => updateBorder('offset', v)} 
                            />
                        </div>
                        <ColorInput 
                            label="Color" 
                            value={imageEl.border?.color ?? '#000000'} 
                            onChange={v => updateBorder('color', v)} 
                        />
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Style</label>
                            <SegmentedControl 
                                options={[
                                    {value: 'solid', label: 'Solid'}, 
                                    {value: 'dashed', label: 'Dashed'}, 
                                    {value: 'dotted', label: 'Dotted'}
                                ]} 
                                value={imageEl.border?.style ?? 'solid'} 
                                onChange={v => updateBorder('style', v)} 
                            />
                        </div>
                    </PropertySection>
                    <PropertySection title="Image" defaultOpen>
                        <div className="space-y-4">
                            <SegmentedControl options={[{value: 'upload', label: 'Upload'}, {value: 'generated', label: 'Generate'}]} value={imageTab} onChange={setImageTab} />
                            {imageTab === 'upload' && (
                                <div>
                                    <label className="w-full text-center cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 block">
                                        <span>Replace Image</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                            )}
                            {imageTab === 'generated' && (
                                <div className="space-y-2">
                                    <textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="A cat wearing a superhero cape..." className="w-full bg-gray-50 text-gray-800 px-2 py-1.5 rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm" rows={3}></textarea>
                                    <button onClick={handleGenerateImage} disabled={isGenerating || !imagePrompt} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md disabled:bg-blue-300">
                                        {isGenerating ? 'Generating...' : 'Generate Image'}
                                    </button>
                                </div>
                            )}
                        </div>
                        <FocusPicker src={imageEl.src} position={{ x: imageEl.crop.x, y: imageEl.crop.y }} onUpdate={pos => updateElement({ id: imageEl.id, crop: { ...imageEl.crop, x: pos.x, y: pos.y } })} />
                        <Input label="Zoom" type="range" min={1} max={5} step={0.01} value={imageEl.crop.zoom} onChange={v => updateElement({ id: imageEl.id, crop: { ...imageEl.crop, zoom: v } })} />
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Fit</label>
                            <SegmentedControl 
                                options={[{value: 'cover', label: 'Fill'}, {value: 'contain', label: 'Fit'}]} 
                                value={imageEl.objectFit} 
                                onChange={v => updateElement({ id: imageEl.id, objectFit: v as 'cover' | 'contain' })} 
                            />
                        </div>
                        <Input label="Alt Text" type="text" value={imageEl.alt} onChange={v => updateElement({ id: imageEl.id, alt: v as string })} />
                    </PropertySection>
                    </>
                )}
                
                <PropertySection title="Shadow">
                    <div className="grid grid-cols-2 gap-2">
                        <Input label="X" type="number" value={shadow?.x ?? 0} onChange={v => updateShadow('x', v)} />
                        <Input label="Y" type="number" value={shadow?.y ?? 0} onChange={v => updateShadow('y', v)} />
                        <Input label="Blur" type="number" min={0} value={shadow?.blur ?? 0} onChange={v => updateShadow('blur', v)} />
                        {!isTextElement && <Input label="Spread" type="number" value={selectedElement.shadow?.spread ?? 0} onChange={v => updateShadow('spread', v)} />}
                    </div>
                    <ColorInput label="Color" value={shadow?.color ?? '#00000033'} onChange={v => updateShadow('color', v)} />
                </PropertySection>

            </div>
            <button onClick={() => deleteElement(selectedElement.id)} className="w-full mt-4 flex items-center justify-center gap-2 bg-white hover:bg-red-500 text-red-600 hover:text-white font-semibold py-2 px-4 border border-red-300 rounded-md transition-colors text-sm">
                <TrashIcon /> Delete Element
            </button>
        </aside>
    );
};

const PropertySection: React.FC<{ title: string; children: React.ReactNode, defaultOpen?: boolean }> = ({ title, children, defaultOpen=false }) => (
    <details open={defaultOpen} className="border-b border-gray-200 pb-2">
        <summary className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 cursor-pointer flex justify-between items-center p-1 hover:bg-gray-50 rounded">
            {title} <ChevronDownIcon />
        </summary>
        <div className="space-y-3 p-1">{children}</div>
    </details>
);

const Input: React.FC<{ label: string; type: string; value: any; onChange?: (value: any) => void; [key: string]: any; }> = ({ label, type, value, onChange, ...props }) => (
    <div>
        <label className="text-xs text-gray-500 mb-1 block">{label}</label>
        <input type={type} value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange?.(type === 'number' || type === 'range' ? parseFloat(e.target.value) || 0 : e.target.value)} 
            className={`w-full bg-gray-50 text-gray-800 px-2 py-1.5 rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-200 disabled:text-gray-500`} {...props} />
    </div>
);

const ColorInput: React.FC<{ label: string; value: string; onChange: (v: string) => void; }> = ({ label, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);

    return (
        <div>
            <label className="text-xs text-gray-500 mb-1 block">{label}</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-md pr-1 h-8">
                <button
                    ref={anchorRef}
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="w-6 h-6 m-1 rounded border border-gray-200"
                    style={{ backgroundColor: value }}
                />
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full bg-transparent text-gray-800 focus:outline-none text-sm"
                    onFocus={() => setIsOpen(false)}
                />
            </div>
            <Popover anchorEl={anchorRef.current} isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <CustomColorPicker color={value} onChange={onChange} />
            </Popover>
        </div>
    );
};

const SegmentedControl: React.FC<{options: {value: any, icon?: React.FC, label?: string}[], value: any, onChange: (v:any)=>void}> = ({ options, value, onChange }) => (
    <div className="flex bg-gray-200 rounded-md p-0.5">
        {options.map(opt => (
            <button key={opt.value} onClick={() => onChange(opt.value)}
                className={`flex-1 p-1 rounded-md text-gray-600 transition-colors text-xs font-medium flex items-center justify-center ${value === opt.value ? 'bg-white shadow-sm' : 'hover:bg-gray-100'}`}>
                {opt.icon && <opt.icon />}
                {opt.label && <span>{opt.label}</span>}
            </button>
        ))}
    </div>
)

const App: React.FC = () => {
    const [presentation, setPresentation] = useLocalStorage<Presentation>('presentation', {
        title: 'Untitled Presentation',
        slides: [{ ...defaultSlide, id: generateId() }],
    });
    const [brand, setBrand] = useLocalStorage<Brand>('brand', defaultBrand);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [view, setView] = useState<View>('designer');
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [editingElementId, setEditingElementId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [canvasPosition, setCanvasPosition] = useState({ top: 0, left: 0 });
    const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>('layers');
    const designerContainerRef = useRef<HTMLDivElement | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const generateImage = async (prompt: string): Promise<string | null> => {
        if (!process.env.API_KEY) {
            alert("API key not configured. Cannot generate image.");
            return null;
        }
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
            });
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        } catch (error) {
            console.error("Error generating image:", error);
            alert("Failed to generate image. Please check the console for more details.");
            return null;
        } finally {
            setIsGenerating(false);
        }
    };
    
    const currentSlide = presentation.slides[currentSlideIndex];

    const handleContainerReady = useCallback((el: HTMLDivElement) => {
        designerContainerRef.current = el;
    }, []);

    useEffect(() => {
        const container = designerContainerRef.current;
        if (!container || !currentSlide?.width || !currentSlide?.height) {
            setZoom(1);
            setCanvasPosition({ top: 0, left: 0 });
            return;
        }

        const calculateAndSetStyle = () => {
            const PADDING = 80;
            const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
            
            const availableWidth = containerWidth - PADDING;
            const availableHeight = containerHeight - PADDING;

            const scaleX = availableWidth / currentSlide.width;
            const scaleY = availableHeight / currentSlide.height;
            
            const newZoom = Math.min(scaleX, scaleY);
            setZoom(newZoom);

            const scaledWidth = currentSlide.width * newZoom;
            const scaledHeight = currentSlide.height * newZoom;
            const newLeft = (containerWidth - scaledWidth) / 2;
            const newTop = (containerHeight - scaledHeight) / 2;
            setCanvasPosition({ top: newTop, left: newLeft });
        };

        calculateAndSetStyle();

        const resizeObserver = new ResizeObserver(calculateAndSetStyle);
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, [currentSlide?.width, currentSlide?.height]);

    useEffect(() => {
        if (!currentSlide?.width || !currentSlide?.height) {
            setLeftPanelMode('frames');
        } else {
            setLeftPanelMode('layers');
        }
    }, [currentSlide]);

    const updateCurrentSlide = useCallback((updatedSlide: Slide) => {
        setPresentation(prev => ({ ...prev, slides: prev.slides.map((slide, index) => index === currentSlideIndex ? updatedSlide : slide) }));
    }, [currentSlideIndex, setPresentation]);
    
    const setSlideFrame = (width: number, height: number) => {
        const updatedSlide = { ...currentSlide, width, height };
        updateCurrentSlide(updatedSlide);
        setLeftPanelMode('layers');
    };

    const deleteCanvasFrame = () => {
        const newSlide: Slide = { ...defaultSlide, id: currentSlide.id };
        updateCurrentSlide(newSlide);
    }

    const addSlide = () => {
        const newSlide: Slide = { ...defaultSlide, id: generateId() };
        setPresentation(prev => ({...prev, slides: [...prev.slides, newSlide]}));
        setCurrentSlideIndex(presentation.slides.length);
    };

    const deleteElement = (elementId: string) => {
        const updatedElements = currentSlide.elements.filter(el => el.id !== elementId);
        updateCurrentSlide({ ...currentSlide, elements: updatedElements });
        setSelectedElementId(null);
    };
    
    const updateElement = (update: Partial<SlideElement> & { id: string }) => {
        const updatedElements = currentSlide.elements.map(el => el.id === update.id ? { ...el, ...update } : el);
        updateCurrentSlide({ ...currentSlide, elements: updatedElements as SlideElement[] });
    };

    const reorderElements = (draggedId: string, targetId: string) => {
        const slide = presentation.slides[currentSlideIndex];
        const sortedElements = [...slide.elements].sort((a, b) => b.zIndex - a.zIndex);
    
        const draggedIndex = sortedElements.findIndex(el => el.id === draggedId);
        if (draggedIndex === -1) return;
    
        const [draggedItem] = sortedElements.splice(draggedIndex, 1);
        const newTargetIndex = sortedElements.findIndex(el => el.id === targetId);
    
        if (newTargetIndex === -1) { 
            sortedElements.push(draggedItem);
        } else {
            sortedElements.splice(newTargetIndex, 0, draggedItem);
        }
    
        const maxZIndex = sortedElements.length - 1;
        const updatedElements = sortedElements.map((el, index) => ({
            ...el,
            zIndex: maxZIndex - index
        }));
    
        updateCurrentSlide({ ...slide, elements: updatedElements });
    };
    
    const selectedElement = currentSlide?.elements.find(el => el.id === selectedElementId) || null;

    if (view === 'presenter') {
        return <Presenter presentation={presentation} onExit={() => setView('designer')} brand={brand} />;
    }

    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-white">
            <Header 
                zoom={zoom}
                setZoom={setZoom}
                onPresent={() => setView('presenter')}
                title={presentation.title}
                onTitleChange={t => setPresentation(p => ({...p, title: t}))}
            />
            <div className="flex-1 flex min-h-0">
                {leftPanelMode === 'frames' ? (
                    <FramePanel onFrameSelect={setSlideFrame} />
                ) : (
                    <LayersPanel
                        slides={presentation.slides}
                        currentSlideIndex={currentSlideIndex}
                        setCurrentSlideIndex={setCurrentSlideIndex}
                        addSlide={addSlide}
                        selectedElementId={selectedElementId}
                        setSelectedElementId={setSelectedElementId}
                        reorderElements={reorderElements}
                        updateElement={updateElement}
                    />
                )}
                <Designer 
                    currentSlide={currentSlide} 
                    onSlideUpdate={updateCurrentSlide}
                    brand={brand}
                    zoom={zoom}
                    canvasPosition={canvasPosition}
                    selectedElementId={selectedElementId}
                    setSelectedElementId={setSelectedElementId}
                    onAddFrame={() => setLeftPanelMode('frames')}
                    onContainerReady={handleContainerReady}
                    editingElementId={editingElementId}
                    setEditingElementId={setEditingElementId}
                />
                <PropertiesSidebar
                    selectedElement={selectedElement}
                    updateElement={updateElement}
                    deleteElement={deleteElement}
                    slide={currentSlide}
                    updateCurrentSlide={updateCurrentSlide}
                    onFrameSelect={setSlideFrame}
                    deleteCanvasFrame={deleteCanvasFrame}
                    generateImage={generateImage}
                    isGenerating={isGenerating}
                />
            </div>
        </div>
    );
};

export default App;