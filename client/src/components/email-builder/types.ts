export type BlockType = 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'columns';

export interface BlockStyles {
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  padding?: string;
  margin?: string;
  borderRadius?: string;
  width?: string;
  height?: string;
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  styles: BlockStyles;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  src: string;
  alt: string;
  linkUrl?: string;
}

export interface ButtonBlock extends BaseBlock {
  type: 'button';
  text: string;
  linkUrl: string;
  buttonColor?: string;
  textColor?: string;
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  lineColor?: string;
  lineWidth?: string;
}

export interface SpacerBlock extends BaseBlock {
  type: 'spacer';
  height: string;
}

export interface ColumnsBlock extends BaseBlock {
  type: 'columns';
  columns: EmailBlock[][];
  columnWidths: string[];
}

export type EmailBlock = TextBlock | ImageBlock | ButtonBlock | DividerBlock | SpacerBlock | ColumnsBlock;

export interface EmailLayout {
  blocks: EmailBlock[];
  globalStyles: {
    backgroundColor: string;
    fontFamily: string;
    maxWidth: string;
  };
}

export const defaultBlockStyles: Record<BlockType, BlockStyles> = {
  text: {
    padding: '16px',
    fontSize: '16px',
    fontFamily: 'Arial, sans-serif',
    color: '#333333',
    textAlign: 'left',
  },
  image: {
    padding: '16px',
    textAlign: 'center',
  },
  button: {
    padding: '16px',
    textAlign: 'center',
  },
  divider: {
    padding: '16px 0',
  },
  spacer: {
    padding: '0',
  },
  columns: {
    padding: '0',
  },
};

export const defaultBlockContent: Record<BlockType, Partial<EmailBlock>> = {
  text: {
    content: '<p>Enter your text here...</p>',
  },
  image: {
    src: 'https://via.placeholder.com/600x200',
    alt: 'Image',
    linkUrl: '',
  },
  button: {
    text: 'Click Here',
    linkUrl: '#',
    buttonColor: '#2563eb',
    textColor: '#ffffff',
  },
  divider: {
    lineColor: '#e5e7eb',
    lineWidth: '1px',
  },
  spacer: {
    height: '32px',
  },
  columns: {
    columns: [[], []],
    columnWidths: ['50%', '50%'],
  },
};
