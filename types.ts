export enum ElementType {
  TEXT = 'text',
  IMAGE = 'image',
  SHAPE = 'shape',
  LINE = 'line',
  ARROW = 'arrow',
}

export interface BaseElement {
  id: string;
  name?: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  shadow?: {
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: string;
  };
}

export enum TextSubtype {
    H1 = 'h1',
    H2 = 'h2',
    H3 = 'h3',
    H4 = 'h4',
    PARAGRAPH = 'p',
    QUOTE = 'quote',
}

export interface TextShadow {
  x: number;
  y: number;
  blur: number;
  color: string;
}

export interface TextElement extends BaseElement {
  type: ElementType.TEXT;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  subtype: TextSubtype;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textTransform: 'none' | 'uppercase';
  backgroundColor: string;
  strokeColor: string;
  strokeWidth: number;
  padding: number;
  borderRadius: number;
  textShadow?: TextShadow;
}

export interface ImageElement extends BaseElement {
  type: ElementType.IMAGE;
  src: string;
  alt: string;
  objectFit: 'cover' | 'contain';
  crop: {
    x: number; // percentage
    y: number; // percentage
    zoom: number; // scale factor
  };
  borderRadius: number;
  source?: 'upload' | 'generated';
  prompt?: string;
  border?: {
    width: number;
    style: 'solid' | 'dashed' | 'dotted';
    color: string;
    offset?: number;
  };
}

export enum ShapeType {
    RECTANGLE = 'rectangle',
    ELLIPSE = 'ellipse',
    TRIANGLE = 'triangle',
}

export interface ShapeElement extends BaseElement {
  type: ElementType.SHAPE;
  shapeType: ShapeType;
  fill: Background;
  strokeColor: string;
  strokeWidth: number;
  borderRadius: number;
}

export interface LineElement extends BaseElement {
    type: ElementType.LINE;
    strokeColor: string;
    strokeWidth: number;
}

export interface ArrowElement extends BaseElement {
    type: ElementType.ARROW;
    strokeColor: string;
    strokeWidth: number;
}

export type SlideElement = TextElement | ImageElement | ShapeElement | LineElement | ArrowElement;

export type BackgroundFit = 'fill' | 'fit' | 'tile' | 'manual';

export type ColorBackground = {
  type: 'color';
  color: string;
};

export type ImageBackground = {
  type: 'image';
  src: string;
  source: 'upload' | 'generated';
  prompt?: string;
  fit: BackgroundFit;
  zoom: number; // percentage, default 100
  position: { x: number, y: number }; // percentage
};

export type GradientStop = {
  id: string;
  color: string;
  position: number; // 0-100
};

export type LinearGradient = {
  type: 'linear';
  angle: number;
  stops: GradientStop[];
};

export type RadialGradient = {
  type: 'radial';
  shape: 'circle' | 'ellipse';
  position: string; // e.g., 'center', 'top left'
  stops: GradientStop[];
};

export type ConicGradient = {
  type: 'conic';
  angle: number;
  position: string;
  stops: GradientStop[];
};

export type Gradient = LinearGradient | RadialGradient | ConicGradient;

export type GradientBackground = {
  type: 'gradient';
  gradient: Gradient;
};

export type Background = ColorBackground | ImageBackground | GradientBackground;

export interface Slide {
  id: string;
  elements: SlideElement[];
  background: Background;
  width?: number;
  height?: number;
}

export interface Template {
    id: string;
    name: string;
    slide: Omit<Slide, 'id'>;
}

export interface Brand {
    logo: string; // data URL
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        text: string;
    },
    fonts: {
        heading: string;
        body: string;
    }
}

export interface Presentation {
  title: string;
  slides: Slide[];
}