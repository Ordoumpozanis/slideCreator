import React, { useState, useEffect, useCallback } from 'react';
import { Presentation, Slide, SlideElement, TextElement, ImageElement, ShapeElement, ElementType, ShapeType, Background, Gradient } from '../types';

interface PresenterProps {
  presentation: Presentation;
  onExit: () => void;
  brand: any;
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

const ElementRenderer: React.FC<{ element: SlideElement }> = ({ element }) => {
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        transform: `rotate(${element.rotation}deg)`,
        zIndex: element.zIndex,
        opacity: element.opacity,
        boxShadow: element.shadow ? `${element.shadow.x}px ${element.shadow.y}px ${element.shadow.blur}px ${element.shadow.spread}px ${element.shadow.color}` : 'none',
    };

    switch (element.type) {
        case ElementType.TEXT:
            const textElement = element as TextElement;
            return <div style={{ 
                ...style, 
                height: 'auto',
                color: textElement.color, 
                fontFamily: textElement.fontFamily, 
                fontSize: `${textElement.fontSize}px`, 
                fontWeight: textElement.fontWeight,
                textAlign: textElement.textAlign,
                lineHeight: textElement.lineHeight,
                letterSpacing: `${textElement.letterSpacing}px`,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontStyle: textElement.fontStyle,
                textDecoration: textElement.textDecoration,
                textTransform: textElement.textTransform,
                backgroundColor: textElement.backgroundColor,
                border: `${textElement.strokeWidth}px solid ${textElement.strokeColor}`,
                borderRadius: `${textElement.borderRadius}px`,
                padding: `${textElement.padding}px`,
                boxSizing: 'border-box',
                boxShadow: 'none',
                textShadow: textElement.textShadow ? `${textElement.textShadow.x}px ${textElement.textShadow.y}px ${textElement.textShadow.blur}px ${textElement.textShadow.color}` : 'none',
            }}>{textElement.text}</div>;
        case ElementType.IMAGE:
            const imageElement = element as ImageElement;
            const imageContainerStyle: React.CSSProperties = {
                ...style,
                overflow: 'hidden',
                borderRadius: `${imageElement.borderRadius}px`,
                boxSizing: 'border-box',
            };
    
            if (imageElement.border && imageElement.border.width > 0) {
                imageContainerStyle.border = `${imageElement.border.width}px ${imageElement.border.style} ${imageElement.border.color}`;
                if (imageElement.border.offset) {
                    imageContainerStyle.padding = `${imageElement.border.offset}px`;
                }
            }
            const imgStyle: React.CSSProperties = {
                width: '100%',
                height: '100%',
                objectFit: imageElement.objectFit,
                objectPosition: `${imageElement.crop.x}% ${imageElement.crop.y}%`,
                transform: `scale(${imageElement.crop.zoom})`
            };
            if (imageElement.borderRadius > 0) {
                const innerRadius = Math.max(0, imageElement.borderRadius - (imageElement.border?.width || 0));
                imgStyle.borderRadius = `${innerRadius}px`;
            }
            return (
                 <div style={imageContainerStyle}>
                    <img
                      src={imageElement.src}
                      alt={imageElement.alt}
                      style={imgStyle}
                    />
                </div>
            )
        case ElementType.SHAPE:
            const shapeElement = element as ShapeElement;
            const shapeStyle: React.CSSProperties = {
                ...style,
                ...getBackgroundStyle(shapeElement.fill),
                border: `${shapeElement.strokeWidth}px solid ${shapeElement.strokeColor}`,
                borderRadius: `${shapeElement.borderRadius}px`,
                boxSizing: 'border-box',
            };

            if (shapeElement.shapeType === ShapeType.ELLIPSE) {
                shapeStyle.borderRadius = '50%';
            } else if (shapeElement.shapeType === ShapeType.TRIANGLE) {
                shapeStyle.clipPath = 'polygon(50% 0, 0 100%, 100% 100%)';
                shapeStyle.borderRadius = '0';
                shapeStyle.border = 'none';
            }
            return <div style={shapeStyle} />;
        default:
            return null;
    }
};

const SlideRenderer: React.FC<{ slide: Slide }> = ({ slide }) => {
  return (
    <div className="w-full h-full" style={{ ...getBackgroundStyle(slide.background), fontFamily: 'sans-serif' }}>
      <div className="relative w-full h-full transform origin-top-left">
        {slide.elements.map(element => (
          <ElementRenderer key={element.id} element={element} />
        ))}
      </div>
    </div>
  );
};


export const Presenter: React.FC<PresenterProps> = ({ presentation, onExit }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      setCurrentSlide(prev => Math.min(prev + 1, presentation.slides.length - 1));
    } else if (e.key === 'ArrowLeft') {
      setCurrentSlide(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      onExit();
    }
  }, [presentation.slides.length, onExit]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const slide = presentation.slides[currentSlide];

  if (!slide) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <p>No slides in this presentation.</p>
        <button onClick={onExit} className="absolute top-4 right-4 bg-red-500 px-3 py-1 rounded">Exit</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center">
      <div className="w-full h-full aspect-video bg-black flex items-center justify-center">
        <div className="w-[1280px] h-[720px] bg-white shadow-2xl">
           <SlideRenderer slide={slide} />
        </div>
      </div>
      <div className="absolute bottom-4 left-4 text-sm text-gray-400">
        Slide {currentSlide + 1} of {presentation.slides.length}
      </div>
       <button onClick={onExit} className="absolute top-4 right-4 bg-gray-700 hover:bg-red-600 transition-colors text-white px-4 py-2 rounded-lg text-sm font-semibold">
        Exit Presentation
      </button>
      <div className="absolute bottom-4 right-4 flex gap-2">
         <button 
          onClick={() => setCurrentSlide(prev => Math.max(prev - 1, 0))}
          disabled={currentSlide === 0}
          className="bg-gray-700 disabled:opacity-50 hover:bg-gray-600 transition-colors text-white px-4 py-2 rounded-lg"
        >
          Prev
        </button>
        <button 
          onClick={() => setCurrentSlide(prev => Math.min(prev + 1, presentation.slides.length - 1))}
          disabled={currentSlide === presentation.slides.length - 1}
          className="bg-gray-700 disabled:opacity-50 hover:bg-gray-600 transition-colors text-white px-4 py-2 rounded-lg"
        >
          Next
        </button>
      </div>
    </div>
  );
};